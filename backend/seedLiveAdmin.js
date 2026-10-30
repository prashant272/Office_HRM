const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Department = require("./models/Department");

dotenv.config();

const seedLiveAdmin = async () => {
    try {
        
        const uri = process.env.MONGO_URI;
        if (!uri) {
            console.error("❌ Error: MONGO_URI is missing in .env file!");
            process.exit(1);
        }

        console.log("⏳ Connecting to Live MongoDB Atlas...");
        await mongoose.connect(uri);
        console.log("✅ Successfully connected to MongoDB Atlas!");

        // 1. Ensure Management / IT Department
        let adminDept = await Department.findOne({ name: "Management & Administration" });
        if (!adminDept) {
            adminDept = await Department.create({
                name: "Management & Administration",
                description: "Executive Management & Operations",
            });
            console.log("📁 Created Department: Management & Administration");
        }

        let salesDept = await Department.findOne({ name: "Field Sales & Business Development" });
        if (!salesDept) {
            salesDept = await Department.create({
                name: "Field Sales & Business Development",
                description: "Field Client Visits & Sales",
            });
            console.log("📁 Created Department: Field Sales & Business Development");
        }

        // 2. Hash passwords
        const salt = await bcrypt.genSalt(10);
        const adminHashedPassword = await bcrypt.hash("adminpassword123", salt);
        const empHashedPassword = await bcrypt.hash("employee123", salt);

        // 3. Upsert Admin User
        const adminData = {
            name: "Super Admin",
            email: "admin@office.com",
            password: adminHashedPassword,
            role: "admin",
            department: adminDept._id,
            designation: "Chief Operating Officer / Admin",
            employeeId: "ADM-001",
            phone: "+91 98765 43210",
            status: "active",
            permissions: {
                canManageMeetings: true,
                canApproveLeaves: true,
                canViewReports: true,
            },
            workingSchedule: {
                shiftName: "General Shift",
                startTime: "09:30",
                endTime: "18:30",
            },
        };

        const admin = await User.findOneAndUpdate(
            { email: "admin@office.com" },
            { $set: adminData },
            { upsert: true, new: true, runValidators: false }
        );
        console.log("👑 Live Admin User seeded/updated successfully:");
        console.log(`   - Name: ${admin.name}`);
        console.log(`   - Email: ${admin.email}`);
        console.log(`   - Role: ${admin.role}`);
        console.log(`   - Password: adminpassword123`);

        // 4. Upsert Employee User
        const empData = {
            name: "Rahul Verma",
            email: "rahul.verma@office.com",
            password: empHashedPassword,
            role: "employee",
            department: salesDept._id,
            designation: "Senior Field Sales Executive",
            employeeId: "EMP-1001",
            phone: "+91 98111 22334",
            status: "active",
            workingSchedule: {
                shiftName: "Field Sales Shift",
                startTime: "09:30",
                endTime: "18:30",
            },
        };

        const emp = await User.findOneAndUpdate(
            { email: "rahul.verma@office.com" },
            { $set: empData },
            { upsert: true, new: true, runValidators: false }
        );
        console.log("👤 Live Employee User seeded/updated successfully:");
        console.log(`   - Name: ${emp.name}`);
        console.log(`   - Email: ${emp.email}`);
        console.log(`   - Role: ${emp.role}`);
        console.log(`   - Password: employee123`);

        console.log("\n🚀 All credentials are live in Atlas database!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding live database:", error);
        process.exit(1);
    }
};

seedLiveAdmin();
