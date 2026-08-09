const Joi = require("joi");

const safeStringPattern = /^[^$<>{}\\]*$/;

const options = {
    abortEarly: false,
    stripUnknown: true
};

const createBlogSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(150)
        .pattern(safeStringPattern)
        .required()
        .messages({
            "string.pattern.base": "Title contains forbidden special characters",
            "string.empty": "Title is required"
        }),
    content: Joi.string()
        .trim()
        .min(10)
        .required()
        .messages({
            "string.empty": "Content is required",
            "string.min": "Content must be at least 10 characters long"
        }),
    tags: Joi.array().items(Joi.string().trim().pattern(safeStringPattern)).optional()
});

const updateBlogSchema = Joi.object({
    title: Joi.string().trim().min(3).max(150).pattern(safeStringPattern).optional(),
    content: Joi.string().trim().min(10).optional(),
    tags: Joi.array().items(Joi.string().trim().pattern(safeStringPattern)).optional()
});

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

module.exports = { validateCreateBlog, validateUpdateBlog };