const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
        },
        clientName: {
            type: String,
        },
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        team: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        startDate: {
            type: Date,
            default: Date.now,
        },
        deadline: {
            type: Date,
        },
        status: {
            type: String,
            enum: ["Active", "Completed", "On Hold"],
            default: "Active",
        },
        progress: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);
