const { getIO } = require("../socket");

/**
 * Emit a real-time notification to a specific user
 * @param {string} userId - ID of the user to notify
 * @param {string} message - Notification message
 * @param {string} type - Type of notification (info, success, warning, error)
 */
const sendNotification = (userId, message, type = "info") => {
    try {
        const io = getIO();
        io.to(userId.toString()).emit("notification", {
            message,
            type,
            timestamp: new Date()
        });
        console.log(`📡 Notification sent to ${userId}: ${message}`);
    } catch (error) {
        console.error("❌ Error sending notification:", error.message);
    }
};

/**
 * Broadcast notification to all users
 */
const broadcastNotification = (message, type = "info") => {
    try {
        const io = getIO();
        io.emit("notification", {
            message,
            type,
            timestamp: new Date()
        });
        console.log(`📡 Broadcast: ${message}`);
    } catch (error) {
        console.error("❌ Error broadcasting notification:", error.message);
    }
};

module.exports = {
    sendNotification,
    broadcastNotification
};
