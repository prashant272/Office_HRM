const mongoose = require("mongoose");

const meetingEvidenceSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FieldMeeting",
            required: true,
            unique: true,
            index: true,
        },
        selfieUrl: {
            type: String,
            default: "",
        },
        selfieCapturedAt: {
            type: Date,
        },
        businessCardUrl: {
            type: String,
            default: "",
        },
        businessCardUploadedAt: {
            type: Date,
        },
        locationSnapshot: {
            address: { type: String, default: "" },
            lat: { type: Number, default: 0 },
            lng: { type: Number, default: 0 },
        },
        deviceMetadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("MeetingEvidence", meetingEvidenceSchema);
