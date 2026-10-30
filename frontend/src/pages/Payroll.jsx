import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import { toast } from "react-hot-toast";
import {
    Calculator,
    Search,
    Download,
    CheckCircle2,
    AlertCircle,
    CalendarDays,
    CreditCard,
    TrendingUp,
    IndianRupee,
    FileText
} from "lucide-react";
import moment from "moment";

const Payroll = () => {
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [month, setMonth] = useState(moment().format("MM"));
    const [year, setYear] = useState(moment().format("YYYY"));
    const [searchTerm, setSearchTerm] = useState("");
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));
    const isAdmin = userInfo?.role === "admin";

    const fetchSalaries = async () => {
        try {
            setLoading(true);
            const endpoint = isAdmin ? `/payroll?month=${month}&year=${year}` : "/payroll/my";
            const { data } = await axios.get(endpoint);
            setSalaries(data);
        } catch (error) {
            toast.error(error.response?.data?.message || "Error fetching salaries");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalaries();
    }, [month, year, isAdmin]);

    const handleGeneratePayroll = async () => {
        try {
            setGenerating(true);
            const { data } = await axios.post("/payroll/generate", { month, year });
            toast.success(data.message || "Payroll generated successfully");
            fetchSalaries();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error generating payroll");
        } finally {
            setGenerating(false);
        }
    };

    const handlePaySalary = async (id) => {
        try {
            await axios.put(`/payroll/${id}/pay`);
            toast.success("Salary marked as Paid");
            fetchSalaries();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error processing payment");
        }
    };

    const handleDownloadPayslip = async (salaryId, employeeName, monthStr) => {
        try {
            const response = await axios.get(`/payroll/${salaryId}/download`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Payslip_${employeeName}_${monthStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            toast.error("Failed to download payslip");
        }
    };

    const filteredSalaries = salaries.filter(s =>
        s.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
                    <p className="text-gray-500">Automate and manage employee salaries with Overtime & PDF Slips</p>
                </div>

                {isAdmin && (
                    <button
                        onClick={handleGeneratePayroll}
                        disabled={generating}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {generating ? (
                            <Calculator className="w-5 h-5 animate-spin" />
                        ) : (
                            <Calculator className="w-5 h-5" />
                        )}
                        Generate {moment(`${month}`, "MM").format("MMMM")} Payroll
                    </button>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full md:w-64">
                    <Search className="text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search employee..."
                        className="bg-transparent border-none focus:ring-0 w-full text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <CalendarDays className="text-gray-400 w-5 h-5" />
                    <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                    >
                        {moment.months().map((m, i) => (
                            <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="bg-gray-50 border-gray-200 rounded-lg text-sm"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={String(y)}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-[13px]">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Attendance</th>
                            <th className="px-6 py-4">Base Salary</th>
                            <th className="px-6 py-4 text-emerald-600">OT Pay</th>
                            <th className="px-6 py-4 text-rose-600">Deductions</th>
                            <th className="px-6 py-4 text-blue-700">Net Salary</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        Loading payroll data...
                                    </div>
                                </td>
                            </tr>
                        ) : filteredSalaries.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                                    No payroll records found for this period.
                                </td>
                            </tr>
                        ) : (
                            filteredSalaries.map((salary) => (
                                <tr key={salary._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{salary.user?.name}</div>
                                        <div className="text-[11px] text-gray-500">{salary.user?.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between w-28">
                                                <span>Presents:</span>
                                                <span className="font-bold text-green-600">{salary.attendanceSummary?.presentDays || 0}</span>
                                            </div>
                                            <div className="flex justify-between w-28 text-[10px] text-slate-400 italic">
                                                <span>OT Hours:</span>
                                                <span>{salary.overtimeHours || 0}h</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 font-mono font-bold">
                                        ₹{salary.baseSalary?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                                        +₹{salary.overtimePay?.toLocaleString() || 0}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-bold text-rose-500">
                                        -₹{salary.deductions?.toLocaleString() || 0}
                                    </td>
                                    <td className="px-6 py-4 font-black text-blue-800 font-mono text-base bg-blue-50/30">
                                        ₹{salary.netSalary?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {salary.status === "Paid" ? (
                                            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2.5 py-1 rounded-full w-fit font-black uppercase text-[10px]">
                                                <CheckCircle2 className="w-3 h-3" /> Paid
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full w-fit font-black uppercase text-[10px]">
                                                <AlertCircle className="w-3 h-3" /> Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            {isAdmin && salary.status === "Pending" && (
                                                <button
                                                    onClick={() => handlePaySalary(salary._id)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 shadow-sm"
                                                    title="Mark as Paid"
                                                >
                                                    <CreditCard className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDownloadPayslip(salary._id, salary.user?.name, salary.month)}
                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100 shadow-sm"
                                                title="Download Payslip PDF"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Payroll;
