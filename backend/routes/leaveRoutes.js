const express = require("express");
const router = express.Router();
const {
    applyLeave,
    getLeaves,
    updateLeaveStatus,
} = require("../controllers/leaveController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.route("/")
    .post(protect, applyLeave)
    .get(protect, getLeaves);

router.put("/:id/status", protect, authorize("admin", "manager", "employee"), updateLeaveStatus);

module.exports = router;
