const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        sharedWith: {
            type: String,
            enum: ["All", "Department", "Specific"],
            default: "All",
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
        },
        type: {
            type: String,
            enum: ["Policy", "Report", "Personal", "Template"],
            default: "Report",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);
