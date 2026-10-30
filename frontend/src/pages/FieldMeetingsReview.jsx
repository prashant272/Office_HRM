import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
    Briefcase,
    Calendar,
    Clock,
    MapPin,
    CheckCircle2,
    XCircle,
    Eye,
    Download,
    Filter,
    Search,
    ShieldAlert,
    Check,
    X,
    Loader2
} from "lucide-react";
import moment from "moment";
import { toast } from "react-hot-toast";

const formatIST = (dateStr) => {
    if (!dateStr) return "—";
    return moment(dateStr).utcOffset("+05:30").format("DD MMM YYYY, hh:mm A");
};

const FieldMeetingsReview = () => {
    const [meetings, setMeetings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchClient, setSearchClient] = useState("");
    const [filterEmployee, setFilterEmployee] = useState("");
    const [filterApproval, setFilterApproval] = useState("All");

    // Review Modal State
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [reviewDecision, setReviewDecision] = useState("Approved");
    const [adminNotes, setAdminNotes] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    const fetchMeetings = async () => {
        try {
            const { data } = await API.get("/field-meetings");
            setMeetings(data);
        } catch (err) {
            console.error("Error fetching meetings:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const { data } = await API.get("/employees");
            setEmployees(data);
        } catch (err) {
            console.error("Error fetching employees:", err);
        }
    };

    useEffect(() => {
        fetchMeetings();
        fetchEmployees();
    }, []);

    // Review Submit (Approve or Reject)
    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (reviewDecision === "Rejected" && !adminNotes.trim()) {
            toast.error("Please provide a reason for rejecting the meeting.");
            return;
        }

        setActionLoading(true);
        try {
            await API.put(`/field-meetings/${selectedMeeting._id}/review`, {
                approvalStatus: reviewDecision,
                adminReviewNotes: adminNotes,
            });
            toast.success(`Meeting has been ${reviewDecision.toLowerCase()} successfully!`);
            setSelectedMeeting(null);
            setAdminNotes("");
            fetchMeetings();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update review status");
        } finally {
            setActionLoading(false);
        }
    };

    // CSV Export
    const handleExportCSV = () => {
        const baseUrl = API.defaults.baseURL || "http://localhost:5000/api";
        window.open(`${baseUrl}/field-meetings/export/csv`, "_blank");
    };

    const filteredMeetings = meetings.filter((m) => {
        if (filterApproval !== "All" && m.approvalStatus !== filterApproval) return false;
        if (filterEmployee && m.employee?._id !== filterEmployee) return false;
        if (searchClient) {
            const term = searchClient.toLowerCase();
            const clientMatch = m.clientName?.toLowerCase().includes(term);
            const compMatch = m.clientCompany?.toLowerCase().includes(term);
            if (!clientMatch && !compMatch) return false;
        }
        return true;
    });

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
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Field Sales Meetings Review</h1>
                    <p className="text-sm font-semibold text-slate-500 mt-1">
                        Verify field attendance evidence, review client mobile OTP status, and approve submitted meetings
                    </p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-slate-700 hover:bg-slate-50 flex items-center space-x-2 shadow-sm transition-all"
                >
                    <Download size={16} />
                    <span>Export Report (CSV)</span>
                </button>
            </div>

            {/* Filter Controls Bar */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Search Client / Company
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchClient}
                            onChange={(e) => setSearchClient(e.target.value)}
                            placeholder="Search by client or company..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Filter by Employee
                    </label>
                    <select
                        value={filterEmployee}
                        onChange={(e) => setFilterEmployee(e.target.value)}
                        className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
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
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Approval Status
                    </label>
                    <select
                        value={filterApproval}
                        onChange={(e) => setFilterApproval(e.target.value)}
                        className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Pending_Approval">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Draft">Draft</option>
                    </select>
                </div>
            </div>

            {/* Meetings Review Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                <th className="py-4 px-6">Employee</th>
                                <th className="py-4 px-6">Client & Company</th>
                                <th className="py-4 px-6">Location</th>
                                <th className="py-4 px-6">Date</th>
                                <th className="py-4 px-6">OTP Verification</th>
                                <th className="py-4 px-6">Evidence</th>
                                <th className="py-4 px-6">Approval Status</th>
                                <th className="py-4 px-6 text-right">Review Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {filteredMeetings.length > 0 ? (
                                filteredMeetings.map((m) => (
                                    <tr key={m._id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-4 px-6">
                                            <span className="font-black text-slate-900 block">{m.employee?.name || "Unknown"}</span>
                                            <span className="text-[11px] text-slate-400">{m.employee?.department?.name || "Field Sales"}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="font-bold text-slate-900 block">{m.clientName}</span>
                                            <span className="text-slate-500 text-[11px]">{m.clientCompany} ({m.clientPhone})</span>
                                        </td>
                                        <td className="py-4 px-6 max-w-xs truncate text-slate-500">
                                            {m.location?.address}
                                        </td>
                                        <td className="py-4 px-6 font-semibold">
                                            {m.scheduledDate}
                                        </td>
                                        <td className="py-4 px-6">
                                            {m.verification?.isVerified ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                                    <CheckCircle2 size={12} /> Verified (OTP)
                                                </span>
                                            ) : m.verification?.bypassRequested ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                                    <ShieldAlert size={12} /> Override Requested
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 font-semibold text-[10px]">Unverified</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center space-x-1.5">
                                                {m.evidence?.selfieUrl && (
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                                                        Selfie
                                                    </span>
                                                )}
                                                {m.evidence?.businessCardUrl && (
                                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold">
                                                        Card
                                                    </span>
                                                )}
                                                {!m.evidence?.selfieUrl && !m.evidence?.businessCardUrl && (
                                                    <span className="text-slate-400 text-[10px]">None</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
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
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => {
                                                    setSelectedMeeting(m);
                                                    setReviewDecision(m.approvalStatus === "Rejected" ? "Rejected" : "Approved");
                                                    setAdminNotes(m.adminReviewNotes || "");
                                                }}
                                                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
                                            >
                                                <Eye size={13} />
                                                <span>Review</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-slate-400 font-semibold">
                                        No meetings match your filter criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Review & Approval Modal */}
            {selectedMeeting && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-100 my-8">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-6">
                            <div>
                                <span className="text-[10px] font-black uppercase text-primary tracking-wider bg-primary/10 px-2.5 py-1 rounded-full">
                                    Administrative Field Meeting Review
                                </span>
                                <h3 className="text-xl font-black text-slate-900 mt-2">{selectedMeeting.title}</h3>
                                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                    Submitted by <strong>{selectedMeeting.employee?.name}</strong> for {selectedMeeting.clientCompany}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedMeeting(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Meeting Information Details */}
                        <div className="space-y-6 text-xs">
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Client Information</span>
                                    <span className="font-black text-slate-900 text-sm block mt-0.5">{selectedMeeting.clientName}</span>
                                    <span className="text-slate-600 block">{selectedMeeting.clientCompany}</span>
                                    <span className="text-slate-500">{selectedMeeting.clientPhone}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Location & Timing</span>
                                    <span className="font-semibold text-slate-800 block mt-0.5">{selectedMeeting.location?.address}</span>
                                    <span className="text-slate-500 block">Date: {selectedMeeting.scheduledDate}</span>
                                    <span className="text-slate-500">Completed at: {formatIST(selectedMeeting.actualEndTime)}</span>
                                </div>
                            </div>

                            {/* OTP Verification Inspection (Without revealing raw OTP) */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                    Mobile OTP Verification Audit
                                </span>
                                {selectedMeeting.verification?.isVerified ? (
                                    <div className="text-emerald-800 font-bold flex items-center gap-2">
                                        <CheckCircle2 size={18} className="text-emerald-600" />
                                        <span>Client Verified On-Site via Mobile SMS OTP at {formatIST(selectedMeeting.verification.verifiedAt)} IST</span>
                                    </div>
                                ) : selectedMeeting.verification?.bypassRequested ? (
                                    <div className="text-amber-800 space-y-1">
                                        <div className="flex items-center gap-1.5 font-bold">
                                            <ShieldAlert size={16} className="text-amber-600" />
                                            <span>Manual Override Requested</span>
                                        </div>
                                        <p className="text-slate-700 bg-amber-100/60 p-2.5 rounded-xl border border-amber-200">
                                            Reason: "{selectedMeeting.verification.bypassReason}"
                                        </p>
                                    </div>
                                ) : (
                                    <span className="text-rose-600 font-bold">⚠️ OTP was not verified for this meeting.</span>
                                )}
                            </div>

                            {/* Evidence Viewer: Live Selfie & Business Card */}
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                                    Evidence Inspection (Live Selfie & Business Card)
                                </span>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                        <span className="text-[10px] font-bold text-slate-500 block mb-2">Employee On-Site Selfie</span>
                                        {selectedMeeting.evidence?.selfieUrl ? (
                                            <a href={selectedMeeting.evidence.selfieUrl} target="_blank" rel="noreferrer" className="block group">
                                                <img
                                                    src={selectedMeeting.evidence.selfieUrl}
                                                    alt="Live Selfie"
                                                    className="w-full h-44 object-cover rounded-xl border border-slate-200 group-hover:opacity-90 transition-opacity"
                                                />
                                                <span className="text-[10px] text-primary font-bold mt-1 block">Click to view high-res</span>
                                            </a>
                                        ) : (
                                            <div className="h-44 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 font-medium">
                                                No selfie captured
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                        <span className="text-[10px] font-bold text-slate-500 block mb-2">Client Business Card</span>
                                        {selectedMeeting.evidence?.businessCardUrl ? (
                                            <a href={selectedMeeting.evidence.businessCardUrl} target="_blank" rel="noreferrer" className="block group">
                                                <img
                                                    src={selectedMeeting.evidence.businessCardUrl}
                                                    alt="Business Card"
                                                    className="w-full h-44 object-cover rounded-xl border border-slate-200 group-hover:opacity-90 transition-opacity"
                                                />
                                                <span className="text-[10px] text-primary font-bold mt-1 block">Click to view high-res</span>
                                            </a>
                                        ) : (
                                            <div className="h-44 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 font-medium">
                                                No card uploaded
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Discussion Summary & Outcomes */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Discussion Notes</span>
                                    <p className="text-slate-800 font-medium mt-0.5">{selectedMeeting.discussionSummary || "—"}</p>
                                </div>
                                {selectedMeeting.outcomes && (
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Outcomes / Next Steps</span>
                                        <p className="text-slate-800 font-medium mt-0.5">{selectedMeeting.outcomes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Decision Form */}
                            <form onSubmit={handleReviewSubmit} className="pt-4 border-t border-slate-100 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-2">Administrative Decision</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setReviewDecision("Approved")}
                                            className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                                                reviewDecision === "Approved"
                                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20"
                                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                            }`}
                                        >
                                            <Check size={16} />
                                            <span>Approve Meeting</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReviewDecision("Rejected")}
                                            className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                                                reviewDecision === "Rejected"
                                                    ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20"
                                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                            }`}
                                        >
                                            <X size={16} />
                                            <span>Reject Meeting</span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Admin Review Notes / Reason {reviewDecision === "Rejected" && "*"}
                                    </label>
                                    <textarea
                                        rows="2"
                                        required={reviewDecision === "Rejected"}
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder={
                                            reviewDecision === "Approved"
                                                ? "Optional approval remark (e.g. Validated with client over phone)..."
                                                : "Mandatory rejection reason (e.g. Selfie does not match client location)..."
                                        }
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                    ></textarea>
                                </div>

                                <div className="flex items-center justify-end space-x-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMeeting(null)}
                                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-60"
                                    >
                                        {actionLoading ? "Submitting..." : `Confirm ${reviewDecision}`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FieldMeetingsReview;
