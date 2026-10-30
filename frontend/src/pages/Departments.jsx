import React, { useState, useEffect } from "react";
import API from "../api/axios";
import { Building2, Plus, Edit, Trash2, XCircle, Users, Loader2, Info } from "lucide-react";

const Departments = () => {
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        head: ""
    });

    const fetchData = async () => {
        try {
            const [deptRes, empRes] = await Promise.all([
                API.get("/departments"),
                API.get("/employees")
            ]);
            setDepartments(deptRes.data);
            setEmployees(empRes.data);
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingId) {
                await API.put(`/departments/${editingId}`, formData);
            } else {
                await API.post("/departments", formData);
            }
            setShowModal(false);
            setEditingId(null);
            setFormData({ name: "", description: "", head: "" });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.message || "Action failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (dept) => {
        setEditingId(dept._id);
        setFormData({
            name: dept.name,
            description: dept.description || "",
            head: dept.head?._id || ""
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure? This might affect employees assigned to this department.")) {
            try {
                await API.delete(`/departments/${id}`);
                fetchData();
            } catch (err) {
                alert(err.response?.data?.message || "Failed to delete");
            }
        }
    };

    if (loading) return (
        <div className="h-[60vh] flex items-center justify-center">
            <Loader2 className="animate-spin text-primary w-12 h-12" />
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Departments</h1>
                    <p className="text-text-muted mt-1 font-medium italic">Manage office structure and leadership</p>
                </div>
                {userInfo.role === "admin" && (
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: "", description: "", head: "" });
                            setShowModal(true);
                        }}
                        className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center space-x-2 hover:bg-blue-700 transition-all active:scale-95"
                    >
                        <Plus size={18} />
                        <span>Add Department</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {departments.map((dept) => (
                    <div key={dept._id} className="glass-card p-6 flex flex-col justify-between group hover:border-primary/30 transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[100px] flex items-center justify-center pointer-events-none group-hover:bg-primary/10 transition-colors">
                            <Building2 size={32} className="text-primary/20 translate-x-4 -translate-y-4" />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-secondary">{dept.name}</h3>
                                {userInfo.role === "admin" && (
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleEdit(dept)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(dept._id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <p className="text-sm text-text-muted font-medium line-clamp-2 min-h-[40px]">
                                {dept.description || "No description provided."}
                            </p>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <Users size={14} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">Dept Head</p>
                                        <p className="text-xs font-bold text-secondary truncate max-w-[120px]">
                                            {dept.head?.name || "Not Assigned"}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">ID</p>
                                    <p className="text-[10px] font-bold text-slate-300">#{dept._id.slice(-6).toUpperCase()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {departments.length === 0 && (
                    <div className="col-span-full py-20 text-center glass-card space-y-4">
                        <div className="inline-flex p-6 bg-slate-50 rounded-full text-slate-300">
                            <Building2 size={48} />
                        </div>
                        <p className="text-text-muted font-bold italic">No departments found. Create your first one!</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                            <h3 className="text-2xl font-bold text-secondary">
                                {editingId ? "Edit Department" : "New Department"}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-text-muted">Department Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                    placeholder="e.g. Human Resources"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-text-muted">Description</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium resize-none h-24"
                                    placeholder="Describe the department's purpose..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-text-muted">Department Head</label>
                                <select
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                                    value={formData.head}
                                    onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                                >
                                    <option value="">Select Head</option>
                                    {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.designation})</option>)}
                                </select>
                                <p className="text-[10px] text-text-muted font-bold flex items-center gap-1 px-1">
                                    <Info size={12} /> Assign an employee as the lead of this department.
                                </p>
                            </div>

                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-text-muted hover:text-secondary">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-10 py-3 bg-primary text-white rounded-xl font-bold shadow-xl shadow-primary/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : (editingId ? "Update Dept" : "Create Dept")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Departments;
