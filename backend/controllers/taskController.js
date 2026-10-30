const Task = require("../models/Task");
const Project = require("../models/Project");
const { sendNotification } = require("../utils/notificationHelper");

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private/Admin or Manager
const createTask = async (req, res) => {
    try {
        const { title, description, assignedTo, deadline, priority, project } = req.body;
        const task = await Task.create({
            title,
            description,
            assignedTo,
            assignedBy: req.user._id,
            deadline,
            priority,
            project,
        });

        // Update project progress if task belongs to a project
        if (project) {
            const allProjectTasks = await Task.find({ project });
            const completed = allProjectTasks.filter(t => t.status === "Completed").length;
            const total = allProjectTasks.length;
            const progress = Math.round((completed / total) * 100);

            await Project.findByIdAndUpdate(project, { progress });
        }

        // Emit real-time notification
        sendNotification(
            assignedTo,
            `New Task Assigned: "${title}" (Priority: ${priority})`,
            "info"
        );

        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all tasks or user tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === "employee") {
            query = { assignedTo: req.user._id };
        }

        const tasks = await Task.find(query)
            .populate("assignedTo", "name email")
            .populate("assignedBy", "name email")
            .populate("project", "name")
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update task status or details
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);

        if (task) {
            const oldStatus = task.status;

            if (req.user.role === "admin" || req.user.role === "manager") {
                task.title = req.body.title || task.title;
                task.description = req.body.description || task.description;
                task.assignedTo = req.body.assignedTo || task.assignedTo;
                task.deadline = req.body.deadline || task.deadline;
                task.priority = req.body.priority || task.priority;
                task.status = req.body.status || task.status;
                task.project = req.body.project || task.project;
            } else if (req.user._id.toString() === task.assignedTo.toString()) {
                // Employee can only update status
                task.status = req.body.status || task.status;
            } else {
                return res.status(403).json({ message: "Not authorized to update this task" });
            }

            const updatedTask = await task.save();

            // Notify if completed
            if (oldStatus !== "Completed" && updatedTask.status === "Completed") {
                sendNotification(
                    updatedTask.assignedBy,
                    `Task Completed: "${updatedTask.title}" by ${req.user.name}`,
                    "success"
                );
            }

            // Update project progress
            if (updatedTask.project) {
                const allProjectTasks = await Task.find({ project: updatedTask.project });
                const completed = allProjectTasks.filter(t => t.status === "Completed").length;
                const total = allProjectTasks.length;
                const progress = Math.round((completed / total) * 100);

                await Project.findByIdAndUpdate(updatedTask.project, { progress });
            }

            res.json(updatedTask);
        } else {
            res.status(404).json({ message: "Task not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (task) {
            await task.deleteOne();
            res.json({ message: "Task removed" });
        } else {
            res.status(404).json({ message: "Task not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Log work hours for a task
// @route   POST /api/tasks/:id/log-work
// @access  Private
const logWork = async (req, res) => {
    try {
        const { startTime, endTime, description } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Only the assigned employee can log work
        if (req.user._id.toString() !== task.assignedTo.toString()) {
            return res.status(403).json({ message: "Not authorized to log work for this task" });
        }

        // Manual duration in minutes (if provided) or calculated
        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = Math.floor((end - start) / 1000 / 60);

        if (duration <= 0) {
            return res.status(400).json({ message: "End time must be after start time" });
        }

        const log = {
            startTime: start,
            endTime: end,
            duration,
            description,
            loggedAt: new Date()
        };

        task.timeLogs.push(log);
        task.totalTimeSpent += duration;

        // Auto-update status to In Progress if it was Pending
        if (task.status === "Pending") {
            task.status = "In Progress";
        }

        const updatedTask = await task.save();
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createTask,
    getTasks,
    updateTask,
    deleteTask,
    logWork,
};
