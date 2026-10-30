const Project = require("../models/Project");
const Task = require("../models/Task");

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private/Admin
const createProject = async (req, res) => {
    try {
        const { name, description, clientName, manager, team, deadline } = req.body;

        const project = await Project.create({
            name,
            description,
            clientName,
            manager,
            team,
            deadline,
        });

        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
    try {
        let query = {};
        if (req.user.role === "employee") {
            query = { team: req.user._id };
        }

        const projects = await Project.find(query)
            .populate("manager", "name email")
            .populate("team", "name email designation")
            .sort({ createdAt: -1 });

        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get project details & progress
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate("manager", "name email")
            .populate("team", "name email designation");

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // Calculate progress based on tasks
        const tasks = await Task.find({ project: project._id });
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === "Completed").length;

        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Update project progress in DB
        project.progress = progress;
        await project.save();

        res.json({ project, tasks });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private/Admin
const updateProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private/Admin
const deleteProject = async (req, res) => {
    try {
        await Project.findByIdAndDelete(req.params.id);
        // Also remove project ref from tasks? Or leave as orphaned? 
        // For now, just delete the project.
        res.json({ message: "Project deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
};
