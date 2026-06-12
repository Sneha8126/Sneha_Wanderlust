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

// Authentication
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

// Routers
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const UserRouter = require("./routes/user.js");

const dbUrl = process.env.ATLASDB_URL;

// Database Connection
async function main() {
  await mongoose.connect(dbUrl);
  console.log("connected to DB");
}
main().catch((err) => console.log(err));

// Settings & Middlewares
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "public")));

// Session Store Setup
const store = new MongoStore({
  url: dbUrl,
  crypto: { secret: process.env.SECRET || "mysupersecretcode" },
  touchAfter: 24 * 3600,
});

app.use(session({
  store: store,
  secret: process.env.SECRET || "mysupersecretcode",
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
}));
app.use(flash());

// Passport Setup
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

// Routes
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);

app.use("/", UserRouter);

// Razorpay SDK
const Razorpay = require("razorpay");
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// app.js mein add karein
app.post("/listings/:id/wishlist", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let user = req.user;

    if (user.wishlist.includes(id)) {
        await User.findByIdAndUpdate(user._id, { $pull: { wishlist: id } });
        req.flash("success", "Removed from wishlist!");
    } else {
        await User.findByIdAndUpdate(user._id, { $push: { wishlist: id } });
        req.flash("success", "Added to wishlist!");
    }
    res.redirect(`/listings/${id}`);
}));

// Booking Routes
app.post("/listings/:id/bookings", isLoggedIn, isGuest, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let { startDate, endDate , guestName, guestEmail, guestPhone } = req.body.booking;
    let listing = await Listing.findById(id);
    if (!listing) { req.flash("error", "Listing does not exist!"); return res.redirect("/listings"); }

    let start = new Date(startDate);
    let end = new Date(endDate);
    if (end <= start) { req.flash("error", "Check-out must be after Check-in!"); return res.redirect(`/listings/${id}`); }

    const options = { amount: (Math.ceil((end - start) / (1000 * 60 * 60 * 24)) * listing.price) * 100, currency: "INR", receipt: `receipt_${Date.now()}` };
    const order = await razorpayInstance.orders.create(options);

     // app.js mein Booking POST route ke andar
const successRedirectUrl = `${req.protocol}://${req.get("host")}/listings/${id}/bookings/success?id=${id}&startDate=${startDate}&endDate=${endDate}&totalPrice=${options.amount/100}&guestName=${encodeURIComponent(guestName)}&guestEmail=${encodeURIComponent(guestEmail)}&guestPhone=${encodeURIComponent(guestPhone)}`;
    res.render("listings/checkout.ejs", { order, listing, startDate, endDate, totalPrice: options.amount/100, key_id: process.env.RAZORPAY_KEY_ID, successRedirectUrl

    });
}));

app.get("/listings/:id/bookings/success", isLoggedIn, wrapAsync(async (req, res) => {
    // req.params.id se listing ID lenge, na ki query se (ye zyada safe hai)
    let id = req.params.id; 
    let { startDate, endDate, totalPrice, guestName, guestEmail, guestPhone,payment_id } = req.query;

    if (!id) {
        req.flash("error", "Invalid Booking Request!");
        return res.redirect("/listings");
    }

    let newBooking = new Booking({ 
        listing: id, 
        user: req.user._id, 
        startDate: new Date(startDate), 
        endDate: new Date(endDate), 
        totalPrice: Number(totalPrice)
    });

    await newBooking.save();
    
    let listing = await Listing.findById(id);
    res.render("listings/success.ejs", { listing, startDate, endDate, totalPrice, guestName, guestEmail, guestPhone,payment_id });
}));

app.delete("/listings/:id/bookings/:bookingId", isLoggedIn, wrapAsync(async (req, res) => {
    await Booking.findByIdAndDelete(req.params.bookingId);
    await Listing.findByIdAndUpdate(req.params.id, { $pull: { bookings: req.params.bookingId } });
    req.flash("success", "Booking cancelled!");
    res.redirect("/profile");
}));

app.get("/profile", isLoggedIn, wrapAsync(async (req, res) => {
    let hostListings = await Listing.find({ owner: req.user._id });
    const hostBookings = await Booking.find({ listing: { $in: hostListings.map(l => l._id) } }).populate("listing").populate("user", "username email");
    const guestBookings = await Booking.find({ user: req.user._id }).populate("listing");
    res.render("users/profile.ejs", { hostBookings, guestBookings, hostListings });
}));

// Error Handlers
app.use((req, res, next) => { next(new ExpressError(404, "Page not found!")); });
app.use((err, req, res, next) => {
  let { statusCode = 500 } = err;
  res.status(statusCode).render("error.ejs", { err });
});

// Server Listener
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});