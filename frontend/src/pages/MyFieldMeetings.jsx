import React, { useState, useEffect, useRef } from "react";
import API from "../api/axios";
import {
    Briefcase,
    Calendar,
    Clock,
    MapPin,
    CheckCircle2,
    XCircle,
    Camera,
    Upload,
    Phone,
    Mail,
    Building2,
    ShieldCheck,
    AlertTriangle,
    Plus,
    RefreshCw,
    Eye,
    ChevronRight,
    ChevronLeft,
    Check,
    Loader2
} from "lucide-react";
import moment from "moment";
import { toast } from "react-hot-toast";

const formatIST = (dateStr) => {
    if (!dateStr) return "—";
    return moment(dateStr).utcOffset("+05:30").format("DD MMM YYYY, hh:mm A");
};

const MyFieldMeetings = () => {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("All");

    // Modal & Wizard State
    const [showWizard, setShowWizard] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [activeMeetingId, setActiveMeetingId] = useState(null);
    const [selectedMeetingDetails, setSelectedMeetingDetails] = useState(null);

    // Form Data - Step 1: Client Info
    const [clientForm, setClientForm] = useState({
        title: "",
        meetingType: "scheduled",
        clientName: "",
        clientCompany: "",
        clientPhone: "",
        clientEmail: "",
        address: "Client Office / On-site",
        lat: 28.6139,
        lng: 77.2090,
        scheduledDate: moment().format("YYYY-MM-DD"),
        scheduledStartTime: moment().format("HH:mm"),
    });

    // Form Data - Step 2: OTP
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [devOtp, setDevOtp] = useState("");
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [showBypassModal, setShowBypassModal] = useState(false);
    const [bypassReason, setBypassReason] = useState("");
    const [isBypassRequested, setIsBypassRequested] = useState(false);

    // Form Data - Step 3 & 4: Evidence Camera & Card
    const [selfieSnapshot, setSelfieSnapshot] = useState(null);
    const [businessCardSnapshot, setBusinessCardSnapshot] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Form Data - Step 5: Notes & Outcomes
    const [notesForm, setNotesForm] = useState({
        meetingNotes: "",
        discussionSummary: "",
        outcomes: "",
        followUpDate: moment().add(3, "days").format("YYYY-MM-DD"),
    });

    const [submitting, setSubmitting] = useState(false);

    const fetchMyMeetings = async () => {
        try {
            const { data } = await API.get("/field-meetings/my");
            setMeetings(data);
        } catch (err) {
            console.error("Error fetching meetings:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyMeetings();
    }, []);

    // Camera Handlers
    const startCamera = async () => {
        try {
            setCameraActive(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.warn("Camera access error:", err.message);
            toast.error("Unable to access camera. Please allow camera permissions or upload an image.");
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const captureSelfie = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setSelfieSnapshot(dataUrl);
        stopCamera();
        toast.success("Selfie captured successfully!");
    };

    const handleFileUpload = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size must be under 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            if (type === "card") {
                setBusinessCardSnapshot(reader.result);
                toast.success("Business card uploaded successfully!");
            } else if (type === "selfie") {
                setSelfieSnapshot(reader.result);
                toast.success("Selfie uploaded successfully!");
            }
        };
        reader.readAsDataURL(file);
    };

    // Step 1: Create Draft Meeting
    const handleCreateDraft = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { data } = await API.post("/field-meetings", {
                ...clientForm,
                location: { address: clientForm.address, lat: clientForm.lat, lng: clientForm.lng },
            });
            setActiveMeetingId(data._id);
            setWizardStep(2);
            toast.success("Client details saved! Proceeding to OTP verification.");

            // Automatically send OTP to WhatsApp right away
            try {
                setOtpLoading(true);
                await API.post(`/field-meetings/${data._id}/send-otp`);
                setOtpSent(true);
                toast.success(`OTP sent to WhatsApp: ${clientForm.clientPhone}`);
            } catch (otpErr) {
                console.error("Auto send OTP error:", otpErr);
            } finally {
                setOtpLoading(false);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to initiate meeting");
        } finally {
            setSubmitting(false);
        }
    };

    // Step 2: Send OTP
    const handleSendOtp = async () => {
        if (!activeMeetingId) {
            toast.error("Meeting ID not found. Please click Back and re-submit.");
            return;
        }
        setOtpLoading(true);
        try {
            const { data } = await API.post(`/field-meetings/${activeMeetingId}/send-otp`);
            setOtpSent(true);
            toast.success(`OTP sent to WhatsApp: ${clientForm.clientPhone}`);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send OTP via WhatsApp");
        } finally {
            setOtpLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async () => {
        if (!otp) {
            toast.error("Please enter the 6-digit OTP");
            return;
        }
        setOtpLoading(true);
        try {
            await API.post(`/field-meetings/${activeMeetingId}/verify-otp`, { otp });
            setIsOtpVerified(true);
            toast.success("✅ Client mobile OTP verified successfully!");
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid OTP");
        } finally {
            setOtpLoading(false);
        }
    };

    // Step 2: Bypass Request
    const handleBypassRequest = async () => {
        if (!bypassReason) {
            toast.error("Please provide a reason for override");
            return;
        }
        try {
            await API.post(`/field-meetings/${activeMeetingId}/request-bypass`, { reason: bypassReason });
            setIsBypassRequested(true);
            setShowBypassModal(false);
            toast.success("Override request registered for Admin review.");
        } catch (err) {
            toast.error(err.response?.data?.message || "Override request failed");
        }
    };

    // Step 5: Finalize and Submit Meeting
    const handleFinalSubmit = async () => {
        setSubmitting(true);
        try {
            // 1. Upload evidence (selfie and card)
            if (selfieSnapshot || businessCardSnapshot) {
                await API.post(`/field-meetings/${activeMeetingId}/evidence`, {
                    selfieBase64: selfieSnapshot,
                    businessCardBase64: businessCardSnapshot,
                    location: { address: clientForm.address, lat: clientForm.lat, lng: clientForm.lng },
                });
            }

            // 2. Complete Meeting
            await API.post(`/field-meetings/${activeMeetingId}/complete`, notesForm);

            toast.success("🎉 Meeting submitted successfully for Admin approval!");
            setShowWizard(false);
            // Reset Wizard State
            setWizardStep(1);
            setActiveMeetingId(null);
            setSelfieSnapshot(null);
            setBusinessCardSnapshot(null);
            setOtp("");
            setOtpSent(false);
            setIsOtpVerified(false);
            setIsBypassRequested(false);
            fetchMyMeetings();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit meeting");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredMeetings = meetings.filter((m) => {
        if (filterStatus === "All") return true;
        if (filterStatus === "Approved") return m.approvalStatus === "Approved";
        if (filterStatus === "Pending") return m.approvalStatus === "Pending_Approval";
        if (filterStatus === "Rejected") return m.approvalStatus === "Rejected";
        return true;
    });

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 pb-16 font-sans">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Field Sales Meetings</h1>
                    <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                        Schedule client visits, verify on-site presence with mobile OTP, and capture evidence
                    </p>
                </div>
                <button
                    onClick={() => {
                        setShowWizard(true);
                        setWizardStep(1);
                        setSelfieSnapshot(null);
                        setBusinessCardSnapshot(null);
                        setIsOtpVerified(false);
                        setIsBypassRequested(false);
                    }}
                    className="w-full sm:w-auto justify-center px-6 py-3.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-primary/25 hover:bg-blue-600 active:scale-95 transition-all"
                >
                    <Plus size={18} />
                    <span>New Field Meeting</span>
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
                {["All", "Pending", "Approved", "Rejected"].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                            filterStatus === status
                                ? "bg-slate-900 text-white shadow-sm"
                                : "text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                        {status} Meetings
                    </button>
                ))}
            </div>

            {/* Meetings Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                <th className="py-4 px-6">Client & Company</th>
                                <th className="py-4 px-6">Meeting Title</th>
                                <th className="py-4 px-6">Location</th>
                                <th className="py-4 px-6">Date & Time</th>
                                <th className="py-4 px-6">OTP Verification</th>
                                <th className="py-4 px-6">Approval Status</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {filteredMeetings.length > 0 ? (
                                filteredMeetings.map((m) => (
                                    <tr key={m._id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-4 px-6">
                                            <span className="font-black text-slate-900 block text-sm">{m.clientName}</span>
                                            <span className="text-slate-500 text-[11px] font-semibold">{m.clientCompany}</span>
                                        </td>
                                        <td className="py-4 px-6 font-bold text-slate-800">{m.title}</td>
                                        <td className="py-4 px-6 max-w-xs truncate text-slate-500">
                                            {m.location?.address || "On-site"}
                                        </td>
                                        <td className="py-4 px-6 font-semibold">
                                            <span className="block">{m.scheduledDate}</span>
                                            <span className="text-[10px] text-slate-400">{m.scheduledStartTime || "—"}</span>
                                        </td>
                                        <td className="py-4 px-6">
                                            {m.verification?.isVerified ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                                                    <CheckCircle2 size={13} /> OTP Verified
                                                </span>
                                            ) : m.verification?.bypassRequested ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                                                    <AlertTriangle size={13} /> Override Requested
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-600">
                                                    Pending
                                                </span>
                                            )}
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
                                                onClick={() => setSelectedMeetingDetails(m)}
                                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all font-bold inline-flex items-center gap-1 text-xs"
                                            >
                                                <Eye size={14} />
                                                <span>View</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-slate-400 font-semibold">
                                        No meetings found under this filter. Click "New Field Meeting" to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 5-Step Field Sales Meeting Execution Modal */}
            {showWizard && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-8 shadow-2xl border border-slate-100 my-auto max-h-[92vh] overflow-y-auto">
                        {/* Progress Stepper Bar */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
                                <span>Step {wizardStep} of 5</span>
                                <span className="text-primary font-bold">
                                    {wizardStep === 1 && "Client Details"}
                                    {wizardStep === 2 && "OTP Verification"}
                                    {wizardStep === 3 && "Live Selfie Capture"}
                                    {wizardStep === 4 && "Business Card Evidence"}
                                    {wizardStep === 5 && "Notes & Review Submit"}
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                {[1, 2, 3, 4, 5].map((step) => (
                                    <div
                                        key={step}
                                        className={`flex-1 transition-all duration-300 ${
                                            step <= wizardStep ? "bg-primary" : "bg-slate-200"
                                        }`}
                                    ></div>
                                ))}
                            </div>
                        </div>

                        {/* STEP 1: Enter Client Details */}
                        {wizardStep === 1 && (
                            <form onSubmit={handleCreateDraft} className="space-y-4">
                                <h3 className="text-lg font-black text-slate-900">Step 1: Client & Company Information</h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Client Full Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={clientForm.clientName}
                                            onChange={(e) => setClientForm({ ...clientForm, clientName: e.target.value })}
                                            placeholder="E.g., Rajesh Kumar"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Client Company *</label>
                                        <input
                                            type="text"
                                            required
                                            value={clientForm.clientCompany}
                                            onChange={(e) => setClientForm({ ...clientForm, clientCompany: e.target.value })}
                                            placeholder="E.g., Acme Corp India"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Client Mobile (for OTP) *</label>
                                        <input
                                            type="tel"
                                            required
                                            value={clientForm.clientPhone}
                                            onChange={(e) => setClientForm({ ...clientForm, clientPhone: e.target.value })}
                                            placeholder="+91 98765 43210"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Client Email (Optional)</label>
                                        <input
                                            type="email"
                                            value={clientForm.clientEmail}
                                            onChange={(e) => setClientForm({ ...clientForm, clientEmail: e.target.value })}
                                            placeholder="rajesh@acme.in"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Title / Agenda</label>
                                    <input
                                        type="text"
                                        value={clientForm.title}
                                        onChange={(e) => setClientForm({ ...clientForm, title: e.target.value })}
                                        placeholder="E.g., Quarterly Review & Software Renewal Pitch"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Meeting Location / Address *</label>
                                    <input
                                        type="text"
                                        required
                                        value={clientForm.address}
                                        onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                                        placeholder="E.g., Cyber Hub, DLF Phase 2, Gurugram"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setShowWizard(false)}
                                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-blue-600 transition-all flex items-center space-x-2"
                                    >
                                        <span>Next: Verify OTP</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 2: WhatsApp & Email OTP Verification */}
                        {wizardStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Step 2: Client WhatsApp & Email OTP Verification</h3>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">
                                        Send a secure 6-digit verification code to client <strong>{clientForm.clientPhone}</strong> via WhatsApp & Email to confirm in-person presence.
                                    </p>
                                </div>

                                {!isOtpVerified && !isBypassRequested && (
                                    <div className="p-4 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200">
                                            <div>
                                                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider block">
                                                    WhatsApp Target
                                                </span>
                                                <span className="text-sm font-bold text-slate-800">{clientForm.clientPhone}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleSendOtp}
                                                disabled={otpLoading}
                                                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {otpLoading ? (
                                                    <Loader2 className="animate-spin w-4 h-4" />
                                                ) : (
                                                    <span>{otpSent ? "Resend OTP on WhatsApp" : "Send 6-Digit OTP"}</span>
                                                )}
                                            </button>
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <label className="block text-xs font-bold text-slate-700 text-center">
                                                Enter 6-Digit Code Received on Client's WhatsApp / Email:
                                            </label>
                                            <input
                                                type="text"
                                                maxLength="6"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.trim())}
                                                placeholder="• • • • • •"
                                                className="w-full text-center tracking-[0.5em] font-mono text-2xl p-3.5 bg-white border border-slate-300 rounded-xl font-black outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleVerifyOtp}
                                                disabled={otpLoading || otp.length < 6}
                                                className="w-full py-3.5 bg-primary hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-md active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                {otpLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Verify OTP & Continue"}
                                            </button>
                                        </div>

                                        <div className="text-center pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowBypassModal(true)}
                                                className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                                            >
                                                Client unable to receive WhatsApp / Email OTP? Request Admin Override
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isOtpVerified && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-center space-x-3">
                                        <CheckCircle2 size={24} className="text-emerald-600" />
                                        <div>
                                            <h4 className="text-sm font-black">OTP Verification Successful!</h4>
                                            <p className="text-xs font-semibold text-emerald-700">Client verified on-site via WhatsApp OTP.</p>
                                        </div>
                                    </div>
                                )}

                                {isBypassRequested && (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 flex items-center space-x-3">
                                        <AlertTriangle size={24} className="text-amber-600" />
                                        <div>
                                            <h4 className="text-sm font-black">Admin Override Requested</h4>
                                            <p className="text-xs font-semibold text-amber-700">Reason: "{bypassReason}". Admin review required.</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(1)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center gap-1"
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!isOtpVerified && !isBypassRequested}
                                        onClick={() => setWizardStep(3)}
                                        className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <span>Next: Live Selfie</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: Live Selfie Capture */}
                        {wizardStep === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Step 3: Capture On-Site Live Selfie</h3>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">
                                        Take a live photo at the client's location to serve as mandatory physical evidence.
                                    </p>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                                    {cameraActive ? (
                                        <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-md bg-black relative">
                                            <video ref={videoRef} autoPlay playsInline className="w-full h-64 object-cover" />
                                            <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-3">
                                                <button
                                                    type="button"
                                                    onClick={captureSelfie}
                                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg"
                                                >
                                                    Take Snapshot
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={stopCamera}
                                                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : selfieSnapshot ? (
                                        <div className="text-center space-y-3">
                                            <img
                                                src={selfieSnapshot}
                                                alt="Selfie Snapshot"
                                                className="w-48 h-48 object-cover rounded-2xl border-4 border-white shadow-lg mx-auto"
                                            />
                                            <button
                                                type="button"
                                                onClick={startCamera}
                                                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
                                            >
                                                Retake Photo
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-4 py-8">
                                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
                                                <Camera size={32} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={startCamera}
                                                className="px-6 py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-blue-600 transition-all"
                                            >
                                                Launch Live Device Camera
                                            </button>
                                            <div className="pt-2">
                                                <span className="text-[11px] text-slate-400 font-bold block mb-1">Or upload image file:</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileUpload(e, "selfie")}
                                                    className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            stopCamera();
                                            setWizardStep(2);
                                        }}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center gap-1"
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            stopCamera();
                                            setWizardStep(4);
                                        }}
                                        className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-blue-600 transition-all flex items-center gap-2"
                                    >
                                        <span>Next: Business Card</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: Client Business Card Evidence */}
                        {wizardStep === 4 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Step 4: Client Business Card Evidence</h3>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">
                                        Upload or capture the client's visiting / business card as official verification.
                                    </p>
                                </div>

                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                                    {businessCardSnapshot ? (
                                        <div className="text-center space-y-3">
                                            <img
                                                src={businessCardSnapshot}
                                                alt="Business Card"
                                                className="w-72 h-44 object-cover rounded-xl border-4 border-white shadow-md mx-auto"
                                            />
                                            <label className="cursor-pointer inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl">
                                                Change Card Image
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleFileUpload(e, "card")}
                                                />
                                            </label>
                                        </div>
                                    ) : (
                                        <label className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all w-full max-w-sm">
                                            <Upload size={32} className="text-slate-400 mb-2" />
                                            <span className="text-xs font-black text-slate-700">Click to Upload Business Card</span>
                                            <span className="text-[10px] text-slate-400 mt-1">JPG, PNG or WebP up to 5MB</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, "card")}
                                            />
                                        </label>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(3)}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center gap-1"
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(5)}
                                        className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-blue-600 transition-all flex items-center gap-2"
                                    >
                                        <span>Next: Meeting Notes</span>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: Meeting Notes & Outcomes */}
                        {wizardStep === 5 && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">Step 5: Notes, Outcomes & Final Submit</h3>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">
                                        Summarize key discussion points, commitments, and follow-up plan for Admin review.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Key Discussion Points *</label>
                                    <textarea
                                        rows="3"
                                        required
                                        value={notesForm.discussionSummary}
                                        onChange={(e) => setNotesForm({ ...notesForm, discussionSummary: e.target.value })}
                                        placeholder="Discussed enterprise pricing tiers, user seat requirements, and data integration timeline..."
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                    ></textarea>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Agreed Outcomes / Next Steps</label>
                                    <textarea
                                        rows="2"
                                        value={notesForm.outcomes}
                                        onChange={(e) => setNotesForm({ ...notesForm, outcomes: e.target.value })}
                                        placeholder="Client requested formal proposal by Thursday..."
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Follow-Up Date</label>
                                        <input
                                            type="date"
                                            value={notesForm.followUpDate}
                                            onChange={(e) => setNotesForm({ ...notesForm, followUpDate: e.target.value })}
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Internal Reference Notes</label>
                                        <input
                                            type="text"
                                            value={notesForm.meetingNotes}
                                            onChange={(e) => setNotesForm({ ...notesForm, meetingNotes: e.target.value })}
                                            placeholder="Client interested in annual billing..."
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(4)}
                                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 flex items-center justify-center gap-1"
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={handleFinalSubmit}
                                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <Loader2 className="animate-spin w-4 h-4" />
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} />
                                                <span>Complete & Submit for Admin Approval</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Bypass Modal */}
            {showBypassModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto">
                        <div className="flex items-center space-x-2 text-amber-600 mb-3">
                            <AlertTriangle size={20} />
                            <h3 className="text-base font-black text-slate-900">Request Admin Verification Override</h3>
                        </div>
                        <p className="text-xs text-slate-600 mb-4">
                            Provide a justifiable business reason why the client cannot receive an SMS OTP. This meeting will be flagged for mandatory administrative review.
                        </p>
                        <textarea
                            rows="3"
                            value={bypassReason}
                            onChange={(e) => setBypassReason(e.target.value)}
                            placeholder="E.g., Client on international roaming with no cellular SMS service..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/20 mb-4"
                        ></textarea>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setShowBypassModal(false)}
                                className="px-4 py-2 text-xs font-bold text-slate-500"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleBypassRequest}
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl"
                            >
                                Submit Override Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Meeting Details View Modal */}
            {selectedMeetingDetails && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-8 shadow-2xl border border-slate-100 my-auto max-h-[92vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-6">
                            <div>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                    selectedMeetingDetails.approvalStatus === "Approved"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : selectedMeetingDetails.approvalStatus === "Rejected"
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-amber-100 text-amber-800"
                                }`}>
                                    {selectedMeetingDetails.approvalStatus?.replace("_", " ")}
                                </span>
                                <h3 className="text-xl font-black text-slate-900 mt-2">{selectedMeetingDetails.title}</h3>
                                <p className="text-xs font-bold text-slate-500">{selectedMeetingDetails.clientCompany}</p>
                            </div>
                            <button
                                onClick={() => setSelectedMeetingDetails(null)}
                                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50">
                                <div>
                                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Client Details</span>
                                    <span className="font-black text-slate-900 text-sm block">{selectedMeetingDetails.clientName}</span>
                                    <span className="text-slate-600 font-medium">{selectedMeetingDetails.clientPhone}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Location</span>
                                    <span className="font-semibold text-slate-700 block">{selectedMeetingDetails.location?.address}</span>
                                </div>
                            </div>

                            {/* Verification Status */}
                            <div className="p-4 rounded-2xl bg-slate-50">
                                <span className="text-slate-400 font-bold block text-[10px] uppercase mb-1">Verification Status</span>
                                {selectedMeetingDetails.verification?.isVerified ? (
                                    <span className="text-emerald-700 font-bold">
                                        ✅ Verified via Client Mobile OTP at {formatIST(selectedMeetingDetails.verification.verifiedAt)}
                                    </span>
                                ) : selectedMeetingDetails.verification?.bypassRequested ? (
                                    <span className="text-amber-700 font-bold">
                                        ⚠️ Override Requested: "{selectedMeetingDetails.verification.bypassReason}"
                                    </span>
                                ) : (
                                    <span className="text-slate-500">Unverified</span>
                                )}
                            </div>

                            {/* Evidence Previews */}
                            {selectedMeetingDetails.evidence && (
                                <div>
                                    <span className="text-slate-400 font-bold block text-[10px] uppercase mb-2">Meeting Evidence</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedMeetingDetails.evidence.selfieUrl && (
                                            <div>
                                                <span className="text-[10px] text-slate-500 block mb-1">On-Site Selfie:</span>
                                                <img
                                                    src={selectedMeetingDetails.evidence.selfieUrl}
                                                    alt="Selfie"
                                                    className="w-full h-32 object-cover rounded-xl border border-slate-200"
                                                />
                                            </div>
                                        )}
                                        {selectedMeetingDetails.evidence.businessCardUrl && (
                                            <div>
                                                <span className="text-[10px] text-slate-500 block mb-1">Business Card:</span>
                                                <img
                                                    src={selectedMeetingDetails.evidence.businessCardUrl}
                                                    alt="Business Card"
                                                    className="w-full h-32 object-cover rounded-xl border border-slate-200"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Discussion Notes */}
                            <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                                <div>
                                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Discussion Summary</span>
                                    <p className="text-slate-800 font-medium">{selectedMeetingDetails.discussionSummary || "—"}</p>
                                </div>
                                {selectedMeetingDetails.outcomes && (
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px] uppercase">Outcomes</span>
                                        <p className="text-slate-800 font-medium">{selectedMeetingDetails.outcomes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Admin Review Notes if available */}
                            {selectedMeetingDetails.adminReviewNotes && (
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                                    <span className="text-amber-800 font-black block text-[10px] uppercase">Admin Review Feedback</span>
                                    <p className="text-amber-900 font-semibold mt-1">{selectedMeetingDetails.adminReviewNotes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyFieldMeetings;
