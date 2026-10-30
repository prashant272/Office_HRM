const mongoose = require("mongoose");

const productivitySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        month: {
            type: String, // YYYY-MM
            required: true
        },
        taskScore: { type: Number, default: 0 },      // 0-40 based on completion%
        deadlineScore: { type: Number, default: 0 },  // 0-30 based on on-time completion
        attendanceScore: { type: Number, default: 0 },// 0-30 based on punctual days
        totalRating: { type: Number, default: 0 },    // Weighted sum (0-100)
        feedback: { type: String, default: "Analysis pending..." }
    },
    { timestamps: true }
);

// Compound index for unique monthly entry per user
productivitySchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Productivity", productivitySchema);
