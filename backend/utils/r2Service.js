
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

// Initialize Cloudflare R2 Client (S3 Compatible)
const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID || "1bcc80c2879ea7fa47c5784ca34f699f"}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "261ad9796c45ac505bbf2621a8ac9e2a",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "29584165cdf578e954f1cef9318bf5e42bf6e40d4e4cddcaf112e3dfe066160f",
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "primetimenews";
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || "https://pub-2343d84e533742e08719e1d3d8c0a3d6.r2.dev").replace(/\/$/, "");

/**
 * Upload a binary buffer directly to Cloudflare R2
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Target file name
 * @param {string} contentType - MIME type (e.g. image/jpeg, image/png)
 * @returns {Promise<string>} Public CDN URL
 */
const uploadBufferToR2 = async (buffer, filename, contentType = "image/jpeg") => {
    try {
        const key = `evidence/${Date.now()}-${filename}`;
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });

        await r2Client.send(command);
        const fileUrl = `${PUBLIC_URL}/${key}`;
        console.log(`☁️ [Cloudflare R2] Successfully uploaded: ${fileUrl}`);
        return fileUrl;
    } catch (error) {
        console.error("❌ [Cloudflare R2] Upload error:", error.message);
        throw error;
    }
};

/**
 * Upload Base64 Data URL (e.g. Camera Snapshot) to Cloudflare R2
 * @param {string} dataString - data:image/jpeg;base64,...
 * @param {string} prefix - 'selfie' or 'card'
 * @returns {Promise<string>} Public CDN URL
 */
const uploadBase64ToR2 = async (dataString, prefix = "evidence") => {
    if (!dataString || !dataString.startsWith("data:image")) {
        return "";
    }

    try {
        const matches = dataString.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return "";
        }

        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        const filename = `${prefix}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const contentType = `image/${matches[1]}`;

        return await uploadBufferToR2(buffer, filename, contentType);
    } catch (error) {
        console.error(`❌ [Cloudflare R2] Error uploading base64 ${prefix}:`, error.message);
        return "";
    }
};

/**
 * Upload a local file from disk to Cloudflare R2
 * @param {string} filePath - Absolute path to local file
 * @param {string} originalName - Original filename
 * @param {string} mimetype - MIME type
 * @returns {Promise<string>} Public CDN URL
 */
const uploadLocalFileToR2 = async (filePath, originalName, mimetype) => {
    try {
        if (!fs.existsSync(filePath)) return "";
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(originalName) || ".jpg";
        const filename = `file-${Math.round(Math.random() * 1e9)}${ext}`;
        return await uploadBufferToR2(buffer, filename, mimetype || "image/jpeg");
    } catch (error) {
        console.error("❌ [Cloudflare R2] Local file upload error:", error.message);
        return "";
    }
};

module.exports = {
    uploadBufferToR2,
    uploadBase64ToR2,
    uploadLocalFileToR2,
};
