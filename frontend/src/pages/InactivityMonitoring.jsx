import React, { useState, useEffect, useCallback } from "react";
import API from "../api/axios";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    User,
    Check,
    MessageSquare,
    RefreshCw,
    Shield,
    WifiOff,
    Info,
    Loader2
} from "lucide-react";
import moment from "moment";
import { toast } from "react-hot-toast";
import { useSocket } from "../context/SocketContext";

const formatIST = (dateStr) => {
    if (!dateStr) return "—";
    return moment(dateStr).utcOffset("+05:30").format("DD MMM YYYY, hh:mm:ss A");
};

const InactivityMonitoring = () => {
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [alertHistory, setAlertHistory] = useState([]);
    const [activeTab, setActiveTab] = useState("active");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state for Acknowledgment
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [adminNotes, setAdminNotes] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const socket = useSocket();

    const fetchAlerts = useCallback(async () => {
        try {
            const [activeRes, histRes] = await Promise.all([
                API.get("/alerts/active"),
                API.get("/alerts/history"),
            ]);
            setActiveAlerts(activeRes.data || []);
            setAlertHistory(histRes.data || []);
        } catch (err) {
            console.error("Error fetching inactivity alerts:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    // Live Socket listener
    useEffect(() => {
        if (!socket) return;

        const handleAlertEvent = () => {
            fetchAlerts();
        };

        socket.on("inactivity-alert", handleAlertEvent);
        socket.on("inactivity-resolved", handleAlertEvent);
        socket.on("session-status-update", handleAlertEvent);

        return () => {
            socket.off("inactivity-alert", handleAlertEvent);
            socket.off("inactivity-resolved", handleAlertEvent);
            socket.off("session-status-update", handleAlertEvent);
        };
    }, [socket, fetchAlerts]);

    const handleAcknowledge = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await API.put(`/alerts/${selectedAlert._id}/acknowledge`, { notes: adminNotes });
            toast.success("Inactivity alert acknowledged and logged.");
            setSelectedAlert(null);
            setAdminNotes("");
            fetchAlerts();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to acknowledge alert");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-16 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Employee Session Inactivity Monitoring
                    </h1>
                    <p className="text-sm font-semibold text-slate-500 mt-1">
                        Admin-only live radar tracking heartbeat loss, tab closure intervals, and idle thresholds
                    </p>
                </div>
                <button
                    onClick={() => {
                        setRefreshing(true);
                        fetchAlerts();
                    }}
                    disabled={refreshing}
                    className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-50 flex items-center space-x-2 shadow-sm transition-all"
                >
                    <RefreshCw size={14} className={refreshing ? "animate-spin text-primary" : ""} />
                    <span>Refresh Alerts</span>
                </button>
            </div>

            {/* Technical Explanation Notice */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-primary font-black text-xs uppercase tracking-widest">
                        <Shield size={16} />
                        <span>Server-Side Background Inactivity Architecture</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                        Closing the HRM tab pauses client heartbeats without immediately logging out the employee. The server retains the last confirmed heartbeat. If heartbeats do not resume within the configured threshold (10 minutes), an Inactivity Alert is created. When the employee resumes the session, the alert auto-resolves with resolution history preserved.
                    </p>
                </div>

                {/* State legend */}
                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active (&lt;90s)
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Missing Hb (1.5 - 10m)
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        Inactive Alert (&gt;10m)
                    </span>
                    <span className="px-3 py-1.5 rounded-xl bg-slate-700 text-slate-300 flex items-center gap-1.5">
                        Logged Out
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center space-x-3 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab("active")}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                        activeTab === "active" ? "bg-rose-600 text-white shadow-md shadow-rose-600/20" : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                    <AlertTriangle size={15} />
                    <span>Active Alerts ({activeAlerts.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                        activeTab === "history" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                    <Clock size={15} />
                    <span>Alerts History ({alertHistory.length})</span>
                </button>
            </div>

            {/* ACTIVE ALERTS TAB */}
            {activeTab === "active" && (
                <div className="space-y-4">
                    {activeAlerts.length > 0 ? (
                        activeAlerts.map((alert) => (
                            <div
                                key={alert._id}
                                className="bg-white rounded-3xl border-2 border-rose-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-slate-900">{alert.user?.name}</h3>
                                            <span className="text-xs text-slate-500 font-semibold">
                                                {alert.user?.employeeId || "Staff"} · {alert.user?.department?.name || "General"} · {alert.user?.designation}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                                        <div className="p-3 bg-slate-50 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Inactivity Duration</span>
                                            <span className="text-base font-black text-rose-600">{alert.inactivityDurationMinutes} minutes</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Confirmed Heartbeat</span>
                                            <span className="font-bold text-slate-800">{formatIST(alert.lastHeartbeat)}</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Last HRM Interaction</span>
                                            <span className="font-bold text-slate-800">{formatIST(alert.lastInteraction)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end space-y-3">
                                    <span className="text-xs font-bold text-slate-400">
                                        Triggered: {formatIST(alert.alertTime)}
                                    </span>
                                    {alert.acknowledged ? (
                                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-right">
                                            <span className="text-xs font-black text-emerald-800 flex items-center gap-1 justify-end">
                                                <Check size={14} /> Acknowledged by Admin
                                            </span>
                                            {alert.adminNotes && (
                                                <p className="text-[11px] text-emerald-700 italic mt-0.5 max-w-xs">
                                                    "{alert.adminNotes}"
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setSelectedAlert(alert)}
                                            className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                                        >
                                            Acknowledge & Add Notes
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-16 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3">
                            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">All Employee Sessions Normal</h3>
                            <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto">
                                No employees are currently inactive for more than 10 minutes. Heartbeats are flowing normally or sessions have cleanly logged out.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ALERTS HISTORY TAB */}
            {activeTab === "history" && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                    <th className="py-4 px-6">Employee</th>
                                    <th className="py-4 px-6">Alert Trigger Time</th>
                                    <th className="py-4 px-6">Total Inactivity</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6">Resolution Time & Reason</th>
                                    <th className="py-4 px-6">Admin Acknowledgment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {alertHistory.length > 0 ? (
                                    alertHistory.map((h) => (
                                        <tr key={h._id} className="hover:bg-slate-50/70">
                                            <td className="py-4 px-6">
                                                <span className="font-black text-slate-900 block">{h.user?.name}</span>
                                                <span className="text-[11px] text-slate-400">{h.user?.department?.name || "Staff"}</span>
                                            </td>
                                            <td className="py-4 px-6 font-semibold">{formatIST(h.alertTime)}</td>
                                            <td className="py-4 px-6 font-bold text-slate-800">{h.inactivityDurationMinutes} mins</td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                                    h.status === "active" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                                                }`}>
                                                    {h.status === "active" ? "Active" : "Auto-Resolved"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {h.resolvedAt ? (
                                                    <div>
                                                        <span className="font-semibold block">{formatIST(h.resolvedAt)}</span>
                                                        <span className="text-[10px] text-slate-500 italic">{h.resolutionReason}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-rose-600 font-bold text-[11px]">Unresolved</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                {h.acknowledged ? (
                                                    <div>
                                                        <span className="font-black text-emerald-700 block">✓ Acknowledged</span>
                                                        <span className="text-[10px] text-slate-400">{h.adminNotes || "No notes"}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px]">Pending</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-slate-400 font-semibold">
                                            No alert history recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Acknowledge Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <div className="flex items-center space-x-2 text-rose-600 mb-3">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-black text-slate-900">Acknowledge Alert</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-4 font-medium">
                            Record administrative acknowledgment for <strong>{selectedAlert.user?.name}</strong> (Inactive for {selectedAlert.inactivityDurationMinutes} minutes).
                        </p>

                        <form onSubmit={handleAcknowledge} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Admin Notes / Observations</label>
                                <textarea
                                    rows="3"
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="E.g., Contacted employee on phone, laptop restart in progress..."
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                ></textarea>
                            </div>

                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedAlert(null)}
                                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md disabled:opacity-60"
                                >
                                    {actionLoading ? "Saving..." : "Confirm Acknowledgment"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InactivityMonitoring;
