const express = require("express");
const router = express.Router();
const {
    getEmployees,
    getEmployeeById,
    getEmployeeHistory,
    createEmployee,
    updateEmployee,
    deleteEmployee,
} = require("../controllers/employeeController");
const { protect, admin } = require("../middleware/authMiddleware");

router.route("/")
    .get(protect, admin, getEmployees)
    .post(protect, admin, createEmployee);

router.get("/:id/history", protect, admin, getEmployeeHistory);

router.route("/:id")
    .get(protect, admin, getEmployeeById)
    .put(protect, admin, updateEmployee)
    .delete(protect, admin, deleteEmployee);

module.exports = router;
