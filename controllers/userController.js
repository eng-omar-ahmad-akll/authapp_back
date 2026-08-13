const mongoose = require("mongoose");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");

const getUserIdFromReq = (req) => {
    if (!req.user) return null;
    if (typeof req.user === "string") return req.user;
    return req.user.id || req.user._id?.toString();
};

// 1. Get All Users (Admin Only)
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

// 2. Get User By ID
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

// 3. Update User Profile Info & Avatar (Fix Bug #1: Active Account Enforcement)
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

    // تم إضافة .select("+isActive") صراحة لفحص حالة الحساب المغلق
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

    if (req.file) {
        if (user.avatar?.public_id) {
            await deleteFromCloudinary(user.avatar.public_id);
        }
        const cloudResult = await uploadToCloudinary(req.file.buffer, "user_avatars");
        user.avatar = {
            url: cloudResult.url,
            public_id: cloudResult.public_id
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

// 4. Change User Role
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

// 5. Delete User (مع مسح الـ Avatar إذا كان موجوداً)
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

    if (user.avatar?.public_id) {
        await deleteFromCloudinary(user.avatar.public_id);
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