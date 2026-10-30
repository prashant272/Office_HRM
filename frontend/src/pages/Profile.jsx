import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
    Loader2, User, Mail, Briefcase, Calendar,
    Award, Target, TrendingUp, Zap, Star,
    ShieldCheck, MapPin, Phone
} from "lucide-react";
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, ResponsiveContainer, Tooltip as ReTooltip
} from "recharts";
import moment from "moment";

const Profile = () => {
    const [user, setUser] = useState(null);
    const [productivity, setProductivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                // Assuming we can get user details from /employees/:id or similar
                // For now using userInfo and fetching productivity
                const { data: prodData } = await API.get(`/productivity/${userInfo._id}`);
                setProductivity(prodData);
                setUser(userInfo);
            } catch (err) {
                console.error("Error fetching profile data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    if (loading) return (
        <div className="h-96 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );

    const latestRating = productivity[0] || {
        taskScore: 0,
        deadlineScore: 0,
        attendanceScore: 0,
        totalRating: 0,
        feedback: "No analysis available for this month yet."
    };

    const radarData = [
        { subject: 'Task Completion', A: latestRating.taskScore, fullMark: 40 },
        { subject: 'Deadline Sync', A: latestRating.deadlineScore, fullMark: 30 },
        { subject: 'Punctuality', A: latestRating.attendanceScore, fullMark: 30 },
    ];

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            {/* Minimalist Profile Header */}
            <div className="relative bg-slate-900 rounded-3xl sm:rounded-[40px] overflow-hidden shadow-2xl shadow-slate-900/20 p-6 sm:p-10 pt-8 sm:pt-12">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,#3b82f6,transparent)]"></div>
                    <div className="grid grid-cols-10 h-full">
                        {[...Array(10)].map((_, i) => <div key={i} className="border-r border-white/5 h-full"></div>)}
                    </div>
                </div>
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-8 text-center sm:text-left">
                    <div className="w-28 h-28 sm:w-40 sm:h-40 bg-white rounded-3xl sm:rounded-4xl p-2 shadow-2xl relative shrink-0">
                        <div className="w-full h-full bg-slate-100 rounded-2xl sm:rounded-3xl flex items-center justify-center overflow-hidden">
                            {user.profileImage ? (
                                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <User size={56} className="text-slate-300 sm:w-20 sm:h-20" />
                            )}
                        </div>
                        <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 p-1.5 sm:p-2 bg-emerald-500 text-white rounded-xl border-2 sm:border-4 border-white">
                            <ShieldCheck size={16} className="sm:w-5 sm:h-5" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">{user.name}</h1>
                        <p className="text-primary font-black uppercase tracking-[0.2em] text-xs mt-1">{user.designation || user.role}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mt-6 sm:mt-10">
                {/* 1. Identity Stats */}
                <div className="glass-card p-5 sm:p-8 space-y-6 sm:space-y-8">
                    <h3 className="text-xs font-black text-secondary uppercase tracking-widest flex items-center gap-2">
                        Professional Identity
                    </h3>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 group">
                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-primary transition-colors">
                                <Mail size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Email</p>
                                <p className="text-sm font-bold text-secondary break-all">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-primary transition-colors">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Department</p>
                                <p className="text-sm font-bold text-secondary">{user.department?.name || "N/A"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 group">
                            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-primary transition-colors">
                                <Briefcase size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Employee ID</p>
                                <p className="text-sm font-bold text-secondary">{user.employeeId || "OMS-2024"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Current Standing</p>
                                <h4 className="text-2xl font-black">Tier 1 Elite</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-2">Top 5% performer in {user.department?.name} this quarter.</p>
                            </div>
                            <Award className="absolute -bottom-6 -right-6 text-white/5 group-hover:text-white/10 transition-all" size={100} />
                        </div>
                    </div>
                </div>

                {/* 2. AI Productivity Radar */}
                <div className="lg:col-span-2 glass-card p-5 sm:p-8 overflow-hidden group">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-secondary tracking-tight">AI performance Radar</h3>
                            <p className="text-xs text-text-muted font-bold">Metrics calculated from monthly activity logs</p>
                        </div>
                        <Zap className="text-primary animate-pulse" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 items-center">
                        <div className="lg:col-span-3 h-[300px] sm:h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                    <Radar
                                        name="Me"
                                        dataKey="A"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fill="#3b82f6"
                                        fillOpacity={0.15}
                                    />
                                    <ReTooltip />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                            <div className="text-center md:text-left">
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Overall Rating</p>
                                <div className="text-5xl sm:text-6xl font-black text-secondary tracking-tighter flex items-center justify-center md:justify-start gap-3">
                                    {latestRating.totalRating}
                                    <span className="text-sm font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100 align-middle">
                                        Active
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 sm:p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:border-primary/20 transition-all">
                                <h4 className="text-xs font-black text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Star size={14} className="text-orange-400" />
                                    AI Feedback
                                </h4>
                                <p className="text-xs text-text-muted font-bold leading-relaxed italic">
                                    "{latestRating.feedback}"
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-blue-50/50 rounded-2xl">
                                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Consistency</p>
                                    <p className="text-lg font-black text-secondary">92%</p>
                                </div>
                                <div className="p-4 bg-indigo-50/50 rounded-2xl">
                                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Velocity</p>
                                    <p className="text-lg font-black text-secondary">4.2x</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance History (Simplified) */}
            <div className="glass-card p-5 sm:p-10">
                <div className="flex items-center justify-between mb-8 sm:mb-10">
                    <h3 className="text-xl sm:text-2xl font-black text-secondary tracking-tighter uppercase">Activity Milestones</h3>
                    <TrendingUp className="text-slate-300" />
                </div>
                <div className="space-y-6 sm:space-y-8 relative before:absolute before:inset-0 before:left-[19px] before:w-px before:bg-slate-100">
                    {[
                        { title: "Monthly Analysis Completed", detail: `Scored ${latestRating.totalRating} points for this month`, icon: <TrendingUp size={16} />, color: "bg-primary" },
                        { title: "Project 'Skyline' Delivered", detail: "On-time completion of all associate tasks", icon: <ShieldCheck size={16} />, color: "bg-emerald-500" },
                        { title: "Performance Bonus Awarded", detail: "Recognized for 100% attendance in previous month", icon: <Zap size={16} />, color: "bg-orange-500" }
                    ].map((m, i) => (
                        <div key={i} className="flex gap-4 sm:gap-8 relative z-10 group">
                            <div className={`w-10 h-10 rounded-2xl ${m.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0`}>
                                {m.icon}
                            </div>
                            <div>
                                <h4 className="font-bold text-secondary text-sm sm:text-base">{m.title}</h4>
                                <p className="text-xs text-text-muted font-bold">{m.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Profile;
