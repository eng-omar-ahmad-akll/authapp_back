/**
 * @file Auth Request Validation Middleware
 * @description Validates authentication payloads (Register, Login, Password Reset) using Joi schemas.
 * 
 * @author 3akl
 */

const Joi = require("joi");

const options = {
    abortEarly: false,
    stripUnknown: true
};

/**
 * Strong password policy scheme definition
 */
const passwordSchema = Joi.string()
    .min(8)
    .max(128)
    .pattern(/[a-z]/, "lowercase")
    .pattern(/[A-Z]/, "uppercase")
    .pattern(/\d/, "number")
    .pattern(/[@$!%*?&#._-]/, "special character")
    .required()
    .messages({
        "string.min": "Password must be at least 8 characters long",
        "string.max": "Password cannot exceed 128 characters",
        "string.pattern.name": "Password must contain at least one {#name}",
        "string.empty": "Password is required"
    });

/**
 * Registration request body schema
 */
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
        .email({ tlds: { allow: true } })
        .trim()
        .lowercase()
        .max(100)
        .required()
        .messages({
            "string.email": "Please provide a valid email address",
            "string.empty": "Email address is required"
        }),

    password: passwordSchema
});

/**
 * Login request body schema
 */
const loginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: true } })
        .trim()
        .lowercase()
        .required(),

    password: Joi.string().required(),

    twoFactorCode: Joi.string().trim().optional().allow("", null),
    totpCode: Joi.string().trim().optional().allow("", null),
    code: Joi.string().trim().optional().allow("", null),
    token: Joi.string().trim().optional().allow("", null)
});

/**
 * Forgot password request body schema
 */
const forgotPasswordSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: true } })
        .trim()
        .lowercase()
        .required()
});

/**
 * Reset password request body schema
 */
const resetPasswordSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: true } })
        .trim()
        .lowercase()
        .required(),
    otp: Joi.string()
        .length(6)
        .pattern(/^\d+$/)
        .required(),
    newPassword: passwordSchema
});

/**
 * Middleware: Validate user registration request body
 * @author 3akl
 */
const validateRegister = (req, res, next) => {
    const { error, value } = registerSchema.validate(req.body, options);
    if (error) {
        return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });
    }
    req.body = value;
    next();
};

/**
 * Middleware: Validate user login request body
 * @author 3akl
 */
const validateLogin = (req, res, next) => {
    const { error, value } = loginSchema.validate(req.body, options);
    if (error) {
        return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });
    }
    req.body = value;
    next();
};

/**
 * Middleware: Validate forgot password email request body
 * @author 3akl
 */
const validateForgotPassword = (req, res, next) => {
    const { error, value } = forgotPasswordSchema.validate(req.body, options);
    if (error) {
        return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });
    }
    req.body = value;
    next();
};

/**
 * Middleware: Validate reset password request body including OTP
 * @author 3akl
 */
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