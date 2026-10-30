const SystemSettings = require("../models/SystemSettings");
const AuditLog = require("../models/AuditLog");

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create({});
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = new SystemSettings({});
        }

        const {
            inactivityThresholdMinutes,
            heartbeatIntervalSeconds,
            otpExpiryMinutes,
            maxOtpAttempts,
            workingSchedule,
            attendancePolicy,
        } = req.body;

        if (inactivityThresholdMinutes !== undefined) {
            settings.inactivityThresholdMinutes = Number(inactivityThresholdMinutes);
        }
        if (heartbeatIntervalSeconds !== undefined) {
            settings.heartbeatIntervalSeconds = Number(heartbeatIntervalSeconds);
        }
        if (otpExpiryMinutes !== undefined) {
            settings.otpExpiryMinutes = Number(otpExpiryMinutes);
        }
        if (maxOtpAttempts !== undefined) {
            settings.maxOtpAttempts = Number(maxOtpAttempts);
        }
        if (workingSchedule) {
            settings.workingSchedule = workingSchedule;
        }
        if (attendancePolicy) {
            settings.attendancePolicy = attendancePolicy;
        }

        settings.updatedBy = req.user._id;
        await settings.save();

        // Audit Log
        await AuditLog.create({
            user: req.user._id,
            action: "SYSTEM_SETTINGS_UPDATED",
            targetEntity: "SystemSettings",
            targetId: settings._id.toString(),
            details: req.body,
            ipAddress: req.ip || "127.0.0.1",
        });

        res.json({ message: "Settings updated successfully", settings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSettings,
    updateSettings,
};
