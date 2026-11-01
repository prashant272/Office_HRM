const ActivityAlert = require("../models/ActivityAlert");
const AuditLog = require("../models/AuditLog");

// @desc    Get all active inactivity alerts (Admin only)
// @route   GET /api/alerts/active
// @access  Private/Admin
const getActiveAlerts = async (req, res) => {
    try {
        const moment = require("moment");
        const startOfDay = moment().startOf("day").toDate();

        const alerts = await ActivityAlert.find({
            status: "active",
            alertTime: { $gte: startOfDay }
        })
            .populate({
                path: "user",
                select: "name email employeeId department designation phone",
                populate: { path: "department", select: "name" },
            })
            .populate("session", "loginTime lastHeartbeat lastInteraction sessionStatus deviceInfo")
            .sort({ alertTime: -1 });

        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get full alert history (Admin only)
// @route   GET /api/alerts/history
// @access  Private/Admin
const getAlertHistory = async (req, res) => {
    try {
        const { status, employee } = req.query;
        let query = {};

        if (status && status !== "All") {
            query.status = status;
        }

        if (employee) {
            query.user = employee;
        }

        const alerts = await ActivityAlert.find(query)
            .populate({
                path: "user",
                select: "name email employeeId department designation",
                populate: { path: "department", select: "name" },
            })
            .populate("session")
            .populate("acknowledgedBy", "name email")
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(alerts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Acknowledge and add notes to an alert (Admin only)
// @route   PUT /api/alerts/:id/acknowledge
// @access  Private/Admin
const acknowledgeAlert = async (req, res) => {
    const { notes } = req.body;

    try {
        const alert = await ActivityAlert.findById(req.params.id);
        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }

        alert.acknowledged = true;
        alert.acknowledgedBy = req.user._id;
        alert.acknowledgedAt = new Date();
        if (notes) {
            alert.adminNotes = notes;
        }

        await alert.save();

        await AuditLog.create({
            user: req.user._id,
            action: "ALERT_ACKNOWLEDGED",
            targetEntity: "ActivityAlert",
            targetId: alert._id.toString(),
            details: { notes },
            ipAddress: req.ip || "127.0.0.1",
        });

        res.json({ message: "Alert acknowledged successfully", alert });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getActiveAlerts,
    getAlertHistory,
    acknowledgeAlert,
};
