const mongoose = require("mongoose");
const dotenv = require("dotenv");
const moment = require("moment");
const User = require("./models/User");
const Department = require("./models/Department");
const SystemSettings = require("./models/SystemSettings");
const FieldMeeting = require("./models/FieldMeeting");
const MeetingVerification = require("./models/MeetingVerification");
const MeetingEvidence = require("./models/MeetingEvidence");
const Attendance = require("./models/Attendance");
const LoginSession = require("./models/LoginSession");

dotenv.config();

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/office_management");
        console.log("Connected to MongoDB for seeding...");

        // 1. Departments
        const salesDept = await Department.findOneAndUpdate(
            { name: "Field Sales & Business Development" },
            { name: "Field Sales & Business Development", description: "Client relationship and on-site sales" },
            { upsert: true, new: true }
        );

        const techDept = await Department.findOneAndUpdate(
            { name: "Information Technology" },
            { name: "Information Technology", description: "Software development and infrastructure" },
            { upsert: true, new: true }
        );

        const opsDept = await Department.findOneAndUpdate(
            { name: "Operations & HR" },
            { name: "Operations & HR", description: "HR management and workplace logistics" },
            { upsert: true, new: true }
        );

        // 2. Admin User
        let admin = await User.findOne({ email: "admin@office.com" });
        if (!admin) {
            admin = await User.create({
                employeeId: "EMP-1000",
                name: "Prashant Sharma (Admin)",
                email: "admin@office.com",
                password: "adminpassword123",
                role: "admin",
                department: techDept._id,
                designation: "Chief HR & Technology Officer",
                phone: "+91 98765 43210",
                status: "active",
                workingSchedule: {
                    shiftName: "General Shift",
                    startTime: "09:30",
                    endTime: "18:30",
                },
            });
            console.log("✅ Admin user created: admin@office.com / adminpassword123");
        } else {
            console.log("ℹ️ Admin user exists: admin@office.com");
        }

        // 3. Employee 1 (Field Sales)
        let emp1 = await User.findOne({ email: "rahul.verma@office.com" });
        if (!emp1) {
            emp1 = await User.create({
                employeeId: "EMP-1001",
                name: "Rahul Verma",
                email: "rahul.verma@office.com",
                password: "employee123",
                role: "employee",
                department: salesDept._id,
                designation: "Senior Field Sales Executive",
                phone: "+91 98111 22334",
                status: "active",
                workingSchedule: {
                    shiftName: "Field Sales Shift",
                    startTime: "09:30",
                    endTime: "18:30",
                },
            });
            console.log("✅ Employee 1 created: rahul.verma@office.com / employee123");
        }

        // 4. Employee 2 (Tech)
        let emp2 = await User.findOne({ email: "priya.nair@office.com" });
        if (!emp2) {
            emp2 = await User.create({
                employeeId: "EMP-1002",
                name: "Priya Nair",
                email: "priya.nair@office.com",
                password: "employee123",
                role: "employee",
                department: techDept._id,
                designation: "Full Stack Engineer",
                phone: "+91 98222 33445",
                status: "active",
                workingSchedule: {
                    shiftName: "General Shift",
                    startTime: "10:00",
                    endTime: "19:00",
                },
            });
            console.log("✅ Employee 2 created: priya.nair@office.com / employee123");
        }

        // 5. System Settings
        let settings = await SystemSettings.findOne();
        if (!settings) {
            settings = await SystemSettings.create({
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
                updatedBy: admin._id,
            });
            console.log("✅ System settings initialized.");
        }

        // 6. Sample Field Meetings
        const today = moment().format("YYYY-MM-DD");
        const existingMeeting = await FieldMeeting.findOne({ clientName: "Aarav Singhania" });
        if (!existingMeeting && emp1) {
            const meeting1 = await FieldMeeting.create({
                title: "Enterprise ERP Demo & Pitch",
                employee: emp1._id,
                meetingType: "scheduled",
                clientName: "Aarav Singhania",
                clientCompany: "Nexus Logistics Pvt Ltd",
                clientPhone: "+91 98765 12345",
                clientEmail: "aarav@nexuslogistics.in",
                location: {
                    address: "Tower B, Cyber City, DLF Phase 2, Gurugram, Haryana 122002",
                    lat: 28.4952,
                    lng: 77.0892,
                },
                scheduledDate: today,
                scheduledStartTime: "11:30",
                actualStartTime: new Date(Date.now() - 3 * 3600 * 1000),
                actualEndTime: new Date(Date.now() - 2 * 3600 * 1000),
                status: "Completed",
                approvalStatus: "Pending_Approval",
                meetingNotes: "Presented the product demo. Client requested commercial proposal with 150 user tier.",
                discussionSummary: "Discussed data migration timeline and SLA expectations.",
                outcomes: "Ready for contract review. Follow-up meeting requested.",
                followUpDate: moment().add(3, "days").toDate(),
            });

            const ver1 = await MeetingVerification.create({
                meeting: meeting1._id,
                clientPhone: meeting1.clientPhone,
                isVerified: true,
                verifiedAt: new Date(Date.now() - 2.8 * 3600 * 1000),
                verificationMethod: "sms_otp",
            });

            const ev1 = await MeetingEvidence.create({
                meeting: meeting1._id,
                selfieUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80",
                selfieCapturedAt: new Date(Date.now() - 2.8 * 3600 * 1000),
                businessCardUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80",
                businessCardUploadedAt: new Date(Date.now() - 2.8 * 3600 * 1000),
                locationSnapshot: meeting1.location,
            });

            meeting1.verification = ver1._id;
            meeting1.evidence = ev1._id;
            await meeting1.save();

            console.log("✅ Sample Field Meeting with OTP verification and evidence created.");
        }

        // 7. Today's Sample Attendance
        const existingAtt = await Attendance.findOne({ user: emp1._id, date: today });
        if (!existingAtt && emp1) {
            await Attendance.create({
                user: emp1._id,
                date: today,
                checkIn: moment().set({ hour: 9, minute: 25 }).toDate(),
                status: "Present",
                shift: "Field Sales Shift (09:30 - 18:30)",
                device: "Chrome / Windows 11",
            });
        }

        console.log("🎉 Database seeding complete!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding error:", err);
        process.exit(1);
    }
};

seedDatabase();
