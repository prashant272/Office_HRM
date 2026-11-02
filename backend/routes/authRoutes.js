const express = require("express");
const router = express.Router();
const {
    registerUser,
    authUser,
    logoutUser,
    getSessionStatus,
    getUserProfile,
    updateUserProfile,
    impersonateEmployee,
} = require("../controllers/authController");
const { protect, admin } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", authUser);
router.post("/logout", protect, logoutUser);
router.post("/impersonate/:id", protect, admin, impersonateEmployee);
router.get("/session/status", protect, getSessionStatus);
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);

module.exports = router;
