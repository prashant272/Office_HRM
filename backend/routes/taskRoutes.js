const express = require("express");
const router = express.Router();
const {
    createTask,
    getTasks,
    updateTask,
    deleteTask,
    logWork,
} = require("../controllers/taskController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.route("/")
    .post(protect, authorize("admin", "manager"), createTask)
    .get(protect, getTasks);

router.route("/:id")
    .put(protect, updateTask)
    .delete(protect, authorize("admin"), deleteTask);

router.post("/:id/log-work", protect, logWork);

module.exports = router;
