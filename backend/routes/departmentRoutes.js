const express = require("express");
const router = express.Router();
const {
    createDepartment,
    getDepartments,
    updateDepartment,
    deleteDepartment,
} = require("../controllers/departmentController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.route("/")
    .post(protect, authorize("admin"), createDepartment)
    .get(protect, getDepartments);

router.route("/:id")
    .put(protect, authorize("admin"), updateDepartment)
    .delete(protect, authorize("admin"), deleteDepartment);

module.exports = router;
