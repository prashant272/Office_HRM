import React, { useState, useEffect } from "react";
import { Bell, User, Clock, WifiOff, Menu, Coffee, Utensils, Play, Square } from "lucide-react";
import { useSocket } from "../context/SocketContext";
import { useSession } from "../context/SessionContext";
import moment from "moment";

const Navbar = ({ onToggleSidebar, isSidebarOpen }) => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    const socket = useSocket();
    const {
        sessionStatus,
        isConnected,
        isOnBreak,
        currentBreakType,
        breakStartTime,
        totalBreakMinutes,
        toggleBreak,
    } = useSession();
    const [currentTime, setCurrentTime] = useState(moment().utcOffset("+05:30").format("hh:mm:ss A"));
    const [unreadAlerts, setUnreadAlerts] = useState(0);
    const [breakElapsed, setBreakElapsed] = useState("00:00");

    // Live break timer ticker
    useEffect(() => {
        if (!isOnBreak || !breakStartTime) {
            setBreakElapsed("00:00");
            return;
        }

        const tick = () => {
            const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(breakStartTime).getTime()) / 1000));
            const mins = Math.floor(diffSeconds / 60);
            const secs = diffSeconds % 60;
            setBreakElapsed(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [isOnBreak, breakStartTime]);

    // Live clock in IST (Asia/Kolkata)
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(moment().utcOffset("+05:30").format("hh:mm:ss A"));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (socket) {
            const handleAlert = () => {
                setUnreadAlerts((prev) => prev + 1);
            };
            socket.on("inactivity-alert", handleAlert);
            socket.on("meeting-submitted", handleAlert);

            return () => {
                socket.off("inactivity-alert", handleAlert);
                socket.off("meeting-submitted", handleAlert);
            };
        }
    }, [socket]);

    const isAdmin = userInfo?.role === "admin" || userInfo?.role === "manager";

    return (
        <header className="h-16 sm:h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-6 lg:px-8 flex items-center justify-between border-b border-slate-200/60 shadow-xs">
            {/* Left: Hamburger Button + Panel Badge + Clock */}
            <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6 min-w-0">
                {/* Mobile Hamburger Toggle Button */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 -ml-1 text-slate-700 hover:text-primary hover:bg-slate-100 rounded-xl transition-colors lg:hidden shrink-0"
                    aria-label="Toggle Navigation Menu"
                >
                    <Menu size={22} />
                </button>

                <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 sm:px-2.5 py-0.5 rounded-full border border-primary/20 shrink-0">
                            {isAdmin ? "Admin" : "Employee"}
                        </span>
                        <div className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-slate-100 text-slate-700 shrink-0">
                            <Clock size={12} className="text-primary shrink-0" />
                            <span className="truncate">{currentTime}</span>
                        </div>
                    </div>
                </div>

                {/* Session Live Status Indicator (hidden on small mobile screens) */}
                <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/50">
                    {isConnected ? (
                        isOnBreak ? (
                            <>
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-purple-700 capitalize">
                                    On {currentBreakType || "Lunch"} Break ({breakElapsed})
                                </span>
                            </>
                        ) : sessionStatus === "active" ? (
                            <>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-emerald-700">Session Active</span>
                            </>
                        ) : (
                            <>
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                <span className="text-xs font-bold text-amber-700 capitalize">{sessionStatus.replace("_", " ")}</span>
                            </>
                        )
                    ) : (
                        <>
                            <WifiOff size={13} className="text-rose-500" />
                            <span className="text-xs font-bold text-rose-600">Reconnecting...</span>
                        </>
                    )}
                </div>
            </div>

            {/* Right: Break Controls, Notifications & User Profile */}
            <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                {/* Employee Break Controls (Lunch / Tea - 30 min total allowance) */}
                {isOnBreak ? (
                    <button
                        onClick={() => toggleBreak()}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all animate-pulse"
                        title="Click to resume work"
                    >
                        <Square size={13} className="fill-white" />
                        <span>End Break ({breakElapsed})</span>
                    </button>
                ) : (
                    <div className="flex items-center space-x-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70">
                        <button
                            onClick={() => toggleBreak("lunch")}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-purple-50 text-purple-800 rounded-xl text-[11px] font-extrabold shadow-2xs border border-purple-200 transition-all"
                            title="Lunch Break (30 min allowance, pauses inactivity)"
                        >
                            <Utensils size={12} className="text-purple-600" />
                            <span className="hidden sm:inline">Lunch Break</span>
                            <span className="sm:hidden">Lunch</span>
                        </button>
                        <button
                            onClick={() => toggleBreak("tea")}
                            className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-800 rounded-xl text-[11px] font-extrabold shadow-2xs border border-amber-200 transition-all"
                            title="Tea / Quick Break (pauses inactivity)"
                        >
                            <Coffee size={12} className="text-amber-600" />
                            <span className="hidden sm:inline">Tea Break</span>
                            <span className="sm:hidden">Tea</span>
                        </button>
                    </div>
                )}
                {isAdmin && (
                    <button
                        onClick={() => setUnreadAlerts(0)}
                        className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                        title="Alerts and Activity"
                    >
                        <Bell size={18} className={unreadAlerts > 0 ? "text-rose-600 animate-bounce" : ""} />
                        {unreadAlerts > 0 && (
                            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                                {unreadAlerts}
                            </span>
                        )}
                    </button>
                )}

                <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-3 border-l border-slate-200">
                    <div className="text-right hidden sm:flex flex-col">
                        <span className="text-xs sm:text-sm font-bold text-secondary truncate max-w-[120px]">
                            {userInfo?.name || "User"}
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-primary uppercase tracking-wider">
                            {userInfo?.employeeId || userInfo?.role}
                        </span>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center text-primary font-black shadow-xs shrink-0 text-sm">
                        {userInfo?.name ? userInfo.name.charAt(0).toUpperCase() : <User size={16} />}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
