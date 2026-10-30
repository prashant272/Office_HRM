const User = require("../models/User");
const Attendance = require("../models/Attendance");
const moment = require("moment");

// @desc    Enroll face descriptor for a user
// @route   PUT /api/employees/:id/enroll-face
// @access  Private/Admin or Manager
const enrollFace = async (req, res) => {
    try {
        const { descriptor } = req.body; // Array of numbers
        if (!descriptor || !Array.isArray(descriptor)) {
            return res.status(400).json({ message: "Valid face descriptor is required" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.faceDescriptor = descriptor;
        await user.save();

        res.json({ message: "Face enrolled successfully", user: { id: user._id, name: user.name } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify face and mark attendance via Kiosk
// @route   POST /api/attendance/kiosk-mark
// @access  Private (Terminal Authentication)
const verifyAndMarkAttendance = async (req, res) => {
    try {
        const { descriptor } = req.body;
        if (!descriptor || !Array.isArray(descriptor)) {
            return res.status(400).json({ message: "Biometric data required" });
        }

        // 1. Find the matching user using Euclidean distance
        const users = await User.find({ faceDescriptor: { $exists: true, $not: { $size: 0 } } });

        let bestMatch = null;
        let minDistance = 0.6; // face-api.js default threshold is usually 0.6

        for (const user of users) {
            const dist = euclideanDistance(descriptor, user.faceDescriptor);
            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = user;
            }
        }

        if (!bestMatch) {
            return res.status(401).json({ message: "Face not recognized. Please try again or contact HR." });
        }

        // 2. Mark attendance for bestMatch
        const today = moment().format("YYYY-MM-DD");
        let attendance = await Attendance.findOne({ user: bestMatch._id, date: today });

        const now = new Date();
        const checkInTime = moment();
        const lateThreshold = moment().set({ hour: 10, minute: 50, second: 0 });

        if (!attendance) {
            // Check-In
            const status = checkInTime.isAfter(lateThreshold) ? "Late" : "Present";
            attendance = await Attendance.create({
                user: bestMatch._id,
                date: today,
                checkIn: now,
                status,
                checkInLocation: { lat: 0, lng: 0, address: "Office Terminal" }
            });
            return res.json({
                message: `Check-in successful! Hello ${bestMatch.name}`,
                type: "check-in",
                user: bestMatch.name,
                status: attendance.status
            });
        } else if (!attendance.checkOut) {
            // Check-Out
            attendance.checkOut = now;
            const diff = attendance.checkOut - attendance.checkIn;
            attendance.workDuration = Math.floor(diff / 1000 / 60);
            await attendance.save();
            return res.json({
                message: `Check-out successful! Goodbye ${bestMatch.name}`,
                type: "check-out",
                user: bestMatch.name,
                duration: `${Math.floor(attendance.workDuration / 60)}h ${attendance.workDuration % 60}m`
            });
        } else {
            return res.status(400).json({ message: "Attendance already completed for today." });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper: Calculate Euclidean distance between two vectors
function euclideanDistance(v1, v2) {
    if (v1.length !== v2.length) return Infinity;
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
        sum += Math.pow(v1[i] - v2[i], 2);
    }
    return Math.sqrt(sum);
}

module.exports = {
    enrollFace,
    verifyAndMarkAttendance
};
