require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const mongoSanitize = require("express-mongo-sanitize");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const connectDB = require("./config/dbconnect");
const corsOptions = require("./config/coresoption");
const { globalErrorHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiters");

const app = express();

// Connect to Database
connectDB();

// 1. Security HTTP Headers
app.use(helmet());

// 2. Core Parsers with Body Size Limits
// 💡 إضافة trust proxy قبل الـ Rate Limiters والمواجه (Middlewares)
app.set("trust proxy", 1);
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// 3. Safe NoSQL Injection Sanitization
app.use((req, res, next) => {
    if (req.body) mongoSanitize.sanitize(req.body);
    if (req.params) mongoSanitize.sanitize(req.params);
    if (req.query) mongoSanitize.sanitize(req.query);
    next();
});

// 4. Rate Limiting
app.use("/api", apiLimiter);

// 5. Static Files
app.use(express.static(path.join(__dirname, "public")));

// 6. Routes Setup
app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/usersRoute"));
app.use("/blogs", require("./routes/blogRoutes"));

// 7. Safe 404 Handler
app.use((req, res) => {
    res.status(404);
    if (req.accepts("html")) {
        res.sendFile(path.join(__dirname, "views", "404.html"));
    } else if (req.accepts("json")) {
        res.json({ status: "fail", message: "404 Not Found" });
    } else {
        res.type("txt").send("404 Not Found");
    }
});

// 8. Global Error Handler Middleware
app.use(globalErrorHandler);

// تشغيل الـ Listener محلياً فقط (Local Development)
// Vercel يتعامل مع الـ Serverless Express تلقائياً بدون الحاجة لـ app.listen
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
    mongoose.connection.once("open", () => {
        console.log("Connected to MongoDB");
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });

    mongoose.connection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
    });
}

module.exports = app;