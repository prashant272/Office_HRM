const LoginSession = require("../models/LoginSession");
const ActivityAlert = require("../models/ActivityAlert");
const SystemSettings = require("../models/SystemSettings");
const socket = require("../socket");

let monitorInterval = null;

// Get settings or default
const getInactivityThreshold = async () => {
    try {
        const settings = await SystemSettings.findOne();
        return settings?.inactivityThresholdMinutes || 10;
    } catch {
        return 10;
    }
};

/**
 * Background worker to check inactive / heartbeat-missing sessions
 */
const runInactivityCheck = async () => {
    try {
        const thresholdMinutes = await getInactivityThreshold();
        const now = Date.now();
        let io;
        try {
            io = socket.getIO();
        } catch {
            // Socket not yet initialized
            return;
        }

        // Active sessions that have not explicitly logged out
        const activeSessions = await LoginSession.find({
            isActive: true,
            logoutTime: null,
        }).populate("user", "name email role department designation");

        for (const session of activeSessions) {
            // IF EMPLOYEE IS CURRENTLY ON AN AUTHORIZED BREAK (Lunch / Tea / Short)
            if (session.currentBreak?.isOnBreak || session.sessionStatus === "on_break") {
                // Do not mark as inactive and do not create inactivity alerts during break
                continue;
            }

            const lastHbTime = session.lastHeartbeat ? session.lastHeartbeat.getTime() : session.loginTime.getTime();
            const diffMinutes = (now - lastHbTime) / 60000;

            if (diffMinutes >= thresholdMinutes) {
                // Inactive session: No heartbeat for >= threshold (default 10 mins)
                const previousStatus = session.sessionStatus;
                session.sessionStatus = "inactive";
                if (!session.lastInactiveFrom) {
                    session.lastInactiveFrom = session.lastHeartbeat || session.loginTime;
                }
                await session.save();

                // Prevent duplicate alerts for the same continuous inactivity period
                const existingAlert = await ActivityAlert.findOne({
                    session: session._id,
                    status: "active",
                });

                const inactiveFromTime = session.lastInactiveFrom || session.lastHeartbeat || session.loginTime;

                if (!existingAlert) {
                    const newAlert = await ActivityAlert.create({
                        user: session.user._id,
                        session: session._id,
                        sessionId: session.sessionId,
                        alertType: "inactivity_timeout",
                        inactivityDurationMinutes: Math.round(diffMinutes),
                        inactiveFrom: inactiveFromTime,
                        inactiveTo: new Date(),
                        lastHeartbeat: session.lastHeartbeat,
                        lastInteraction: session.lastInteraction,
                        alertTime: new Date(),
                        status: "active",
                    });

                    const populatedAlert = await ActivityAlert.findById(newAlert._id)
                        .populate("user", "name email department designation");

                    // Notify Admins in real-time
                    io.emit("inactivity-alert", populatedAlert);
                    console.log(`⚠️ Inactivity Alert created for ${session.user.name} (${Math.round(diffMinutes)} mins idle)`);
                } else {
                    // Update continuous inactivity duration & latest to timestamp
                    existingAlert.inactivityDurationMinutes = Math.round(diffMinutes);
                    existingAlert.inactiveTo = new Date();
                    await existingAlert.save();
                }

                if (previousStatus !== "inactive") {
                    io.emit("session-status-update", {
                        sessionId: session.sessionId,
                        userId: session.user._id,
                        sessionStatus: "inactive",
                        lastHeartbeat: session.lastHeartbeat,
                        inactiveFrom: inactiveFromTime,
                        durationMinutes: Math.round(diffMinutes),
                    });
                }
            } else if (diffMinutes >= 1.5) {
                // Heartbeat missing (tab closed, laptop sleeping, or background throttled: 1.5m to 10m)
                if (session.sessionStatus !== "heartbeat_missing") {
                    session.sessionStatus = "heartbeat_missing";
                    session.lastInactiveFrom = session.lastHeartbeat || new Date();
                    await session.save();

                    io.emit("session-status-update", {
                        sessionId: session.sessionId,
                        userId: session.user._id,
                        sessionStatus: "heartbeat_missing",
                        lastHeartbeat: session.lastHeartbeat,
                        inactiveFrom: session.lastInactiveFrom,
                    });
                }
            } else {
                // Active session with fresh heartbeat (<1.5 min)
                if (session.sessionStatus !== "active") {
                    session.sessionStatus = "active";
                    session.lastInactiveFrom = null;
                    await session.save();

                    io.emit("session-status-update", {
                        sessionId: session.sessionId,
                        userId: session.user._id,
                        sessionStatus: "active",
                        lastHeartbeat: session.lastHeartbeat,
                    });
                }
            }
        }
    } catch (err) {
        console.error("❌ Error in session inactivity check:", err.message);
    }
};

/**
 * Handle incoming heartbeat from employee browser session
 */
const recordHeartbeat = async (sessionId, interactionData = {}) => {
    if (!sessionId) return null;

    const session = await LoginSession.findOne({ sessionId, isActive: true });
    if (!session) return null;

    const now = new Date();
    session.lastHeartbeat = now;

    if (interactionData.hasInteraction) {
        session.lastInteraction = interactionData.interactionTimestamp ? new Date(interactionData.interactionTimestamp) : now;
        session.interactionCount = (session.interactionCount || 0) + 1;
    }

    // If employee is on break, retain on_break status
    if (session.currentBreak?.isOnBreak) {
        session.sessionStatus = "on_break";
        await session.save();
        return session;
    }

    const wasInactiveOrMissing = session.sessionStatus === "inactive" || session.sessionStatus === "heartbeat_missing";
    session.sessionStatus = "active";
    session.lastInactiveFrom = null;
    await session.save();

    // If there was an active alert for this continuous session, automatically resolve it
    if (wasInactiveOrMissing) {
        const activeAlert = await ActivityAlert.findOne({
            session: session._id,
            status: "active",
        });

        if (activeAlert) {
            activeAlert.status = "resolved";
            activeAlert.resolvedAt = now;
            activeAlert.inactiveTo = now;
            activeAlert.resolutionReason = "Heartbeat resumed by employee";
            await activeAlert.save();

            try {
                const io = socket.getIO();
                io.emit("inactivity-resolved", {
                    alertId: activeAlert._id,
                    sessionId: session.sessionId,
                    userId: session.user,
                    resolvedAt: now,
                });
            } catch (e) {
                // socket not ready
            }
        }

        try {
            const io = socket.getIO();
            io.emit("session-status-update", {
                sessionId: session.sessionId,
                userId: session.user,
                sessionStatus: "active",
                lastHeartbeat: now,
            });
        } catch (e) {
            // socket not ready
        }
    }

    return session;
};

/**
 * Start background scheduler
 */
const startSessionMonitoring = () => {
    if (monitorInterval) clearInterval(monitorInterval);
    console.log("⏱️ Starting HRM Session Inactivity Monitor (interval: 30s)...");
    // Run immediately once, then every 30 seconds
    setTimeout(runInactivityCheck, 5000);
    monitorInterval = setInterval(runInactivityCheck, 30000);
};

module.exports = {
    startSessionMonitoring,
    runInactivityCheck,
    recordHeartbeat,
};
