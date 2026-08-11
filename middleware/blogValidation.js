// blogValidation.js
const Joi = require("joi");

const createBlogSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(150)
        .required(),

    content: Joi.string()
        .trim()
        .min(10)
        .max(50000)
        .required(),

    tags: Joi.array()
        .items(
            Joi.string()
                .trim()
                .min(1)
                .max(30)
                .lowercase()
        )
        .unique()
        .optional()
});

const updateBlogSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(150),

    content: Joi.string()
        .trim()
        .min(10)
        .max(50000),

    tags: Joi.array()
        .items(
            Joi.string()
                .trim()
                .min(1)
                .max(30)
                .lowercase()
        )
        .unique()
});

const validateCreateBlog = (req, res, next) => {
    const { error, value } = createBlogSchema.validate(req.body, { 
        abortEarly: false, 
        stripUnknown: true 
    });

    if (error) {
        return res.status(400).json({ 
            status: "fail", 
            errors: error.details.map(d => d.message) 
        });
    }

    req.body = value;
    next();
};

const validateUpdateBlog = (req, res, next) => {
    const { error, value } = updateBlogSchema.validate(req.body, { 
        abortEarly: false, 
        stripUnknown: true 
    });

    if (error) {
        return res.status(400).json({ 
            status: "fail", 
            errors: error.details.map(d => d.message) 
        });
    }

    // التحقق الفعلي من الحقول المقبولة بعد مسح أي حقول غير معرفة (stripUnknown)
    if (!value || Object.keys(value).length === 0) {
        return res.status(400).json({ 
            status: "fail", 
            message: "At least one valid field must be provided for update" 
        });
    }

    req.body = value;
    next();
};

module.exports = { 
    validateCreateBlog, 
    validateUpdateBlog 
};