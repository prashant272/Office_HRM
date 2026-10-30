import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
    Users,
    Mail,
    Phone,
    Briefcase,
    UserPlus,
    Filter,
    Trash2,
    Edit,
    CheckCircle2,
    XCircle,
    Calendar,
    Clock,
    Eye,
    Shield,
    Activity,
    Sliders,
    Search,
    Loader2
} from "lucide-react";
import moment from "moment";
import { toast } from "react-hot-toast";

const formatIST = (dateStr) => {
    if (!dateStr) return "—";
    return moment(dateStr).utcOffset("+05:30").format("DD MMM YYYY, hh:mm A");
};

const Employees = () => {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search and Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filterDept, setFilterDept] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");

    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [employeeHistory, setEmployeeHistory] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        employeeId: "",
        name: "",
        email: "",
        password: "employee123",
        role: "employee",
        department: "",
        designation: "",
        phone: "",
        address: "",
        status: "active",
        workingSchedule: {
            shiftName: "General Shift",
            startTime: "09:30",
            endTime: "18:30",
        },
        permissions: {
            canManageMeetings: true,
            canApproveLeaves: false,
            canViewReports: false,
        },
    });

    const [editingId, setEditingId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchEmployees = async () => {
        try {
            const { data } = await API.get("/employees");
            setEmployees(data);
        } catch (err) {
            console.error("Error fetching employees:", err);
            toast.error("Failed to load employees");
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const { data } = await API.get("/departments");
            setDepartments(data);
        } catch (err) {
            console.error("Error fetching departments:", err);
        }
    };

    useEffect(() => {
        fetchEmployees();
        fetchDepartments();
    }, []);

    // Open Add Modal
    const handleOpenAdd = () => {
        setFormData({
            employeeId: `EMP-${1000 + employees.length + 1}`,
            name: "",
            email: "",
            password: "employee123",
            role: "employee",
            department: departments[0]?._id || "",
            designation: "Sales Associate",
            phone: "+91 ",
            address: "",
            status: "active",
            workingSchedule: {
                shiftName: "General Shift",
                startTime: "09:30",
                endTime: "18:30",
            },
            permissions: {
                canManageMeetings: true,
                canApproveLeaves: false,
                canViewReports: false,
            },
        });
        setShowAddModal(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (emp) => {
        setEditingId(emp._id);
        setFormData({
            employeeId: emp.employeeId || "",
            name: emp.name,
            email: emp.email,
            password: "",
            role: emp.role || "employee",
            department: emp.department?._id || emp.department || "",
            designation: emp.designation || "",
            phone: emp.phone || "",
            address: emp.address || "",
            status: emp.status || "active",
            workingSchedule: emp.workingSchedule || {
                shiftName: "General Shift",
                startTime: "09:30",
                endTime: "18:30",
            },
            permissions: emp.permissions || {
                canManageMeetings: true,
                canApproveLeaves: false,
                canViewReports: false,
            },
        });
        setShowEditModal(true);
    };

    // Open History Modal
    const handleOpenHistory = async (empId) => {
        setShowHistoryModal(true);
        setHistoryLoading(true);
        try {
            const { data } = await API.get(`/employees/${empId}/history`);
            setEmployeeHistory(data);
        } catch (err) {
            toast.error("Failed to load employee history records");
            setShowHistoryModal(false);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Save New Employee
    const handleSaveAdd = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await API.post("/employees", formData);
            toast.success("Employee onboarded successfully!");
            setShowAddModal(false);
            fetchEmployees();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create employee");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Save Edit Employee
    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await API.put(`/employees/${editingId}`, formData);
            toast.success("Employee details updated successfully!");
            setShowEditModal(false);
            fetchEmployees();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update employee");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle Deactivate / Activate
    const handleToggleStatus = async (emp) => {
        const newStatus = emp.status === "active" ? "inactive" : "active";
        const actionWord = newStatus === "active" ? "reactivate" : "deactivate";

        if (window.confirm(`Are you sure you want to ${actionWord} ${emp.name}?`)) {
            try {
                await API.put(`/employees/${emp._id}`, { status: newStatus });
                toast.success(`Employee ${newStatus === "active" ? "activated" : "deactivated"} successfully!`);
                fetchEmployees();
            } catch (err) {
                toast.error(err.response?.data?.message || `Failed to ${actionWord} employee`);
            }
        }
    };

    const filteredEmployees = employees.filter((emp) => {
        if (filterStatus !== "All" && emp.status !== filterStatus) return false;
        if (filterDept !== "All" && emp.department?._id !== filterDept && emp.department?.name !== filterDept) {
            return false;
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const nameMatch = emp.name?.toLowerCase().includes(q);
            const emailMatch = emp.email?.toLowerCase().includes(q);
            const idMatch = emp.employeeId?.toLowerCase().includes(q);
            if (!nameMatch && !emailMatch && !idMatch) return false;
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
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Employee Directory & Access</h1>
                    <p className="text-sm font-semibold text-slate-500 mt-1">
                        Manage employee profiles, shift schedules, credentials, permissions, and view complete session & meeting logs
                    </p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="px-6 py-3.5 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-primary/25 hover:bg-blue-600 active:scale-95 transition-all"
                >
                    <UserPlus size={18} />
                    <span>Onboard Employee</span>
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by ID, name or email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <div>
                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
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
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                    >
                        <option value="All">All Statuses</option>
                        <option value="active">Active Accounts</option>
                        <option value="inactive">Deactivated</option>
                    </select>
                </div>
            </div>

            {/* Employees Directory Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                                <th className="py-4 px-6">Employee ID & Name</th>
                                <th className="py-4 px-6">Department & Role</th>
                                <th className="py-4 px-6">Contact Phone</th>
                                <th className="py-4 px-6">Shift Schedule</th>
                                <th className="py-4 px-6">Live Session</th>
                                <th className="py-4 px-6">Account Status</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {filteredEmployees.length > 0 ? (
                                filteredEmployees.map((emp) => {
                                    const isOnline = emp.latestSession?.isActive && emp.latestSession?.sessionStatus === "active";
                                    const isMissing = emp.latestSession?.isActive && emp.latestSession?.sessionStatus === "heartbeat_missing";

                                    return (
                                        <tr key={emp._id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-4 px-6">
                                                <span className="font-mono text-[10px] text-slate-400 block font-bold">
                                                    {emp.employeeId || "EMP-N/A"}
                                                </span>
                                                <span className="font-black text-slate-900 text-sm block">
                                                    {emp.name}
                                                </span>
                                                <span className="text-[11px] text-slate-500">{emp.email}</span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="font-bold text-slate-800 block">{emp.department?.name || "General"}</span>
                                                <span className="text-[11px] text-primary font-bold uppercase">{emp.role}</span>
                                            </td>
                                            <td className="py-4 px-6 font-semibold">{emp.phone || "—"}</td>
                                            <td className="py-4 px-6">
                                                <span className="block font-semibold text-slate-800">
                                                    {emp.workingSchedule?.shiftName || "General Shift"}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {emp.workingSchedule?.startTime || "09:30"} – {emp.workingSchedule?.endTime || "18:30"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {isOnline ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                        Online Now
                                                    </span>
                                                ) : isMissing ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                                                        Tab Closed
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-[10px] font-semibold">Offline</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                                    emp.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                                }`}>
                                                    {emp.status === "active" ? "Active" : "Deactivated"}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right space-x-2">
                                                <button
                                                    onClick={() => handleOpenHistory(emp._id)}
                                                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all font-bold inline-flex items-center gap-1 text-[11px]"
                                                    title="View Full History"
                                                >
                                                    <Eye size={13} />
                                                    <span>History</span>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(emp)}
                                                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-primary transition-all font-bold inline-flex items-center gap-1 text-[11px]"
                                                    title="Edit Employee"
                                                >
                                                    <Edit size={13} />
                                                    <span>Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(emp)}
                                                    className={`p-2 rounded-xl text-[11px] font-bold transition-all ${
                                                        emp.status === "active"
                                                            ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                    }`}
                                                >
                                                    {emp.status === "active" ? "Deactivate" : "Activate"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-slate-400 font-semibold">
                                        No employees match your search criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD EMPLOYEE MODAL */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-100 my-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-black text-slate-900">Onboard New Employee</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Employee ID *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.employeeId}
                                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Role *</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                    >
                                        <option value="employee">Employee Panel User</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Pooja Sharma"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="pooja@office.com"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Password *</label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Phone Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 98765 43210"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Department</label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                    >
                                        {departments.map((dept) => (
                                            <option key={dept._id} value={dept._id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Designation</label>
                                    <input
                                        type="text"
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                        placeholder="Field Sales Representative"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                    />
                                </div>
                            </div>

                            {/* Working Schedule */}
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <span className="text-[11px] font-black uppercase text-slate-700 block">Working Schedule & Shift</span>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Shift Name</label>
                                        <input
                                            type="text"
                                            value={formData.workingSchedule.shiftName}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    workingSchedule: { ...formData.workingSchedule, shiftName: e.target.value },
                                                })
                                            }
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Start Time</label>
                                        <input
                                            type="time"
                                            value={formData.workingSchedule.startTime}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    workingSchedule: { ...formData.workingSchedule, startTime: e.target.value },
                                                })
                                            }
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase">End Time</label>
                                        <input
                                            type="time"
                                            value={formData.workingSchedule.endTime}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    workingSchedule: { ...formData.workingSchedule, endTime: e.target.value },
                                                })
                                            }
                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-black uppercase tracking-wider shadow-md hover:bg-blue-600 transition-all disabled:opacity-60"
                                >
                                    {isSubmitting ? "Creating..." : "Save Employee"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT EMPLOYEE MODAL */}
            {showEditModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-100 my-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-black text-slate-900">Edit Employee & Permissions</h3>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Employee ID</label>
                                    <input
                                        type="text"
                                        value={formData.employeeId}
                                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                    >
                                        <option value="employee">Employee</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Designation</label>
                                    <input
                                        type="text"
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-primary text-white rounded-xl font-black uppercase tracking-wider shadow-md hover:bg-blue-600 transition-all disabled:opacity-60"
                                >
                                    {isSubmitting ? "Saving..." : "Update Employee"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FULL EMPLOYEE HISTORY & RECORDS MODAL */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl border border-slate-100 my-8">
                        {historyLoading ? (
                            <div className="py-24 text-center">
                                <Loader2 className="animate-spin text-primary w-10 h-10 mx-auto mb-3" />
                                <p className="text-xs font-bold text-slate-500">Loading full records and session logs...</p>
                            </div>
                        ) : employeeHistory ? (
                            <div className="space-y-6 text-xs">
                                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-primary tracking-wider bg-primary/10 px-2.5 py-1 rounded-full">
                                            Individual History & Session Audit
                                        </span>
                                        <h3 className="text-2xl font-black text-slate-900 mt-2">
                                            {employeeHistory.employee?.name} ({employeeHistory.employee?.employeeId})
                                        </h3>
                                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                            {employeeHistory.employee?.department?.name || "General"} · {employeeHistory.employee?.designation}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowHistoryModal(false)}
                                        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Sessions Timeline */}
                                <div className="space-y-2">
                                    <h4 className="font-black text-slate-900 text-sm">Recent Login Sessions & Heartbeat Logs</h4>
                                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                                        {employeeHistory.sessions?.length > 0 ? (
                                            employeeHistory.sessions.map((sess) => (
                                                <div key={sess._id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                                    <div>
                                                        <span className="font-mono text-[10px] text-slate-400 block">{sess.sessionId}</span>
                                                        <span className="font-bold text-slate-800">
                                                            Login: {formatIST(sess.loginTime)}
                                                        </span>
                                                        <span className="text-slate-500 block text-[11px]">
                                                            Last Heartbeat: {formatIST(sess.lastHeartbeat)}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 capitalize">
                                                            {sess.sessionStatus?.replace("_", " ")}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 block mt-1">
                                                            Duration: {sess.durationMinutes}m
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-slate-400">No session logs found</div>
                                        )}
                                    </div>
                                </div>

                                {/* Field Meetings */}
                                <div className="space-y-2">
                                    <h4 className="font-black text-slate-900 text-sm">Field Sales Meetings</h4>
                                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                                        {employeeHistory.meetings?.length > 0 ? (
                                            employeeHistory.meetings.map((m) => (
                                                <div key={m._id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                                    <div>
                                                        <span className="font-black text-slate-900 block">{m.clientName} ({m.clientCompany})</span>
                                                        <span className="text-[11px] text-slate-500">{m.title} · {m.scheduledDate}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                                            m.approvalStatus === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                                        }`}>
                                                            {m.approvalStatus}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 block mt-1">
                                                            {m.verification?.isVerified ? "✓ OTP Verified" : "Unverified"}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-slate-400">No field meetings recorded</div>
                                        )}
                                    </div>
                                </div>

                                {/* Inactivity Alerts History */}
                                <div className="space-y-2">
                                    <h4 className="font-black text-slate-900 text-sm">Inactivity Alerts Record</h4>
                                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
                                        {employeeHistory.alerts?.length > 0 ? (
                                            employeeHistory.alerts.map((al) => (
                                                <div key={al._id} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                                                    <div className="text-rose-700 font-bold">
                                                        <span>⚠️ Inactive for {al.inactivityDurationMinutes}m</span>
                                                        <span className="text-[10px] text-slate-400 block font-normal">{formatIST(al.alertTime)}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                                        {al.status}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-3 text-center text-slate-400">No inactivity alerts on record</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
