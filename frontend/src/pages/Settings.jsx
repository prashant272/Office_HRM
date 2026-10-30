import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
    Sliders,
    Clock,
    Shield,
    Phone,
    Calendar,
    Save,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";
import { toast } from "react-hot-toast";

const Settings = () => {
    const [settings, setSettings] = useState({
        inactivityThresholdMinutes: 10,
        heartbeatIntervalSeconds: 45,
        otpExpiryMinutes: 5,
        maxOtpAttempts: 3,
        workingSchedule: {
            shiftName: "General Shift",
            startTime: "09:30",
            endTime: "18:30",
        },
        attendancePolicy: {
            lateThresholdTime: "10:15",
            halfDayThresholdMinutes: 240,
        },
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await API.get("/settings");
                if (data) {
                    setSettings((prev) => ({ ...prev, ...data }));
                }
            } catch (err) {
                console.error("Error loading settings:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await API.put("/settings", settings);
            toast.success("System configurations saved successfully!");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[70vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-primary w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-16 font-sans max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">System & Policy Settings</h1>
                <p className="text-sm font-semibold text-slate-500 mt-1">
                    Configure inactivity thresholds, heartbeat monitoring intervals, field sales OTP limits, and shift policies
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* 1. Inactivity & Heartbeat Monitoring */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 text-primary border-b border-slate-100 pb-4">
                        <Clock size={22} />
                        <h3 className="text-base font-black text-slate-900">Inactivity & Session Monitoring Policy</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                        <div>
                            <label className="block text-slate-700 font-bold mb-1.5">
                                Inactivity Alert Threshold (Minutes) *
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="120"
                                value={settings.inactivityThresholdMinutes}
                                onChange={(e) =>
                                    setSettings({ ...settings, inactivityThresholdMinutes: Number(e.target.value) })
                                }
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Triggers an admin inactivity alert when no heartbeat is received past this threshold (Default: 10 mins).
                            </p>
                        </div>

                        <div>
                            <label className="block text-slate-700 font-bold mb-1.5">
                                Client Heartbeat Interval (Seconds) *
                            </label>
                            <input
                                type="number"
                                required
                                min="15"
                                max="180"
                                value={settings.heartbeatIntervalSeconds}
                                onChange={(e) =>
                                    setSettings({ ...settings, heartbeatIntervalSeconds: Number(e.target.value) })
                                }
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Frequency of continuous browser background heartbeats (Default: 30–60 seconds).
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Field Sales Mobile OTP Verification Policy */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 text-primary border-b border-slate-100 pb-4">
                        <Phone size={22} />
                        <h3 className="text-base font-black text-slate-900">Field Sales Client OTP Policies</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                        <div>
                            <label className="block text-slate-700 font-bold mb-1.5">
                                Client OTP Expiry (Minutes) *
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="30"
                                value={settings.otpExpiryMinutes}
                                onChange={(e) =>
                                    setSettings({ ...settings, otpExpiryMinutes: Number(e.target.value) })
                                }
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Duration before the 6-digit client mobile verification code expires (Default: 5 mins).
                            </p>
                        </div>

                        <div>
                            <label className="block text-slate-700 font-bold mb-1.5">
                                Maximum Allowed Verification Attempts *
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="10"
                                value={settings.maxOtpAttempts}
                                onChange={(e) =>
                                    setSettings({ ...settings, maxOtpAttempts: Number(e.target.value) })
                                }
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Prevents brute force OTP inputs before blocking and requesting admin override.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. Company Shift & Attendance Policy */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm space-y-6">
                    <div className="flex items-center space-x-3 text-primary border-b border-slate-100 pb-4">
                        <Calendar size={22} />
                        <h3 className="text-base font-black text-slate-900">Standard Shift & Attendance Rules</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                        <div>
                            <label className="block text-slate-700 font-bold mb-1.5">Standard Shift Name</label>
                            <input
                                type="text"
                                value={settings.workingSchedule?.shiftName || "General Shift"}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        workingSchedule: { ...settings.workingSchedule, shiftName: e.target.value },
                                    })
                                }
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-700 font-bold mb-1.5">Shift Start Time (IST)</label>
                            <input
                                type="time"
                                value={settings.workingSchedule?.startTime || "09:30"}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        workingSchedule: { ...settings.workingSchedule, startTime: e.target.value },
                                    })
                                }
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-700 font-bold mb-1.5">Shift End Time (IST)</label>
                            <input
                                type="time"
                                value={settings.workingSchedule?.endTime || "18:30"}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        workingSchedule: { ...settings.workingSchedule, endTime: e.target.value },
                                    })
                                }
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs pt-2">
                        <div>
                            <label className="block text-slate-700 font-bold mb-1.5">Late Mark Threshold Time</label>
                            <input
                                type="time"
                                value={settings.attendancePolicy?.lateThresholdTime || "10:15"}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        attendancePolicy: { ...settings.attendancePolicy, lateThresholdTime: e.target.value },
                                    })
                                }
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-700 font-bold mb-1.5">Half-Day Threshold (Minutes)</label>
                            <input
                                type="number"
                                value={settings.attendancePolicy?.halfDayThresholdMinutes || 240}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        attendancePolicy: {
                                            ...settings.attendancePolicy,
                                            halfDayThresholdMinutes: Number(e.target.value),
                                        },
                                    })
                                }
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/25 hover:bg-blue-600 active:scale-95 transition-all flex items-center space-x-2 disabled:opacity-60"
                    >
                        {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
                        <span>Save System Configurations</span>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
