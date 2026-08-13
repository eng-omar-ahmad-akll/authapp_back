/**
 * @file Database Connection Utility
 * @description Establishes a secure and persistent connection to MongoDB using Mongoose.
 * 
 * @author 3akl
 */

const mongoose = require("mongoose");

/**
 * Connects to MongoDB cluster with singleton check and fail-safe process exits
 */
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Database Connection Error: ${error.message}`);
        process.exit(1); // Safely abort application process on critical database failure
    }
};

module.exports = connectDB;