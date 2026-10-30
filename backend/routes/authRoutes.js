const express = require("express");
const router = express.Router();
const {
    registerUser,
    authUser,
    logoutUser,
    getSessionStatus,
    getUserProfile,
    updateUserProfile,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", authUser);
router.post("/logout", protect, logoutUser);
router.get("/session/status", protect, getSessionStatus);
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);

module.exports = router;
