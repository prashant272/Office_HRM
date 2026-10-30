import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { CheckSquare, Clock, AlertCircle, Plus, MoreVertical, Calendar, Filter, XCircle, User, Loader2, Timer, History, Trash2, CheckCircle2, Briefcase } from "lucide-react";
import moment from "moment";

const Tasks = () => {
    const [tasks, setTasks] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        assignedTo: "",
        deadline: "",
        priority: "Medium",
        project: ""
    });

    const [logData, setLogData] = useState({
        startTime: moment().subtract(1, 'hour').format("YYYY-MM-DDTHH:mm"),
        endTime: moment().format("YYYY-MM-DDTHH:mm"),
        description: ""
    });

    const fetchTasks = async () => {
        try {
            const { data } = await API.get("/tasks");
            setTasks(data);
        } catch (err) {
            console.error("Error fetching tasks:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        if (userInfo.role !== "employee") {
            try {
                const { data } = await API.get("/employees");
                setEmployees(data);
            } catch (err) {
                console.error("Error fetching employees:", err);
            }
        }
    };

    const fetchProjects = async () => {
        try {
            const { data } = await API.get("/projects");
            setProjects(data);
        } catch (err) {
            console.error("Error fetching projects:", err);
        }
    };

    useEffect(() => {
        fetchTasks();
        fetchEmployees();
        fetchProjects();
    }, []);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await API.post("/tasks", formData);
            setShowAddModal(false);
            setFormData({ title: "", description: "", assignedTo: "", deadline: "", priority: "Medium", project: "" });
            fetchTasks();
        } catch (err) {
            alert("Failed to create task");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogWork = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await API.post(`/tasks/${selectedTask._id}/log-work`, logData);
            setShowLogModal(false);
            setLogData({
                startTime: moment().subtract(1, 'hour').format("YYYY-MM-DDTHH:mm"),
                endTime: moment().format("YYYY-MM-DDTHH:mm"),
                description: ""
            });
            fetchTasks();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to log work");
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateStatus = async (taskId, status) => {
        try {
            await API.put(`/tasks/${taskId}`, { status });
            fetchTasks();
        } catch (err) {
            console.error("Error updating task status:", err);
        }
    };

    const deleteTask = async (id) => {
        if (window.confirm("Delete this objective?")) {
            try {
                await API.delete(`/tasks/${id}`);
                fetchTasks();
            } catch (err) {
                alert("Failed to delete task");
            }
        }
    };

    const columns = [
        { id: "Pending", icon: <Clock className="text-orange-500" />, bg: "bg-orange-50" },
        { id: "In Progress", icon: <AlertCircle className="text-blue-500" />, bg: "bg-blue-50" },
        { id: "Completed", icon: <CheckSquare className="text-emerald-500" />, bg: "bg-emerald-50" }
    ];

    const formatDuration = (mins) => {
        if (!mins) return "0m";
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Daily Tasks</h1>
                    <p className="text-text-muted mt-1 font-medium italic">Track, manage and assign workplace objectives</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-secondary flex items-center space-x-2 hover:bg-slate-50 shadow-sm transition-all">
                        <Filter size={16} />
                        <span>Filter</span>
                    </button>
                    {userInfo.role !== "employee" && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center space-x-2 hover:bg-blue-700 transition-all active:scale-95"
                        >
                            <Plus size={18} />
                            <span>Assign Task</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                            <h3 className="text-2xl font-bold text-secondary">New Objective</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <XCircle size={28} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTask} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-text-muted">Task Title</label>
                                <input
                                    type="text" required
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                                    placeholder="e.g. Q4 Financial Audit"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-text-muted">Assign To</label>
                                    <select
                                        required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-secondary"
                                        value={formData.assignedTo}
                                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.designation})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-text-muted">Associated Project (Optional)</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none font-medium text-secondary"
                                        value={formData.project}
                                        onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                                    >
                                        <option value="">None / Internal</option>
                                        {projects.map(proj => <option key={proj._id} value={proj._id}>{proj.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-text-muted">Deadline</label>
                                    <input
                                        type="date" required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={formData.deadline}
                                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-text-muted">Priority</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option>High</option>
                                        <option>Medium</option>
                                        <option>Low</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-text-muted">Brief Description</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[100px]"
                                    placeholder="Details about the task..."
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
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus size={18} />}
                                    <span>Create Task</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Work Log Modal */}
            {showLogModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-2xl font-bold text-secondary">Task Tracker</h3>
                                <p className="text-xs font-bold text-primary mt-1">{selectedTask?.title}</p>
                            </div>
                            <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <XCircle size={28} />
                            </button>
                        </div>
                        <form onSubmit={handleLogWork} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-text-muted">Start Time</label>
                                    <input
                                        type="datetime-local" required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={logData.startTime}
                                        onChange={(e) => setLogData({ ...logData, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-text-muted">End Time</label>
                                    <input
                                        type="datetime-local" required
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={logData.endTime}
                                        onChange={(e) => setLogData({ ...logData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-text-muted">What did you do?</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[100px]"
                                    placeholder="Briefly describe your work..."
                                    required
                                    value={logData.description}
                                    onChange={(e) => setLogData({ ...logData, description: e.target.value })}
                                />
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowLogModal(false)} className="px-6 py-3 font-bold text-text-muted">Cancel</button>
                                <button
                                    type="submit" disabled={isSubmitting}
                                    className="px-10 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center space-x-2"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Timer size={18} />}
                                    <span>Log Work</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Tracker Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-2xl font-bold text-secondary tracking-tight">System Logs</h3>
                                <p className="text-xs font-bold text-primary mt-1 italic">Chronological activity record for "{selectedTask?.title}"</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-rose-50">
                                <XCircle size={28} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                            {selectedTask?.timeLogs?.length > 0 ? (
                                selectedTask.timeLogs.map((log, idx) => (
                                    <div key={idx} className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl relative overflow-hidden group hover:bg-white hover:shadow-lg transition-all">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:w-1.5 group-hover:bg-primary transition-all"></div>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-primary shadow-sm">
                                                    <Timer size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-secondary tracking-tight">{moment(log.startTime).format("DD MMM, YYYY")}</p>
                                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{moment(log.startTime).format("hh:mm A")} - {moment(log.endTime).format("hh:mm A")}</p>
                                                </div>
                                            </div>
                                            <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                                                {formatDuration(log.duration)}
                                            </div>
                                        </div>
                                        <p className="text-sm font-medium text-text-muted italic leading-relaxed">"{log.description}"</p>
                                    </div>
                                ))
                            ) : (
                                <div className="p-20 text-center space-y-4">
                                    <div className="inline-flex items-center justify-center p-6 bg-slate-50 rounded-full text-slate-300">
                                        <History size={48} />
                                    </div>
                                    <p className="text-text-muted font-bold italic tracking-tight">No work sessions logged yet for this objective.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Aggregate Velocity</p>
                                    <p className="text-lg font-black text-secondary">{formatDuration(selectedTask?.totalTimeSpent)} total</p>
                                </div>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="px-8 py-3 bg-secondary text-white rounded-xl font-bold shadow-lg shadow-secondary/20 hover:bg-slate-800 transition-all">Close Viewer</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {columns.map((col) => (
                    <div key={col.id} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center space-x-2">
                                {col.icon}
                                <h3 className="font-extrabold text-secondary tracking-tight">{col.id}</h3>
                                <span className="bg-slate-100 text-text-muted text-[10px] font-black px-2 py-0.5 rounded-full">
                                    {tasks.filter(t => t.status === col.id).length}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {tasks.filter(t => t.status === col.id).map((task) => (
                                <div key={task._id} className="glass-card p-5 hover:border-primary/20 transition-all group cursor-pointer active:scale-[0.98]">
                                    <div className="flex items-start justify-between mb-3">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${task.priority === "High" ? "bg-rose-100 text-rose-600" :
                                            task.priority === "Medium" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                                            }`}>
                                            {task.priority} Priority
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {userInfo.role !== "employee" && (
                                                <button onClick={() => deleteTask(task._id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-secondary mb-1 group-hover:text-primary transition-colors">{task.title}</h4>

                                    {task.project && (
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Briefcase size={10} className="text-primary" />
                                            <span className="text-[10px] font-extrabold text-primary underline decoration-primary/30 underline-offset-2">{task.project.name}</span>
                                        </div>
                                    )}

                                    <p className="text-xs text-text-muted line-clamp-2 mb-4 font-medium leading-relaxed italic">"{task.description}"</p>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div className="flex items-center -space-x-2">
                                            <div className="w-7 h-7 bg-slate-100 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary">
                                                {task.assignedTo?.name?.[0] || <User size={12} />}
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-[11px] font-bold text-secondary">{task.assignedTo?.name || "Unassigned"}</p>
                                                {task.totalTimeSpent > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowHistoryModal(true);
                                                        }}
                                                        className="text-[9px] font-black text-emerald-600 flex items-center gap-1 uppercase tracking-tighter hover:underline"
                                                    >
                                                        <History size={10} /> {formatDuration(task.totalTimeSpent)} tracked
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end text-slate-400">
                                            <div className="flex items-center space-x-1.5 ">
                                                <Calendar size={12} />
                                                <span className="text-[10px] font-black">{moment(task.deadline).format("DD MMM")}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons for status change and tracker */}
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                                        {col.id === "Pending" && userInfo.role === "employee" && (
                                            <button
                                                onClick={() => updateStatus(task._id, "In Progress")}
                                                className="flex-1 py-2 text-[10px] font-black uppercase tracking-tighter bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Clock size={12} /> Start Work
                                            </button>
                                        )}
                                        {col.id === "In Progress" && (
                                            <>
                                                {userInfo.role === "employee" ? (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowLogModal(true);
                                                        }}
                                                        className="flex-1 py-2 text-[10px] font-black uppercase tracking-tighter bg-primary/5 text-primary rounded-lg hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1.5 border border-primary/10"
                                                    >
                                                        <Timer size={12} /> Log Tracker
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTask(task);
                                                            setShowHistoryModal(true);
                                                        }}
                                                        className="flex-1 py-2 text-[10px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <History size={12} /> View Logs
                                                    </button>
                                                )}
                                                {userInfo.role === "employee" && (
                                                    <button
                                                        onClick={() => updateStatus(task._id, "Completed")}
                                                        className="flex-1 py-2 text-[10px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <CheckCircle2 size={12} /> Done
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {col.id === "Completed" && (
                                            <button
                                                onClick={() => {
                                                    setSelectedTask(task);
                                                    setShowHistoryModal(true);
                                                }}
                                                className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition-all font-black text-[10px] uppercase"
                                            >
                                                <History size={12} /> Logs Summary
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Tasks;
