// routes/booking.js
const express = require("express");
const router = express.Router({ mergeParams: true }); // Parent route parameters khinchne ke liye zaroori hai
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../authMiddleware");
const bookingController = require("../controllers/bookings");

// FIX: Yahan path sirf "/" hona chahiye na ki "/listings/:id/bookings"
router.post("/", isLoggedIn, wrapAsync(bookingController.createBooking));

module.exports = router;