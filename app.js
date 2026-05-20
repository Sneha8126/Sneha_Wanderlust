if (process.env.NODE_ENV !== "production") {
  const path = require("path");
  require('dotenv').config({ path: path.join(__dirname, ".env") });
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const nodemailer = require("nodemailer");

// Models & Utilities
const Listing = require("./models/listing.js");
const Booking = require("./models/booking.js");
const ExpressError = require("./utils/ExpressError.js");
const wrapAsync = require("./utils/wrapAsync.js");
const { isLoggedIn, isGuest } = require("./authMiddleware.js");

// Session & Flash Configuration
const session = require("express-session");
const MongoStore = require("connect-mongo")(session); 
const flash = require("connect-flash");

// Authentication Packages
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

// Routers
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const UserRouter = require("./routes/user.js");

const dbUrl = process.env.ATLASDB_URL;

// Optimized Mongoose Connection for Serverless
let isConnected = false;
async function main() {
  if (isConnected) return;
  await mongoose.connect(dbUrl);
  isConnected = true;
}

main().catch((err) => console.log(err));

// Settings & Middlewares
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// Mongo Session Store Setup
const store = new MongoStore({
  url: dbUrl,
  crypto: {
    secret: process.env.SECRET || "mysupersecretcode",
  },
  touchAfter: 24 * 3600,
});

const sessionOptions = {
  store: store,
  secret: process.env.SECRET || "mysupersecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

// Passport Authentication Setup
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// App Core Routes Mapping
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", UserRouter);

// Razorpay SDK Initialization
const Razorpay = require("razorpay");
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post("/listings/:id/bookings", isLoggedIn, isGuest, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let { startDate, endDate , guestName, guestEmail, guestPhone } = req.body.booking;
    
    let listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing does not exist!");
        return res.redirect("/listings");
    }

    let start = new Date(startDate);
    let end = new Date(endDate);
    let today = new Date();
    let maxBookingWindow = new Date();
    maxBookingWindow.setDate(today.getDate() + 30);

    if (start > maxBookingWindow) {
        req.flash("error", "Policy Restriction: Stays can only be booked up to 30 days in advance!");
        return res.redirect(`/listings/${id}`);
    }

    if (end <= start) {
        req.flash("error", "Check-out date must be after Check-in date!");
        return res.redirect(`/listings/${id}`);
    }

    const existingBooking = await Booking.findOne({
        listing: id,
        $or: [ { startDate: { $lte: end }, endDate: { $gte: start } } ]
    });

    if (existingBooking) {
        req.flash("error", "This destination is already booked for the selected dates!");
        return res.redirect(`/listings/${id}`);
    }

    const timeDiff = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const totalPrice = totalDays * listing.price;

    const options = {
        amount: Number(totalPrice) * 100,
        currency: "INR",
        receipt: `receipt_order_${id.substring(0, 5)}_${Date.now()}`
    };

    const order = await razorpayInstance.orders.create(options);

    res.render("listings/checkout.ejs", { 
        order, 
        listing, 
        startDate, 
        endDate, 
        totalPrice,
        key_id: process.env.RAZORPAY_KEY_ID,
        successRedirectUrl: `${req.protocol}://${req.get("host")}/listings/${id}/bookings/success?startDate=${startDate}&endDate=${endDate}&totalPrice=${totalPrice}&guestName=${encodeURIComponent(guestName)}&guestEmail=${encodeURIComponent(guestEmail)}&guestPhone=${encodeURIComponent(guestPhone)}`
    });
}));

app.get("/listings/:id/bookings/success", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let { startDate, endDate, totalPrice, payment_id, guestName, guestEmail, guestPhone } = req.query;

    let existingBooking = await Booking.findOne({
        listing: id,
        user: req.user._id,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
    });

    if (!existingBooking) {
        let newBooking = new Booking({
            listing: id,
            user: req.user._id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalPrice: Number(totalPrice)
        });
        await newBooking.save();
    }

    let listing = await Listing.findById(id);
    res.render("listings/success.ejs", {
        listing,
        startDate,
        endDate,
        totalPrice,
        guestName,
        guestEmail,
        guestPhone,
        payment_id: payment_id || `pay_dummy_${Date.now().toString().slice(-6)}`
    });
}));

app.delete("/listings/:id/bookings/:bookingId", isLoggedIn, wrapAsync(async (req, res) => {
    let { id, bookingId } = req.params;
    let booking = await Booking.findById(bookingId).populate("listing").populate("user");
    
    if (!booking) {
        req.flash("error", "Booking record not found.");
        return res.redirect("/profile");
    }

    let checkInDate = new Date(booking.startDate);
    let today = new Date();
    let policyMessage = "";

    if (req.user.role === 'host') {
        let refundAmount = booking.totalPrice;
        policyMessage = `Reservation declined. 100% Full Refund issued.`;
        
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Wanderlust Support" <${process.env.EMAIL_USER}>`,
            to: booking.user.email,
            subject: `Cancellation update`,
            html: `Your reservation at ${booking.listing.title} has been cancelled.`
        }).catch(err => console.log(err));
    } else {
        let timeDifference = checkInDate.getTime() - today.getTime();
        let daysBeforeCheckIn = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
        if (daysBeforeCheckIn >= 10) {
            policyMessage = `Trip cancelled successfully! 100% Refund processed.`;
        } else if (daysBeforeCheckIn >= 0) {
            policyMessage = `Trip cancelled. 30% penalty applied. 70% Refund processed.`;
        } else {
            req.flash("error", "Cannot cancel ongoing reservations!");
            return res.redirect("/profile");
        }
    }

    await Booking.findByIdAndDelete(bookingId);
    await Listing.findByIdAndUpdate(id, { $pull: { bookings: bookingId } });
    req.flash("success", policyMessage);
    res.redirect("/profile");
}));

app.get("/profile", isLoggedIn, wrapAsync(async (req, res) => {
    let hostListings = await Listing.find({ owner: req.user._id });
    let listingIds = hostListings.map(listing => listing._id);
    const hostBookings = await Booking.find({ listing: { $in: listingIds } }).populate("listing").populate("user", "username email").sort({ createdAt: -1 });
    const guestBookings = await Booking.find({ user: req.user._id }).populate("listing").sort({ createdAt: -1 });
    res.render("users/profile.ejs", { hostBookings, guestBookings, hostListings });
}));

app.use((req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { err });
});

module.exports = app;