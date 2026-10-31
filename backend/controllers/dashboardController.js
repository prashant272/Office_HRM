const User = require("../models/User");
const Attendance = require("../models/Attendance");
const LoginSession = require("../models/LoginSession");
const ActivityAlert = require("../models/ActivityAlert");
const FieldMeeting = require("../models/FieldMeeting");
const Task = require("../models/Task");
const Leave = require("../models/Leave");
const Department = require("../models/Department");
const moment = require("moment");

// @desc    Get dashboard statistics (High performance parallel batch queries)
// @route   GET /api/dashboard/stats
// @access  Private
const getStats = async (req, res) => {
    try {
        const today = moment().format("YYYY-MM-DD");

        // Precompute last 7 dates array for batch querying
        const last7Dates = [];
        const dayNames = [];
        for (let i = 6; i >= 0; i--) {
            const d = moment().subtract(i, "days");
            last7Dates.push(d.format("YYYY-MM-DD"));
            dayNames.push(d.format("ddd"));
        }

        // ==========================================
        // 1. ADMIN PANEL DASHBOARD METRICS
        // ==========================================
        if (req.user.role === "admin" || req.user.role === "manager") {
            // Execute all queries in parallel via Promise.all
            const [
                totalEmployees,
                activeSessions,
                todayAttendanceCount,
                presentCount,
                lateCount,
                halfDayCount,
                todayMeetingsTotal,
                todayMeetingsCompleted,
                pendingMeetingApprovals,
                pendingCorrections,
                activeAlerts,
                recentSessions,
                last7Attendance,
                last7Meetings,
                approvedMeetingsCount,
                rejectedMeetingsCount,
                draftMeetingsCount,
                totalMeetingsCount
            ] = await Promise.all([
                User.countDocuments({ role: "employee", status: "active" }),
                LoginSession.find({
                    isActive: true,
                    logoutTime: null,
                }).populate("user", "name email department designation role").lean(),
                Attendance.countDocuments({ date: today }),
                Attendance.countDocuments({ date: today, status: "Present" }),
                Attendance.countDocuments({ date: today, status: "Late" }),
                Attendance.countDocuments({ date: today, status: "Half-Day" }),
                FieldMeeting.countDocuments({ scheduledDate: today }),
                FieldMeeting.countDocuments({ scheduledDate: today, status: "Completed" }),
                FieldMeeting.countDocuments({ approvalStatus: "Pending_Approval" }),
                Attendance.countDocuments({ "correctionRequest.status": "Pending" }),
                ActivityAlert.find({ status: "active" })
                    .populate({
                        path: "user",
                        select: "name email employeeId department designation",
                        populate: { path: "department", select: "name" },
                    })
                    .sort({ alertTime: -1 })
                    .limit(10)
                    .lean(),
                LoginSession.find()
                    .populate({
                        path: "user",
                        select: "name email employeeId department designation",
                        populate: { path: "department", select: "name" },
                    })
                    .sort({ updatedAt: -1, loginTime: -1 })
                    .limit(8)
                    .lean(),
                Attendance.find({ date: { $in: last7Dates } }).select("date").lean(),
                FieldMeeting.find({ scheduledDate: { $in: last7Dates } }).select("scheduledDate status").lean(),
                FieldMeeting.countDocuments({ approvalStatus: "Approved" }),
                FieldMeeting.countDocuments({ approvalStatus: "Rejected" }),
                FieldMeeting.countDocuments({ approvalStatus: "Draft" }),
                FieldMeeting.countDocuments(),
            ]);

            // Filter unique active user IDs
            const loggedInUserIds = new Set(activeSessions.map((s) => s.user?._id?.toString()).filter(Boolean));
            const loggedInEmployees = loggedInUserIds.size;

            const activeCount = activeSessions.filter((s) => s.sessionStatus === "active").length;
            const onBreakCount = activeSessions.filter((s) => s.sessionStatus === "on_break").length;
            const inactiveCount = activeSessions.filter((s) => s.sessionStatus === "inactive").length;
            const missingHeartbeatCount = activeSessions.filter((s) => s.sessionStatus === "heartbeat_missing").length;
            const loggedOutEmployees = Math.max(0, totalEmployees - loggedInEmployees);

            // In-memory fast aggregation for last 7 days trend
            const attCountByDate = {};
            for (let i = 0; i < last7Attendance.length; i++) {
                const d = last7Attendance[i].date;
                attCountByDate[d] = (attCountByDate[d] || 0) + 1;
            }

            const meetingsByDate = {};
            const completedMeetingsByDate = {};
            for (let i = 0; i < last7Meetings.length; i++) {
                const m = last7Meetings[i];
                meetingsByDate[m.scheduledDate] = (meetingsByDate[m.scheduledDate] || 0) + 1;
                if (m.status === "Completed") {
                    completedMeetingsByDate[m.scheduledDate] = (completedMeetingsByDate[m.scheduledDate] || 0) + 1;
                }
            }

            const last7Days = last7Dates.map((date, idx) => ({
                day: dayNames[idx],
                date,
                attendance: attCountByDate[date] || 0,
                meetings: meetingsByDate[date] || 0,
                completedMeetings: completedMeetingsByDate[date] || 0,
            }));

            // Session Status Distribution (Pie Chart)
            const sessionDistribution = [
                { name: "Active Now", value: activeCount, color: "#10b981" },
                { name: "On Break (Exempt)", value: onBreakCount, color: "#8b5cf6" },
                { name: "Missing Heartbeat", value: missingHeartbeatCount, color: "#f59e0b" },
                { name: "Inactive > 10m", value: inactiveCount, color: "#ef4444" },
                { name: "Logged Out", value: loggedOutEmployees, color: "#94a3b8" },
            ];

            const meetingStats = {
                pending: pendingMeetingApprovals,
                approved: approvedMeetingsCount,
                rejected: rejectedMeetingsCount,
                draft: draftMeetingsCount,
                total: totalMeetingsCount,
            };

            return res.json({
                isAdmin: true,
                totalEmployees,
                loggedInEmployees,
                activeEmployees: activeCount,
                onBreakEmployees: onBreakCount,
                inactiveEmployees: inactiveCount,
                missingHeartbeatEmployees: missingHeartbeatCount,
                loggedOutEmployees,
                todayAttendance: {
                    total: todayAttendanceCount,
                    present: presentCount,
                    late: lateCount,
                    halfDay: halfDayCount,
                },
                fieldMeetings: {
                    todayTotal: todayMeetingsTotal,
                    todayCompleted: todayMeetingsCompleted,
                    pendingApprovals: pendingMeetingApprovals,
                },
                pendingCorrections,
                activeAlertsCount: activeAlerts.length,
                activeAlerts,
                recentSessions,
                last7Days,
                sessionDistribution,
                meetingStats,
            });
        }

        // ==========================================
        // 2. EMPLOYEE PANEL DASHBOARD METRICS
        // ==========================================
        const sessionId = req.headers["x-session-id"] || req.query.sessionId;

        // Run all employee queries concurrently
        const [
            myTodayAttendance,
            myCurrentSession,
            myTodayMeetings,
            myPendingMeetings,
            myApprovedMeetings,
            myRejectedMeetings,
            myRecentMeetings,
            myLast7Attendance
        ] = await Promise.all([
            Attendance.findOne({
                user: req.user._id,
                date: today,
            }).lean(),
            sessionId
                ? LoginSession.findOne({
                      sessionId,
                      user: req.user._id,
                      isActive: true,
                  }).lean()
                : LoginSession.findOne({
                      user: req.user._id,
                      isActive: true,
                  }).sort({ loginTime: -1 }).lean(),
            FieldMeeting.countDocuments({
                employee: req.user._id,
                scheduledDate: today,
            }),
            FieldMeeting.countDocuments({
                employee: req.user._id,
                approvalStatus: "Pending_Approval",
            }),
            FieldMeeting.countDocuments({
                employee: req.user._id,
                approvalStatus: "Approved",
            }),
            FieldMeeting.countDocuments({
                employee: req.user._id,
                approvalStatus: "Rejected",
            }),
            FieldMeeting.find({ employee: req.user._id })
                .populate("verification", "-otpHash")
                .populate("evidence")
                .sort({ scheduledDate: -1, createdAt: -1 })
                .limit(5)
                .lean(),
            Attendance.find({
                user: req.user._id,
                date: { $in: last7Dates },
            }).select("date workDuration").lean(),
        ]);

        // Personal 7-day Attendance Trend in memory
        const attMap = {};
        for (let i = 0; i < myLast7Attendance.length; i++) {
            attMap[myLast7Attendance[i].date] = myLast7Attendance[i];
        }

        const myLast7Days = last7Dates.map((date, idx) => {
            const att = attMap[date];
            return {
                day: dayNames[idx],
                date,
                attended: att ? 1 : 0,
                durationHours: att?.workDuration ? (att.workDuration / 60).toFixed(1) : 0,
            };
        });

        return res.json({
            isAdmin: false,
            todayAttendance: myTodayAttendance || null,
            currentSession: myCurrentSession
                ? {
                      sessionId: myCurrentSession.sessionId,
                      loginTime: myCurrentSession.loginTime,
                      lastHeartbeat: myCurrentSession.lastHeartbeat,
                      lastInteraction: myCurrentSession.lastInteraction,
                      sessionStatus: myCurrentSession.sessionStatus,
                      durationMinutes: myCurrentSession.durationMinutes,
                      deviceInfo: myCurrentSession.deviceInfo,
                  }
                : null,
            fieldMeetings: {
                todayTotal: myTodayMeetings,
                pendingApprovals: myPendingMeetings,
                approved: myApprovedMeetings,
                rejected: myRejectedMeetings,
                recent: myRecentMeetings,
            },
            chartData: myLast7Days,
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getStats };
