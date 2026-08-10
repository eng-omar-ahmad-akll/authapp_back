const Joi = require("joi");

// النمط المخصص لمنع رموز الـ NoSQL Injection و أقواس XSS
const safeStringPattern = /^[^$<>{}\\]*$/;

// OWASP Pattern لكلمات المرور القوية (8-128 حرف، حرف كبير، حرف صغير، رقم، ورمز خاص)
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._\--]).{8,128}$/;

const options = {
    abortEarly: false,     // إرجاع جميع أخطاء المدخلات دفعة واحدة
    stripUnknown: true     // OWASP Mitigation: حظر ومنع الحقول الغريبة (Mass Assignment)
};

// 1. Schema تسجيل حساب جديد
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
            "string.min": "First name must be at least 2 characters long",
            "string.max": "First name cannot exceed 30 characters"
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

// 2. Schema تسجيل الدخول
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

// Middlewares للتحقق
const validateRegister = (req, res, next) => {
    const { error, value } = registerSchema.validate(req.body, options);
    
    if (error) {
        const errorsList = error.details.map((detail) => detail.message);
        return res.status(400).json({ status: "fail", errors: errorsList });
    }
    
    req.body = value; // إسناد البيانات المعالجة والنظيفة
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