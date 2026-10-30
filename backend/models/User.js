const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ["admin", "manager", "employee"],
            default: "employee",
        },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
        },
        designation: { type: String },
        phone: { type: String },
        address: { type: String },
        joinDate: { type: Date, default: Date.now },
        profileImage: { type: String, default: "" },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        baseSalary: {
            type: Number,
            default: 0,
        },
        bankDetails: {
            accountName: { type: String, default: "" },
            accountNumber: { type: String, default: "" },
            ifscCode: { type: String, default: "" },
            bankName: { type: String, default: "" },
        },
        employeeId: { type: String, unique: true, sparse: true },
        workingSchedule: {
            shiftName: { type: String, default: "General Shift" },
            startTime: { type: String, default: "09:30" },
            endTime: { type: String, default: "18:30" },
        },
        permissions: {
            canManageMeetings: { type: Boolean, default: true },
            canApproveLeaves: { type: Boolean, default: false },
            canViewReports: { type: Boolean, default: false },
        },
    },
    { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
