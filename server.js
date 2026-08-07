require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/dbconnect");
const corsOptions = require("./config/coresoption");

const app = express();

// Middleware لضمان الاتصال بـ MongoDB قبل معالجة أي Request على Vercel
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("Database Connection Error:", err);
        res.status(500).json({ message: "Internal Server Error - DB Connection Failed" });
    }
});

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Serving static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/usersroute"));

// 404 Handler
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

module.exports = app;