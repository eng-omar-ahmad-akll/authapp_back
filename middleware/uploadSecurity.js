const multer = require("multer");
const { AppError } = require("./errorHandler");

// 1. التخزين المبدئي في الـ Memory لفحص الخصائص الأمنية قبل الرفع الدائم
const storage = multer.memoryStorage();

// 2. Strict MIME Type Filtering
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError("Invalid file format. Only JPEG, PNG, and WebP images are allowed.", 400), false);
    }
};

// 3. Multer Configuration مع حدود حازمة للـ Payload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB Max Size
        files: 1 // مسموح بملف واحد فقط في الطلب
    }
});

// 4. Deep Magic Bytes Inspection Middleware (التحقق الفعلي من محتوى الملف)
const validateImageMagicBytes = async (req, res, next) => {
    if (!req.file) return next();

    try {
        // استيراد ديناميكي لمكتبة file-type
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