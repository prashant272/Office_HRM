const mongoose = require("mongoose");

const meetingVerificationSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FieldMeeting",
            required: true,
            unique: true,
            index: true,
        },
        clientPhone: {
            type: String,
            required: true,
        },
        otpHash: {
            type: String,
            // Hashed OTP or null if bypass requested
        },
        otpExpiresAt: {
            type: Date,
        },
        attempts: {
            type: Number,
            default: 0,
        },
        maxAttempts: {
            type: Number,
            default: 3,
        },
        resendCount: {
            type: Number,
            default: 0,
        },
        isVerified: {
            type: Boolean,
            default: false,
            index: true,
        },
        verifiedAt: {
            type: Date,
        },
        verificationMethod: {
            type: String,
            enum: ["sms_otp", "admin_manual_override", "unverified"],
            default: "unverified",
        },
        bypassRequested: {
            type: Boolean,
            default: false,
        },
        bypassReason: {
            type: String,
            default: "",
        },
        bypassApprovedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("MeetingVerification", meetingVerificationSchema);
