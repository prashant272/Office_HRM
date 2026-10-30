const express = require("express");
const router = express.Router();
const {
    postHeartbeat,
    checkIn,
    checkOut,
    getMyAttendance,
    getAllAttendance,
    getAllSessions,
    requestCorrection,
    getCorrections,
    reviewCorrection,
    exportAttendanceCSV,
} = require("../controllers/attendanceController");
const { protect, admin } = require("../middleware/authMiddleware");

// Employee & Common Routes
router.post("/heartbeat", protect, postHeartbeat);
router.post("/checkin", protect, checkIn);
router.post("/checkout", protect, checkOut);
router.get("/my", protect, getMyAttendance);
router.post("/correction", protect, requestCorrection);

// Admin-only Routes
router.get("/", protect, admin, getAllAttendance);
router.get("/sessions", protect, admin, getAllSessions);
router.get("/corrections", protect, admin, getCorrections);
router.put("/corrections/:id", protect, admin, reviewCorrection);
router.get("/export/csv", protect, admin, exportAttendanceCSV);

module.exports = router;
