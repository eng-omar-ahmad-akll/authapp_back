/**
 * @file Blog Validation Middleware
 * @description Validates payloads for creating and updating blog posts using Joi schemas.
 * 
 * @author 3akl
 */

const Joi = require("joi");

/**
 * Schema definition for creating a new blog post
 */
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

    category: Joi.string()
        .trim()
        .max(50)
        .optional(),

    tags: Joi.array()
        .items(
            Joi.string()
                .trim()
                .min(1)
                .max(30)
                .lowercase()
        )
        .unique()
        .optional(),

    coverImageUrl: Joi.string()
        .uri()
        .optional()
        .allow(""),

    coverImage: Joi.object({
        url: Joi.string().uri().allow(""),
        public_id: Joi.string().allow("")
    }).optional()
});

/**
 * Schema definition for updating an existing blog post
 */
const updateBlogSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(150),

    content: Joi.string()
        .trim()
        .min(10)
        .max(50000),

    category: Joi.string()
        .trim()
        .max(50),

    tags: Joi.array()
        .items(
            Joi.string()
                .trim()
                .min(1)
                .max(30)
                .lowercase()
        )
        .unique(),

    coverImageUrl: Joi.string()
        .uri()
        .allow(""),

    coverImage: Joi.object({
        url: Joi.string().uri().allow(""),
        public_id: Joi.string().allow("")
    })
});

/**
 * Middleware: Validate request payload for blog creation
 * @author 3akl
 */
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

/**
 * Middleware: Validate request payload for updating a blog post
 * @author 3akl
 */
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