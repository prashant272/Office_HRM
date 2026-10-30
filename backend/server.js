const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const path = require("path");
const socket = require("./socket");
const { startSessionMonitoring } = require("./utils/sessionMonitor");

// Load ENV
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socket.init(server);

// Middleware
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Static uploads directory for meeting evidence (selfies, business cards)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// DB Connection
mongoose
    .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/office_management")
    .then(() => {
        console.log("✅ MongoDB Connected Successfully");
        // Start background session inactivity monitor
        startSessionMonitoring();
    })
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err);
        process.exit(1);
    });

// Routes
const authRoutes = require("./routes/authRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const taskRoutes = require("./routes/taskRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const projectRoutes = require("./routes/projectRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const productivityRoutes = require("./routes/productivityRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const fieldMeetingRoutes = require("./routes/fieldMeetingRoutes");
const alertRoutes = require("./routes/alertRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/productivity", productivityRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/field-meetings", fieldMeetingRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/", (req, res) => {
    res.send("🚀 Office Management System API is running...");
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`📡 Server running on port ${PORT}`);
});
