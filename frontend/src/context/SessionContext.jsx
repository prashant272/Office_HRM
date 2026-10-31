import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import API from "../api/axios";
import { toast } from "react-hot-toast";

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }) => {
    const [sessionData, setSessionData] = useState(() => {
        try {
            const stored = localStorage.getItem("userInfo");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const [sessionStatus, setSessionStatus] = useState("active");
    const [lastHeartbeat, setLastHeartbeat] = useState(new Date());
    const [isConnected, setIsConnected] = useState(true);
    const [isOnBreak, setIsOnBreak] = useState(false);
    const [currentBreakType, setCurrentBreakType] = useState(null);
    const [breakStartTime, setBreakStartTime] = useState(null);
    const [totalBreakMinutes, setTotalBreakMinutes] = useState(0);

    const lastInteractionRef = useRef(Date.now());
    const hasInteractionRef = useRef(false);
    const heartbeatTimerRef = useRef(null);
    const workerRef = useRef(null);

    // Fetch initial break status
    const refreshBreakStatus = useCallback(async () => {
        try {
            const res = await API.get("/attendance/break/status");
            if (res.data) {
                setIsOnBreak(res.data.isOnBreak || false);
                setCurrentBreakType(res.data.currentBreakType || null);
                setBreakStartTime(res.data.activeBreakStartTime ? new Date(res.data.activeBreakStartTime) : null);
                setTotalBreakMinutes(res.data.totalBreakMinutes || 0);
            }
        } catch (e) {
            // Ignore if unauthenticated
        }
    }, []);

    // Toggle Break Action (start or end)
    const toggleBreak = async (breakType = "lunch") => {
        const userInfo = localStorage.getItem("userInfo") ? JSON.parse(localStorage.getItem("userInfo")) : null;
        const action = isOnBreak ? "end" : "start";

        try {
            const res = await API.post("/attendance/break", {
                action,
                breakType: isOnBreak ? currentBreakType : breakType,
                sessionId: userInfo?.sessionId,
            });

            if (res.data.success) {
                setIsOnBreak(res.data.isOnBreak);
                setCurrentBreakType(res.data.currentBreakType);
                setBreakStartTime(res.data.breakStartTime ? new Date(res.data.breakStartTime) : null);
                setTotalBreakMinutes(res.data.totalBreakMinutes || 0);
                if (res.data.isOnBreak) {
                    setSessionStatus("on_break");
                    toast.success(res.data.message || "Break started. Inactivity paused!");
                } else {
                    setSessionStatus("active");
                    toast.success(res.data.message || "Break ended. Welcome back!");
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update break status");
        }
    };

    // Track user interactions (clicks, keys, scrolls) without recording sensitive text
    const recordUserInteraction = useCallback(() => {
        lastInteractionRef.current = Date.now();
        hasInteractionRef.current = true;
    }, []);

    useEffect(() => {
        const events = ["mousedown", "keydown", "scroll", "touchstart"];
        const throttledInteraction = () => {
            recordUserInteraction();
        };

        events.forEach((ev) => window.addEventListener(ev, throttledInteraction, { passive: true }));
        return () => {
            events.forEach((ev) => window.removeEventListener(ev, throttledInteraction));
        };
    }, [recordUserInteraction]);

    // Send Heartbeat to server
    const sendHeartbeat = useCallback(async () => {
        const userInfo = localStorage.getItem("userInfo") ? JSON.parse(localStorage.getItem("userInfo")) : null;
        if (!userInfo || !userInfo.sessionId || !userInfo.token) return;

        try {
            const hasInteraction = hasInteractionRef.current;
            const interactionTimestamp = lastInteractionRef.current;
            hasInteractionRef.current = false; // reset flag

            const res = await API.post("/attendance/heartbeat", {
                sessionId: userInfo.sessionId,
                hasInteraction,
                interactionTimestamp,
            });

            if (res.data) {
                setSessionStatus(res.data.sessionStatus || "active");
                setLastHeartbeat(new Date(res.data.lastHeartbeat || Date.now()));
                setIsConnected(true);
            }
        } catch (err) {
            console.warn("⚠️ Heartbeat transmission issue:", err.response?.data?.message || err.message);
            if (err.response?.status === 404) {
                // Session ended or invalidated
                setSessionStatus("logged_out");
            } else {
                setIsConnected(false);
            }
        }
    }, []);

    // Check session status on mount / tab revisit
    useEffect(() => {
        const validateSession = async () => {
            const userInfo = localStorage.getItem("userInfo") ? JSON.parse(localStorage.getItem("userInfo")) : null;
            if (!userInfo || !userInfo.sessionId || !userInfo.token) return;

            try {
                const res = await API.get("/auth/session/status", {
                    params: { sessionId: userInfo.sessionId },
                });
                if (res.data && res.data.isValid) {
                    setSessionStatus(res.data.sessionStatus || "active");
                    setLastHeartbeat(new Date(res.data.lastHeartbeat || Date.now()));
                    setIsConnected(true);
                } else {
                    // Session was expired or terminated
                    localStorage.removeItem("userInfo");
                    setSessionData(null);
                }
            } catch (err) {
                console.warn("Session validation check:", err.message);
            }
        };

        validateSession();
    }, []);

    // Periodic Heartbeat loop + Un-throttled Background Web Worker
    useEffect(() => {
        if (!sessionData?.sessionId) return;

        // Fetch initial break status
        refreshBreakStatus();

        // Send initial heartbeat
        sendHeartbeat();

        // Standard timer (for foreground / active window)
        heartbeatTimerRef.current = setInterval(sendHeartbeat, 30000);

        // Dedicated Web Worker (NEVER throttled when laptop is on and user is working in another app/tab!)
        try {
            if (window.Worker) {
                const worker = new Worker("/heartbeat-worker.js");
                workerRef.current = worker;
                worker.postMessage("start");
                worker.onmessage = (e) => {
                    if (e.data === "tick") {
                        sendHeartbeat();
                    }
                };
            }
        } catch (workerErr) {
            console.warn("Background web worker unavailable, using standard timers", workerErr);
        }

        // Resume heartbeat when tab becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                sendHeartbeat();
                refreshBreakStatus();
            }
        };

        // Online / Offline listener
        const handleOnline = () => {
            setIsConnected(true);
            sendHeartbeat();
        };
        const handleOffline = () => {
            setIsConnected(false);
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
            if (workerRef.current) {
                workerRef.current.postMessage("stop");
                workerRef.current.terminate();
                workerRef.current = null;
            }
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [sessionData?.sessionId, sendHeartbeat, refreshBreakStatus]);

    // Explicit Logout
    const logout = async () => {
        const userInfo = localStorage.getItem("userInfo") ? JSON.parse(localStorage.getItem("userInfo")) : null;

        try {
            if (userInfo?.sessionId) {
                await API.post("/auth/logout", { sessionId: userInfo.sessionId });
            }
        } catch (e) {
            console.error("Logout error:", e);
        } finally {
            if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
            localStorage.removeItem("userInfo");
            setSessionData(null);
            setSessionStatus("logged_out");
            toast.success("Session terminated. Logged out successfully.");
            window.location.href = "/login";
        }
    };

    return (
        <SessionContext.Provider
            value={{
                sessionData,
                setSessionData,
                sessionStatus,
                lastHeartbeat,
                isConnected,
                isOnBreak,
                currentBreakType,
                breakStartTime,
                totalBreakMinutes,
                toggleBreak,
                refreshBreakStatus,
                logout,
                sendHeartbeat,
            }}
        >
            {children}
        </SessionContext.Provider>
    );
};
