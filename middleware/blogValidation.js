const Joi = require("joi");

// النمط المخصص لمنع رموز الـ NoSQL Injection وأقواس XSS المباشرة
const safeStringPattern = /^[^$<>{}\\]*$/;

const options = {
    abortEarly: false,     // إرجاع كافة أخطاء المدخلات دفعة واحدة
    stripUnknown: true     // OWASP Mitigation: حظر وحذف الحقول غير المعروفة (Mass Assignment)
};

// 1. Schema إنشاء مقال جديد
const createBlogSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(150)
        .pattern(safeStringPattern)
        .required()
        .messages({
            "string.pattern.base": "Title contains forbidden special characters",
            "string.empty": "Title is required",
            "string.min": "Title must be at least 3 characters long",
            "string.max": "Title cannot exceed 150 characters"
        }),

    content: Joi.string()
        .trim()
        .min(10)
        .max(50000) // تحديد حد أقصى لحجم المقال لمنع DoS
        .required()
        .messages({
            "string.empty": "Content is required",
            "string.min": "Content must be at least 10 characters long",
            "string.max": "Content is too long (max 50,000 characters)"
        }),

    tags: Joi.array()
        .items(
            Joi.string()
                .trim()
                .max(30)
                .pattern(safeStringPattern)
                .messages({
                    "string.pattern.base": "Tag contains forbidden special characters",
                    "string.max": "Tag cannot exceed 30 characters"
                })
        )
        .max(10) // منع إرسال أكثر من 10 تاجز
        .optional()
        .messages({
            "array.max": "You cannot add more than 10 tags"
        })
});

// 2. Schema تعديل مقال (يلزم إرسال حقل واحد على الأقل للتحديث)
const updateBlogSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(150)
        .pattern(safeStringPattern)
        .optional()
        .messages({
            "string.pattern.base": "Title contains forbidden special characters",
            "string.min": "Title must be at least 3 characters long",
            "string.max": "Title cannot exceed 150 characters"
        }),

    content: Joi.string()
        .trim()
        .min(10)
        .max(50000)
        .optional()
        .messages({
            "string.min": "Content must be at least 10 characters long",
            "string.max": "Content is too long (max 50,000 characters)"
        }),

    tags: Joi.array()
        .items(
            Joi.string()
                .trim()
                .max(30)
                .pattern(safeStringPattern)
                .messages({
                    "string.pattern.base": "Tag contains forbidden special characters",
                    "string.max": "Tag cannot exceed 30 characters"
                })
        )
        .max(10)
        .optional()
        .messages({
            "array.max": "You cannot add more than 10 tags"
        })
}).min(1).messages({
    "object.min": "At least one field (title, content, or tags) must be provided for update"
});

// Middlewares للتحقق
const validateCreateBlog = (req, res, next) => {
    const { error, value } = createBlogSchema.validate(req.body, options);
    
    if (error) {
        const errorsList = error.details.map((detail) => detail.message);
        return res.status(400).json({ status: "fail", errors: errorsList });
    }
    
    req.body = value;
    next();
};

const validateUpdateBlog = (req, res, next) => {
    const { error, value } = updateBlogSchema.validate(req.body, options);
    
    if (error) {
        const errorsList = error.details.map((detail) => detail.message);
        return res.status(400).json({ status: "fail", errors: errorsList });
    }
    
    req.body = value;
    next();
};

module.exports = {
    validateCreateBlog,
    validateUpdateBlog
};