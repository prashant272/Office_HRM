const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema(
    {
        inactivityThresholdMinutes: {
            type: Number,
            default: 10,
        },
        heartbeatIntervalSeconds: {
            type: Number,
            default: 45,
        },
        otpExpiryMinutes: {
            type: Number,
            default: 5,
        },
        maxOtpAttempts: {
            type: Number,
            default: 3,
        },
        workingSchedule: {
            shiftName: { type: String, default: "General Shift" },
            startTime: { type: String, default: "09:30" },
            endTime: { type: String, default: "18:30" },
        },
        attendancePolicy: {
            lateThresholdTime: { type: String, default: "10:15" },
            halfDayThresholdMinutes: { type: Number, default: 240 },
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SystemSettings", systemSettingsSchema);
