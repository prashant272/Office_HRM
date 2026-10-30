const express = require("express");
const router = express.Router();
const {
    generateMonthlyPayroll,
    getSalaries,
    paySalary,
    getMySalaries,
    downloadPayslip
} = require("../controllers/payrollController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Admin routes
router.post("/generate", protect, authorize("admin"), generateMonthlyPayroll);
router.get("/", protect, authorize("admin"), getSalaries);
router.put("/:id/pay", protect, authorize("admin"), paySalary);

// Common routes
router.get("/my", protect, getMySalaries);
router.get("/:id/download", protect, downloadPayslip);

module.exports = router;
