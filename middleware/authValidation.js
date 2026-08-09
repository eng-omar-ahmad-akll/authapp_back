const Joi = require("joi");

// Pattern to block NoSQL injection chars ($) and HTML/Script tags (<, >, {, }, \)
const safeStringPattern = /^[^$<>{}\\]*$/;

// OWASP Regex for strong password: min 8, 1 upper, 1 lower, 1 digit, 1 special char
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-]).{8,128}$/;

const options = {
    abortEarly: false,
    stripUnknown: true // OWASP Protection: Mass Assignment Mitigation
};

// 1. Protected Register Schema
const registerSchema = Joi.object({
    first_name: Joi.string()
        .trim()
        .min(2)
        .max(30)
        .pattern(safeStringPattern)
        .required()
        .messages({
            "string.pattern.base": "First name contains forbidden special characters",
            "string.empty": "First name is required",
            "string.min": "First name must be at least 2 characters long"
        }),

    last_name: Joi.string()
        .trim()
        .min(2)
        .max(30)
        .pattern(safeStringPattern)
        .required()
        .messages({
            "string.pattern.base": "Last name contains forbidden special characters",
            "string.empty": "Last name is required",
            "string.min": "Last name must be at least 2 characters long"
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
            "string.pattern.base": "Password must include uppercase, lowercase, number and special character (@$!%*?&#._-)",
            "string.empty": "Password is required"
        })
});

// 2. Protected Login Schema
const loginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .trim()
        .lowercase()
        .required()
        .messages({
            "string.email": "Please provide a valid email address",
            "string.empty": "Email is required"
        }),

    password: Joi.string()
        .required()
        .messages({
            "string.empty": "Password is required"
        })
});

// Middlewares
const validateRegister = (req, res, next) => {
    const { error, value } = registerSchema.validate(req.body, options);
    
    if (error) {
        const errorsList = error.details.map((detail) => detail.message);
        return res.status(400).json({ status: "fail", errors: errorsList });
    }
    
    req.body = value;
    next();
};

const validateLogin = (req, res, next) => {
    const { error, value } = loginSchema.validate(req.body, options);
    
    if (error) {
        const errorsList = error.details.map((detail) => detail.message);
        return res.status(400).json({ status: "fail", errors: errorsList });
    }
    
    req.body = value;
    next();
};

module.exports = {
    validateRegister,
    validateLogin
};