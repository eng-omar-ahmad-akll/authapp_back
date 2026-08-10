const Joi = require("joi");

// النمط المخصص لمنع رموز الـ NoSQL Injection و أوسام XSS
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
        .required()
        .messages({
            "string.empty": "Content is required",
            "string.min": "Content must be at least 10 characters long"
        }),

    tags: Joi.array()
        .items(
            Joi.string()
                .trim()
                .pattern(safeStringPattern)
                .messages({
                    "string.pattern.base": "Tag contains forbidden special characters"
                })
        )
        .optional()
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
        .optional()
        .messages({
            "string.min": "Content must be at least 10 characters long"
        }),

    tags: Joi.array()
        .items(
            Joi.string()
                .trim()
                .pattern(safeStringPattern)
                .messages({
                    "string.pattern.base": "Tag contains forbidden special characters"
                })
        )
        .optional()
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