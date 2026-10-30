const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
        },
        head: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Head of Department
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Department", departmentSchema);
