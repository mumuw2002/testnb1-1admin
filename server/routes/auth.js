const express = require("express");
const passport = require("passport");
const authController = require("../controllers/authController");
const router = express.Router();

// Login
router.get("/login", authController.loginPage);
router.post("/login", authController.login);

// Login failure
router.get("/login-failure", authController.loginFailure);

// Logout
router.get("/logout", authController.logout);

module.exports = router;