const mongoose = require("mongoose");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

// 1. Get All Users (استبعاد كلمة السر وسر الـ 2FA)
const getallusers = asyncHandler(async (req, res) => {
    const users = await User.find().select("-password -twoFactorSecret").lean();

    return res.status(200).json({
        status: "success",
        count: users.length,
        data: users
    });
});

// 2. Get User By ID (استبعاد كلمة السر وسر الـ 2FA)
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

// 3. Update User Info (First Name / Last Name / Email)
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400);
        throw new Error("Invalid User ID format");
    }

    // السماح بتحديث حقول محددة فقط (منع Mass Assignment)
    const allowedUpdates = {};
    if (req.body.first_name) allowedUpdates.first_name = req.body.first_name;
    if (req.body.last_name) allowedUpdates.last_name = req.body.last_name;
    
    // فحص الإيميل إذا كان يتحدث لمنع تكراره بـ Error نضيف
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
    getallusers,
    getUserById,
    updateUser,
    deleteUser
};