/**
 * @file Express Root / Static View Routes
 * @description Safely serves static HTML pages while protecting against Path Traversal vulnerabilities.
 * 
 * @author 3akl
 */

const express = require("express");
const router = express.Router();
const path = require("path");

const VIEWS_DIR = path.join(__dirname, "..", "views");

router.get(["/", "/index", "/index.html"], (req, res) => {
    res.sendFile("index.html", { root: VIEWS_DIR }, (err) => {
        if (err) {
            res.status(err.status || 500).json({
                status: "error",
                message: "Unable to serve requested page"
            });
        }
    });
});

module.exports = router;