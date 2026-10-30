import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children, user }) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (user) {
            // Derive root server URL from VITE_API_URL (e.g., http://localhost:5000/api -> http://localhost:5000)
            const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
            const socketUrl = apiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "") || "http://localhost:5000";
            const newSocket = io(socketUrl);
            setSocket(newSocket);

            newSocket.emit("join", user._id);

            // Generic Notification Listener
            newSocket.on("notification", (data) => {
                const type = data.type || "success";
                toast[type](`🔔 ${data.message}`, {
                    duration: 5000,
                    position: "top-right",
                });
            });

            // Admin Inactivity Alert Event
            newSocket.on("inactivity-alert", (alert) => {
                if (user.role === "admin") {
                    toast.error(`⚠️ INACTIVITY ALERT: ${alert.user?.name || "Employee"} inactive for >${alert.inactivityDurationMinutes} mins without heartbeat`, {
                        duration: 8000,
                        position: "top-right",
                        style: {
                            borderRadius: "16px",
                            background: "#881337",
                            color: "#fff",
                            fontWeight: "bold",
                            border: "1px solid #f43f5e",
                        },
                    });
                }
            });

            // Inactivity Resolved Event
            newSocket.on("inactivity-resolved", (data) => {
                if (user.role === "admin") {
                    toast.success("✅ Employee heartbeats resumed. Alert automatically resolved.", {
                        duration: 4000,
                        position: "top-right",
                    });
                }
            });

            // Meeting Submitted Event
            newSocket.on("meeting-submitted", (data) => {
                if (user.role === "admin") {
                    toast(`💼 Field Meeting Submitted by ${data.employeeName}: "${data.clientName}" (${data.clientCompany})`, {
                        duration: 6000,
                        position: "top-right",
                        style: {
                            borderRadius: "16px",
                            background: "#0f172a",
                            color: "#38bdf8",
                            fontWeight: "bold",
                        },
                    });
                }
            });

            // Meeting Review Update Event (for Employee)
            newSocket.on("meeting-review-update", (data) => {
                if (data.approvalStatus === "Approved") {
                    toast.success("🎉 Your submitted field meeting has been APPROVED by Admin!", {
                        duration: 6000,
                    });
                } else if (data.approvalStatus === "Rejected") {
                    toast.error(`❌ Field Meeting Rejected: ${data.adminReviewNotes || "Please review notes"}`, {
                        duration: 7000,
                    });
                }
            });

            return () => newSocket.close();
        }
    }, [user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
