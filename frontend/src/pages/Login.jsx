import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import { Lock, Mail, Loader2, Shield } from "lucide-react";
import { useSession } from "../context/SessionContext";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { setSessionData } = useSession();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Gather client device info
            const browser = navigator.userAgent.includes("Chrome")
                ? "Google Chrome"
                : navigator.userAgent.includes("Firefox")
                ? "Mozilla Firefox"
                : "Web Browser";
            const os = navigator.userAgent.includes("Windows")
                ? "Windows 11"
                : navigator.userAgent.includes("Mac")
                ? "macOS"
                : "Desktop";
            const screenResolution = `${window.screen.width}x${window.screen.height}`;

            const { data } = await API.post("/auth/login", {
                email: email.trim(),
                password,
                browser,
                os,
                screenResolution,
            });

            // Role is automatically verified by backend DB
            localStorage.setItem("userInfo", JSON.stringify(data));
            if (setSessionData) setSessionData(data);
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Invalid email or password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
            {/* Ambient background glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl">
                    {/* Brand Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-tr from-primary to-blue-500 mx-auto rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-primary/30">
                            <Shield size={32} />
                        </div>
                        <h1 className="text-2xl font-black text-white tracking-tight">OfficeHRM Portal</h1>
                        <p className="text-slate-400 text-xs font-semibold mt-1">
                            Enterprise Session & Inactivity Monitored Workplace
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs font-bold animate-in fade-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3.5 bg-primary text-white rounded-xl font-black text-sm tracking-wide shadow-lg shadow-primary/25 hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <span>Sign In to OfficeHRM</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-[11px] text-slate-500 font-medium">
                        Continuous Session Heartbeat · IST (Asia/Kolkata)
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
