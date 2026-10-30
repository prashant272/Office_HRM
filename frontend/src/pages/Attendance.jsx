import React, { useState, useEffect, useCallback } from "react";
import API from "../api/axios";
import {
    Clock,
    MapPin,
    CheckCircle2,
    XCircle,
    Loader2,
    Filter,
    Download,
    AlertCircle,
    Calendar,
    Send,
    Eye,
    Check,
    X,
    Wifi,
    FileText
} from "lucide-react";
import moment from "moment";
import { toast } from "react-hot-toast";

const formatIST = (dateStr) => {
    if (!dateStr) return "—";
    return moment(dateStr).utcOffset("+05:30").format("DD MMM, hh:mm A");
};

const Attendance = () => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    const isAdmin = userInfo?.role === "admin" || userInfo?.role === "manager";

    const [activeTab, setActiveTab] = useState(isAdmin ? "attendance" : "my_attendance");
    const [attendanceData, setAttendanceData] = useState([]);
    const [sessionsData, setSessionsData] = useState([]);
    const [correctionsData, setCorrectionsData] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters for Admin
    const [filterEmployee, setFilterEmployee] = useState("");
    const [filterDepartment, setFilterDepartment] = useState("All");
    const [filterDate, setFilterDate] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");

    // Employee specific state
    const [todayRecord, setTodayRecord] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    const [correctionForm, setCorrectionForm] = useState({
        date: moment().format("YYYY-MM-DD"),
        reason: "",
        proposedCheckIn: "",
        proposedCheckOut: "",
    });

    // Review Modal for Admin
    const [selectedCorrection, setSelectedCorrection] = useState(null);
    const [reviewStatus, setReviewStatus] = useState("Approved");
    const [adminComment, setAdminComment] = useState("");
    const [reviewLoading, setReviewLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (isAdmin) {
                const [attRes, sessRes, corrRes, empRes, deptRes] = await Promise.all([
                    API.get("/attendance", {
                        params: {
                            employee: filterEmployee || undefined,
                            department: filterDepartment !== "All" ? filterDepartment : undefined,
                            date: filterDate || undefined,
                            status: filterStatus !== "All" ? filterStatus : undefined,
                        },
                    }),
                    API.get("/attendance/sessions"),
                    API.get("/attendance/corrections"),
                    API.get("/employees"),
                    API.get("/departments"),
                ]);
                setAttendanceData(attRes.data || []);
                setSessionsData(sessRes.data || []);
                setCorrectionsData(corrRes.data || []);
                setEmployees(empRes.data || []);
                setDepartments(deptRes.data || []);
            } else {
                const { data } = await API.get("/attendance/my");
                setAttendanceData(data || []);
                const today = moment().format("YYYY-MM-DD");
                const todayRec = (data || []).find((r) => r.date === today);
                setTodayRecord(todayRec || null);
            }
        } catch (err) {
            console.error("Error fetching attendance data:", err);
            toast.error("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    }, [isAdmin, filterEmployee, filterDepartment, filterDate, filterStatus]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Employee Punch In / Out
    const handlePunch = async (type) => {
        setActionLoading(true);
        try {
            if (type === "checkin") {
                await API.post("/attendance/checkin", {
                    sessionId: userInfo?.sessionId,
                    location: { address: "Office / Geofence", lat: 28.6193, lng: 77.0293 },
                });
                toast.success("Clocked in successfully!");
            } else {
                await API.post("/attendance/checkout", {
                    location: { address: "Office / Geofence", lat: 28.6193, lng: 77.0293 },
                });
                toast.success("Clocked out successfully!");
            }
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Attendance punch failed");
        } finally {
            setActionLoading(false);
        }
    };

    // Employee submit correction request
    const handleSubmitCorrection = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await API.post("/attendance/correction", correctionForm);
            toast.success("Correction request submitted for Admin review!");
            setShowCorrectionModal(false);
            setCorrectionForm({
                date: moment().format("YYYY-MM-DD"),
                reason: "",
                proposedCheckIn: "",
                proposedCheckOut: "",
            });
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit correction request");
        } finally {
            setActionLoading(false);
        }
    };

    // Admin Review Correction
    const handleReviewCorrection = async (e) => {
        e.preventDefault();
        setReviewLoading(true);
        try {
            await API.put(`/attendance/corrections/${selectedCorrection._id}`, {
                status: reviewStatus,
                adminComment,
            });
            toast.success(`Correction request ${reviewStatus.toLowerCase()} successfully!`);
            setSelectedCorrection(null);
            setAdminComment("");
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to review correction");
        } finally {
            setReviewLoading(false);
        }
    };

    // CSV Export
    const handleExportCSV = () => {
        const baseUrl = API.defaults.baseURL || "http://localhost:5000/api";
        window.open(`${baseUrl}/attendance/export/csv`, "_blank");
    };

    if (loading && attendanceData.length === 0) {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-16 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {isAdmin ? "Attendance & Login Sessions History" : "My Attendance"}
                    </h1>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                        {isAdmin
                            ? "Complete log of employee daily attendance, browser sessions, and correction requests"
                            : "Daily check-in / check-out history and session duration"}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {isAdmin && (
                        <button
                            onClick={handleExportCSV}
                            className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-50 flex items-center justify-center space-x-2 shadow-sm transition-all"
                        >
                            <Download size={15} />
                            <span>Export CSV</span>
                        </button>
                    )}
                    {!isAdmin && (
                        <button
                            onClick={() => setShowCorrectionModal(true)}
                            className="w-full sm:w-auto px-5 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-blue-600 transition-all flex items-center justify-center space-x-2"
                        >
                            <FileText size={15} />
                            <span>Request Attendance Correction</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Admin Tabs */}
            {isAdmin && (
                <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
                    <button
                        onClick={() => setActiveTab("attendance")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                            activeTab === "attendance" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        Attendance Records ({attendanceData.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("sessions")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                            activeTab === "sessions" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        Live Session Logs ({sessionsData.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("corrections")}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                            activeTab === "corrections" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        <span>Correction Requests</span>
                        {correctionsData.filter((c) => c.correctionRequest?.status === "Pending").length > 0 && (
                            <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-black">
                                {correctionsData.filter((c) => c.correctionRequest?.status === "Pending").length}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {/* ======================================================== */}
            {/* ADMIN TAB 1: ALL ATTENDANCE RECORDS */}
            {/* ======================================================== */}
            {isAdmin && activeTab === "attendance" && (
                <div className="space-y-6">
                    {/* Filter Bar */}
                    <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Employee
                            </label>
                            <select
                                value={filterEmployee}
                                onChange={(e) => setFilterEmployee(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                            >
                                <option value="">All Employees</option>
                                {employees.map((emp) => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.name} ({emp.employeeId || "Staff"})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Department
                            </label>
                            <select
                                value={filterDepartment}
                                onChange={(e) => setFilterDepartment(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                            >
                                <option value="All">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Specific Date
                            </label>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                Status
                            </label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Present">Present</option>
                                <option value="Late">Late</option>
                                <option value="Half-Day">Half-Day</option>
                                <option value="Absent">Absent</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                        <th className="py-4 px-6">Employee ID & Name</th>
                                        <th className="py-4 px-6">Department</th>
                                        <th className="py-4 px-6">Date</th>
                                        <th className="py-4 px-6">Check-In (IST)</th>
                                        <th className="py-4 px-6">Check-Out (IST)</th>
                                        <th className="py-4 px-6">Duration</th>
                                        <th className="py-4 px-6">Shift</th>
                                        <th className="py-4 px-6 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {attendanceData.length > 0 ? (
                                        attendanceData.map((r) => (
                                            <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-4 px-6">
                                                    <span className="font-mono text-[10px] text-slate-400 block">
                                                        {r.user?.employeeId || "EMP-N/A"}
                                                    </span>
                                                    <span className="font-black text-slate-900 text-sm block">
                                                        {r.user?.name || "Staff"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-slate-600 font-semibold">
                                                    {r.user?.department?.name || "General"}
                                                </td>
                                                <td className="py-4 px-6 font-bold text-slate-800">{r.date}</td>
                                                <td className="py-4 px-6 font-semibold">{formatIST(r.checkIn)}</td>
                                                <td className="py-4 px-6 font-semibold">{formatIST(r.checkOut)}</td>
                                                <td className="py-4 px-6">
                                                    {r.workDuration ? `${r.workDuration} mins` : "—"}
                                                </td>
                                                <td className="py-4 px-6 text-slate-500 text-[11px] truncate max-w-xs">
                                                    {r.shift || "General Shift"}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-[11px] font-black ${
                                                            r.status === "Present"
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : r.status === "Late"
                                                                ? "bg-amber-100 text-amber-800"
                                                                : r.status === "Half-Day"
                                                                ? "bg-purple-100 text-purple-800"
                                                                : "bg-rose-100 text-rose-800"
                                                        }`}
                                                    >
                                                        {r.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="py-12 text-center text-slate-400 font-semibold">
                                                No attendance records match your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* ADMIN TAB 2: LIVE SESSION LOGS */}
            {/* ======================================================== */}
            {isAdmin && activeTab === "sessions" && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-base font-black text-slate-900">
                            Authenticated Sessions & Heartbeat Logs
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            Server-maintained records. When heartbeats pause, session status transitions to heartbeat_missing, and triggers an inactivity alert after &gt;10 mins.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                    <th className="py-4 px-6">Employee</th>
                                    <th className="py-4 px-6">Session ID</th>
                                    <th className="py-4 px-6">Device & Browser</th>
                                    <th className="py-4 px-6">Login Time (IST)</th>
                                    <th className="py-4 px-6">Last Confirmed Heartbeat</th>
                                    <th className="py-4 px-6">Duration</th>
                                    <th className="py-4 px-6 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {sessionsData.map((s) => (
                                    <tr key={s._id} className="hover:bg-slate-50/70">
                                        <td className="py-4 px-6">
                                            <span className="font-black text-slate-900 block">{s.user?.name}</span>
                                            <span className="text-[11px] text-slate-400">{s.user?.department?.name || "Staff"}</span>
                                        </td>
                                        <td className="py-4 px-6 font-mono text-slate-600">
                                            {s.sessionId?.slice(0, 16)}...
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="block font-semibold text-slate-800">{s.deviceInfo?.browser}</span>
                                            <span className="text-[10px] text-slate-400">{s.deviceInfo?.os} · {s.deviceInfo?.ipAddress}</span>
                                        </td>
                                        <td className="py-4 px-6 font-semibold">{formatIST(s.loginTime)}</td>
                                        <td className="py-4 px-6 font-semibold">{formatIST(s.lastHeartbeat)}</td>
                                        <td className="py-4 px-6">{s.durationMinutes || 0} mins</td>
                                        <td className="py-4 px-6 text-right">
                                            {s.sessionStatus === "active" && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Active
                                                </span>
                                            )}
                                            {s.sessionStatus === "heartbeat_missing" && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                    Heartbeat Missing
                                                </span>
                                            )}
                                            {s.sessionStatus === "inactive" && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">
                                                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                                    Inactive &gt; 10m
                                                </span>
                                            )}
                                            {s.sessionStatus === "logged_out" && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-600">
                                                    Logged Out
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* ADMIN TAB 3: CORRECTION REQUESTS */}
            {/* ======================================================== */}
            {isAdmin && activeTab === "corrections" && (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                    <th className="py-4 px-6">Employee</th>
                                    <th className="py-4 px-6">Date to Correct</th>
                                    <th className="py-4 px-6">Reason Provided</th>
                                    <th className="py-4 px-6">Proposed Timings (IST)</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6 text-right">Review Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {correctionsData.length > 0 ? (
                                    correctionsData.map((c) => (
                                        <tr key={c._id} className="hover:bg-slate-50/70">
                                            <td className="py-4 px-6">
                                                <span className="font-black text-slate-900 block">{c.user?.name}</span>
                                                <span className="text-[11px] text-slate-400">{c.user?.department?.name || "Staff"}</span>
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-900">{c.date}</td>
                                            <td className="py-4 px-6 max-w-xs text-slate-700 font-medium">
                                                {c.correctionRequest?.reason}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div>In: <strong>{formatIST(c.correctionRequest?.proposedCheckIn)}</strong></div>
                                                <div>Out: <strong>{formatIST(c.correctionRequest?.proposedCheckOut)}</strong></div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                                                    c.correctionRequest?.status === "Approved"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : c.correctionRequest?.status === "Rejected"
                                                        ? "bg-rose-100 text-rose-800"
                                                        : "bg-amber-100 text-amber-800"
                                                }`}>
                                                    {c.correctionRequest?.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCorrection(c);
                                                        setReviewStatus("Approved");
                                                        setAdminComment("");
                                                    }}
                                                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                                                >
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-slate-400 font-semibold">
                                            No attendance correction requests submitted.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* EMPLOYEE VIEW: ATTENDANCE HISTORY & PUNCH */}
            {/* ======================================================== */}
            {!isAdmin && (
                <div className="space-y-6">
                    {/* Today's Punch Card */}
                    <div className="p-5 sm:p-8 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                                Today: {moment().format("DD MMMM YYYY")}
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
                                {todayRecord?.checkIn ? "You are Checked In" : "You have not Checked In yet"}
                            </h2>
                            <p className="text-xs font-semibold text-slate-500 mt-1">
                                Shift: General Shift (09:30 AM – 06:30 PM IST)
                            </p>
                        </div>

                        <div className="flex items-center w-full sm:w-auto">
                            {!todayRecord?.checkIn ? (
                                <button
                                    onClick={() => handlePunch("checkin")}
                                    disabled={actionLoading}
                                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-primary hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:opacity-60"
                                >
                                    {actionLoading ? "Processing..." : "Clock In Now"}
                                </button>
                            ) : !todayRecord?.checkOut ? (
                                <button
                                    onClick={() => handlePunch("checkout")}
                                    disabled={actionLoading}
                                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-60"
                                >
                                    {actionLoading ? "Processing..." : "Clock Out"}
                                </button>
                            ) : (
                                <span className="w-full sm:w-auto text-center px-6 py-3 bg-emerald-100 text-emerald-800 font-black text-xs uppercase rounded-2xl">
                                    Today's Attendance Completed
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Attendance History Table */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-slate-100">
                            <h3 className="text-base sm:text-lg font-black text-slate-900">My Attendance History</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                        <th className="py-4 px-6">Date</th>
                                        <th className="py-4 px-6">Check-In (IST)</th>
                                        <th className="py-4 px-6">Check-Out (IST)</th>
                                        <th className="py-4 px-6">Duration</th>
                                        <th className="py-4 px-6">Shift</th>
                                        <th className="py-4 px-6">Correction</th>
                                        <th className="py-4 px-6 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {attendanceData.map((r) => (
                                        <tr key={r._id} className="hover:bg-slate-50/70">
                                            <td className="py-4 px-6 font-bold text-slate-900">{r.date}</td>
                                            <td className="py-4 px-6 font-semibold">{formatIST(r.checkIn)}</td>
                                            <td className="py-4 px-6 font-semibold">{formatIST(r.checkOut)}</td>
                                            <td className="py-4 px-6">
                                                {r.workDuration ? `${r.workDuration} mins` : "—"}
                                            </td>
                                            <td className="py-4 px-6 text-slate-500">{r.shift || "General Shift"}</td>
                                            <td className="py-4 px-6">
                                                {r.correctionRequest?.requested ? (
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                        r.correctionRequest.status === "Approved"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : r.correctionRequest.status === "Rejected"
                                                            ? "bg-rose-100 text-rose-800"
                                                            : "bg-amber-100 text-amber-800"
                                                    }`}>
                                                        Correction: {r.correctionRequest.status}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-[11px] font-black ${
                                                        r.status === "Present"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : r.status === "Late"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-rose-100 text-rose-800"
                                                    }`}
                                                >
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Correction Request Modal (Employee) */}
            {showCorrectionModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base sm:text-lg font-black text-slate-900">Request Attendance Correction</h3>
                            <button
                                onClick={() => setShowCorrectionModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mb-6">
                            Submit a correction if your session was interrupted, power cut occurred, or logout was missed.
                        </p>

                        <form onSubmit={handleSubmitCorrection} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Date to Correct *</label>
                                <input
                                    type="date"
                                    required
                                    value={correctionForm.date}
                                    onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Proposed Check-In Time</label>
                                    <input
                                        type="datetime-local"
                                        value={correctionForm.proposedCheckIn}
                                        onChange={(e) => setCorrectionForm({ ...correctionForm, proposedCheckIn: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Proposed Check-Out Time</label>
                                    <input
                                        type="datetime-local"
                                        value={correctionForm.proposedCheckOut}
                                        onChange={(e) => setCorrectionForm({ ...correctionForm, proposedCheckOut: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Correction *</label>
                                <textarea
                                    rows="3"
                                    required
                                    value={correctionForm.reason}
                                    onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                                    placeholder="E.g., Laptop battery died unexpectedly during field visit..."
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                ></textarea>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCorrectionModal(false)}
                                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 text-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-blue-600 transition-all disabled:opacity-60 text-center"
                                >
                                    {actionLoading ? "Submitting..." : "Submit Correction Request"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Admin Review Correction Modal */}
            {selectedCorrection && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95">
                        <h3 className="text-lg font-black text-slate-900 mb-2">Review Attendance Correction</h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Employee: <strong>{selectedCorrection.user?.name}</strong> for date <strong>{selectedCorrection.date}</strong>
                        </p>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Reason</span>
                            <p className="text-slate-800 font-medium">{selectedCorrection.correctionRequest?.reason}</p>
                        </div>

                        <form onSubmit={handleReviewCorrection} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Action</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setReviewStatus("Approved")}
                                        className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
                                            reviewStatus === "Approved"
                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                                : "bg-white text-slate-600 border-slate-200"
                                        }`}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReviewStatus("Rejected")}
                                        className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
                                            reviewStatus === "Rejected"
                                                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                                : "bg-white text-slate-600 border-slate-200"
                                        }`}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Admin Remark</label>
                                <textarea
                                    rows="2"
                                    value={adminComment}
                                    onChange={(e) => setAdminComment(e.target.value)}
                                    placeholder="Optional remark for the employee..."
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                                ></textarea>
                            </div>

                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCorrection(null)}
                                    className="px-4 py-2 text-xs font-bold text-slate-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={reviewLoading}
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider"
                                >
                                    {reviewLoading ? "Saving..." : `Confirm ${reviewStatus}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
