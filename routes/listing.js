// routes/listing.js
const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { listingSchema } = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing, isHost } = require("../authMiddleware.js");
const listingController = require("../controllers/listings.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

// =========================================================
// CORE ROUTES MAPPING (MVC ARCHITECTURE)
// =========================================================

router.route("/")
  // GET: Fetches filtered categories/searches via Controller logic
  .get(wrapAsync(listingController.index))
  // POST: Handles multi-part listing creation with cloud storage upload
  .post(
    isLoggedIn, 
    isHost, 
    upload.array("listing[image]",5), 
    validateListing, 
    wrapAsync(listingController.createListing)
  );

// Render New Form Route
router.get("/new", isLoggedIn, isHost, listingController.renderNewForm);

router.route("/:id")
  // GET: Show specific listing details page
  .get(wrapAsync(listingController.showListing))
  // PUT: Update database schema attributes along with image updates
  .put(
    isLoggedIn, 
    isOwner, 
    upload.array("listing[image]",5), 
    validateListing, 
    wrapAsync(listingController.updateListing)
  )
  // DELETE: Trigger document deletion flow safely
  .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

// Render Edit Form Route
router.get("/:id/edit", isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;