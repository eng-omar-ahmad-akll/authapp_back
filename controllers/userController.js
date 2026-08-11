const mongoose = require("mongoose");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

// 1. Get All Users (Admin Only)
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select("-password -twoFactorSecret").lean();

    return res.status(200).json({
        status: "success",
        count: users.length,
        data: users
    });
});

// 2. Get User By ID (Owner or Admin)
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid User ID format");
    }

    const user = await User.findById(id).select("-password -twoFactorSecret").lean();

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    return res.status(200).json({
        status: "success",
        data: user
    });
});

// 3. Update User Profile Info (Owner or Admin)
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid User ID format");
    }

    const allowedUpdates = {};
    if (req.body.first_name) allowedUpdates.first_name = req.body.first_name;
    if (req.body.last_name) allowedUpdates.last_name = req.body.last_name;

    if (req.body.email) {
        const emailExists = await User.findOne({ email: req.body.email, _id: { $ne: id } });
        if (emailExists) {
            res.status(409);
            throw new Error("Email address is already in use by another account");
        }
        allowedUpdates.email = req.body.email;
    }

    const updatedUser = await User.findByIdAndUpdate(
        id,
        allowedUpdates,
        { new: true, runValidators: true }
    ).select("-password -twoFactorSecret");

    if (!updatedUser) {
        res.status(404);
        throw new Error("User not found");
    }

    return res.status(200).json({
        status: "success",
        data: updatedUser
    });
});

// 4. Change User Role (Admin Only Endpoint)
const changeUserRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
        res.status(400);
        throw new Error("Role field is required");
    }

    const normalizedRole = role.toLowerCase().trim();
    if (!["user", "author", "admin"].includes(normalizedRole)) {
        res.status(400);
        throw new Error("Invalid role type. Allowed roles: user, author, admin");
    }

    // حماية الأدمن من سلب صلاحيات نفسه أو تغيير رتبته بنفسه
    const currentAdminId = (req.user?.id || req.user)?._id?.toString() || (req.user?.id || req.user)?.toString();
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

    // منع الأدمن من حذف حسابه عن طريق الخطأ
    const currentAdminId = (req.user?.id || req.user)?._id?.toString() || (req.user?.id || req.user)?.toString();
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