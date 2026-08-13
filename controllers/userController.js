/**
 * @file User Controller
 * @description Administrative and Profile Management API.
 * Handles fetching user records, profile updates, and role modifications.
 * 
 * @author 3akl
 */

const mongoose = require("mongoose");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * Utility function to normalize User ID string extraction from JWT Request object
 * @param {Object} req - Express Request object
 * @returns {string|null} User ID string
 */
const getUserIdFromReq = (req) => {
    if (!req.user) return null;
    if (typeof req.user === "string") return req.user;
    return req.user.id || req.user._id?.toString();
};

/**
 * @route GET /api/users
 * @desc Get all registered user accounts without sensitive credentials
 * @access Private (Admin Only)
 * @author 3akl
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find()
        .select("-password -twoFactorSecret -tempTwoFactorSecret -refreshTokens")
        .lean();

    return res.status(200).json({
        status: "success",
        count: users.length,
        data: users
    });
});

/**
 * @route GET /api/users/:id
 * @desc Get specific user profile details by ID
 * @access Private (Authenticated User)
 * @author 3akl
 */
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid User ID format");
    }

    const user = await User.findById(id)
        .select("-password -twoFactorSecret -tempTwoFactorSecret -refreshTokens")
        .lean();

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    return res.status(200).json({
        status: "success",
        data: user
    });
});

/**
 * @route PUT /api/users/:id
 * @desc Update user profile details (Name, Avatar direct URL)
 * @access Private (Account Owner or Admin)
 * @author 3akl
 */
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid User ID format");
    }

    const currentUserId = getUserIdFromReq(req);
    const currentUserRole = req.user?.role;

    if (id !== currentUserId && currentUserRole !== "admin") {
        res.status(403);
        throw new Error("Forbidden: You are not authorized to update this profile");
    }

    if (req.body.email) {
        res.status(400);
        throw new Error("Email address cannot be updated via this route. Use email update verification flow.");
    }

    const user = await User.findById(id).select("+isActive");
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (user.isActive === false) {
        res.status(401);
        throw new Error("Account deactivated or banned");
    }

    let isModified = false;

    if (typeof req.body.first_name === "string" && req.body.first_name.trim() !== "") {
        user.first_name = req.body.first_name.trim();
        isModified = true;
    }
    if (typeof req.body.last_name === "string" && req.body.last_name.trim() !== "") {
        user.last_name = req.body.last_name.trim();
        isModified = true;
    }

    const avatarUrlInput = req.body.avatarUrl || req.body.avatar?.url;

    if (avatarUrlInput && typeof avatarUrlInput === "string") {
        user.avatar = {
            url: avatarUrlInput.trim(),
            public_id: user.avatar?.public_id || `avatar_${Date.now()}`
        };
        isModified = true;
    }

    if (!isModified) {
        res.status(400);
        throw new Error("No valid fields provided for update");
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.twoFactorSecret;
    delete userResponse.tempTwoFactorSecret;
    delete userResponse.refreshTokens;
    delete userResponse.isActive;

    return res.status(200).json({
        status: "success",
        data: userResponse
    });
});

/**
 * @route PATCH /api/users/:id/role
 * @desc Modify authorization access role of a target user account
 * @access Private (Admin Only)
 * @author 3akl
 */
const changeUserRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid User ID format");
    }

    if (!role) {
        res.status(400);
        throw new Error("Role field is required");
    }

    const normalizedRole = String(role).toLowerCase().trim();
    if (!["user", "author", "admin"].includes(normalizedRole)) {
        res.status(400);
        throw new Error("Invalid role type. Allowed roles: user, author, admin");
    }

    const currentAdminId = getUserIdFromReq(req);
    if (id === currentAdminId) {
        res.status(400);
        throw new Error("Security Alert: You cannot change your own admin role");
    }

    const user = await User.findById(id);
    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (user.role === "admin") {
        res.status(403);
        throw new Error("Security Alert: You cannot modify or demote another Admin account");
    }

    user.role = normalizedRole;
    await user.save();

    return res.status(200).json({
        status: "success",
        message: `User role updated successfully to '${normalizedRole}'`,
        data: {
            id: user._id,
            email: user.email,
            role: user.role
        }
    });
});

/**
 * @route DELETE /api/users/:id
 * @desc Permanently remove user account record from database
 * @access Private (Admin Only)
 * @author 3akl
 */
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid User ID format");
    }

    const currentAdminId = getUserIdFromReq(req);
    if (id === currentAdminId) {
        res.status(400);
        throw new Error("Security Alert: You cannot delete your own admin account");
    }

    const user = await User.findById(id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    await user.deleteOne();

    return res.status(200).json({
        status: "success",
        message: "User deleted successfully"
    });
});

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    changeUserRole,
    deleteUser
};