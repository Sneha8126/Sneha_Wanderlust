const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const {saveRedirectUrl} = require("../authMiddleware.js");

const userController = require("../controllers/users.js");

router.route("/signup").get(userController.renderSignupForm)
.post(wrapAsync(userController.signup));

router.route("/login").get(userController.renderLoginForm)
.post(saveRedirectUrl, passport.authenticate("local",{failureRedirect:'/login',failureFlash: true }),userController.login);

// FORGOT PASSWORD ROUTES
router.get("/forgot", userController.renderForgotForm);
router.post("/forgot", wrapAsync(userController.forgotPassword));

// RESET PASSWORD ROUTES
router.get("/reset/:token", wrapAsync(userController.renderResetForm));
router.post("/reset/:token", wrapAsync(userController.resetPassword));

router.get("/logout",userController.logout);

module.exports = router;