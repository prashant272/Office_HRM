const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        month: {
            type: String, // e.g., "March 2026"
            required: true,
        },
        baseSalary: {
            type: Number,
            required: true,
        },
        overtimeHours: {
            type: Number,
            default: 0,
        },
        overtimePay: {
            type: Number,
            default: 0,
        },
        bonus: {
            type: Number,
            default: 0,
        },
        deductions: {
            type: Number,
            default: 0,
        },
        netSalary: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Paid"],
            default: "Pending",
        },
        paidAt: {
            type: Date,
        },
        attendanceSummary: {
            presentDays: Number,
            absentDays: Number,
            leavesTaken: Number,
        }
    },
    { timestamps: true }
);

// Prevent duplicate salary for same user and month
salarySchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Salary", salarySchema);
