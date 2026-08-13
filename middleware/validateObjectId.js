/**
 * @file Mongo ObjectId Parameter Validator
 * @description Higher-order middleware function to validate MongoDB ObjectIDs in URL route parameters.
 * 
 * @author 3akl
 */

const mongoose = require("mongoose");

/**
 * Validates target HTTP parameter against standard MongoDB ObjectId hex string rules
 * @param {string} paramName - Parameter key name inside req.params
 * @returns {Function} Express Middleware
 * @author 3akl
 */
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