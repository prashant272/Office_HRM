import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
    Briefcase, Plus, XCircle, User, Loader2, Calendar,
    ChevronRight, Target, Users, CheckCircle2, AlertCircle, Clock
} from "lucide-react";
import moment from "moment";
import { Link } from "react-router-dom";

const Projects = () => {
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        clientName: "",
        manager: "",
        team: [],
        deadline: "",
    });

    const fetchProjects = async () => {
        try {
            const { data } = await API.get("/projects");
            setProjects(data);
        } catch (err) {
            console.error("Error fetching projects:", err);
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
        fetchProjects();
        fetchEmployees();
    }, []);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await API.post("/projects", formData);
            setShowAddModal(false);
            setFormData({ name: "", description: "", clientName: "", manager: "", team: [], deadline: "" });
            fetchProjects();
        } catch (err) {
            alert("Failed to create project");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTeamSelection = (employeeId) => {
        const isSelected = formData.team.includes(employeeId);
        if (isSelected) {
            setFormData({ ...formData, team: formData.team.filter(id => id !== employeeId) });
        } else {
            setFormData({ ...formData, team: [...formData.team, employeeId] });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Active": return "bg-emerald-100 text-emerald-700";
            case "Completed": return "bg-blue-100 text-blue-700";
            case "On Hold": return "bg-orange-100 text-orange-700";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    if (loading) return (
        <div className="h-96 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={48} />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Project Management</h1>
                    <p className="text-text-muted mt-1 font-medium italic">Oversee company initiatives, teams and delivery progress</p>
                </div>
                {userInfo.role !== "employee" && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center space-x-2 hover:bg-blue-700 transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        <span>Startup New Project</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <div key={project._id} className="glass-card flex flex-col hover:border-primary/30 transition-all group">
                        <div className="p-6 flex-1 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatusColor(project.status)}`}>
                                    {project.status}
                                </div>
                                <Link to={`/projects/${project._id}`} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-primary hover:bg-primary/5 transition-all">
                                    <ChevronRight size={18} />
                                </Link>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-secondary mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
                                <p className="text-xs text-text-muted italic line-clamp-2">"{project.description}"</p>
                            </div>

                            <div className="flex items-center gap-4 py-2 border-y border-slate-50">
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Director</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-primary border border-white shadow-sm">
                                            {project.manager?.name?.[0]}
                                        </div>
                                        <span className="text-xs font-bold text-secondary">{project.manager?.name}</span>
                                    </div>
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Delivery ETA</p>
                                    <div className="flex items-center justify-end gap-1.5 text-secondary font-bold text-xs">
                                        <Calendar size={12} className="text-slate-400" />
                                        <span>{moment(project.deadline).format("DD MMM, YYYY")}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Progress Velocity</p>
                                    <span className="text-sm font-black text-primary">{project.progress}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-1000 shadow-sm shadow-primary/30"
                                        style={{ width: `${project.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50/50 rounded-b-2xl border-t border-slate-100 flex items-center justify-between">
                            <div className="flex -space-x-2">
                                {project.team.slice(0, 4).map((member, i) => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-white flex items-center justify-center text-[10px] font-black text-text-muted shadow-sm" title={member.name}>
                                        {member.name?.[0]}
                                    </div>
                                ))}
                                {project.team.length > 4 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-text-muted shadow-sm">
                                        +{project.team.length - 4}
                                    </div>
                                )}
                            </div>
                            <div className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100">
                                {project.team.length} Members
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Project Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-2xl font-bold text-secondary">Initiate Workspace</h3>
                                <p className="text-text-muted text-xs font-medium italic mt-1">Configure project core parameters and team access</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <XCircle size={28} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateProject} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-text-muted">Project Identification</label>
                                    <input
                                        type="text" required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                                        placeholder="Project Alpha..."
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-text-muted">Client Account</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        placeholder="Client Name..."
                                        value={formData.clientName}
                                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-text-muted">Directing Manager</label>
                                    <select
                                        required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-secondary font-bold"
                                        value={formData.manager}
                                        onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                                    >
                                        <option value="">Select Lead</option>
                                        {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-text-muted">Delivery Deadline</label>
                                    <input
                                        type="date" required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                                        value={formData.deadline}
                                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-text-muted">Assignment (Team Members)</label>
                                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 custom-scrollbar">
                                    {employees.map(emp => (
                                        <div
                                            key={emp._id}
                                            onClick={() => handleTeamSelection(emp._id)}
                                            className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${formData.team.includes(emp._id)
                                                    ? "bg-primary/10 border-primary text-primary"
                                                    : "bg-white border-slate-100 hover:border-slate-300"
                                                }`}
                                        >
                                            <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black">
                                                {emp.name[0]}
                                            </div>
                                            <span className="text-[10px] font-bold truncate">{emp.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-text-muted">Operational Scope (Description)</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[100px]"
                                    placeholder="Strategic objectives for this project..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 font-bold text-text-muted">Cancel</button>
                                <button
                                    type="submit" disabled={isSubmitting}
                                    className="px-10 py-3 bg-primary text-white rounded-xl font-bold shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all flex items-center space-x-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Briefcase size={18} />}
                                    <span>Initiate Project</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
