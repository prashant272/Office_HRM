const mongoose = require("mongoose");

const loginSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        loginTime: {
            type: Date,
            default: Date.now,
            required: true,
        },
        logoutTime: {
            type: Date,
        },
        lastHeartbeat: {
            type: Date,
            default: Date.now,
            index: true,
        },
        lastInteraction: {
            type: Date,
            default: Date.now,
        },
        interactionCount: {
            type: Number,
            default: 1,
        },
        sessionStatus: {
            type: String,
            enum: ["active", "heartbeat_missing", "inactive", "on_break", "logged_out"],
            default: "active",
            index: true,
        },
        currentBreak: {
            isOnBreak: { type: Boolean, default: false },
            breakType: { type: String, enum: ["lunch", "tea", "short", null], default: null },
            startTime: { type: Date },
        },
        breaks: [
            {
                breakType: { type: String, enum: ["lunch", "tea", "short"], default: "lunch" },
                startTime: { type: Date, required: true },
                endTime: { type: Date },
                durationMinutes: { type: Number, default: 0 },
            }
        ],
        totalBreakMinutes: {
            type: Number,
            default: 0,
        },
        lastInactiveFrom: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        logoutReason: {
            type: String,
            enum: ["explicit_logout", "inactivity_timeout", "admin_revoked", "session_expired", null],
            default: null,
        },
        deviceInfo: {
            browser: { type: String, default: "Unknown Browser" },
            os: { type: String, default: "Unknown OS" },
            ipAddress: { type: String, default: "127.0.0.1" },
            userAgent: { type: String, default: "" },
            screenResolution: { type: String, default: "" },
        },
        attendanceDate: {
            type: String, // YYYY-MM-DD
            index: true,
        },
        shift: {
            type: String,
            default: "General Shift (09:30 - 18:30)",
        },
        durationMinutes: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Calculate duration virtual or pre-save
loginSessionSchema.pre("save", function () {
    const end = this.logoutTime || this.lastHeartbeat || new Date();
    const diffMs = Math.max(0, new Date(end) - new Date(this.loginTime));
    this.durationMinutes = Math.round(diffMs / 60000);
});

module.exports = mongoose.model("LoginSession", loginSessionSchema);
