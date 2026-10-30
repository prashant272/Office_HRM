const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/fieldMeetingController");
const { protect, admin } = require("../middleware/authMiddleware");
const { uploadEvidence } = require("../utils/uploadMiddleware");

// Common & Employee Routes
router.post("/", protect, createMeeting);
router.get("/my", protect, getMyMeetings);
router.post("/:id/send-otp", protect, sendMeetingOtp);
router.post("/:id/verify-otp", protect, verifyMeetingOtp);
router.post("/:id/request-bypass", protect, requestVerificationBypass);
router.post(
    "/:id/evidence",
    protect,
    uploadEvidence.fields([
        { name: "selfie", maxCount: 1 },
        { name: "businessCard", maxCount: 1 },
    ]),
    uploadMeetingEvidence
);
router.post("/:id/complete", protect, completeMeeting);

// Admin-only Routes
router.get("/", protect, admin, getAllMeetings);
router.put("/:id/review", protect, admin, reviewMeeting);
router.get("/export/csv", protect, admin, exportMeetingsCSV);

module.exports = router;
