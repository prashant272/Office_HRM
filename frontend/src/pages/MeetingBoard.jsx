import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
    Loader2, Video, Calendar, Clock, MapPin,
    Users, Plus, Trash2, CheckCircle2, XCircle,
    Copy, ExternalLink, ShieldAlert
} from "lucide-react";
import moment from "moment";
import { toast } from "react-hot-toast";

const MeetingBoard = () => {
    const [meetings, setMeetings] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    const [formData, setFormData] = useState({
        title: "",
        agenda: "",
        room: "Conference Room A",
        startTime: "",
        endTime: "",
        participants: [],
        meetingLink: ""
    });

    const fetchMeetings = async () => {
        try {
            const { data } = await API.get("/meetings");
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

    const handleCreateMeeting = async (e) => {
        e.preventDefault();
        try {
            await API.post("/meetings", formData);
            toast.success("Meeting Scheduled Successfully");
            setShowModal(false);
            fetchMeetings();
            setFormData({
                title: "", agenda: "", room: "Conference Room A",
                startTime: "", endTime: "", participants: [], meetingLink: ""
            });
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to schedule meeting");
        }
    };

    const isAdmin = userInfo.role === "admin" || userInfo.role === "manager";

    if (loading) return (
        <div className="h-96 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-secondary tracking-tighter">Meeting Board</h1>
                    <p className="text-text-muted mt-1 font-bold italic flex items-center gap-2">
                        <Video size={16} className="text-primary" />
                        Synchronize and collaborate across departments
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-primary text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-primary/30 flex items-center space-x-3 hover:bg-blue-700 transition-all active:scale-95 text-sm uppercase tracking-widest"
                >
                    <Plus size={20} />
                    <span>Schedule Sync</span>
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Rooms Stats Sidebar */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="text-xs font-black text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
                            Office Zones
                        </h3>
                        <div className="space-y-4">
                            {["Conference Room A", "Brainstorming Zone", "Main Hall", "Virtual Sync"].map((room) => {
                                const activeInRoom = meetings.filter(m => m.room === room && m.status === "Scheduled").length;
                                return (
                                    <div key={room} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-transparent">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${activeInRoom > 0 ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                            <p className="text-xs font-bold text-secondary">{room}</p>
                                        </div>
                                        <span className="text-[10px] font-black text-text-muted">{activeInRoom} Scheduled</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="glass-card p-6 bg-slate-900 text-white border-none">
                        <ShieldAlert className="text-primary mb-4" />
                        <h4 className="text-sm font-black uppercase tracking-widest mb-2">Conflict Logic</h4>
                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                            System automatically prevents overlapping bookings for physical office zones to ensure seamless logistics.
                        </p>
                    </div>
                </div>

                {/* Meetings List */}
                <div className="xl:col-span-3 space-y-4">
                    {meetings.map((meeting) => (
                        <div key={meeting._id} className="glass-card p-6 hover:border-primary/20 transition-all group overflow-hidden relative">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                <div className="flex gap-6 items-start">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100 flex-shrink-0">
                                        <span className="text-[10px] font-black uppercase text-text-muted tracking-tight">{moment(meeting.startTime).format("MMM")}</span>
                                        <span className="text-2xl font-black text-secondary -mt-1">{moment(meeting.startTime).format("DD")}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-secondary group-hover:text-primary transition-colors">{meeting.title}</h3>
                                        <div className="flex flex-wrap items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted">
                                                <Clock size={14} className="text-slate-400" />
                                                {moment(meeting.startTime).format("hh:mm A")} - {moment(meeting.endTime).format("hh:mm A")}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted">
                                                <MapPin size={14} className="text-slate-400" />
                                                {meeting.room}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                                <Users size={14} />
                                                {meeting.participants.length} Participants
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {meeting.meetingLink && (
                                        <a
                                            href={meeting.meetingLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <ExternalLink size={18} />
                                        </a>
                                    )}
                                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${meeting.status === "Scheduled" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                                        }`}>
                                        {meeting.status}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                        {meeting.host?.name?.[0]}
                                    </div>
                                    <p className="text-xs font-bold text-secondary">Hosted by {meeting.host?.name}</p>
                                </div>
                                <div className="flex -space-x-3">
                                    {meeting.participants.slice(0, 5).map((p, idx) => (
                                        <div key={idx} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] font-black overflow-hidden shadow-sm" title={p.name}>
                                            {p.profileImage ? <img src={p.profileImage} alt="" className="w-full h-full object-cover" /> : p.name?.[0]}
                                        </div>
                                    ))}
                                    {meeting.participants.length > 5 && (
                                        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-700 text-white flex items-center justify-center text-[9px] font-black shadow-sm">
                                            +{meeting.participants.length - 5}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Decoration */}
                            <Video className="absolute -bottom-6 -right-6 text-slate-50 group-hover:text-primary/5 transition-colors duration-700" size={120} />
                        </div>
                    ))}

                    {meetings.length === 0 && (
                        <div className="p-20 border-2 border-dashed border-slate-100 rounded-[40px] text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-4xl flex items-center justify-center mx-auto mb-6">
                                <Video className="text-slate-300" size={40} />
                            </div>
                            <h3 className="text-xl font-black text-secondary">No meetings scheduled</h3>
                            <p className="text-text-muted font-bold italic mt-2">The war room is quiet. Use the schedule button to set a new sync.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Schedule Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="bg-primary p-8 text-white relative">
                            <h2 className="text-3xl font-black tracking-tighter">Schedule Sync</h2>
                            <p className="text-sm opacity-80 font-bold">Reserve a room and notify your team</p>
                            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 p-3 bg-white/10 rounded-2xl hover:bg-white text-white hover:text-primary transition-all">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateMeeting} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest px-1">Meeting Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        placeholder="Project Launch Sync"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest px-1">Location / Zone</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.room}
                                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                    >
                                        <option value="Conference Room A">Conference Room A</option>
                                        <option value="Brainstorming Zone">Brainstorming Zone</option>
                                        <option value="Main Hall">Main Hall</option>
                                        <option value="Virtual Sync">Virtual Sync</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest px-1">Start Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-text-muted tracking-widest px-1">End Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-text-muted tracking-widest px-1">Invite Participants</label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-2xl">
                                    {employees.map(emp => (
                                        <label key={emp._id} className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-primary/30 transition-all">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded-full border-slate-200 text-primary focus:ring-primary/20"
                                                checked={formData.participants.includes(emp._id)}
                                                onChange={(e) => {
                                                    const newParts = e.target.checked
                                                        ? [...formData.participants, emp._id]
                                                        : formData.participants.filter(id => id !== emp._id);
                                                    setFormData({ ...formData, participants: newParts });
                                                }}
                                            />
                                            <span className="text-[11px] font-bold text-secondary truncate">{emp.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-text-muted tracking-widest px-1">Meeting Agenda</label>
                                <textarea
                                    required
                                    rows="3"
                                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                    placeholder="Discuss deliverables for the upcoming sprint..."
                                    value={formData.agenda}
                                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-secondary text-white font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-secondary/10"
                            >
                                Finalize & Book Sync
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MeetingBoard;
