const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        content: {
            type: String,
            required: true
        },
        priority: {
            type: String,
            enum: ["Normal", "Urgent"],
            default: "Normal"
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        expiresAt: {
            type: Date,
            default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
        },
        isVisible: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
