import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api/axios";
import {
    Loader2, Calendar, Target, Users, Briefcase,
    ChevronLeft, Clock, CheckCircle2, AlertCircle,
    MoreVertical, Trash2, Edit
} from "lucide-react";
import moment from "moment";

const ProjectDetails = () => {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    const fetchProjectDetails = async () => {
        try {
            const { data } = await API.get(`/projects/${id}`);
            setProject(data);
        } catch (err) {
            console.error("Error fetching project details:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjectDetails();
    }, [id]);

    const updateProjectStatus = async (status) => {
        try {
            await API.put(`/projects/${id}`, { status });
            fetchProjectDetails();
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "Active": return <Clock className="text-emerald-500" />;
            case "Completed": return <CheckCircle2 className="text-blue-500" />;
            case "On Hold": return <AlertCircle className="text-orange-500" />;
            default: return null;
        }
    };

    if (loading) return (
        <div className="h-96 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );

    if (!project) return (
        <div className="p-20 text-center">
            <h2 className="text-2xl font-bold text-secondary">Project not found</h2>
            <Link to="/projects" className="text-primary hover:underline mt-4 inline-block">Back to Projects</Link>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/projects" className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-primary transition-all shadow-sm">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-extrabold text-secondary tracking-tight">{project.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-text-muted text-xs font-bold uppercase tracking-widest">{project.clientName || "Internal Project"}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${project.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                                    project.status === "Completed" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                                }`}>
                                {project.status}
                            </span>
                        </div>
                    </div>
                </div>
                {userInfo.role !== "employee" && (
                    <div className="flex items-center gap-2">
                        <select
                            className="bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-secondary outline-none focus:ring-2 focus:ring-primary/20"
                            value={project.status}
                            onChange={(e) => updateProjectStatus(e.target.value)}
                        >
                            <option value="Active">Mark as Active</option>
                            <option value="Completed">Mark as Completed</option>
                            <option value="On Hold">Mark as On Hold</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details & Description */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="glass-card p-8">
                        <h3 className="text-sm font-black text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Target size={16} className="text-primary" />
                            Objective Scope
                        </h3>
                        <p className="text-text-muted leading-relaxed font-medium italic">
                            "{project.description}"
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Timeline Start</p>
                                <p className="font-bold text-secondary text-sm">{moment(project.startDate).format("DD MMM, YYYY")}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Final Deadline</p>
                                <p className="font-bold text-rose-600 text-sm">{moment(project.deadline).format("DD MMM, YYYY")}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Director</p>
                                <p className="font-bold text-secondary text-sm">{project.manager?.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Task Density</p>
                                <p className="font-bold text-secondary text-sm">{(project.tasks || []).length} Objectives</p>
                            </div>
                        </div>
                    </div>

                    {/* Task List in Project */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-extrabold text-secondary tracking-tight px-2 flex items-center gap-2">
                            Activity Stream
                            <span className="text-xs font-black bg-slate-100 text-text-muted px-2 py-0.5 rounded-full">{(project.tasks || []).length}</span>
                        </h3>
                        <div className="space-y-3">
                            {(project.tasks || []).map((task) => (
                                <div key={task._id} className="glass-card p-4 flex items-center justify-between hover:border-primary/20 transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.status === "Completed" ? "bg-emerald-50" : task.status === "In Progress" ? "bg-blue-50" : "bg-slate-50"
                                            }`}>
                                            {task.status === "Completed" ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Clock className="text-slate-400" size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-secondary text-sm">{task.title}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-bold text-text-muted">Assigned to: {task.assignedTo?.name}</span>
                                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                <span className="text-[10px] font-bold text-rose-500">Due {moment(task.deadline).format("MMM DD")}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${task.priority === "High" ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                                            }`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(project.tasks || []).length === 0 && (
                                <div className="p-10 border-2 border-dashed border-slate-100 rounded-3xl text-center">
                                    <p className="text-text-muted italic font-medium">No tasks linked to this project workspace yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Progress & Team */}
                <div className="space-y-8">
                    {/* Progress Card */}
                    <div className="glass-card p-6 bg-primary text-white shadow-xl shadow-primary/20">
                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4">Delivery Progress</h3>
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-5xl font-black">{project.progress}%</span>
                            <span className="text-xs font-bold mb-2 opacity-80 uppercase tracking-tighter">Real-time Velocity</span>
                        </div>
                        <div className="h-3 w-full bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-all duration-1000"
                                style={{ width: `${project.progress}%` }}
                            ></div>
                        </div>
                        <p className="mt-6 text-[11px] font-bold opacity-80 leading-relaxed italic">
                            Overall progress is calculated based on completed objectives within this workspace.
                        </p>
                    </div>

                    {/* Team Card */}
                    <div className="glass-card p-6">
                        <h3 className="text-sm font-black text-secondary uppercase tracking-widest mb-6 flex items-center gap-2">
                            Team Roster
                        </h3>
                        <div className="space-y-4">
                            {project.team?.map((member) => (
                                <div key={member._id} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-100 hover:bg-white transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-white border border-slate-100 rounded-full flex items-center justify-center text-xs font-black text-primary shadow-sm">
                                            {member.name?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-secondary">{member.name}</p>
                                            <p className="text-[10px] font-medium text-text-muted">{member.designation}</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg uppercase tracking-tighter">
                                        {member.department?.name || 'Staff'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetails;
