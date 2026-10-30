const express = require("express");
const router = express.Router();
const {
    analyzeUserProductivity,
    getUserProductivity
} = require("../controllers/productivityController");
const { protect, authorize, admin } = require("../middleware/authMiddleware");

router.post("/analyze/:userId", protect, authorize("admin", "manager"), analyzeUserProductivity);
router.get("/:userId", protect, getUserProductivity);

module.exports = router;
