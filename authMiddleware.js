const Listing = require("./models/listing.js");
const Review = require("./models/review.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");

// ✅ FIX: CommonJS format mein Vercel runtime config aise likhte hain
const config = {
  runtime: 'nodejs',
};

// 1. Check if User is Logged In
const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "You must be logged in to make changes!");
    return res.redirect("/login");
  }
  next();
};

// 2. Save Redirect URL for Post-Login redirection
const saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

// 3. Authorization Check: Is Current User the Owner of the Listing?
const isOwner = async (req, res, next) => {
  let { id } = req.params;
  let listing = await Listing.findById(id);
  
  if (!listing.owner.equals(res.locals.currUser._id)) {
    req.flash("error", "You don't have permission to do that!");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// 4. Joi Data Validation for Listings
const validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// 5. Joi Data Validation for Reviews
const validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// 6. Authorization Check: Is Current User the Author of the Review?
const isReviewAuthor = async (req, res, next) => {
  let { id, reviewId } = req.params;
  let review = await Review.findById(reviewId);
  
  if (!review.author.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not the author of this review!");
    return res.redirect(`/listings/${id}`);
  }
  next();
};

// 7. Check if User is Host
const isHost = (req, res, next) => {
    if (req.user && req.user.role === "host") {
        return next();
    }
    req.flash("error", "Access Denied! Only Hosts are allowed to create or manage properties. ❌");
    res.redirect("/listings");
};

// 8. Check if User is Guest
const isGuest = (req, res, next) => {
    if (req.user && req.user.role === "guest") {
        return next();
    }
    req.flash("error", "Access Denied! Hosts are not allowed to make bookings. ❌");
    res.redirect(`/listings/${req.params.id}`);
};

// Sabhi functions ko ek saath export kar rahe hain
module.exports = {
  config,
  isLoggedIn,
  saveRedirectUrl,
  isOwner,
  validateListing,
  validateReview,
  isReviewAuthor,
  isHost,
  isGuest
};