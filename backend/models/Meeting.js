const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        agenda: {
            type: String,
            required: true
        },
        room: {
            type: String,
            enum: ["Conference Room A", "Brainstorming Zone", "Main Hall", "Virtual Sync"],
            required: true
        },
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: true
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        meetingLink: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["Scheduled", "Ongoing", "Completed", "Cancelled"],
            default: "Scheduled"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Meeting", meetingSchema);
