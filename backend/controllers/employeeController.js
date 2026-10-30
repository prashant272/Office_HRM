const User = require("../models/User");
const Attendance = require("../models/Attendance");
const LoginSession = require("../models/LoginSession");
const FieldMeeting = require("../models/FieldMeeting");
const ActivityAlert = require("../models/ActivityAlert");
const AuditLog = require("../models/AuditLog");

// @desc    Get all employees with latest session and attendance status
// @route   GET /api/employees
// @access  Private/Admin
const getEmployees = async (req, res) => {
    try {
        const employees = await User.find({})
            .populate("department", "name")
            .select("-password")
            .sort({ createdAt: -1 });

        const employeesWithDetails = await Promise.all(
            employees.map(async (emp) => {
                const lastAttendance = await Attendance.findOne({ user: emp._id }).sort({ date: -1, checkIn: -1 });
                const latestSession = await LoginSession.findOne({ user: emp._id }).sort({ loginTime: -1 });
                const meetingCount = await FieldMeeting.countDocuments({ employee: emp._id });

                return {
                    ...emp._doc,
                    lastAttendance,
                    latestSession: latestSession
                        ? {
                              sessionId: latestSession.sessionId,
                              loginTime: latestSession.loginTime,
                              lastHeartbeat: latestSession.lastHeartbeat,
                              sessionStatus: latestSession.sessionStatus,
                              isActive: latestSession.isActive,
                          }
                        : null,
                    meetingCount,
                };
            })
        );

        res.json(employeesWithDetails);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get comprehensive employee profile + full history (Admin only)
// @route   GET /api/employees/:id/history
// @access  Private/Admin
const getEmployeeHistory = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id)
            .populate("department", "name")
            .select("-password");

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const attendance = await Attendance.find({ user: employee._id })
            .populate("sessions")
            .sort({ date: -1 })
            .limit(30);

        const sessions = await LoginSession.find({ user: employee._id })
            .sort({ loginTime: -1 })
            .limit(30);

        const meetings = await FieldMeeting.find({ employee: employee._id })
            .populate("verification", "-otpHash")
            .populate("evidence")
            .sort({ scheduledDate: -1 })
            .limit(30);

        const alerts = await ActivityAlert.find({ user: employee._id })
            .sort({ alertTime: -1 })
            .limit(30);

        res.json({
            employee,
            attendance,
            sessions,
            meetings,
            alerts,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private/Admin
const getEmployeeById = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id)
            .populate("department", "name")
            .select("-password");
        if (employee) {
            res.json(employee);
        } else {
            res.status(404).json({ message: "Employee not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create Employee (Admin only)
// @route   POST /api/employees
// @access  Private/Admin
const createEmployee = async (req, res) => {
    const {
        name,
        email,
        password,
        role,
        department,
        designation,
        phone,
        address,
        employeeId,
        workingSchedule,
        permissions,
        baseSalary,
    } = req.body;

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "An employee already exists with this email" });
        }

        // Auto-generate employee ID if not provided
        let finalEmpId = employeeId;
        if (!finalEmpId) {
            const count = await User.countDocuments();
            finalEmpId = `EMP-${1000 + count + 1}`;
        }

        const employee = await User.create({
            name,
            email,
            password: password || "employee123",
            role: role || "employee",
            department,
            designation,
            phone,
            address,
            employeeId: finalEmpId,
            workingSchedule: workingSchedule || {
                shiftName: "General Shift",
                startTime: "09:30",
                endTime: "18:30",
            },
            permissions: permissions || {
                canManageMeetings: true,
                canApproveLeaves: false,
                canViewReports: false,
            },
            baseSalary: baseSalary || 0,
            status: "active",
        });

        await AuditLog.create({
            user: req.user._id,
            action: "EMPLOYEE_CREATED",
            targetEntity: "User",
            targetId: employee._id.toString(),
            details: { name: employee.name, email: employee.email, role: employee.role },
            ipAddress: req.ip || "127.0.0.1",
        });

        res.status(201).json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update employee (Admin only)
// @route   PUT /api/employees/:id
// @access  Private/Admin
const updateEmployee = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id);

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        employee.name = req.body.name || employee.name;
        employee.email = req.body.email || employee.email;
        employee.role = req.body.role || employee.role;
        employee.department = req.body.department || employee.department;
        employee.designation = req.body.designation || employee.designation;
        employee.phone = req.body.phone || employee.phone;
        employee.status = req.body.status || employee.status;
        employee.employeeId = req.body.employeeId || employee.employeeId;

        if (req.body.workingSchedule) {
            employee.workingSchedule = req.body.workingSchedule;
        }

        if (req.body.permissions) {
            employee.permissions = req.body.permissions;
        }

        if (req.body.password) {
            employee.password = req.body.password;
        }

        const updatedEmployee = await employee.save();

        await AuditLog.create({
            user: req.user._id,
            action: "EMPLOYEE_UPDATED",
            targetEntity: "User",
            targetId: employee._id.toString(),
            details: { name: employee.name, status: employee.status },
            ipAddress: req.ip || "127.0.0.1",
        });

        res.json(updatedEmployee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete employee (Admin only)
// @route   DELETE /api/employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res) => {
    try {
        const employee = await User.findById(req.params.id);

        if (employee) {
            await employee.deleteOne();

            await AuditLog.create({
                user: req.user._id,
                action: "EMPLOYEE_DELETED",
                targetEntity: "User",
                targetId: req.params.id,
                details: { name: employee.name, email: employee.email },
                ipAddress: req.ip || "127.0.0.1",
            });

            res.json({ message: "Employee removed successfully" });
        } else {
            res.status(404).json({ message: "Employee not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getEmployees,
    getEmployeeById,
    getEmployeeHistory,
    createEmployee,
    updateEmployee,
    deleteEmployee,
};
