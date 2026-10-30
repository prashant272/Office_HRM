const User = require("../models/User");
const Attendance = require("../models/Attendance");
const LoginSession = require("../models/LoginSession");
const ActivityAlert = require("../models/ActivityAlert");
const FieldMeeting = require("../models/FieldMeeting");
const Task = require("../models/Task");
const Leave = require("../models/Leave");
const Department = require("../models/Department");
const moment = require("moment");

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getStats = async (req, res) => {
    try {
        const today = moment().format("YYYY-MM-DD");

        // ==========================================
        // 1. ADMIN PANEL DASHBOARD METRICS
        // ==========================================
        if (req.user.role === "admin" || req.user.role === "manager") {
            const totalEmployees = await User.countDocuments({ role: "employee", status: "active" });

            // Find all active sessions
            const activeSessions = await LoginSession.find({
                isActive: true,
                logoutTime: null,
            }).populate("user", "name email department designation role");

            // Filter unique active user IDs
            const loggedInUserIds = new Set(activeSessions.map((s) => s.user?._id?.toString()).filter(Boolean));
            const loggedInEmployees = loggedInUserIds.size;

            const activeCount = activeSessions.filter((s) => s.sessionStatus === "active").length;
            const inactiveCount = activeSessions.filter((s) => s.sessionStatus === "inactive").length;
            const missingHeartbeatCount = activeSessions.filter((s) => s.sessionStatus === "heartbeat_missing").length;
            const loggedOutEmployees = Math.max(0, totalEmployees - loggedInEmployees);

            // Today's Attendance
            const todayAttendanceCount = await Attendance.countDocuments({ date: today });
            const presentCount = await Attendance.countDocuments({ date: today, status: "Present" });
            const lateCount = await Attendance.countDocuments({ date: today, status: "Late" });
            const halfDayCount = await Attendance.countDocuments({ date: today, status: "Half-Day" });

            // Today's Field Meetings
            const todayMeetingsTotal = await FieldMeeting.countDocuments({ scheduledDate: today });
            const todayMeetingsCompleted = await FieldMeeting.countDocuments({
                scheduledDate: today,
                status: "Completed",
            });
            const pendingMeetingApprovals = await FieldMeeting.countDocuments({
                approvalStatus: "Pending_Approval",
            });

            // Pending attendance correction requests
            const pendingCorrections = await Attendance.countDocuments({
                "correctionRequest.status": "Pending",
            });

            // Real-time Inactivity Alerts
            const activeAlerts = await ActivityAlert.find({ status: "active" })
                .populate({
                    path: "user",
                    select: "name email employeeId department designation",
                    populate: { path: "department", select: "name" },
                })
                .sort({ alertTime: -1 })
                .limit(10);

            // Recent Sessions Activity
            const recentSessions = await LoginSession.find()
                .populate({
                    path: "user",
                    select: "name email employeeId department designation",
                    populate: { path: "department", select: "name" },
                })
                .sort({ updatedAt: -1, loginTime: -1 })
                .limit(8);

            // 7-day Attendance and Field Meetings Trend
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const date = moment().subtract(i, "days").format("YYYY-MM-DD");
                const dayName = moment().subtract(i, "days").format("ddd");

                const dayAtt = await Attendance.countDocuments({ date });
                const dayMeetings = await FieldMeeting.countDocuments({ scheduledDate: date });
                const dayCompletedMeetings = await FieldMeeting.countDocuments({
                    scheduledDate: date,
                    status: "Completed",
                });

                last7Days.push({
                    day: dayName,
                    date,
                    attendance: dayAtt,
                    meetings: dayMeetings,
                    completedMeetings: dayCompletedMeetings,
                });
            }

            // Session Status Distribution (Pie Chart)
            const sessionDistribution = [
                { name: "Active Now", value: activeCount, color: "#10b981" },
                { name: "Missing Heartbeat", value: missingHeartbeatCount, color: "#f59e0b" },
                { name: "Inactive > 10m", value: inactiveCount, color: "#ef4444" },
                { name: "Logged Out", value: loggedOutEmployees, color: "#94a3b8" },
            ];

            // Field Meetings by Approval Status
            const approvedMeetingsCount = await FieldMeeting.countDocuments({ approvalStatus: "Approved" });
            const rejectedMeetingsCount = await FieldMeeting.countDocuments({ approvalStatus: "Rejected" });
            const draftMeetingsCount = await FieldMeeting.countDocuments({ approvalStatus: "Draft" });

            const meetingStats = {
                pending: pendingMeetingApprovals,
                approved: approvedMeetingsCount,
                rejected: rejectedMeetingsCount,
                draft: draftMeetingsCount,
                total: await FieldMeeting.countDocuments(),
            };

            return res.json({
                isAdmin: true,
                totalEmployees,
                loggedInEmployees,
                activeEmployees: activeCount,
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
        const myTodayAttendance = await Attendance.findOne({
            user: req.user._id,
            date: today,
        });

        // Find employee's current active session
        const sessionId = req.headers["x-session-id"] || req.query.sessionId;
        let myCurrentSession = null;
        if (sessionId) {
            myCurrentSession = await LoginSession.findOne({
                sessionId,
                user: req.user._id,
                isActive: true,
            });
        }
        if (!myCurrentSession) {
            myCurrentSession = await LoginSession.findOne({
                user: req.user._id,
                isActive: true,
            }).sort({ loginTime: -1 });
        }

        // Employee's Field Meetings
        const myTodayMeetings = await FieldMeeting.countDocuments({
            employee: req.user._id,
            scheduledDate: today,
        });
        const myPendingMeetings = await FieldMeeting.countDocuments({
            employee: req.user._id,
            approvalStatus: "Pending_Approval",
        });
        const myApprovedMeetings = await FieldMeeting.countDocuments({
            employee: req.user._id,
            approvalStatus: "Approved",
        });
        const myRejectedMeetings = await FieldMeeting.countDocuments({
            employee: req.user._id,
            approvalStatus: "Rejected",
        });

        const myRecentMeetings = await FieldMeeting.find({ employee: req.user._id })
            .populate("verification", "-otpHash")
            .populate("evidence")
            .sort({ scheduledDate: -1, createdAt: -1 })
            .limit(5);

        // Personal 7-day Attendance Trend
        const myLast7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = moment().subtract(i, "days").format("YYYY-MM-DD");
            const dayName = moment().subtract(i, "days").format("ddd");
            const att = await Attendance.findOne({ user: req.user._id, date });

            myLast7Days.push({
                day: dayName,
                date,
                attended: att ? 1 : 0,
                durationHours: att?.workDuration ? (att.workDuration / 60).toFixed(1) : 0,
            });
        }

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
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getStats };
