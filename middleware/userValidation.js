const Joi = require("joi");

const safeStringPattern = /^[^$<>{}\\]*$/;

const options = {
    abortEarly: false,
    stripUnknown: true // OWASP Mitigation: يحظر ويحذف تلقائياً أي حقول غير معرفة (مثل role أو password)
};

// Schema لتعديل البيانات الأساسية فقط
const updateUserSchema = Joi.object({
    first_name: Joi.string()
        .trim()
        .min(2)
        .max(30)
        .pattern(safeStringPattern)
        .optional()
        .messages({
            "string.pattern.base": "First name contains forbidden special characters",
            "string.min": "First name must be at least 2 characters long",
            "string.max": "First name cannot exceed 30 characters"
        }),

    last_name: Joi.string()
        .trim()
        .min(2)
        .max(30)
        .pattern(safeStringPattern)
        .optional()
        .messages({
            "string.pattern.base": "Last name contains forbidden special characters",
            "string.min": "Last name must be at least 2 characters long",
            "string.max": "Last name cannot exceed 30 characters"
        }),

    email: Joi.string()
        .email({ tlds: { allow: false } })
        .trim()
        .lowercase()
        .max(100)
        .optional()
        .messages({
            "string.email": "Please provide a valid email address"
        })
}).min(1).messages({
    "object.min": "At least one field (first_name, last_name, or email) must be provided for update"
});

const validateUpdateUser = (req, res, next) => {
    const { error, value } = updateUserSchema.validate(req.body, options);

    if (error) {
        const errorsList = error.details.map((detail) => detail.message);
        return res.status(400).json({ status: "fail", errors: errorsList });
    }

    req.body = value;
    next();
};

module.exports = {
    validateUpdateUser
};