// userValidation.js
const Joi = require("joi");

const namePattern = /^[a-zA-Z\u0600-\u06FF\s'-]+$/;

const updateUserSchema = Joi.object({
    first_name: Joi.string()
        .trim()
        .min(2)
        .max(30)
        .pattern(namePattern)
        .messages({
            "string.min": "First name must be at least 2 characters",
            "string.max": "First name cannot exceed 30 characters",
            "string.pattern.base": "First name contains invalid characters"
        }),
        
    last_name: Joi.string()
        .trim()
        .min(2)
        .max(30)
        .pattern(namePattern)
        .messages({
            "string.min": "Last name must be at least 2 characters",
            "string.max": "Last name cannot exceed 30 characters",
            "string.pattern.base": "Last name contains invalid characters"
        }),
        
    email: Joi.string()
        .email({ tlds: { allow: true } })
        .trim()
        .lowercase()
        .max(100)
});

const validateUpdateUser = (req, res, next) => {
    const { error, value } = updateUserSchema.validate(req.body, { 
        abortEarly: false, 
        stripUnknown: true 
    });

    if (error) {
        const errorMessages = error.details.map((detail) => detail.message);
        return res.status(400).json({ status: "fail", errors: errorMessages });
    }

    // التحقق الفعلي من وجود حقول معتمدة بعد حذف الحقول المجهولة بواسطة stripUnknown
    if (!value || Object.keys(value).length === 0) {
        return res.status(400).json({ 
            status: "fail", 
            message: "At least one valid field must be provided for update" 
        });
    }

    req.body = value;
    next();
};

module.exports = { validateUpdateUser };