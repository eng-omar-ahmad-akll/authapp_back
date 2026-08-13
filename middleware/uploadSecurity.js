/**
 * @file File Upload & Magic Bytes Inspection Middleware
 * @description Secure file upload handling using Multer memory storage and deep magic bytes inspection.
 * 
 * @author 3akl
 */

const multer = require("multer");
const { AppError } = require("./errorHandler");

/**
 * In-Memory storage buffer allocation
 */
const storage = multer.memoryStorage();

/**
 * MIME Type filtering strategy
 */
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError("Invalid file format. Only JPEG, PNG, and WebP images are allowed.", 400), false);
    }
};

/**
 * Multer upload options with payload limit safeguards
 */
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB Max File Limit
        files: 1
    }
});

/**
 * Middleware: Inspect upload buffer magic bytes to prevent spoofed binary/script uploads
 * @author 3akl
 */
const validateImageMagicBytes = async (req, res, next) => {
    if (!req.file) return next();

    try {
        const { fileTypeFromBuffer } = await import("file-type");
        const detectedType = await fileTypeFromBuffer(req.file.buffer);

        const validExtensions = ["jpg", "png", "webp"];
        const validMimes = ["image/jpeg", "image/png", "image/webp"];

        if (!detectedType || !validExtensions.includes(detectedType.ext) || !validMimes.includes(detectedType.mime)) {
            return next(new AppError("Security Alert: Uploaded file content does not match a valid image type.", 400));
        }

        next();
    } catch (err) {
        return next(new AppError("Error verifying file integrity.", 500));
    }
};

module.exports = {
    uploadSingleImage: upload.single("image"),
    validateImageMagicBytes
};