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
    const lastInteractionRef = useRef(Date.now());
    const hasInteractionRef = useRef(false);
    const heartbeatTimerRef = useRef(null);

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

    // Periodic Heartbeat loop (every 35 seconds)
    useEffect(() => {
        if (!sessionData?.sessionId) return;

        // Send initial heartbeat
        sendHeartbeat();

        // 35-second heartbeat interval
        heartbeatTimerRef.current = setInterval(sendHeartbeat, 35000);

        // Resume heartbeat when tab becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                sendHeartbeat();
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
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [sessionData?.sessionId, sendHeartbeat]);

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
                logout,
                sendHeartbeat,
            }}
        >
            {children}
        </SessionContext.Provider>
    );
};
