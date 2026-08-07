const express = require("express");
const router = express.Router();
const path = require("path");
const userscontroller = require("../controllers/userscontroller");
const verifyjwt = require("../middleware/verifyJWT");

router.use(verifyjwt);
router.route("/").get(userscontroller.getallusers);


module.exports = router;