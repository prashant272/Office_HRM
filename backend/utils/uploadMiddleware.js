const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const uploadDir = path.join(__dirname, "..", "uploads", "evidence");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

// File filter (images only)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (allowedTypes.test(ext) && (mime.startsWith("image/") || allowedTypes.test(mime))) {
        cb(null, true);
    } else {
        cb(new Error("Only JPEG, PNG, and WebP image formats are permitted!"), false);
    }
};

const uploadEvidence = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max limit
    fileFilter,
});

module.exports = {
    uploadEvidence,
    uploadDir,
};
