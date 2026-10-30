const Announcement = require("../models/Announcement");
const { broadcastNotification } = require("../utils/notificationHelper");

// @desc    Create new announcement
// @route   POST /api/announcements
// @access  Private/Admin or Manager
const createAnnouncement = async (req, res) => {
    try {
        const { title, content, priority, expiresAt } = req.body;
        const announcement = await Announcement.create({
            title,
            content,
            priority,
            expiresAt,
            author: req.user._id
        });

        // Broadcast notification to all users
        broadcastNotification(
            `📢 Announcement: ${title}`,
            priority === "Urgent" ? "error" : "info"
        );

        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all active announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res) => {
    try {
        const now = new Date();
        const announcements = await Announcement.find({
            isVisible: true,
            expiresAt: { $gt: now }
        })
            .populate("author", "name designation")
            .sort({ createdAt: -1 });

        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private/Admin or Manager
const updateAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found" });
        }

        Object.assign(announcement, req.body);
        const updatedAnnouncement = await announcement.save();
        res.json(updatedAnnouncement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete/Hide announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin or Manager
const deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found" });
        }

        announcement.isVisible = false;
        await announcement.save();
        res.json({ message: "Announcement removed" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createAnnouncement,
    getAnnouncements,
    updateAnnouncement,
    deleteAnnouncement
};
