const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const FieldMeeting = require("../models/FieldMeeting");
const MeetingVerification = require("../models/MeetingVerification");
const MeetingEvidence = require("../models/MeetingEvidence");
const SystemSettings = require("../models/SystemSettings");
const AuditLog = require("../models/AuditLog");
const { uploadDir } = require("../utils/uploadMiddleware");
const socket = require("../socket");
const { sendWhatsAppOTP, sendEmailOTP } = require("../utils/notificationService");
const { uploadBase64ToR2, uploadLocalFileToR2 } = require("../utils/r2Service");

// Helper to save base64 image if uploaded as data URL from camera
const saveBase64Image = (dataString, prefix) => {
    if (!dataString || !dataString.startsWith("data:image")) return "";
    const matches = dataString.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return "";

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/evidence/${filename}`;
};

// @desc    Create a new field meeting (Employee or Admin)
// @route   POST /api/field-meetings
// @access  Private
const createMeeting = async (req, res) => {
    const {
        title,
        meetingType,
        clientName,
        clientCompany,
        clientPhone,
        clientEmail,
        location,
        scheduledDate,
        scheduledStartTime,
    } = req.body;

    try {
        if (!clientName || !clientCompany || !clientPhone) {
            return res.status(400).json({ message: "Client name, company, and phone are mandatory" });
        }

        const today = moment().format("YYYY-MM-DD");
        const meeting = await FieldMeeting.create({
            title: title || `Client Meeting with ${clientName} (${clientCompany})`,
            employee: req.user._id,
            meetingType: meetingType || "scheduled",
            clientName,
            clientCompany,
            clientPhone,
            clientEmail: clientEmail || "",
            location: location || { address: "On-site / Client Office", lat: 0, lng: 0 },
            scheduledDate: scheduledDate || today,
            scheduledStartTime: scheduledStartTime || moment().format("HH:mm"),
            status: meetingType === "walkin" ? "Ongoing" : "Scheduled",
            actualStartTime: meetingType === "walkin" ? new Date() : undefined,
            approvalStatus: "Draft",
        });

        // Initialize verification record
        const verification = await MeetingVerification.create({
            meeting: meeting._id,
            clientPhone,
        });

        // Initialize evidence record
        const evidence = await MeetingEvidence.create({
            meeting: meeting._id,
            locationSnapshot: location || { address: "On-site" },
        });

        meeting.verification = verification._id;
        meeting.evidence = evidence._id;
        await meeting.save();

        res.status(201).json(meeting);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send OTP to client mobile
// @route   POST /api/field-meetings/:id/send-otp
// @access  Private
const sendMeetingOtp = async (req, res) => {
    try {
        const meeting = await FieldMeeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        let verification = await MeetingVerification.findOne({ meeting: meeting._id });
        if (!verification) {
            verification = await MeetingVerification.create({
                meeting: meeting._id,
                clientPhone: meeting.clientPhone,
            });
            meeting.verification = verification._id;
            await meeting.save();
        }

        // Check max resend limits
        if (verification.resendCount >= 5) {
            return res.status(429).json({
                message: "Maximum OTP resend limit reached. Please request admin verification override.",
            });
        }

        // Generate 6 digit numeric OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        // Securely hash OTP before saving (never plaintext!)
        const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

        const expiryMinutes = 5;
        verification.otpHash = otpHash;
        verification.otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
        verification.resendCount = (verification.resendCount || 0) + 1;
        verification.attempts = 0; // reset attempts for new OTP
        await verification.save();

        // If meeting was scheduled, mark as ongoing when verification starts
        if (meeting.status === "Scheduled") {
            meeting.status = "Ongoing";
            meeting.actualStartTime = new Date();
            await meeting.save();
        }

        // Send real WhatsApp and Email notifications concurrently
        const notificationPromises = [
            sendWhatsAppOTP({ mobile: meeting.clientPhone, otp }),
        ];

        if (meeting.clientEmail) {
            notificationPromises.push(
                sendEmailOTP({
                    email: meeting.clientEmail,
                    otp,
                    clientName: meeting.clientName,
                    meetingTitle: meeting.title || "Field Sales Meeting",
                })
            );
        }

        // Fire notifications concurrently
        Promise.allSettled(notificationPromises).then((results) => {
            const waRes = results[0]?.status === "fulfilled" ? results[0].value : null;
            const emailRes = results[1]?.status === "fulfilled" ? results[1].value : null;
            console.log(`📱 [Wabridge WhatsApp] Target: ${meeting.clientPhone} -> Result:`, waRes?.success ? "SUCCESS" : waRes?.error);
            if (meeting.clientEmail) {
                console.log(`✉️ [Gmail SMTP] Target: ${meeting.clientEmail} -> Result:`, emailRes?.success ? "SUCCESS" : emailRes?.error);
            }
        });

        res.json({
            message: `OTP sent successfully to ${meeting.clientPhone}. Valid for ${expiryMinutes} minutes.`,
            expiresAt: verification.otpExpiresAt,
            attemptsRemaining: verification.maxAttempts,
            resendCount: verification.resendCount,
            // For testing & evaluation convenience in development mode, provide simulated OTP
            devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Client OTP
// @route   POST /api/field-meetings/:id/verify-otp
// @access  Private
const verifyMeetingOtp = async (req, res) => {
    const { otp } = req.body;

    if (!otp) {
        return res.status(400).json({ message: "OTP is required" });
    }

    try {
        const meeting = await FieldMeeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        const verification = await MeetingVerification.findOne({ meeting: meeting._id });
        if (!verification || !verification.otpHash) {
            return res.status(400).json({ message: "No active OTP request found. Please send OTP first." });
        }

        if (verification.isVerified) {
            return res.json({ message: "Meeting is already verified!", isVerified: true });
        }

        if (new Date() > new Date(verification.otpExpiresAt)) {
            return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
        }

        if (verification.attempts >= verification.maxAttempts) {
            return res.status(400).json({
                message: "Maximum OTP attempts exceeded. Please request a new OTP or request admin override.",
            });
        }

        const hashedInput = crypto.createHash("sha256").update(otp.trim()).digest("hex");

        if (hashedInput === verification.otpHash) {
            verification.isVerified = true;
            verification.verifiedAt = new Date();
            verification.verificationMethod = "sms_otp";
            verification.otpHash = undefined; // Clear hash upon successful verification
            await verification.save();

            return res.json({
                success: true,
                message: "✅ Client mobile OTP successfully verified!",
                isVerified: true,
                verifiedAt: verification.verifiedAt,
            });
        } else {
            verification.attempts += 1;
            await verification.save();
            const remaining = verification.maxAttempts - verification.attempts;
            return res.status(400).json({
                message: `Invalid OTP. ${remaining} attempt(s) remaining.`,
                attemptsRemaining: remaining,
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Request Verification Override (Client cannot receive SMS)
// @route   POST /api/field-meetings/:id/request-bypass
// @access  Private
const requestVerificationBypass = async (req, res) => {
    const { reason } = req.body;

    if (!reason) {
        return res.status(400).json({ message: "Reason for bypass is required" });
    }

    try {
        const meeting = await FieldMeeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        let verification = await MeetingVerification.findOne({ meeting: meeting._id });
        if (!verification) {
            verification = new MeetingVerification({ meeting: meeting._id, clientPhone: meeting.clientPhone });
        }

        verification.bypassRequested = true;
        verification.bypassReason = reason;
        verification.verificationMethod = "admin_manual_override";
        await verification.save();

        res.json({
            message: "Alternative verification requested. Meeting will require admin review.",
            verification,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload Meeting Evidence (Selfie and/or Business Card)
// @route   POST /api/field-meetings/:id/evidence
// @access  Private
const uploadMeetingEvidence = async (req, res) => {
    try {
        const meeting = await FieldMeeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        let evidence = await MeetingEvidence.findOne({ meeting: meeting._id });
        if (!evidence) {
            evidence = new MeetingEvidence({ meeting: meeting._id });
        }

        const now = new Date();

        // 1. Check for files uploaded via multipart/form-data
        if (req.files) {
            if (req.files.selfie && req.files.selfie[0]) {
                const r2Url = await uploadLocalFileToR2(
                    req.files.selfie[0].path,
                    req.files.selfie[0].originalname,
                    req.files.selfie[0].mimetype
                );
                evidence.selfieUrl = r2Url || `/uploads/evidence/${req.files.selfie[0].filename}`;
                evidence.selfieCapturedAt = now;
            }
            if (req.files.businessCard && req.files.businessCard[0]) {
                const r2Url = await uploadLocalFileToR2(
                    req.files.businessCard[0].path,
                    req.files.businessCard[0].originalname,
                    req.files.businessCard[0].mimetype
                );
                evidence.businessCardUrl = r2Url || `/uploads/evidence/${req.files.businessCard[0].filename}`;
                evidence.businessCardUploadedAt = now;
            }
        }

        // 2. Check for base64 data URLs (live camera snapshot)
        if (req.body.selfieBase64) {
            const r2Url = await uploadBase64ToR2(req.body.selfieBase64, "selfie");
            const savedUrl = r2Url || saveBase64Image(req.body.selfieBase64, "selfie");
            if (savedUrl) {
                evidence.selfieUrl = savedUrl;
                evidence.selfieCapturedAt = now;
            }
        }

        if (req.body.businessCardBase64) {
            const r2Url = await uploadBase64ToR2(req.body.businessCardBase64, "card");
            const savedUrl = r2Url || saveBase64Image(req.body.businessCardBase64, "card");
            if (savedUrl) {
                evidence.businessCardUrl = savedUrl;
                evidence.businessCardUploadedAt = now;
            }
        }

        if (req.body.location) {
            try {
                const loc = typeof req.body.location === "string" ? JSON.parse(req.body.location) : req.body.location;
                evidence.locationSnapshot = loc;
            } catch (e) {
                // ignore json error
            }
        }

        await evidence.save();

        res.json({
            message: "Evidence uploaded successfully",
            evidence,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Complete Meeting & Submit for Admin Review
// @route   POST /api/field-meetings/:id/complete
// @access  Private
const completeMeeting = async (req, res) => {
    const { meetingNotes, discussionSummary, outcomes, followUpDate } = req.body;

    try {
        const meeting = await FieldMeeting.findById(req.params.id);
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        const verification = await MeetingVerification.findOne({ meeting: meeting._id });
        const evidence = await MeetingEvidence.findOne({ meeting: meeting._id });

        // Policy validation check:
        const isVerifiedOrBypass = verification && (verification.isVerified || verification.bypassRequested);
        if (!isVerifiedOrBypass) {
            return res.status(400).json({
                message: "Meeting verification is incomplete. Please verify client OTP or submit an override request.",
            });
        }

        meeting.meetingNotes = meetingNotes || "";
        meeting.discussionSummary = discussionSummary || "";
        meeting.outcomes = outcomes || "";
        if (followUpDate) meeting.followUpDate = new Date(followUpDate);

        meeting.status = "Completed";
        meeting.actualEndTime = new Date();
        meeting.approvalStatus = "Pending_Approval";
        await meeting.save();

        // Emit socket notification to Admin
        try {
            const io = socket.getIO();
            io.emit("meeting-submitted", {
                meetingId: meeting._id,
                title: meeting.title,
                employeeName: req.user.name,
                clientName: meeting.clientName,
                clientCompany: meeting.clientCompany,
                approvalStatus: "Pending_Approval",
                submittedAt: new Date(),
            });
        } catch (e) {
            // socket error
        }

        res.json({
            message: "Meeting completed and submitted for Admin approval successfully!",
            meeting,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged in employee's meetings
// @route   GET /api/field-meetings/my
// @access  Private (Employee)
const getMyMeetings = async (req, res) => {
    try {
        const { status, approvalStatus, date } = req.query;
        let query = { employee: req.user._id };

        if (status && status !== "All") query.status = status;
        if (approvalStatus && approvalStatus !== "All") query.approvalStatus = approvalStatus;
        if (date) query.scheduledDate = date;

        const meetings = await FieldMeeting.find(query)
            .populate({
                path: "verification",
                select: "-otpHash", // NEVER expose raw or hashed OTP!
            })
            .populate("evidence")
            .populate("reviewedBy", "name email")
            .sort({ scheduledDate: -1, createdAt: -1 });

        res.json(meetings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all meetings for Admin
// @route   GET /api/field-meetings
// @access  Private/Admin
const getAllMeetings = async (req, res) => {
    try {
        const { employee, status, approvalStatus, date, startDate, endDate, client } = req.query;
        let query = {};

        if (employee) query.employee = employee;
        if (status && status !== "All") query.status = status;
        if (approvalStatus && approvalStatus !== "All") query.approvalStatus = approvalStatus;
        if (date) query.scheduledDate = date;
        if (startDate && endDate) query.scheduledDate = { $gte: startDate, $lte: endDate };
        if (client) {
            query.$or = [
                { clientName: new RegExp(client, "i") },
                { clientCompany: new RegExp(client, "i") },
            ];
        }

        const meetings = await FieldMeeting.find(query)
            .populate("employee", "name email employeeId department designation")
            .populate({
                path: "verification",
                select: "-otpHash", // Never expose OTP
            })
            .populate("evidence")
            .populate("reviewedBy", "name email")
            .sort({ scheduledDate: -1, createdAt: -1 });

        res.json(meetings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Review Field Meeting: Approve or Reject (Admin only)
// @route   PUT /api/field-meetings/:id/review
// @access  Private/Admin
const reviewMeeting = async (req, res) => {
    const { approvalStatus, adminReviewNotes } = req.body;

    if (!["Approved", "Rejected"].includes(approvalStatus)) {
        return res.status(400).json({ message: "Approval status must be either Approved or Rejected" });
    }

    if (approvalStatus === "Rejected" && !adminReviewNotes) {
        return res.status(400).json({ message: "Reason is required when rejecting a meeting." });
    }

    try {
        const meeting = await FieldMeeting.findById(req.params.id).populate("employee", "name email");
        if (!meeting) return res.status(404).json({ message: "Meeting not found" });

        meeting.approvalStatus = approvalStatus;
        meeting.adminReviewNotes = adminReviewNotes || "";
        meeting.reviewedBy = req.user._id;
        meeting.reviewedAt = new Date();
        await meeting.save();

        // If bypass was requested and admin approved, mark verification as confirmed
        const verification = await MeetingVerification.findOne({ meeting: meeting._id });
        if (verification && verification.bypassRequested && approvalStatus === "Approved") {
            verification.isVerified = true;
            verification.verifiedAt = new Date();
            verification.bypassApprovedBy = req.user._id;
            await verification.save();
        }

        // Record Audit Log
        await AuditLog.create({
            user: req.user._id,
            action: `MEETING_${approvalStatus.toUpperCase()}`,
            targetEntity: "FieldMeeting",
            targetId: meeting._id.toString(),
            details: {
                clientName: meeting.clientName,
                approvalStatus,
                adminReviewNotes,
            },
            ipAddress: req.ip || "127.0.0.1",
        });

        // Notify Employee via Socket
        try {
            const io = socket.getIO();
            io.emit("meeting-review-update", {
                meetingId: meeting._id,
                employeeId: meeting.employee._id,
                approvalStatus,
                adminReviewNotes,
            });
        } catch (e) {
            // socket error
        }

        res.json({
            message: `Meeting ${approvalStatus.toLowerCase()} successfully!`,
            meeting,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export meetings to CSV (Admin only)
// @route   GET /api/field-meetings/export/csv
// @access  Private/Admin
const exportMeetingsCSV = async (req, res) => {
    try {
        const meetings = await FieldMeeting.find()
            .populate("employee", "name email employeeId department designation")
            .populate("verification", "-otpHash")
            .populate("reviewedBy", "name")
            .sort({ scheduledDate: -1 });

        let csv = "Meeting ID,Employee Name,Employee ID,Client Name,Client Company,Client Phone,Location,Date,Start Time (IST),End Time (IST),Status,Approval Status,OTP Verified,Review Notes\n";

        meetings.forEach((m) => {
            const id = m._id;
            const empName = `"${m.employee?.name || 'Unknown'}"`;
            const empId = m.employee?.employeeId || "N/A";
            const client = `"${m.clientName}"`;
            const company = `"${m.clientCompany}"`;
            const phone = m.clientPhone;
            const loc = `"${m.location?.address || 'N/A'}"`;
            const date = m.scheduledDate;
            const startIST = m.actualStartTime ? moment(m.actualStartTime).utcOffset("+05:30").format("hh:mm A") : "N/A";
            const endIST = m.actualEndTime ? moment(m.actualEndTime).utcOffset("+05:30").format("hh:mm A") : "N/A";
            const status = m.status;
            const approval = m.approvalStatus;
            const verified = m.verification?.isVerified ? "Yes" : (m.verification?.bypassRequested ? "Bypass Requested" : "No");
            const notes = `"${(m.adminReviewNotes || '').replace(/"/g, '""')}"`;

            csv += `${id},${empName},${empId},${client},${company},${phone},${loc},${date},${startIST},${endIST},${status},${approval},${verified},${notes}\n`;
        });

        res.header("Content-Type", "text/csv");
        res.attachment(`field_meetings_report_${moment().format("YYYYMMDD_HHmmss")}.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createMeeting,
    sendMeetingOtp,
    verifyMeetingOtp,
    requestVerificationBypass,
    uploadMeetingEvidence,
    completeMeeting,
    getMyMeetings,
    getAllMeetings,
    reviewMeeting,
    exportMeetingsCSV,
};
