const mongoose = require("mongoose");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

// 1. Get All Users
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select("-password -twoFactorSecret").lean();

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

// 3. Update User Info (مع معالجة الـ Role Normalization للـ Admin فقط)
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid User ID format");
    }

    const allowedUpdates = {};
    if (req.body.first_name) allowedUpdates.first_name = req.body.first_name;
    if (req.body.last_name) allowedUpdates.last_name = req.body.last_name;
    
    // توحيد الحروف للـ Role لو الـ Admin هو اللي بيعدل
    if (req.body.role && req.user?.role?.toLowerCase() === "admin") {
        allowedUpdates.role = req.body.role.toLowerCase();
    }

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

// 4. Delete User
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid User ID format");
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
    deleteUser
};