const crypto = require("crypto");
const moment = require("moment");
const User = require("../models/User");
const LoginSession = require("../models/LoginSession");
const Attendance = require("../models/Attendance");
const ActivityAlert = require("../models/ActivityAlert");
const AuditLog = require("../models/AuditLog");
const jwt = require("jsonwebtoken");
const socket = require("../socket");

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public / Admin
const registerUser = async (req, res) => {
    const {
        name,
        email,
        password,
        role,
        department,
        designation,
        phone,
        baseSalary,
        bankDetails,
        employeeId,
        workingSchedule,
    } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        // Auto-generate employee ID if not provided
        let finalEmpId = employeeId;
        if (!finalEmpId) {
            const count = await User.countDocuments();
            finalEmpId = `EMP-${1000 + count + 1}`;
        }

        const user = await User.create({
            name,
            email,
            password,
            role: role || "employee",
            department,
            designation,
            phone,
            baseSalary,
            bankDetails,
            employeeId: finalEmpId,
            workingSchedule: workingSchedule || {
                shiftName: "General Shift",
                startTime: "09:30",
                endTime: "18:30",
            },
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                employeeId: user.employeeId,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token + start authenticated session
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
    const { email, password, browser, os, screenResolution } = req.body;

    try {
        const user = await User.findOne({ email }).populate("department");

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (user.status === "inactive") {
            return res.status(403).json({ message: "Account has been deactivated. Please contact your administrator." });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate unique server session ID
        const sessionId = crypto.randomUUID();
        const today = moment().format("YYYY-MM-DD");
        const now = new Date();

        // Detect client IP and User-Agent
        const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
        const userAgent = req.headers["user-agent"] || "";

        // Create Server-side Login Session record
        const loginSession = await LoginSession.create({
            user: user._id,
            sessionId,
            loginTime: now,
            lastHeartbeat: now,
            lastInteraction: now,
            sessionStatus: "active",
            isActive: true,
            deviceInfo: {
                browser: browser || "Web Browser",
                os: os || "Desktop",
                ipAddress,
                userAgent,
                screenResolution: screenResolution || "",
            },
            attendanceDate: today,
            shift: user.workingSchedule?.shiftName || "General Shift (09:30 - 18:30)",
        });

        // Automatically create or link today's Attendance
        let attendance = await Attendance.findOne({ user: user._id, date: today });
        if (!attendance) {
            const checkInTime = moment();
            const lateThreshold = moment().set({ hour: 10, minute: 15, second: 0 });
            const status = checkInTime.isAfter(lateThreshold) ? "Late" : "Present";

            attendance = await Attendance.create({
                user: user._id,
                date: today,
                checkIn: checkInTime.toDate(),
                status,
                sessions: [loginSession._id],
                device: browser || "Web Browser",
                shift: user.workingSchedule?.shiftName || "General Shift",
            });
        } else {
            if (!attendance.sessions.includes(loginSession._id)) {
                attendance.sessions.push(loginSession._id);
                await attendance.save();
            }
        }

        // Record Audit Log
        await AuditLog.create({
            user: user._id,
            action: "USER_LOGIN",
            targetEntity: "LoginSession",
            targetId: sessionId,
            details: {
                browser: browser || "Web Browser",
                os: os || "Desktop",
                ipAddress,
            },
            ipAddress,
        });

        // Emit Socket Event for real-time dashboard update
        try {
            const io = socket.getIO();
            io.emit("session-login", {
                sessionId,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    department: user.department?.name,
                    designation: user.designation,
                },
                loginTime: now,
                sessionStatus: "active",
            });
        } catch (e) {
            // Socket not yet ready
        }

        res.json({
            _id: user._id,
            employeeId: user.employeeId || "EMP-" + user._id.toString().slice(-4),
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            designation: user.designation,
            workingSchedule: user.workingSchedule,
            permissions: user.permissions,
            sessionId,
            token: generateToken(user._id),
            sessionStatus: "active",
            loginTime: now,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Explicit Logout user & invalidate session
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
    const { sessionId } = req.body;
    const now = new Date();

    try {
        if (sessionId) {
            const session = await LoginSession.findOne({ sessionId, user: req.user._id });
            if (session) {
                session.isActive = false;
                session.logoutTime = now;
                session.sessionStatus = "logged_out";
                session.logoutReason = "explicit_logout";
                await session.save();

                // Auto-resolve any pending activity alert for this session
                const alert = await ActivityAlert.findOne({ session: session._id, status: "active" });
                if (alert) {
                    alert.status = "resolved";
                    alert.resolvedAt = now;
                    alert.resolutionReason = "Session explicitly logged out";
                    await alert.save();
                }

                // Update Attendance checkOut time if not yet checked out
                const today = moment().format("YYYY-MM-DD");
                const attendance = await Attendance.findOne({ user: req.user._id, date: today });
                if (attendance && !attendance.checkOut) {
                    attendance.checkOut = now;
                    const diffMs = attendance.checkOut.getTime() - attendance.checkIn.getTime();
                    attendance.workDuration = Math.round(diffMs / 60000);
                    await attendance.save();
                }

                // Record Audit Log
                await AuditLog.create({
                    user: req.user._id,
                    action: "USER_LOGOUT",
                    targetEntity: "LoginSession",
                    targetId: sessionId,
                    details: {
                        durationMinutes: session.durationMinutes,
                        logoutReason: "explicit_logout",
                    },
                    ipAddress: req.ip || "127.0.0.1",
                });

                // Emit Socket Event
                try {
                    const io = socket.getIO();
                    io.emit("session-logout", {
                        sessionId,
                        userId: req.user._id,
                        logoutTime: now,
                        sessionStatus: "logged_out",
                    });
                } catch (e) {
                    // Socket not ready
                }
            }
        }

        res.json({ message: "Successfully logged out and session terminated." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Validate current session status (tab reopened / refresh)
// @route   GET /api/auth/session/status
// @access  Private
const getSessionStatus = async (req, res) => {
    const sessionId = req.headers["x-session-id"] || req.query.sessionId;

    try {
        if (!sessionId) {
            return res.status(400).json({ message: "Session ID required" });
        }

        const session = await LoginSession.findOne({ sessionId, user: req.user._id });

        if (!session) {
            return res.status(404).json({ message: "Session not found", isValid: false });
        }

        if (!session.isActive || session.sessionStatus === "logged_out") {
            return res.json({
                isValid: false,
                sessionStatus: session.sessionStatus,
                message: "Session has ended",
            });
        }

        // Resume active heartbeat since client is back
        session.lastHeartbeat = new Date();
        session.sessionStatus = "active";
        await session.save();

        res.json({
            isValid: true,
            sessionId: session.sessionId,
            sessionStatus: session.sessionStatus,
            loginTime: session.loginTime,
            lastHeartbeat: session.lastHeartbeat,
            durationMinutes: session.durationMinutes,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id).populate("department");

    if (user) {
        res.json({
            _id: user._id,
            employeeId: user.employeeId,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            designation: user.designation,
            phone: user.phone,
            address: user.address,
            joinDate: user.joinDate,
            profileImage: user.profileImage,
            baseSalary: user.baseSalary,
            bankDetails: user.bankDetails,
            workingSchedule: user.workingSchedule,
            permissions: user.permissions,
        });
    } else {
        res.status(404).json({ message: "User not found" });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.phone = req.body.phone || user.phone;
        user.address = req.body.address || user.address;
        user.bankDetails = req.body.bankDetails || user.bankDetails;
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            employeeId: updatedUser.employeeId,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404).json({ message: "User not found" });
    }
};

module.exports = {
    registerUser,
    authUser,
    logoutUser,
    getSessionStatus,
    getUserProfile,
    updateUserProfile,
};
