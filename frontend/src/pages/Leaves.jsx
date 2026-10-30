import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { Calendar, Clock, AlertCircle, CheckCircle2, XCircle, Plus, Send, Loader2 } from "lucide-react";
import moment from "moment";

const Leaves = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showApply, setShowApply] = useState(false);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    // Form state
    const [formData, setFormData] = useState({
        leaveType: "Sick",
        startDate: "",
        endDate: "",
        reason: ""
    });

    const fetchLeaves = async () => {
        try {
            const { data } = await API.get("/leaves");
            setLeaves(data);
        } catch (err) {
            console.error("Error fetching leaves:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    const handleApply = async (e) => {
        e.preventDefault();
        try {
            await API.post("/leaves", formData);
            setShowApply(false);
            fetchLeaves();
        } catch (err) {
            alert("Failed to apply for leave");
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await API.put(`/leaves/${id}/status`, { status });
            fetchLeaves();
        } catch (err) {
            alert("Failed to update status");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Time Off</h1>
                    <p className="text-text-muted mt-1 font-medium">Request and manage leave applications</p>
                </div>
                <button
                    onClick={() => setShowApply(true)}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center space-x-2 hover:bg-blue-700 transition-all active:scale-95"
                >
                    <Plus size={18} />
                    <span>New Request</span>
                </button>
            </div>

            {showApply && (
                <div className="glass-card p-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-secondary">Apply for Leave</h3>
                        <button onClick={() => setShowApply(false)} className="text-text-muted hover:text-secondary"><XCircle size={24} /></button>
                    </div>
                    <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-secondary">Leave Type</label>
                            <select
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.leaveType}
                                onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                            >
                                <option>Sick</option>
                                <option>Casual</option>
                                <option>Vacation</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-secondary">Reason</label>
                            <input
                                type="text"
                                placeholder="Brief reason for leave"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-secondary">Start Date</label>
                            <input
                                type="date"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-secondary">End Date</label>
                            <input
                                type="date"
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                required
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button type="submit" className="px-10 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center space-x-2">
                                <Send size={18} />
                                <span>Submit Request</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {leaves.map((leave) => (
                    <div key={leave._id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/20 transition-all">
                        <div className="flex items-center space-x-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${leave.status === "Approved" ? "bg-emerald-50 text-emerald-600" :
                                leave.status === "Rejected" ? "bg-rose-50 text-rose-600" : "bg-orange-50 text-orange-600"
                                }`}>
                                {leave.status === "Approved" ? <CheckCircle2 size={28} /> :
                                    leave.status === "Rejected" ? <XCircle size={28} /> : <Clock size={28} />}
                            </div>
                            <div>
                                <div className="flex items-center space-x-3 mb-1">
                                    <h4 className="font-extrabold text-secondary">{leave.leaveType} Leave</h4>
                                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${leave.status === "Approved" ? "bg-emerald-100 text-emerald-700" :
                                        leave.status === "Rejected" ? "bg-rose-100 text-rose-700" : "bg-orange-100 text-orange-700"
                                        }`}>
                                        {leave.status}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-4 text-xs font-bold text-text-muted">
                                    <span className="flex items-center space-x-1.5 font-medium">
                                        <Calendar size={14} className="text-primary" />
                                        <span>{moment(leave.startDate).format("DD MMM")} - {moment(leave.endDate).format("DD MMM, YYYY")}</span>
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-secondary italic">"{leave.reason}"</span>
                                </div>
                                {userInfo.role !== "employee" || (leave.user?._id !== userInfo._id) ? (
                                    <p className="text-[10px] font-extrabold text-primary mt-2 uppercase tracking-widest">Requester: {leave.user?.name}</p>
                                ) : null}
                            </div>
                        </div>

                        {(userInfo.role !== "employee" || (leave.user?._id !== userInfo._id)) && leave.status === "Pending" && (
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => updateStatus(leave._id, "Rejected")}
                                    className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-all"
                                >
                                    Reject
                                </button>
                                <button
                                    onClick={() => updateStatus(leave._id, "Approved")}
                                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                                >
                                    Approve
                                </button>
                            </div>
                        )}

                        {leave.status !== "Pending" && (
                            <div className="text-right">
                                <p className="text-[11px] font-bold text-text-muted mb-1">Process by:</p>
                                <p className="text-sm font-bold text-secondary">{leave.approvedBy?.name || "System"}</p>
                            </div>
                        )}
                    </div>
                ))}
                {leaves.length === 0 && (
                    <div className="glass-card p-12 text-center text-text-muted italic bg-slate-50/50 border-dashed">
                        No leave history recorded yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaves;
