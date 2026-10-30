const mongoose = require("mongoose");

const fieldMeetingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        meetingType: {
            type: String,
            enum: ["scheduled", "walkin"],
            default: "scheduled",
        },
        clientName: {
            type: String,
            required: true,
            trim: true,
        },
        clientCompany: {
            type: String,
            required: true,
            trim: true,
        },
        clientPhone: {
            type: String,
            required: true,
            trim: true,
        },
        clientEmail: {
            type: String,
            trim: true,
            default: "",
        },
        location: {
            address: { type: String, required: true },
            lat: { type: Number, default: 0 },
            lng: { type: Number, default: 0 },
        },
        scheduledDate: {
            type: String, // YYYY-MM-DD
            required: true,
            index: true,
        },
        scheduledStartTime: {
            type: String, // HH:mm
            default: "",
        },
        actualStartTime: {
            type: Date,
        },
        actualEndTime: {
            type: Date,
        },
        status: {
            type: String,
            enum: ["Scheduled", "Ongoing", "Completed", "Cancelled"],
            default: "Scheduled",
            index: true,
        },
        approvalStatus: {
            type: String,
            enum: ["Draft", "Pending_Approval", "Approved", "Rejected"],
            default: "Draft",
            index: true,
        },
        adminReviewNotes: {
            type: String,
            default: "",
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        reviewedAt: {
            type: Date,
        },
        meetingNotes: {
            type: String,
            default: "",
        },
        discussionSummary: {
            type: String,
            default: "",
        },
        outcomes: {
            type: String,
            default: "",
        },
        followUpDate: {
            type: Date,
        },
        verification: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MeetingVerification",
        },
        evidence: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MeetingEvidence",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("FieldMeeting", fieldMeetingSchema);
