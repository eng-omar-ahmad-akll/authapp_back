const mongoose = require("mongoose");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

// استخراج الـ ID بشكل موحد وآمن
const getUserIdFromReq = (req) => {
    if (!req.user) return null;
    if (typeof req.user === "string") return req.user;
    return req.user.id || req.user._id?.toString();
};

// 1. Get All Users (Admin Only)
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find()
        .select("-password -twoFactorSecret -tempTwoFactorSecret")
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
        .select("-password -twoFactorSecret -tempTwoFactorSecret")
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

// 3. Update User Profile Info
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid User ID format");
    }

    // علاج ثغرة الـ IDOR: التأكد أن صاحب الحساب نفسه أو Admin هو من يجري التعديل
    const currentUserId = getUserIdFromReq(req);
    const currentUserRole = req.user?.role;

    if (id !== currentUserId && currentUserRole !== "admin") {
        res.status(403);
        throw new Error("Forbidden: You are not authorized to update this profile");
    }

    const allowedUpdates = {};
    if (req.body.first_name) allowedUpdates.first_name = String(req.body.first_name).trim();
    if (req.body.last_name) allowedUpdates.last_name = String(req.body.last_name).trim();

    if (req.body.email) {
        const cleanEmail = String(req.body.email).toLowerCase().trim();
        const emailExists = await User.findOne({ email: cleanEmail, _id: { $ne: id } });
        if (emailExists) {
            res.status(409);
            throw new Error("Email address is already in use by another account");
        }
        allowedUpdates.email = cleanEmail;
    }

    try {
        const updatedUser = await User.findByIdAndUpdate(
            id,
            allowedUpdates,
            { new: true, runValidators: true }
        ).select("-password -twoFactorSecret -tempTwoFactorSecret");

        if (!updatedUser) {
            res.status(404);
            throw new Error("User not found");
        }

        return res.status(200).json({
            status: "success",
            data: updatedUser
        });
    } catch (error) {
        // حماية أضافية من الـ Race Conditions للـ Unique Email
        if (error.code === 11000) {
            res.status(409);
            throw new Error("Email address is already in use by another account");
        }
        throw error;
    }
});

// 4. Change User Role (Admin Only)
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

// 5. Delete User (Admin Only)
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