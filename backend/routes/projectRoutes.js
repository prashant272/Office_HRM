const express = require("express");
const router = express.Router();
const {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    deleteProject,
} = require("../controllers/projectController");
const { protect, admin } = require("../middleware/authMiddleware");

router.route("/")
    .post(protect, admin, createProject)
    .get(protect, getProjects);

router.route("/:id")
    .get(protect, getProjectById)
    .put(protect, admin, updateProject)
    .delete(protect, admin, deleteProject);

module.exports = router;
