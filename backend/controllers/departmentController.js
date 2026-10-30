const Department = require("../models/Department");

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private/Admin
const createDepartment = async (req, res) => {
    try {
        const { name, description, head } = req.body;
        const departmentExists = await Department.findOne({ name });

        if (departmentExists) {
            return res.status(400).json({ message: "Department already exists" });
        }

        const department = await Department.create({
            name,
            description,
            head,
        });

        res.status(201).json(department);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
const getDepartments = async (req, res) => {
    try {
        const departments = await Department.find({}).populate("head", "name email");
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private/Admin
const updateDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (department) {
            department.name = req.body.name || department.name;
            department.description = req.body.description || department.description;
            department.head = req.body.head || department.head;

            const updatedDepartment = await department.save();
            res.json(updatedDepartment);
        } else {
            res.status(404).json({ message: "Department not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private/Admin
const deleteDepartment = async (req, res) => {
    try {
        const department = await Department.findById(req.params.id);

        if (department) {
            await department.deleteOne();
            res.json({ message: "Department removed" });
        } else {
            res.status(404).json({ message: "Department not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createDepartment,
    getDepartments,
    updateDepartment,
    deleteDepartment,
};
