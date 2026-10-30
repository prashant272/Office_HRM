const Meeting = require("../models/Meeting");
const { sendNotification } = require("../utils/notificationHelper");

// @desc    Create and schedule a meeting with conflict detection
// @route   POST /api/meetings
// @access  Private
const scheduleMeeting = async (req, res) => {
    try {
        const { title, agenda, room, startTime, endTime, participants, meetingLink } = req.body;

        // Conflict detection: Check if room is booked during the requested time
        const conflict = await Meeting.findOne({
            room,
            status: "Scheduled",
            $or: [
                { startTime: { $lt: endTime, $gte: startTime } },
                { endTime: { $gt: startTime, $lte: endTime } }
            ]
        });

        if (conflict) {
            return res.status(400).json({
                message: `Conflict detected! ${room} is already booked from ${new Date(conflict.startTime).toLocaleTimeString()} to ${new Date(conflict.endTime).toLocaleTimeString()}`
            });
        }

        const meeting = await Meeting.create({
            title,
            agenda,
            room,
            startTime,
            endTime,
            participants,
            meetingLink,
            host: req.user._id
        });

        // Notify participants
        participants.forEach(userId => {
            sendNotification(
                userId,
                `📅 New Meeting: ${title} in ${room}`,
                "info"
            );
        });

        // Also notify host
        sendNotification(req.user._id, `✅ Meeting Scheduled: ${title}`, "success");

        res.status(201).json(meeting);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all meetings (Future/Upcoming)
// @route   GET /api/meetings
// @access  Private
const getMeetings = async (req, res) => {
    try {
        const meetings = await Meeting.find({
            endTime: { $gte: new Date() },
            status: { $ne: "Cancelled" }
        })
            .populate("host", "name designation")
            .populate("participants", "name designation email")
            .sort({ startTime: 1 });

        res.json(meetings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update meeting status
// @route   PUT /api/meetings/:id/status
// @access  Private
const updateMeetingStatus = async (req, res) => {
    try {
        const meeting = await Meeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        meeting.status = req.body.status;
        await meeting.save();
        res.json(meeting);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    scheduleMeeting,
    getMeetings,
    updateMeetingStatus
};
