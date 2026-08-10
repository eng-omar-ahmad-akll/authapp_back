const mongoose = require("mongoose");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

// 1. Get All Users (لا يرجع كلمة السر)
const getallusers = asyncHandler(async (req, res) => {
    const users = await User.find().select("-password").lean();

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

    const user = await User.findById(id).select("-password").lean();

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

    const { first_name, last_name, email } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
        id,
        { first_name, last_name, email },
        { new: true, runValidators: true }
    ).select("-password");

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