const Productivity = require("../models/Productivity");
const Task = require("../models/Task");
const Attendance = require("../models/Attendance");
const moment = require("moment");

// @desc    Analyze and generate productivity rating for an employee
// @route   POST /api/productivity/analyze/:userId
// @access  Private/Admin or Manager
const analyzeUserProductivity = async (req, res) => {
    try {
        const { userId } = req.params;
        const { month } = req.body; // Format: YYYY-MM

        const startOfMonth = moment(month, "YYYY-MM").startOf("month").toDate();
        const endOfMonth = moment(month, "YYYY-MM").endOf("month").toDate();

        // 1. Task Score (Completion %) - Max 40
        const tasks = await Task.find({
            assignedTo: userId,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const completedTasks = tasks.filter(t => t.status === "Completed").length;
        const taskScore = tasks.length > 0 ? (completedTasks / tasks.length) * 40 : 0;

        // 2. Deadline Adherence - Max 30
        const onTimeTasks = tasks.filter(t =>
            t.status === "Completed" &&
            moment(t.updatedAt).isSameOrBefore(t.deadline)
        ).length;
        const deadlineScore = tasks.length > 0 ? (onTimeTasks / tasks.length) * 30 : 0;

        // 3. Attendance Score - Max 30
        const attendances = await Attendance.find({
            user: userId,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const onTimeDays = attendances.filter(a => a.status === "On Time").length;
        const attendanceScore = attendances.length > 0 ? (onTimeDays / attendances.length) * 30 : 0;

        const totalRating = Math.round(taskScore + deadlineScore + attendanceScore);

        // Feedback generation logic
        let feedback = "Needs more active participation.";
        if (totalRating > 80) feedback = "Outstanding performance this month!";
        else if (totalRating > 60) feedback = "Consistent and reliable performance.";
        else if (totalRating > 40) feedback = "Performing adequately but can improve.";

        const productivity = await Productivity.findOneAndUpdate(
            { user: userId, month },
            {
                taskScore,
                deadlineScore,
                attendanceScore,
                totalRating,
                feedback
            },
            { upsert: true, new: true }
        );

        res.json(productivity);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user productivity stats
// @route   GET /api/productivity/:userId
// @access  Private
const getUserProductivity = async (req, res) => {
    try {
        const ratings = await Productivity.find({ user: req.params.userId })
            .sort({ month: -1 })
            .limit(12);
        res.json(ratings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    analyzeUserProductivity,
    getUserProductivity
};
