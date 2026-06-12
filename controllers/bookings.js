// controllers/bookings.js
const Booking = require("../models/booking");
const Listing = require("../models/listing");

module.exports.createBooking = async (req, res) => {
    let { id } = req.params;
    // Yahan check karein ki id sach mein mil rahi hai ya nahi
    console.log("DEBUG: Listing ID is:", id); 
    
    if (!id) {
        throw new Error("Listing ID is missing in request params!");
    }
    let { startDate, endDate } = req.body.booking;
    
    let listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you are trying to book does not exist!");
        return res.redirect("/listings");
    }

    let start = new Date(startDate);
    let end = new Date(endDate);

    // 1. Validation: Check-out check-in se pehle nahi ho sakta
    if (end <= start) {
        req.flash("error", "Check-out date must be after Check-in date!");
        return res.redirect(`/listings/${id}`);
    }

    // 2. COLLISION LOGIC: Check karo kya ye dates pehle se booked hain?
    const existingBooking = await Booking.findOne({
        listing: id,
        $or: [
            { startDate: { $lte: end }, endDate: { $gte: start } }
        ]
    });

    if (existingBooking) {
        req.flash("error", "This destination is already booked for the selected dates!");
        return res.redirect(`/listings/${id}`);
    }

    // 3. AUTO PRICE CALCULATION: Days count karke final price nikalna
    const timeDiff = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // MS to Days
    const totalPrice = totalDays * listing.price;

    // 4. Save Booking Data
    let newBooking = new Booking({
        listing: id,
        user: req.user._id, // Logged in user ki ID
        startDate: start,
        endDate: end,
        totalPrice: totalPrice
    });

    await newBooking.save();
    
    req.flash("success", `Successfully Booked for ${totalDays} nights! Total Price: ₹${totalPrice.toLocaleString("en-IN")}`);
    res.redirect(`/listings/${id}`);
};