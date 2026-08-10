require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/dbconnect");
const corsOptions = require("./config/coresoption");
const { globalErrorHandler } = require("./middleware/errorHandler");

const app = express();

// 1. Sanitization Middleware
app.use((req, res, next) => {
    if (req.body) mongoSanitize.sanitize(req.body);
    if (req.params) mongoSanitize.sanitize(req.params);
    if (req.query) mongoSanitize.sanitize(req.query);
    next();
});

// 2. Database Connection Middleware
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("Database Connection Error:", err);
        res.status(500).json({ message: "Internal Server Error - DB Connection Failed" });
    }
});

// 3. Middlewares
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Static Files
app.use(express.static(path.join(__dirname, "public")));

// 5. Routes (تم تعديل usersRoute بالـ R الكابيتال)
app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/usersRoute"));
app.use("/blogs", require("./routes/blogRoutes"));

// 6. 404 Handler
app.all(/(.*)/, (req, res) => {
    res.status(404);
    if (req.accepts("html")) {
        res.sendFile(path.join(__dirname, "views", "404.html"));
    } else if (req.accepts("json")) {
        res.json({ message: "404 Not Found" });
    } else {
        res.type("txt").send("404 Not Found");
    }
});

// 7. Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;