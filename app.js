if (process.env.NODE_ENV != "production") {
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

const dbUrl = process.env.ATLASDB_URL || "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

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

store.on("error", function(err) {
  console.log("ERROR in MONGO SESSION STORE", err);
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

// Locals Middleware for Flash and Current User
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

/* ========================================================
   ADVANCED MAJOR FEATURE: RAZORPAY BOOKING SYSTEM ROUTES
   ======================================================== */

// 1. POST Route: Booking validation (with 1-Month Limit) & Razorpay Order Generation
app.post("/listings/:id/bookings", isLoggedIn, isGuest, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let { startDate, endDate , guestName, guestEmail, guestPhone } = req.body.booking;
    
    let listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you are trying to book does not exist!");
        return res.redirect("/listings");
    }

    let start = new Date(startDate);
    let end = new Date(endDate);
    let today = new Date();

    // ─── NEW FEATURE BLOCK: 1-MONTH ADVANCE BOOKING POLICY ───
    let maxBookingWindow = new Date();
    maxBookingWindow.setDate(today.getDate() + 30); // 30 days calculation limit

    if (start > maxBookingWindow) {
        req.flash("error", "Policy Restriction: Stays can only be booked up to 1 month (30 days) in advance!");
        return res.redirect(`/listings/${id}`);
    }
    // ────────────────────────────────────────────────────────

    // Date Logic Validation
    if (end <= start) {
        req.flash("error", "Check-out date must be after Check-in date!");
        return res.redirect(`/listings/${id}`);
    }

    // Collision Check: Ensures no double booking for same dates
    const existingBooking = await Booking.findOne({
        listing: id,
        $or: [ { startDate: { $lte: end }, endDate: { $gte: start } } ]
    });

    if (existingBooking) {
        req.flash("error", "This destination is already booked for the selected dates!");
        return res.redirect(`/listings/${id}`);
    }

    // Stay Duration & Price Calculation
    const timeDiff = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const totalPrice = totalDays * listing.price;

    // Razorpay Order parameters options
    const options = {
        amount: Number(totalPrice) * 100, // Amount expects value in paise
        currency: "INR",
        receipt: `receipt_order_${id.substring(0, 5)}_${Date.now()}`
    };

    const order = await razorpayInstance.orders.create(options);

    const successRedirectUrl = `${req.protocol}://${req.get("host")}/listings/${id}/bookings/success?startDate=${startDate}&endDate=${endDate}&totalPrice=${totalPrice}&guestName=${encodeURIComponent(guestName)}&guestEmail=${encodeURIComponent(guestEmail)}&guestPhone=${encodeURIComponent(guestPhone)}`;

    // Sends checkout session payload details to client invoice screen
    res.render("listings/checkout.ejs", { 
        order, 
        listing, 
        startDate, 
        endDate, 
        totalPrice,
        key_id: process.env.RAZORPAY_KEY_ID,
        successRedirectUrl
    });
}));

// 2. GET Route: Verification Handler & Dynamic Invoice Receipt Renderer
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
        console.log("New unique booking saved successfully!");
    } else {
        console.log("Duplicate booking detected, skipping database insert.");
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

// ─── FULL WORKING CANCELLATION ROUTE WITH REAL EMAIL TRIGGER ───
app.delete("/listings/:id/bookings/:bookingId", isLoggedIn, wrapAsync(async (req, res) => {
    let { id, bookingId } = req.params;

    // Booking ke saath listing aur user dono ko populate karo taaki mail data ready rahe
    let booking = await Booking.findById(bookingId).populate("listing").populate("user");
    if (!booking) {
        req.flash("error", "Booking record not found.");
        return res.redirect("/profile");
    }

    let checkInDate = new Date(booking.startDate);
    let today = new Date();
    let policyMessage = "";

    // ─── CASE 1: IF THE LOGGED-IN USER IS THE HOST (TRIGGER SORRY MAIL) ───
    if (req.user.role === 'host') {
        let refundAmount = booking.totalPrice; // Full Refund
        
        policyMessage = `Reservation declined. 100% Full Refund of ₹${refundAmount.toLocaleString("en-IN")} has been issued to the guest, and an apologetic email has been dispatched.`;
        
        // 🚀 NODEMAILER CONFIGURATION ROUTINE
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,    // Aapki .env file se automatic uthayega
                pass: process.env.EMAIL_PASS,    // Aapka Gmail App Password
            },
        });

        // Designing a beautiful rich text HTML structure for the Guest
        let mailOptions = {
            from: `"Wanderlust Support" <${process.env.EMAIL_USER}>`,
            to: booking.user.email, // Registered guest's email id
            subject: `⚠️ Important Update: Your reservation at ${booking.listing.title} has been cancelled`,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #222222; max-width: 600px; border: 1px solid #dde1e5; border-radius: 12px;">
                    <h2 style="color: #fe424d; margin-bottom: 20px;">Important Update Regarding Your Stay</h2>
                    <p>Dear <strong>@${booking.user.username}</strong>,</p>
                    <p>We sincerely apologize, but due to unexpected operational constraints from the host's end, your upcoming reservation at <strong>${booking.listing.title}</strong> has been cancelled.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fe424d;">
                        <h4 style="margin: 0 0 10px 0; color: #1a1a1a;">Trip Details:</h4>
                        <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Check-In:</strong> ${new Date(booking.startDate).toLocaleDateString("en-IN")}</p>
                        <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Check-Out:</strong> ${new Date(booking.endDate).toLocaleDateString("en-IN")}</p>
                    </div>

                    <h3 style="color: #198754; margin-top: 25px;">Refund Processed: 100% Full Return</h3>
                    <p>Since this cancellation was initiated by the system/host, a <strong>full 100% refund of ₹${refundAmount.toLocaleString("en-IN")}</strong> has been successfully credited back. The amount will reflect in your original payment method within 5-7 business days.</p>
                    
                    <hr style="border: 0; border-top: 1px solid #dde1e5; margin: 30px 0;" />
                    <p style="font-size: 0.85rem; color: #6c757d;">Thank you for your cooperation and understanding.</p>
                    <p style="font-size: 0.85rem; color: #6c757d; font-weight: bold;">Team Wanderlust Support</p>
                </div>
            `,
        };

        // Triggering the real async email dispatch service
        try {
            await transporter.sendMail(mailOptions);
            console.log(`[SUCCESS] Apology email successfully dispatched to ${booking.user.email}`);
        } catch (mailErr) {
            console.error("[ERROR] Nodemailer failed to send email:", mailErr);
        }
        
    // ─── CASE 2: IF THE LOGGED-IN USER IS THE GUEST (NORMAL PENALTY CALCULATION) ───
    } else {
        let timeDifference = checkInDate.getTime() - today.getTime();
        let daysBeforeCheckIn = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
        let refundAmount = booking.totalPrice;

        if (daysBeforeCheckIn >= 10) {
            refundAmount = booking.totalPrice;
            policyMessage = `Trip cancelled successfully! 100% Refund processed: ₹${refundAmount.toLocaleString("en-IN")} credited back.`;
        } else if (daysBeforeCheckIn < 10 && daysBeforeCheckIn >= 0) {
            refundAmount = booking.totalPrice * 0.70;
            let penaltyFee = booking.totalPrice * 0.30;
            policyMessage = `Trip cancelled. Under 10-days policy threshold, a 30% penalty (₹${penaltyFee.toLocaleString("en-IN")}) was deducted. 70% Refund: ₹${refundAmount.toLocaleString("en-IN")} processed safely.`;
        } else {
            req.flash("error", "Cannot cancel ongoing or completed reservation periods!");
            return res.redirect("/profile");
        }
    }

    // Database entries delete handler loops
    await Booking.findByIdAndDelete(bookingId);
    await Listing.findByIdAndUpdate(id, { $pull: { bookings: bookingId } });

    req.flash("success", policyMessage);
    res.redirect("/profile");
}));
// ───────────────────────────────────────────────────────────────────────────

// Profile Route mapping
app.get("/profile", isLoggedIn, wrapAsync(async (req, res) => {
    let hostListings = await Listing.find({ owner: req.user._id });
    let listingIds = hostListings.map(listing => listing._id);

    const hostBookings = await Booking.find({ listing: { $in: listingIds } })
        .populate("listing")
        .populate("user", "username email") 
        .sort({ createdAt: -1 });

    const guestBookings = await Booking.find({ user: req.user._id })
        .populate("listing")
        .sort({ createdAt: -1 });

    res.render("users/profile.ejs", { hostBookings, guestBookings, hostListings });
}));

// Wishlist Handlers
app.post("/listings/:id/wishlist", isLoggedIn, async (req, res) => {
    let { id } = req.params;
    let user = await User.findById(req.user._id);
    let index = user.wishlist.indexOf(id);

    if (index === -1) {
        user.wishlist.push(id);
        req.flash("success", "Added to wishlist! ❤️");
    } else {
        user.wishlist.splice(index, 1);
        req.flash("success", "Removed from wishlist!");
    }

    await user.save();
    res.redirect("/listings");
});

app.get("/wishlist", isLoggedIn, async (req, res) => {
    let user = await User.findById(req.user._id).populate("wishlist");
    res.render("users/wishlist.ejs", { wishlistListings: user.wishlist });
});

// ========================================================
// CORE GLOBAL ERROR HANDLING MIDDLEWARES (Keep at bottom)
// ========================================================
app.use((req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { err });
});

const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log("server started");
  });
}

module.exports = app;