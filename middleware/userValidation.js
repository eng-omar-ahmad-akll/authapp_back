const Joi = require("joi");

// النمط المخصص لمنع رموز الـ NoSQL Injection و أقواس XSS
const safeStringPattern = /^[^$<>{}\\]*$/;

const updateUserSchema = Joi.object({
    first_name: Joi.string()
        .min(2)
        .max(30)
        .trim()
        .pattern(safeStringPattern)
        .messages({
            "string.pattern.base": "First name contains forbidden special characters"
        }),
        
    last_name: Joi.string()
        .min(2)
        .max(30)
        .trim()
        .pattern(safeStringPattern)
        .messages({
            "string.pattern.base": "Last name contains forbidden special characters"
        }),
        
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .trim()
        .lowercase()
        .max(100)
}).min(1);

const validateUpdateUser = (req, res, next) => {
    const { error, value } = updateUserSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (error) {
        const errorMessages = error.details.map((detail) => detail.message);
        return res.status(400).json({ status: "fail", errors: errorMessages });
    }

    req.body = value;
    next();
};

module.exports = { validateUpdateUser };