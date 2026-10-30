const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        date: {
            type: String, // Format: YYYY-MM-DD for easy querying
            required: true,
            index: true,
        },
        checkIn: {
            type: Date,
        },
        checkOut: {
            type: Date,
        },
        status: {
            type: String,
            enum: ["Present", "Absent", "Late", "Half-Day"],
            default: "Present",
            index: true,
        },
        checkInLocation: {
            lat: Number,
            lng: Number,
            address: String,
        },
        checkOutLocation: {
            lat: Number,
            lng: Number,
            address: String,
        },
        workDuration: {
            type: Number, // in minutes
        },
        shift: {
            type: String,
            default: "General Shift (09:30 - 18:30)",
        },
        device: {
            type: String,
            default: "Web Browser",
        },
        sessions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "LoginSession",
            },
        ],
        correctionRequest: {
            requested: { type: Boolean, default: false },
            reason: { type: String, default: "" },
            proposedCheckIn: { type: Date },
            proposedCheckOut: { type: Date },
            status: {
                type: String,
                enum: ["None", "Pending", "Approved", "Rejected"],
                default: "None",
                index: true,
            },
            reviewedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
            reviewedAt: { type: Date },
            adminComment: { type: String, default: "" },
        },
    },
    { timestamps: true }
);

// Compound indexes for fast lookups
attendanceSchema.index({ user: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
