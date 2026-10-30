const express = require("express");
const router = express.Router();
const {
    scheduleMeeting,
    getMeetings,
    updateMeetingStatus
} = require("../controllers/meetingController");
const { protect } = require("../middleware/authMiddleware");

router.route("/")
    .get(protect, getMeetings)
    .post(protect, scheduleMeeting);

router.route("/:id/status")
    .put(protect, updateMeetingStatus);

module.exports = router;
