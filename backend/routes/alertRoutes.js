const express = require("express");
const router = express.Router();
const {
    getActiveAlerts,
    getAlertHistory,
    acknowledgeAlert,
} = require("../controllers/alertController");
const { protect, admin } = require("../middleware/authMiddleware");

// All alert routes are Admin-only
router.get("/active", protect, admin, getActiveAlerts);
router.get("/history", protect, admin, getAlertHistory);
router.put("/:id/acknowledge", protect, admin, acknowledgeAlert);

module.exports = router;
