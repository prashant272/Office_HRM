const Leave = require("../models/Leave");
const Department = require("../models/Department");
const { sendNotification } = require("../utils/notificationHelper");
const moment = require("moment");

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private
const applyLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;
        const leave = await Leave.create({
            user: req.user._id,
            leaveType,
            startDate,
            endDate,
            reason,
        });
        res.status(201).json(leave);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get leaves (all for Admin, team for Dept Head, own for Employee)
// @route   GET /api/leaves
// @access  Private
const getLeaves = async (req, res) => {
    try {
        let query = {};
        const managedDepartments = await Department.find({ head: req.user._id });
        const managedDeptIds = managedDepartments.map(d => d._id);

        if (req.user.role === "admin" || req.user.role === "manager") {
            query = {};
        } else if (managedDeptIds.length > 0) {
            const leaves = await Leave.find({})
                .populate({
                    path: "user",
                    select: "name email department",
                    populate: { path: "department" }
                })
                .populate("approvedBy", "name email")
                .sort({ createdAt: -1 });

            const filteredLeaves = leaves.filter(leave => {
                if (leave.user._id.toString() === req.user._id.toString()) return true;
                return managedDeptIds.some(id => leave.user.department?._id.toString() === id.toString());
            });

            return res.json(filteredLeaves);
        } else {
            query = { user: req.user._id };
        }

        const leaves = await Leave.find(query)
            .populate("user", "name email department")
            .populate("approvedBy", "name email")
            .sort({ createdAt: -1 });

        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve/Reject leave
// @route   PUT /api/leaves/:id/status
// @access  Private/Admin or Department Head
const updateLeaveStatus = async (req, res) => {
    try {
        const leave = await Leave.findById(req.params.id).populate("user");

        if (!leave) {
            return res.status(404).json({ message: "Leave record not found" });
        }

        const managedDepartments = await Department.find({ head: req.user._id });
        const managedDeptIds = managedDepartments.map(d => d._id.toString());
        const isDeptHead = managedDeptIds.includes(leave.user.department?.toString());

        if (req.user.role !== "admin" && req.user.role !== "manager" && !isDeptHead) {
            return res.status(403).json({ message: "Not authorized to approve this leave" });
        }

        leave.status = req.body.status; // Approved or Rejected
        leave.approvedBy = req.user._id;

        const updatedLeave = await leave.save();

        // Emit real-time notification to the employee
        sendNotification(
            leave.user._id,
            `Leave application ${updatedLeave.status}: ${leave.leaveType} (${moment(leave.startDate).format("DD MMM")})`,
            updatedLeave.status === "Approved" ? "success" : "error"
        );

        res.json(updatedLeave);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    applyLeave,
    getLeaves,
    updateLeaveStatus,
};
