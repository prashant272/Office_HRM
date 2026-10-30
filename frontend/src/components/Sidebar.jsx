import React from "react";
import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    Clock,
    CalendarCheck,
    Briefcase,
    Building2,
    Sliders,
    UserCircle,
    Activity,
    LogOut,
    Shield,
    X
} from "lucide-react";
import { useSession } from "../context/SessionContext";

const Sidebar = ({ isOpen, onClose }) => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    const { logout, sessionStatus } = useSession();

    const isAdmin = userInfo && (userInfo.role === "admin" || userInfo.role === "manager");

    const adminNavItems = [
        { name: "Admin Dashboard", path: "/dashboard", icon: <LayoutDashboard size={19} /> },
        { name: "Employee Directory", path: "/employees", icon: <Users size={19} /> },
        { name: "Attendance & Sessions", path: "/attendance", icon: <Clock size={19} /> },
        { name: "Inactivity Monitoring", path: "/inactivity-monitoring", icon: <Activity size={19} /> },
        { name: "Field Meetings Review", path: "/field-meetings", icon: <CalendarCheck size={19} /> },
        { name: "Departments", path: "/departments", icon: <Building2 size={19} /> },
        { name: "System Settings", path: "/settings", icon: <Sliders size={19} /> },
        { name: "My Profile", path: "/profile", icon: <UserCircle size={19} /> },
    ];

    const employeeNavItems = [
        { name: "My Dashboard", path: "/dashboard", icon: <LayoutDashboard size={19} /> },
        { name: "My Attendance", path: "/attendance", icon: <Clock size={19} /> },
        { name: "Field Meetings", path: "/my-meetings", icon: <Briefcase size={19} /> },
        { name: "My Profile", path: "/profile", icon: <UserCircle size={19} /> },
    ];

    const currentNavItems = isAdmin ? adminNavItems : employeeNavItems;

    return (
        <aside
            className={`w-72 h-screen bg-slate-950 text-slate-300 flex flex-col fixed left-0 top-0 shadow-2xl z-50 border-r border-slate-800/80 transition-transform duration-300 ease-in-out ${
                isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            }`}
        >
            {/* Brand Logo Header */}
            <div className="p-5 sm:p-7 border-b border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30 shrink-0">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight leading-tight">OfficeHRM</h2>
                        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.25em]">
                            {isAdmin ? "Admin Console" : "Employee Portal"}
                        </span>
                    </div>
                </div>

                {/* Close Button on Mobile Screen */}
                <button
                    onClick={onClose}
                    className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
                    aria-label="Close Sidebar"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
                <div className="px-3 mb-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.25em]">
                    {isAdmin ? "Admin Controls" : "Workspace"}
                </div>

                {currentNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center space-x-3.5 px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 group ${
                                isActive
                                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                            }`
                        }
                    >
                        <span className="transition-transform group-hover:scale-110">{item.icon}</span>
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Session Info & Terminate Session */}
            <div className="p-5 border-t border-slate-800/60 bg-slate-900/40">
                <div className="mb-3 px-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Session:</span>
                    <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        {sessionStatus === "active" ? "Connected" : sessionStatus}
                    </span>
                </div>

                <button
                    onClick={() => {
                        onClose?.();
                        logout();
                    }}
                    className="w-full flex items-center justify-center space-x-2.5 px-4 py-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white transition-all text-xs font-black uppercase tracking-wider border border-rose-500/20 active:scale-95 shadow-sm"
                >
                    <LogOut size={16} />
                    <span>Explicit Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
