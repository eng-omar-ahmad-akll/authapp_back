const Joi = require("joi");

const createBlogSchema = Joi.object({
    title: Joi.string().min(3).max(150).trim().required(),
    content: Joi.string().min(10).max(50000).trim().required(),
    tags: Joi.array().items(Joi.string().max(30).trim().lowercase()).optional()
});

const updateBlogSchema = Joi.object({
    title: Joi.string().min(3).max(150).trim(),
    content: Joi.string().min(10).max(50000).trim(),
    tags: Joi.array().items(Joi.string().max(30).trim().lowercase())
}).min(1);

const validateCreateBlog = (req, res, next) => {
    const { error, value } = createBlogSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });
    }
    req.body = value;
    next();
};

const validateUpdateBlog = (req, res, next) => {
    const { error, value } = updateBlogSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        return res.status(400).json({ status: "fail", errors: error.details.map(d => d.message) });
    }
    req.body = value;
    next();
};

module.exports = { validateCreateBlog, validateUpdateBlog };