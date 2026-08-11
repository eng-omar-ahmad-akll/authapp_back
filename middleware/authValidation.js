const Joi = require("joi");

// OWASP Pattern لكلمات المرور القوية
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-]).{8,128}$/;

const options = {
    abortEarly: false,
    stripUnknown: true // يمنع حقول الـ Injection ويحذف الحقول الغريبة
};

const registerSchema = Joi.object({
    first_name: Joi.string()
        .trim()
        .min(2)
        .max(30)
        .required()
        .messages({
            "string.empty": "First name is required",
            "string.min": "First name must be at least 2 characters long",
            "string.max": "First name cannot exceed 30 characters"
        }),

    last_name: Joi.string()
        .trim()
        .min(2)
        .max(30)
        .required()
        .messages({
            "string.empty": "Last name is required",
            "string.min": "Last name must be at least 2 characters long",
            "string.max": "Last name cannot exceed 30 characters"
        }),

    email: Joi.string()
        .email({ tlds: { allow: false } })
        .trim()
        .lowercase()
        .max(100)
        .required()
        .messages({
            "string.email": "Please provide a valid email address",
            "string.empty": "Email address is required"
        }),

    password: Joi.string()
        .required()
        .pattern(strongPasswordPattern)
        .messages({
            "string.pattern.base": "Password must be 8-128 chars, include upper & lower case, number and a special character",
            "string.empty": "Password is required"
        })
});

const loginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .trim()
        .lowercase()
        .required(),

    password: Joi.string().required(),

    twoFactorCode: Joi.string().trim().optional().allow("", null),
    totpCode: Joi.string().trim().optional().allow("", null),
    code: Joi.string().trim().optional().allow("", null),
    token: Joi.string().trim().optional().allow("", null)
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .trim()
        .lowercase()
        .required()
});

const resetPasswordSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .trim()
        .lowercase()
        .required(),
    otp: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required(),
    newPassword: Joi.string()
        .required()
        .pattern(strongPasswordPattern)
});

const validateRegister = (req, res, next) => {
    const { error, value } = registerSchema.validate(req.body, options);
    if (error) {
        return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });
    }
    req.body = value;
    next();
};

const validateLogin = (req, res, next) => {
    const { error, value } = loginSchema.validate(req.body, options);
    if (error) {
        return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });
    }
    req.body = value;
    next();
};

const validateForgotPassword = (req, res, next) => {
    const { error, value } = forgotPasswordSchema.validate(req.body, options);
    if (error) {
        return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });
    }
    req.body = value;
    next();
};

const validateResetPassword = (req, res, next) => {
    const { error, value } = resetPasswordSchema.validate(req.body, options);
    if (error) {
        return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });
    }
    req.body = value;
    next();
};

module.exports = {
    validateRegister,
    validateLogin,
    validateForgotPassword,
    validateResetPassword
};