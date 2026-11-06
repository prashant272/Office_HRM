const express = require("express");
const router = express.Router();
const {
    postHeartbeat,
    checkIn,
    checkOut,
    resumeShift,
    toggleBreak,
    getBreakStatus,
    getMyAttendance,
    getAllAttendance,
    getAllSessions,
    requestCorrection,
    getCorrections,
    reviewCorrection,
    exportAttendanceCSV,
    forceSignoutAll,
    resetEmployeeTodayAttendance,
    adminUpdateAttendance,
} = require("../controllers/attendanceController");
const { protect, admin } = require("../middleware/authMiddleware");

// Employee & Common Routes
router.post("/heartbeat", protect, postHeartbeat);
router.post("/checkin", protect, checkIn);
router.post("/checkout", protect, checkOut);
router.post("/resume-shift", protect, resumeShift);
router.post("/break", protect, toggleBreak);
router.get("/break/status", protect, getBreakStatus);
router.get("/my", protect, getMyAttendance);
router.post("/correction", protect, requestCorrection);

// Admin-only Routes
router.post("/reset-today/:identifier", protect, admin, resetEmployeeTodayAttendance);
router.delete("/reset-today/:identifier", protect, admin, resetEmployeeTodayAttendance);
router.put("/:id", protect, admin, adminUpdateAttendance);
router.post("/signout-all", protect, admin, forceSignoutAll);
router.get("/", protect, admin, getAllAttendance);
router.get("/sessions", protect, admin, getAllSessions);
router.get("/corrections", protect, admin, getCorrections);
router.put("/corrections/:id", protect, admin, reviewCorrection);
router.get("/export/csv", protect, admin, exportAttendanceCSV);

module.exports = router;
