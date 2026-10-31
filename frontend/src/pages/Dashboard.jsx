import React, { useEffect, useState, useCallback, useRef } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import {
    Users,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Activity,
    CalendarCheck,
    Briefcase,
    Shield,
    Wifi,
    WifiOff,
    Check,
    XCircle,
    ArrowUpRight,
    TrendingUp,
    RefreshCw,
    MessageSquare,
    Eye,
    Plus,
    Loader2
} from "lucide-react";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from "recharts";
import moment from "moment";
import { useSocket } from "../context/SocketContext";
import { useSession } from "../context/SessionContext";
import { toast } from "react-hot-toast";

// Helper for IST formatting
const formatIST = (dateStr) => {
    if (!dateStr) return "—";
    return moment(dateStr).utcOffset("+05:30").format("DD MMM, hh:mm A");
};

const StatCard = ({ title, value, subtitle, icon, color, alert, badge }) => (
    <div className={`p-6 rounded-3xl bg-white border ${alert ? 'border-rose-300 ring-2 ring-rose-100 shadow-rose-100' : 'border-slate-200/80'} shadow-sm hover:shadow-md transition-all`}>
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
                {icon}
            </div>
            {badge && (
                <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {badge}
                </span>
            )}
        </div>
        <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{title}</h4>
            <div className="flex items-baseline space-x-2">
                <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
                {subtitle && <span className="text-xs text-slate-500 font-semibold">{subtitle}</span>}
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [clockLoading, setClockLoading] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [ackLoading, setAckLoading] = useState(false);
    const debounceTimerRef = useRef(null);

    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    const isAdmin = userInfo?.role === "admin" || userInfo?.role === "manager";
    const socket = useSocket();
    const { sessionStatus, lastHeartbeat, isConnected } = useSession();
    const navigate = useNavigate();

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await API.get("/dashboard/stats");
            setStats(data);
            setFetchError(null);
        } catch (err) {
            console.error("Dashboard stats error:", err);
            setFetchError(err.response?.data?.message || err.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Socket real-time listeners for live updates (debounced to avoid server load)
    useEffect(() => {
        if (!socket) return;

        const handleRealtimeUpdate = () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                fetchStats();
            }, 1500);
        };

        socket.on("inactivity-alert", handleRealtimeUpdate);
        socket.on("inactivity-resolved", handleRealtimeUpdate);
        socket.on("session-login", handleRealtimeUpdate);
        socket.on("session-logout", handleRealtimeUpdate);
        socket.on("meeting-submitted", handleRealtimeUpdate);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            socket.off("inactivity-alert", handleRealtimeUpdate);
            socket.off("inactivity-resolved", handleRealtimeUpdate);
            socket.off("session-login", handleRealtimeUpdate);
            socket.off("session-logout", handleRealtimeUpdate);
            socket.off("meeting-submitted", handleRealtimeUpdate);
        };
    }, [socket, fetchStats]);

    // Employee Clock In / Out handler
    const handleToggleClock = async () => {
        setClockLoading(true);
        const hasCheckedIn = stats?.todayAttendance?.checkIn;
        const hasCheckedOut = stats?.todayAttendance?.checkOut;

        try {
            if (!hasCheckedIn) {
                await API.post("/attendance/checkin", {
                    sessionId: userInfo?.sessionId,
                    location: { address: "Office / Remote", lat: 28.6193, lng: 77.0293 },
                });
                toast.success("Clocked in successfully for today!");
            } else if (!hasCheckedOut) {
                await API.post("/attendance/checkout", {
                    location: { address: "Office / Remote", lat: 28.6193, lng: 77.0293 },
                });
                toast.success("Clocked out successfully!");
            }
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || "Attendance action failed");
        } finally {
            setClockLoading(false);
        }
    };

    // Admin Alert Acknowledgment
    const handleAcknowledgeAlert = async () => {
        if (!selectedAlert) return;
        setAckLoading(true);
        try {
            await API.put(`/alerts/${selectedAlert._id}/acknowledge`, { notes: adminNotes });
            toast.success("Inactivity alert acknowledged.");
            setSelectedAlert(null);
            setAdminNotes("");
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to acknowledge alert");
        } finally {
            setAckLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="animate-spin text-primary w-12 h-12" />
                <p className="text-sm font-bold text-slate-500">Loading HRM Dashboard...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-800">Unable to Load Dashboard Data</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                    {fetchError || "The HRM server did not respond in time. Please check your connection or retry."}
                </p>
                <button
                    onClick={() => {
                        setLoading(true);
                        fetchStats();
                    }}
                    className="px-6 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-blue-600 transition-all shadow-md active:scale-95"
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-12 font-sans">
            {/* Header section with refresh button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {isAdmin ? "Admin Overview & Inactivity Operations" : "Employee Workspace"}
                    </h1>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
                        {isAdmin
                            ? "Real-time session heartbeats, inactivity alerts, and field meeting approvals"
                            : `Welcome back, ${userInfo?.name || "Employee"}. Continuous session monitoring active.`}
                    </p>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                    <button
                        onClick={() => {
                            setRefreshing(true);
                            fetchStats();
                        }}
                        disabled={refreshing}
                        className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-50 flex items-center justify-center space-x-2 shadow-xs transition-all"
                    >
                        <RefreshCw size={14} className={refreshing ? "animate-spin text-primary" : ""} />
                        <span>Refresh</span>
                    </button>
                    {!isAdmin && (
                        <button
                            onClick={() => navigate("/my-meetings")}
                            className="flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 bg-primary text-white rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-primary/20 hover:bg-blue-600 transition-all text-center"
                        >
                            <Plus size={16} />
                            <span className="truncate">New Meeting</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ======================================================== */}
            {/* ADMIN PANEL VIEW */}
            {/* ======================================================== */}
            {isAdmin && stats && (
                <>
                    {/* Top KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Total Employees"
                            value={stats.totalEmployees || 0}
                            subtitle="Registered staff"
                            icon={<Users size={22} className="text-blue-600" />}
                            color="bg-blue-500 text-blue-600"
                        />
                        <StatCard
                            title="Currently Logged In"
                            value={stats.loggedInEmployees || 0}
                            subtitle={`Active: ${stats.activeEmployees || 0}`}
                            icon={<Activity size={22} className="text-emerald-600" />}
                            color="bg-emerald-500 text-emerald-600"
                            badge="Sessions Live"
                        />
                        <StatCard
                            title="Inactive > 10 Mins"
                            value={stats.inactiveEmployees || 0}
                            subtitle="Missing heartbeats"
                            icon={<AlertTriangle size={22} className="text-rose-600" />}
                            color="bg-rose-500 text-rose-600"
                            alert={stats.inactiveEmployees > 0}
                            badge={stats.inactiveEmployees > 0 ? "Alerts Active" : "Normal"}
                        />
                        <StatCard
                            title="Logged Out"
                            value={stats.loggedOutEmployees || 0}
                            subtitle="Ended shifts"
                            icon={<Clock size={22} className="text-slate-500" />}
                            color="bg-slate-500 text-slate-600"
                        />
                    </div>

                    {/* Secondary Metrics Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Attendance</span>
                                <h3 className="text-2xl font-black text-slate-900 mt-1">
                                    {stats.todayAttendance?.total || 0} Checked In
                                </h3>
                                <p className="text-xs font-semibold text-emerald-600 mt-1">
                                    {stats.todayAttendance?.present || 0} On Time · {stats.todayAttendance?.late || 0} Late
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                                <CheckCircle2 size={24} />
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Field Meetings</span>
                                <h3 className="text-2xl font-black text-slate-900 mt-1">
                                    {stats.fieldMeetings?.todayTotal || 0} Scheduled
                                </h3>
                                <p className="text-xs font-semibold text-blue-600 mt-1">
                                    {stats.fieldMeetings?.todayCompleted || 0} Completed with OTP & Evidence
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                                <Briefcase size={24} />
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
                                <h3 className="text-2xl font-black text-amber-600 mt-1">
                                    {stats.fieldMeetings?.pendingApprovals || 0} Meetings
                                </h3>
                                <button
                                    onClick={() => navigate("/field-meetings")}
                                    className="text-xs font-bold text-primary hover:underline mt-1 flex items-center gap-1"
                                >
                                    <span>Review Submissions</span>
                                    <ArrowUpRight size={13} />
                                </button>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                                <CalendarCheck size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Real-time Inactivity Alerts Banner & Drawer */}
                    {stats.activeAlerts && stats.activeAlerts.length > 0 && (
                        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center animate-pulse">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-rose-900">
                                            ⚠️ Active Inactivity Alerts ({stats.activeAlerts.length})
                                        </h3>
                                        <p className="text-xs text-rose-700 font-semibold">
                                            No heartbeats received for &gt;10 minutes. Tab closed, disconnected, or idle.
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold px-3 py-1 bg-rose-200/80 text-rose-800 rounded-full">
                                    Auto-resolves upon heartbeat resumption
                                </span>
                            </div>

                            <div className="space-y-3">
                                {stats.activeAlerts.map((alert) => (
                                    <div
                                        key={alert._id}
                                        className="bg-white p-4 rounded-2xl border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-black text-slate-900 text-sm">{alert.user?.name}</span>
                                                <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                                    {alert.user?.employeeId || "Staff"}
                                                </span>
                                                <span className="text-xs text-slate-500 font-medium">({alert.user?.department?.name || "General"})</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                                                <span>Inactivity Duration: <strong className="text-rose-600">{alert.inactivityDurationMinutes} mins</strong></span>
                                                <span className="bg-rose-100/70 text-rose-800 px-2 py-0.5 rounded-md font-bold">
                                                    Inactive Interval: {formatIST(alert.inactiveFrom || alert.lastHeartbeat)} → {alert.inactiveTo ? formatIST(alert.inactiveTo) : "Still Inactive"}
                                                </span>
                                                <span>Last Heartbeat: <strong>{formatIST(alert.lastHeartbeat)} IST</strong></span>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            {alert.acknowledged ? (
                                                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                                                    <Check size={14} /> Acknowledged
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => setSelectedAlert(alert)}
                                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95"
                                                >
                                                    Acknowledge & Add Notes
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Live Sessions Status & Recent Activity Table */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Recent Employee Sessions & Heartbeat Activity</h3>
                                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                    Tracked server-side even when browser tabs are closed
                                </p>
                            </div>
                            <button
                                onClick={() => navigate("/attendance")}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                <span>View Full Session Logs</span>
                                <ArrowUpRight size={14} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                        <th className="py-3 px-4">Employee</th>
                                        <th className="py-3 px-4">Session ID / Device</th>
                                        <th className="py-3 px-4">Login Time (IST)</th>
                                        <th className="py-3 px-4">Last Confirmed Heartbeat</th>
                                        <th className="py-3 px-4">Duration</th>
                                        <th className="py-3 px-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {stats.recentSessions?.map((sess) => {
                                        const isAct = sess.sessionStatus === "active";
                                        const isOnBreak = sess.sessionStatus === "on_break";
                                        const isMissing = sess.sessionStatus === "heartbeat_missing";
                                        const isInactive = sess.sessionStatus === "inactive";
                                        const isLoggedOut = sess.sessionStatus === "logged_out";

                                        return (
                                            <tr key={sess._id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className="font-black text-slate-900 block">{sess.user?.name || "User"}</span>
                                                    <span className="text-[11px] text-slate-400">{sess.user?.department?.name || "General"}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-mono text-[11px] text-slate-600 block">{sess.sessionId?.slice(0, 13)}...</span>
                                                    <span className="text-[10px] text-slate-400">{sess.deviceInfo?.browser} ({sess.deviceInfo?.os})</span>
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-800">
                                                    {formatIST(sess.loginTime)}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-800">
                                                    {formatIST(sess.lastHeartbeat)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div>{sess.durationMinutes || 0} mins</div>
                                                    {sess.totalBreakMinutes > 0 && (
                                                        <span className="text-[10px] text-purple-600 font-bold block">
                                                            Break: {sess.totalBreakMinutes}m
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {isAct && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            Active Now
                                                        </span>
                                                    )}
                                                    {isOnBreak && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-800">
                                                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                                                            On Break ({sess.currentBreak?.breakType || "Break"})
                                                        </span>
                                                    )}
                                                    {isMissing && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                                                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                            Missing Heartbeat (Tab Closed)
                                                        </span>
                                                    )}
                                                    {isInactive && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">
                                                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                                            Inactive &gt; 10m
                                                        </span>
                                                    )}
                                                    {isLoggedOut && (
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-600">
                                                            Logged Out
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Analytics Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 7-Day Attendance Trend */}
                        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                            <h3 className="text-base font-black text-slate-900 mb-1">7-Day Attendance & Meeting Volume</h3>
                            <p className="text-xs font-semibold text-slate-500 mb-6">Attendance and Field Sales Meetings trends</p>

                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.last7Days || []}>
                                        <defs>
                                            <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorAtt)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Session Distribution Pie */}
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 mb-1">Session Health Distribution</h3>
                                <p className="text-xs font-semibold text-slate-500 mb-4">Live employee session status breakdown</p>
                            </div>

                            <div className="h-52">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.sessionDistribution || []}
                                            innerRadius={50}
                                            outerRadius={75}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {(stats.sessionDistribution || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold">
                                {(stats.sessionDistribution || []).map((item) => (
                                    <div key={item.name} className="flex items-center space-x-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                                        <span className="text-slate-600 truncate">{item.name}: <strong>{item.value}</strong></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ======================================================== */}
            {/* EMPLOYEE PANEL VIEW */}
            {/* ======================================================== */}
            {!isAdmin && stats && (
                <>
                    {/* Attendance Action & Status Card */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* Today's Clock In / Out */}
                        <div className="lg:col-span-2 p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div>
                                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 sm:px-3 py-1 rounded-full">
                                        Today's Shift
                                    </span>
                                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 sm:mt-3">
                                        {stats.todayAttendance?.checkIn ? "Shift in Progress" : "Shift Not Started"}
                                    </h2>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">
                                        General Shift (09:30 AM – 06:30 PM IST)
                                    </p>
                                </div>
                                <div className="sm:text-right">
                                    <span className="text-[10px] sm:text-xs text-slate-400 font-bold block">Status</span>
                                    <span className={`text-xs sm:text-sm font-black px-3 py-1 rounded-full inline-block mt-1 ${
                                        stats.todayAttendance?.status === "Present"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : stats.todayAttendance?.status === "Late"
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-slate-100 text-slate-700"
                                    }`}>
                                        {stats.todayAttendance?.status || "Pending Clock In"}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 sm:my-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100">
                                <div>
                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase">Clock In (IST)</span>
                                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                                        {stats.todayAttendance?.checkIn ? formatIST(stats.todayAttendance.checkIn) : "—"}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase">Clock Out (IST)</span>
                                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                                        {stats.todayAttendance?.checkOut ? formatIST(stats.todayAttendance.checkOut) : "—"}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase">Duration</span>
                                    <p className="text-xs sm:text-sm font-black text-primary mt-0.5">
                                        {stats.todayAttendance?.workDuration ? `${stats.todayAttendance.workDuration} mins` : "In Progress"}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleToggleClock}
                                disabled={clockLoading || Boolean(stats.todayAttendance?.checkOut)}
                                className={`w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-60 ${
                                    !stats.todayAttendance?.checkIn
                                        ? "bg-primary hover:bg-blue-600 text-white shadow-primary/25"
                                        : !stats.todayAttendance?.checkOut
                                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25"
                                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                                }`}
                            >
                                {clockLoading ? (
                                    <Loader2 className="animate-spin w-5 h-5 mx-auto" />
                                ) : !stats.todayAttendance?.checkIn ? (
                                    "Punch Clock In"
                                ) : !stats.todayAttendance?.checkOut ? (
                                    "Punch Clock Out"
                                ) : (
                                    "Attendance Completed for Today"
                                )}
                            </button>
                        </div>

                        {/* Live Session Status Widget */}
                        <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-slate-950 text-white shadow-xl border border-slate-800 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-black uppercase text-primary tracking-widest bg-primary/20 px-2.5 py-1 rounded-full">
                                        HRM Session Heartbeat
                                    </span>
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                </div>
                                <h3 className="text-base sm:text-lg font-black tracking-tight">Active Continuous Session</h3>
                                <p className="text-xs text-slate-400 font-medium mt-1">
                                    Your session stays authenticated even if you close this browser tab.
                                </p>
                            </div>

                            <div className="space-y-2.5 my-4 sm:my-6">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">Session ID:</span>
                                    <span className="font-mono text-slate-200 truncate max-w-[130px]">{stats.currentSession?.sessionId?.slice(0, 10)}...</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">Status:</span>
                                    <span className="text-emerald-400 font-bold">🟢 Connected & Active</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">Last Server Heartbeat:</span>
                                    <span className="text-slate-200 font-semibold">{formatIST(lastHeartbeat)}</span>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">
                                ℹ️ Heartbeats pause when closed and resume when re-opened. Sessions inactive for &gt;10 mins alert administrators.
                            </div>
                        </div>
                    </div>

                    {/* Field Meetings & Recent Submissions */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-6 lg:p-8 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                            <div>
                                <h3 className="text-lg sm:text-xl font-black text-slate-900">My Field Meetings & Approvals</h3>
                                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                    Client meetings with mobile OTP verification, selfie, and business card evidence
                                </p>
                            </div>
                            <button
                                onClick={() => navigate("/my-meetings")}
                                className="w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-xs"
                            >
                                <Plus size={16} />
                                <span>Schedule / Start Field Meeting</span>
                            </button>
                        </div>

                        {/* Meeting Status Badges Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
                            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400">Today's Total</span>
                                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.fieldMeetings?.todayTotal || 0}</p>
                            </div>
                            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-100">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-700">Pending Review</span>
                                <p className="text-xl sm:text-2xl font-black text-amber-800 mt-1">{stats.fieldMeetings?.pendingApprovals || 0}</p>
                            </div>
                            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-100">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-700">Approved</span>
                                <p className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">{stats.fieldMeetings?.approved || 0}</p>
                            </div>
                            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-100">
                                <span className="text-[9px] sm:text-[10px] font-black uppercase text-rose-700">Rejected</span>
                                <p className="text-xl sm:text-2xl font-black text-rose-800 mt-1">{stats.fieldMeetings?.rejected || 0}</p>
                            </div>
                        </div>

                        {/* Recent Meetings Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                        <th className="py-3 px-4">Client & Company</th>
                                        <th className="py-3 px-4">Meeting Title</th>
                                        <th className="py-3 px-4">Scheduled Date</th>
                                        <th className="py-3 px-4">Verification</th>
                                        <th className="py-3 px-4 text-right">Approval Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {stats.fieldMeetings?.recent?.length > 0 ? (
                                        stats.fieldMeetings.recent.map((m) => (
                                            <tr key={m._id} className="hover:bg-slate-50/70">
                                                <td className="py-3 px-4">
                                                    <span className="font-black text-slate-900 block">{m.clientName}</span>
                                                    <span className="text-[11px] text-slate-500">{m.clientCompany} ({m.clientPhone})</span>
                                                </td>
                                                <td className="py-3 px-4 font-bold text-slate-800">{m.title}</td>
                                                <td className="py-3 px-4">{m.scheduledDate}</td>
                                                <td className="py-3 px-4">
                                                    {m.verification?.isVerified ? (
                                                        <span className="text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full text-[10px]">
                                                            ✅ OTP Verified
                                                        </span>
                                                    ) : m.verification?.bypassRequested ? (
                                                        <span className="text-amber-700 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full text-[10px]">
                                                            ⚠️ Override Requested
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 font-bold bg-slate-100 px-2.5 py-0.5 rounded-full text-[10px]">
                                                            Pending Verification
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                                                        m.approvalStatus === "Approved"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : m.approvalStatus === "Pending_Approval"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : m.approvalStatus === "Rejected"
                                                            ? "bg-rose-100 text-rose-800"
                                                            : "bg-slate-100 text-slate-600"
                                                    }`}>
                                                        {m.approvalStatus?.replace("_", " ")}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="py-8 text-center text-slate-400 font-semibold">
                                                No field meetings scheduled yet. Click "New Field Meeting" to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Acknowledge Alert Modal (Admin only) */}
            {selectedAlert && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center space-x-3 text-rose-600 mb-4">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-black text-slate-900">Acknowledge Inactivity Alert</h3>
                        </div>
                        <p className="text-xs text-slate-600 font-medium mb-4">
                            Employee <strong>{selectedAlert.user?.name}</strong> has missed heartbeats for{" "}
                            <strong>{selectedAlert.inactivityDurationMinutes} minutes</strong>.
                        </p>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Admin Review Notes</label>
                            <textarea
                                rows="3"
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="E.g., Contacted employee on mobile, in transit to client site..."
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                            ></textarea>
                        </div>

                        <div className="flex items-center justify-end space-x-3">
                            <button
                                onClick={() => setSelectedAlert(null)}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAcknowledgeAlert}
                                disabled={ackLoading}
                                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-md active:scale-95 disabled:opacity-60"
                            >
                                {ackLoading ? "Saving..." : "Confirm Acknowledgment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
