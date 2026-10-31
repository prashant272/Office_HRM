const Attendance = require("../models/Attendance");
const LoginSession = require("../models/LoginSession");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const moment = require("moment");
const { recordHeartbeat } = require("../utils/sessionMonitor");
const { getDistance } = require("../utils/geoUtils");

// @desc    Heartbeat from employee browser
// @route   POST /api/attendance/heartbeat
// @access  Private
const postHeartbeat = async (req, res) => {
    const { sessionId, hasInteraction, interactionTimestamp, interactionType } = req.body;

    if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required for heartbeat" });
    }

    try {
        const session = await recordHeartbeat(sessionId, {
            hasInteraction: Boolean(hasInteraction),
            interactionTimestamp,
            interactionType,
        });

        if (!session) {
            return res.status(404).json({ message: "Active session not found or has ended", isActive: false });
        }

        res.json({
            success: true,
            sessionId: session.sessionId,
            sessionStatus: session.sessionStatus,
            lastHeartbeat: session.lastHeartbeat,
            durationMinutes: session.durationMinutes,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark Check-In
// @route   POST /api/attendance/checkin
// @access  Private
const checkIn = async (req, res) => {
    const { location, sessionId } = req.body;
    const today = moment().format("YYYY-MM-DD");

    try {
        let attendance = await Attendance.findOne({
            user: req.user._id,
            date: today,
        });

        if (attendance && attendance.checkIn) {
            return res.status(400).json({ message: "Already checked in today" });
        }

        const checkInTime = moment();
        const lateThreshold = moment().set({ hour: 10, minute: 15, second: 0 });
        const status = checkInTime.isAfter(lateThreshold) ? "Late" : "Present";

        // Optional geofence verification if coordinates provided and geofence is enabled
        let loc = location;
        if (loc && loc.lat && loc.lng && process.env.OFFICE_LAT && process.env.OFFICE_LNG) {
            const officeLat = parseFloat(process.env.OFFICE_LAT);
            const officeLng = parseFloat(process.env.OFFICE_LNG);
            const officeRadius = parseFloat(process.env.OFFICE_RADIUS || 500);
            const dist = getDistance(loc.lat, loc.lng, officeLat, officeLng);
            loc.distanceFromOffice = Math.round(dist);
        }

        // Link active session if provided
        let sessionIds = [];
        if (sessionId) {
            const sess = await LoginSession.findOne({ sessionId, user: req.user._id });
            if (sess) sessionIds.push(sess._id);
        }

        if (attendance) {
            attendance.checkIn = checkInTime.toDate();
            attendance.status = status;
            if (loc) attendance.checkInLocation = loc;
            if (sessionIds.length > 0) attendance.sessions = sessionIds;
            await attendance.save();
        } else {
            attendance = await Attendance.create({
                user: req.user._id,
                date: today,
                checkIn: checkInTime.toDate(),
                checkInLocation: loc,
                status,
                sessions: sessionIds,
                shift: req.user.workingSchedule?.shiftName || "General Shift (09:30 - 18:30)",
            });
        }

        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark Check-Out
// @route   POST /api/attendance/checkout
// @access  Private
const checkOut = async (req, res) => {
    const { location } = req.body;
    const today = moment().format("YYYY-MM-DD");

    try {
        const attendance = await Attendance.findOne({
            user: req.user._id,
            date: today,
        });

        if (!attendance) {
            return res.status(400).json({ message: "No check-in record found for today" });
        }

        if (attendance.checkOut) {
            return res.status(400).json({ message: "Already checked out today" });
        }

        attendance.checkOut = new Date();
        if (location) attendance.checkOutLocation = location;

        // Calculate work duration in minutes
        const diff = attendance.checkOut - attendance.checkIn;
        attendance.workDuration = Math.max(0, Math.floor(diff / 1000 / 60));

        const updatedAttendance = await attendance.save();
        res.json(updatedAttendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged in employee's own attendance history
// @route   GET /api/attendance/my
// @access  Private (Employee)
const getMyAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({ user: req.user._id })
            .populate("sessions")
            .sort({ date: -1 });

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all attendance records (Admin only)
// @route   GET /api/attendance
// @access  Private/Admin
const getAllAttendance = async (req, res) => {
    try {
        const { employee, department, date, startDate, endDate, status } = req.query;
        let query = {};

        if (date) {
            query.date = date;
        } else if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        }

        if (status && status !== "All") {
            query.status = status;
        }

        if (employee) {
            query.user = employee;
        }

        let userFilter = {};
        if (department && department !== "All") {
            userFilter.department = department;
        }

        let attendance = await Attendance.find(query)
            .populate({
                path: "user",
                select: "name email role employeeId department designation",
                populate: { path: "department", select: "name" },
            })
            .populate("sessions")
            .sort({ date: -1 });

        if (department && department !== "All") {
            attendance = attendance.filter(
                (a) => a.user && a.user.department && a.user.department._id.toString() === department
            );
        }

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all login sessions with live status (Admin only)
// @route   GET /api/attendance/sessions
// @access  Private/Admin
const getAllSessions = async (req, res) => {
    try {
        const { status, employee, date } = req.query;
        let query = {};

        if (status && status !== "All") {
            query.sessionStatus = status;
        }

        if (employee) {
            query.user = employee;
        }

        if (date) {
            query.attendanceDate = date;
        }

        const sessions = await LoginSession.find(query)
            .populate({
                path: "user",
                select: "name email employeeId department designation role",
                populate: { path: "department", select: "name" },
            })
            .sort({ loginTime: -1 })
            .limit(100);

        res.json(sessions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit Attendance Correction Request (Employee)
// @route   POST /api/attendance/correction
// @access  Private (Employee)
const requestCorrection = async (req, res) => {
    const { date, reason, proposedCheckIn, proposedCheckOut } = req.body;

    if (!date || !reason) {
        return res.status(400).json({ message: "Date and reason are required" });
    }

    try {
        let attendance = await Attendance.findOne({ user: req.user._id, date });

        if (!attendance) {
            // Create a placeholder record
            attendance = new Attendance({
                user: req.user._id,
                date,
                status: "Absent",
            });
        }

        attendance.correctionRequest = {
            requested: true,
            reason,
            proposedCheckIn: proposedCheckIn ? new Date(proposedCheckIn) : undefined,
            proposedCheckOut: proposedCheckOut ? new Date(proposedCheckOut) : undefined,
            status: "Pending",
        };

        await attendance.save();

        res.json({ message: "Attendance correction request submitted successfully", attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all correction requests (Admin only)
// @route   GET /api/attendance/corrections
// @access  Private/Admin
const getCorrections = async (req, res) => {
    try {
        const corrections = await Attendance.find({
            "correctionRequest.requested": true,
        })
            .populate({
                path: "user",
                select: "name email employeeId department designation",
                populate: { path: "department", select: "name" },
            })
            .sort({ updatedAt: -1 });

        res.json(corrections);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Review Attendance Correction Request (Admin only)
// @route   PUT /api/attendance/corrections/:id
// @access  Private/Admin
const reviewCorrection = async (req, res) => {
    const { status, adminComment } = req.body; // Approved or Rejected

    if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be Approved or Rejected" });
    }

    try {
        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) {
            return res.status(404).json({ message: "Attendance record not found" });
        }

        attendance.correctionRequest.status = status;
        attendance.correctionRequest.adminComment = adminComment || "";
        attendance.correctionRequest.reviewedBy = req.user._id;
        attendance.correctionRequest.reviewedAt = new Date();

        if (status === "Approved") {
            if (attendance.correctionRequest.proposedCheckIn) {
                attendance.checkIn = attendance.correctionRequest.proposedCheckIn;
            }
            if (attendance.correctionRequest.proposedCheckOut) {
                attendance.checkOut = attendance.correctionRequest.proposedCheckOut;
            }
            attendance.status = "Present";

            if (attendance.checkIn && attendance.checkOut) {
                const diff = attendance.checkOut.getTime() - attendance.checkIn.getTime();
                attendance.workDuration = Math.max(0, Math.floor(diff / 60000));
            }
        }

        await attendance.save();

        // Audit log
        await AuditLog.create({
            user: req.user._id,
            action: `ATTENDANCE_CORRECTION_${status.toUpperCase()}`,
            targetEntity: "Attendance",
            targetId: attendance._id.toString(),
            details: { employee: attendance.user, status, adminComment },
            ipAddress: req.ip || "127.0.0.1",
        });

        res.json({ message: `Correction request ${status.toLowerCase()} successfully`, attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export attendance to CSV (Admin only)
// @route   GET /api/attendance/export/csv
// @access  Private/Admin
const exportAttendanceCSV = async (req, res) => {
    try {
        const records = await Attendance.find()
            .populate({
                path: "user",
                select: "name email employeeId department designation",
                populate: { path: "department", select: "name" },
            })
            .sort({ date: -1 });

        let csv = "Employee ID,Name,Email,Department,Designation,Date,Check-In (IST),Check-Out (IST),Work Duration (Mins),Status,Shift\n";

        records.forEach((r) => {
            const empId = r.user?.employeeId || "N/A";
            const name = `"${r.user?.name || 'Unknown'}"`;
            const email = r.user?.email || "N/A";
            const dept = `"${r.user?.department?.name || 'General'}"`;
            const desig = `"${r.user?.designation || 'Staff'}"`;
            const date = r.date;
            const checkInIST = r.checkIn ? moment(r.checkIn).utcOffset("+05:30").format("YYYY-MM-DD hh:mm:ss A") : "N/A";
            const checkOutIST = r.checkOut ? moment(r.checkOut).utcOffset("+05:30").format("YYYY-MM-DD hh:mm:ss A") : "N/A";
            const duration = r.workDuration || 0;
            const status = r.status;
            const shift = `"${r.shift || 'General Shift'}"`;

            csv += `${empId},${name},${email},${dept},${desig},${date},${checkInIST},${checkOutIST},${duration},${status},${shift}\n`;
        });

        res.header("Content-Type", "text/csv");
        res.attachment(`attendance_report_${moment().format("YYYYMMDD_HHmmss")}.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Start or End Break (Lunch / Tea / Short)
// @route   POST /api/attendance/break
// @access  Private
const toggleBreak = async (req, res) => {
    const { action, breakType, sessionId } = req.body; // action: 'start' | 'end'
    const today = moment().format("YYYY-MM-DD");
    const now = new Date();

    try {
        const attendance = await Attendance.findOne({
            user: req.user._id,
            date: today,
        });

        let session = null;
        if (sessionId) {
            session = await LoginSession.findOne({ sessionId, user: req.user._id });
        }

        if (action === "start") {
            const selectedType = breakType || "lunch";

            if (attendance) {
                if (attendance.isOnBreak) {
                    return res.status(400).json({ message: "You are already on a break" });
                }
                attendance.isOnBreak = true;
                attendance.currentBreakType = selectedType;
                attendance.breaks.push({
                    breakType: selectedType,
                    startTime: now,
                });
                await attendance.save();
            }

            if (session) {
                session.sessionStatus = "on_break";
                session.currentBreak = {
                    isOnBreak: true,
                    breakType: selectedType,
                    startTime: now,
                };
                session.breaks.push({
                    breakType: selectedType,
                    startTime: now,
                });
                await session.save();
            }

            // Socket notify admin
            try {
                const socket = require("../socket");
                const io = socket.getIO();
                io.emit("session-status-update", {
                    sessionId: session?.sessionId || null,
                    userId: req.user._id,
                    sessionStatus: "on_break",
                    breakType: selectedType,
                    isOnBreak: true,
                    startTime: now,
                });
            } catch (err) {}

            return res.json({
                success: true,
                message: `${selectedType === "lunch" ? "Lunch" : "Tea"} break started. Inactivity alerts paused.`,
                isOnBreak: true,
                currentBreakType: selectedType,
                breakStartTime: now,
                totalBreakMinutes: attendance?.totalBreakMinutes || session?.totalBreakMinutes || 0,
            });
        } else if (action === "end") {
            let breakMinutesAdded = 0;

            if (attendance && attendance.isOnBreak) {
                attendance.isOnBreak = false;
                const activeBreak = attendance.breaks.slice().reverse().find(b => !b.endTime);
                if (activeBreak) {
                    activeBreak.endTime = now;
                    const diffMs = Math.max(0, now - new Date(activeBreak.startTime));
                    activeBreak.durationMinutes = Math.round(diffMs / 60000);
                    breakMinutesAdded = activeBreak.durationMinutes;
                }
                attendance.totalBreakMinutes = attendance.breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
                attendance.currentBreakType = null;
                await attendance.save();
            }

            if (session) {
                session.sessionStatus = "active";
                session.currentBreak = {
                    isOnBreak: false,
                    breakType: null,
                    startTime: null,
                };
                const sessActiveBreak = session.breaks.slice().reverse().find(b => !b.endTime);
                if (sessActiveBreak) {
                    sessActiveBreak.endTime = now;
                    const diffMs = Math.max(0, now - new Date(sessActiveBreak.startTime));
                    sessActiveBreak.durationMinutes = Math.round(diffMs / 60000);
                }
                session.totalBreakMinutes = session.breaks.reduce((acc, b) => acc + (b.durationMinutes || 0), 0);
                session.lastHeartbeat = now;
                await session.save();
            }

            // Socket notify admin
            try {
                const socket = require("../socket");
                const io = socket.getIO();
                io.emit("session-status-update", {
                    sessionId: session?.sessionId || null,
                    userId: req.user._id,
                    sessionStatus: "active",
                    isOnBreak: false,
                });
            } catch (err) {}

            return res.json({
                success: true,
                message: "Break ended. Work resumed.",
                isOnBreak: false,
                currentBreakType: null,
                totalBreakMinutes: attendance?.totalBreakMinutes || session?.totalBreakMinutes || 0,
            });
        } else {
            return res.status(400).json({ message: "Invalid action. Must be 'start' or 'end'." });
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// @desc    Get current break status
// @route   GET /api/attendance/break/status
// @access  Private
const getBreakStatus = async (req, res) => {
    const today = moment().format("YYYY-MM-DD");
    try {
        const attendance = await Attendance.findOne({
            user: req.user._id,
            date: today,
        });

        let isOnBreak = attendance?.isOnBreak || false;
        let currentBreakType = attendance?.currentBreakType || null;
        let totalBreakMinutes = attendance?.totalBreakMinutes || 0;
        let activeBreakStartTime = null;

        if (attendance?.breaks?.length > 0) {
            const activeBreak = attendance.breaks.slice().reverse().find(b => !b.endTime);
            if (activeBreak) {
                activeBreakStartTime = activeBreak.startTime;
            }
        }

        res.json({
            isOnBreak,
            currentBreakType,
            activeBreakStartTime,
            totalBreakMinutes,
            allowedBreakMinutes: 30,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    postHeartbeat,
    checkIn,
    checkOut,
    toggleBreak,
    getBreakStatus,
    getMyAttendance,
    getAllAttendance,
    getAllSessions,
    requestCorrection,
    getCorrections,
    reviewCorrection,
    exportAttendanceCSV,
};
