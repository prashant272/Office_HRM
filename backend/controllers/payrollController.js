const Salary = require("../models/Salary");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Leave = require("../models/Leave");
const moment = require("moment");
const PDFDocument = require("pdfkit");
const { broadcastNotification } = require("../utils/notificationHelper");

// @desc    Generate salary for all employees for a specific month
// @route   POST /api/payroll/generate
// @access  Private/Admin
const generateMonthlyPayroll = async (req, res) => {
    try {
        const { month, year } = req.body; // month is "01"-"12", year is "YYYY"
        const m = parseInt(month) - 1; // 0-indexed for moment
        const y = parseInt(year);

        const targetDate = moment([y, m]);
        const monthStr = targetDate.format("MMMM YYYY");
        const daysInMonth = targetDate.daysInMonth();

        const employees = await User.find({ role: "employee", status: "active" });
        const payrollResults = [];

        for (const emp of employees) {
            const startDate = moment([y, m, 1]).startOf("day");
            const endDate = moment([y, m, daysInMonth]).endOf("day");

            // Get All Attendance for the month
            const attendanceDocs = await Attendance.find({
                user: emp._id,
                date: { $gte: startDate.format("YYYY-MM-DD"), $lte: endDate.format("YYYY-MM-DD") }
            });

            // Get Approved Leaves
            const leaveDocs = await Leave.find({
                user: emp._id,
                status: "Approved",
                $or: [
                    { startDate: { $gte: startDate.toDate(), $lte: endDate.toDate() } },
                    { endDate: { $gte: startDate.toDate(), $lte: endDate.toDate() } }
                ]
            });

            let presentDays = 0;
            let totalOvertimeMinutes = 0;
            let shortDurationDeductions = 0;
            const SHORT_DURATION_PENALTY = 200; // Fixed penalty for < 8.5 hours
            const OVERTIME_THRESHOLD = 510; // 8.5 hours in minutes

            attendanceDocs.forEach(att => {
                if (att.status === "Present" || att.status === "Late") {
                    presentDays++;

                    // 8.5 hours = 510 minutes
                    if (att.workDuration && att.workDuration < 510) {
                        shortDurationDeductions += SHORT_DURATION_PENALTY;
                    } else if (att.workDuration && att.workDuration > 510) {
                        totalOvertimeMinutes += (att.workDuration - 510);
                    }
                }
            });

            const leavesTaken = leaveDocs.length;
            const paidDays = presentDays + leavesTaken;
            const absentDays = daysInMonth - paidDays;

            const baseSalary = emp.baseSalary || 0;
            const dailyRate = baseSalary / daysInMonth;
            const hourlyRate = dailyRate / 8.5;

            // Overtime Pay (1.2x of hourly rate per hour)
            const overtimeHours = Number((totalOvertimeMinutes / 60).toFixed(2));
            const overtimePay = Math.round((totalOvertimeMinutes / 60) * hourlyRate * 1.2);

            // Deductions logic:
            const absentDeduction = Math.round(dailyRate * absentDays);
            const totalDeductions = absentDeduction + shortDurationDeductions;

            const netSalary = Math.max(0, baseSalary + overtimePay - totalDeductions);

            // Upsert salary record
            const salary = await Salary.findOneAndUpdate(
                { user: emp._id, month: monthStr },
                {
                    baseSalary,
                    overtimeHours,
                    overtimePay,
                    deductions: totalDeductions,
                    netSalary,
                    attendanceSummary: {
                        presentDays,
                        leavesTaken,
                        absentDays
                    }
                },
                { upsert: true, new: true }
            );

            payrollResults.push(salary);
        }

        // Broadcast notification to all employees
        broadcastNotification(
            `Payroll for ${monthStr} has been generated! View your payslip now.`,
            "success"
        );

        res.status(201).json({ message: `Payroll generated for ${monthStr}`, count: payrollResults.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all salaries for a specific month
// @route   GET /api/payroll
// @access  Private/Admin
const getSalaries = async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = {};

        if (month && year) {
            const m = parseInt(month) - 1;
            const y = parseInt(year);
            query.month = moment([y, m]).format("MMMM YYYY");
        }

        const salaries = await Salary.find(query).populate("user", "name email department designation bankDetails");
        res.json(salaries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update salary status (Pay)
// @route   PUT /api/payroll/:id/pay
// @access  Private/Admin
const paySalary = async (req, res) => {
    try {
        const salary = await Salary.findById(req.params.id);
        if (!salary) return res.status(404).json({ message: "Salary record not found" });

        salary.status = "Paid";
        salary.paidAt = Date.now();
        await salary.save();

        res.json(salary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get own salary history
// @route   GET /api/payroll/my
// @access  Private
const getMySalaries = async (req, res) => {
    try {
        const salaries = await Salary.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(salaries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download Payslip PDF
// @route   GET /api/payroll/:id/download
// @access  Private
const downloadPayslip = async (req, res) => {
    try {
        const salary = await Salary.findById(req.params.id)
            .populate("user", "name email role designation department bankDetails");

        if (!salary) {
            return res.status(404).json({ message: "Salary record not found" });
        }

        // Check permission: Admin or the owner
        if (req.user.role !== "admin" && req.user._id.toString() !== salary.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to download this payslip" });
        }

        const doc = new PDFDocument({ margin: 50 });

        // Response settings for PDF
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=payslip_${salary.user.name}_${salary.month}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text("OFFICE MANAGEMENT SYSTEM", { align: "center", underline: true });
        doc.moveDown();
        doc.fontSize(16).text(`Salary Slip for ${salary.month}`, { align: "center" });
        doc.moveDown(2);

        // Employee Info
        doc.fontSize(12).text(`Employee Name: ${salary.user.name}`);
        doc.text(`Designation: ${salary.user.designation || "N/A"}`);
        doc.text(`Email: ${salary.user.email}`);
        doc.text(`Status: ${salary.status}`);
        doc.moveDown();

        // Bank Details
        doc.text("--- Bank Details ---", { underline: true });
        const bank = salary.user.bankDetails || {};
        doc.text(`Account Name: ${bank.accountName || "N/A"}`);
        doc.text(`Account Number: ${bank.accountNumber || "N/A"}`);
        doc.text(`IFSC: ${bank.ifscCode || "N/A"}`);
        doc.text(`Bank: ${bank.bankName || "N/A"}`);
        doc.moveDown();

        // Attendance Info
        doc.text("--- Attendance Summary ---", { underline: true });
        doc.text(`Present Days: ${salary.attendanceSummary.presentDays}`);
        doc.text(`Leaves Taken: ${salary.attendanceSummary.leavesTaken}`);
        doc.text(`Absent Days: ${salary.attendanceSummary.absentDays}`);
        doc.moveDown();

        // Salary Breakdown
        doc.text("--- Salary Breakdown ---", { underline: true });
        doc.text(`Base Salary: INR ${salary.baseSalary.toLocaleString()}`);
        doc.text(`Overtime Pay: INR ${salary.overtimePay.toLocaleString()} (${salary.overtimeHours} hrs)`);
        doc.text(`Bonus: INR ${salary.bonus.toLocaleString()}`);
        doc.fillColor("red").text(`Deductions: -INR ${salary.deductions.toLocaleString()}`);
        doc.moveDown();

        doc.fillColor("black").fontSize(14).text(`Net Salary: INR ${salary.netSalary.toLocaleString()}`, { bold: true });
        doc.moveDown(4);

        // Footer
        doc.fontSize(10).text("This is a computer-generated document and does not require a physical signature.", { align: "center", italic: true });

        doc.end();

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    generateMonthlyPayroll,
    getSalaries,
    paySalary,
    getMySalaries,
    downloadPayslip
};
