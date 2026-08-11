const mongoose = require("mongoose");

const validateObjectId = (paramName = "id") => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                status: "fail",
                message: `Invalid ID format for parameter '${paramName}'`
            });
        }
        next();
    };
};

module.exports = validateObjectId;