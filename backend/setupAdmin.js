const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const Department = require("./models/Department");

dotenv.config();

const setupAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        // Create IT Department
        let dept = await Department.findOne({ name: "IT" });
        if (!dept) {
            dept = await Department.create({
                name: "IT",
                description: "Information Technology Department",
            });
            console.log("IT Department created.");
        }

        // Check if admin exists
        const adminExists = await User.findOne({ role: "admin" });

        if (adminExists) {
            console.log("Admin account already exists.");
        } else {
            const admin = await User.create({
                name: "Super Admin",
                email: "admin@office.com",
                password: "adminpassword123",
                role: "admin",
                department: dept._id,
                designation: "CTO",
                status: "active",
            });
            console.log("Admin account created successfully!");
            console.log("Email: admin@office.com");
            console.log("Password: adminpassword123");
        }

        process.exit();
    } catch (error) {
        console.error("Error setting up admin:", error);
        process.exit(1);
    }
};

setupAdmin();
