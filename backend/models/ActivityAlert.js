const mongoose = require("mongoose");

const activityAlertSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LoginSession",
            required: true,
            index: true,
        },
        sessionId: {
            type: String,
            required: true,
            index: true,
        },
        alertType: {
            type: String,
            enum: ["inactivity_timeout", "heartbeat_missing_prolonged", "tab_closed_extended"],
            default: "inactivity_timeout",
        },
        inactivityDurationMinutes: {
            type: Number,
            required: true,
            default: 10,
        },
        inactiveFrom: {
            type: Date,
        },
        inactiveTo: {
            type: Date,
        },
        lastHeartbeat: {
            type: Date,
            required: true,
        },
        lastInteraction: {
            type: Date,
            required: true,
        },
        alertTime: {
            type: Date,
            default: Date.now,
            index: true,
        },
        status: {
            type: String,
            enum: ["active", "resolved"],
            default: "active",
            index: true,
        },
        resolvedAt: {
            type: Date,
        },
        resolutionReason: {
            type: String,
            default: null,
        },
        acknowledged: {
            type: Boolean,
            default: false,
            index: true,
        },
        acknowledgedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        acknowledgedAt: {
            type: Date,
        },
        adminNotes: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ActivityAlert", activityAlertSchema);
