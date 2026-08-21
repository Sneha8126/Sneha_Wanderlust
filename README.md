# 🌍 WanderLust – Travel & Stay Booking Platform

<p align="center">
  <b>A full-stack Airbnb-inspired travel and accommodation platform built with Node.js, Express, MongoDB and EJS.</b>
</p>

<p align="center">
  <a href="https://sneha-wanderlust-1.onrender.com/listings">
    <img src="https://img.shields.io/badge/🌐%20Live%20Demo-WanderLust-success?style=for-the-badge" alt="Live Demo">
  </a>
  <a href="https://github.com/Sneha8126/Sneha_Wanderlust">
    <img src="https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github" alt="GitHub">
  </a>
</p>

---

## ✨ About The Project

**WanderLust** is a full-stack travel and accommodation booking web application inspired by platforms such as Airbnb.

The platform allows users to explore different stays, view detailed property information, create accounts, manage listings, add properties to their wishlist, make bookings and complete payments through Razorpay.

The project provides a smooth experience for both **guests and hosts**, with authentication, authorization, listing management, reviews, bookings and payment functionality.

---

## 🚀 Live Demo

🔗 **Live Website:**  
https://sneha-wanderlust-1.onrender.com/listings

🔗 **GitHub Repository:**  
https://github.com/Sneha8126/Sneha_Wanderlust

> **Note:** The application is deployed on Render. Since it uses a free hosting environment, the first request may take a little time if the service has been idle.

---

## 🎯 Key Features

### 👤 User Authentication
- User registration and login
- Authentication using Passport.js
- Session-based authentication
- Guest and host access control
- Logout functionality
- Protected routes

### 🏡 Property Listings
- Browse available properties
- View detailed property information
- Create, edit and delete listings
- Property image support
- Listing categories
- Property owner information

### ❤️ Wishlist
- Add properties to wishlist
- Remove properties from wishlist
- Login protection for wishlist functionality

### 📅 Booking System
- Select check-in and check-out dates
- Calculate booking price based on duration
- Enter guest details
- Create booking orders
- View booking information
- Cancel bookings
- Guest and host booking management

### 💳 Online Payment
- Razorpay payment integration
- Dynamic payment amount calculation
- Server-side order creation
- Payment success flow

### ⭐ Reviews
- Add reviews to listings
- Display reviews
- Delete reviews
- Authentication for review actions

### 👨‍💼 Profile & Host Management
- Manage personal listings
- View guest bookings
- View properties booked by the user
- Manage booking information

### 📧 Email Support
- Email functionality using Nodemailer

---

# 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express.js | Backend framework |
| MongoDB | Database |
| Mongoose | MongoDB ODM |
| EJS | Dynamic server-side UI |
| EJS-Mate | EJS layouts |
| Bootstrap | Responsive UI |
| JavaScript | Client-side functionality |
| Passport.js | Authentication |
| Express Session | Session management |
| Connect-Mongo | MongoDB session store |
| Connect-Flash | Flash messages |
| Cloudinary | Image storage |
| Multer | File uploads |
| Razorpay | Online payments |
| Nodemailer | Email functionality |
| Render | Deployment |
| Git & GitHub | Version control |

---

# 🏗️ Project Architecture

```text
                         ┌──────────────────┐
                         │     Browser      │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    Express.js    │
                         │     Server       │
                         └────────┬─────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             │                    │                    │
             ▼                    ▼                    ▼
      ┌─────────────┐      ┌─────────────┐     ┌──────────────┐
      │   MongoDB   │      │ Cloudinary  │     │   Razorpay   │
      │  Database   │      │   Images    │     │   Payments   │
      └─────────────┘      └─────────────┘     └──────────────┘
             │
             ▼
      ┌─────────────┐
      │    EJS      │
      │    Views    │
      └─────────────┘
```

---

# 📁 Project Structure

```text
Sneha_Wanderlust/
│
├── controllers/
├── models/
│   ├── listing.js
│   ├── booking.js
│   └── user.js
│
├── routes/
│   ├── listing.js
│   ├── review.js
│   └── user.js
│
├── views/
│   ├── listings/
│   ├── users/
│   ├── layouts/
│   └── includes/
│
├── public/
│   ├── css/
│   ├── js/
│   └── images/
│
├── utils/
│   ├── ExpressError.js
│   └── wrapAsync.js
│
├── authMiddleware.js
├── app.js
├── package.json
├── package-lock.json
└── README.md
```

---

# 🔐 Environment Variables

For security reasons, sensitive credentials should **never be committed to GitHub**.

Create a `.env` file locally:

```env
ATLASDB_URL=your_mongodb_connection_string
SECRET=your_session_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_KEY=your_cloudinary_key
CLOUDINARY_SECRET=your_cloudinary_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

> Never expose your MongoDB password, Cloudinary secret, Razorpay secret or email credentials publicly.

---

# 💻 Installation & Setup

## 1. Clone the Repository

```bash
git clone https://github.com/Sneha8126/Sneha_Wanderlust.git
```

## 2. Navigate to the Project

```bash
cd Sneha_Wanderlust
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Configure Environment Variables

Create a `.env` file in the root directory and add the required credentials.

## 5. Start the Application

```bash
npm start
```

Then open:

```text
http://localhost:8080
```

---

# 🔄 Application Workflow

### Guest Workflow

```text
Visit Website
      ↓
Browse Listings
      ↓
View Property
      ↓
Register / Login
      ↓
Select Dates
      ↓
Enter Guest Details
      ↓
Proceed to Payment
      ↓
Razorpay Checkout
      ↓
Booking Confirmation
```

### Host Workflow

```text
Login
  ↓
Create Listing
  ↓
Upload Property Images
  ↓
Publish Listing
  ↓
Manage Listings
  ↓
View Guest Bookings
```

---

# 🧩 Major Functional Modules

## 1. Authentication Module

Handles:
- Registration
- Login
- Logout
- Session management
- User authorization

Implemented using Passport.js, Passport Local, Express Session and MongoDB.

## 2. Listing Module

Handles:
- Listing creation
- Listing editing
- Listing deletion
- Listing details
- Property images
- Categories

## 3. Review Module

Users can:
- Add reviews
- View reviews
- Delete reviews

## 4. Booking Module

The booking system calculates the total price based on:

```text
Number of Days × Property Price
```

The calculated amount is then passed to the Razorpay order system.

## 5. Wishlist Module

Users can save their favorite properties and remove them whenever required.

## 6. Payment Module

Razorpay is integrated for online payment processing.

---

# ☁️ Deployment

The project is deployed using **Render**.

### Deployment Flow

```text
GitHub Repository
       ↓
     Render
       ↓
   npm install
       ↓
   node app.js
       ↓
 MongoDB Atlas
       ↓
   Live Website
```

Production environment variables are configured securely through the hosting platform.

---

# 🔒 Security Considerations

The project uses:
- Environment variables for sensitive credentials
- Authentication-protected routes
- Authorization middleware
- Session-based authentication
- HTTP-only cookies
- Server-side validation
- Protected booking and wishlist routes

Do not commit:

```text
.env
node_modules/
```

Add them to `.gitignore`:

```gitignore
.env
node_modules/
```

---

# 📊 Future Improvements

- 🔎 Advanced property search
- 🗺️ Interactive maps and location search
- 📍 Google Maps integration
- 🔔 Real-time booking notifications
- 📱 Progressive Web App support
- 💬 Host–guest chat system
- 📊 Advanced host analytics dashboard
- 🧠 AI-based property recommendations
- 🌐 Multi-language support
- 💰 Dynamic pricing system
- 📸 Image optimization
- 🔐 Two-factor authentication

---

# 📚 Learning Outcomes

This project provided hands-on experience with:

- Full-stack web development
- RESTful routing
- MVC architecture
- Node.js and Express.js
- MongoDB and Mongoose
- Authentication and authorization
- Session management
- CRUD operations
- File uploads and cloud storage
- Payment gateway integration
- Database relationships
- Error handling
- Environment variable management
- Git and GitHub
- Cloud deployment

---

# 👩‍💻 Author

## Sneha

**B.Tech – Computer Science & Engineering**

Interested in:
- 💻 Web Development
- 🧩 Data Structures & Algorithms
- 🤖 AI & Machine Learning
- 🚀 Building real-world applications

---

# 🔗 Project Links

🌐 **Live Project:**  
https://sneha-wanderlust-1.onrender.com/listings

💻 **GitHub Repository:**  
https://github.com/Sneha8126/Sneha_Wanderlust

---

# ⭐ Support

If you found this project interesting, consider giving the repository a ⭐ on GitHub!

---

<p align="center">
  <b>Built with ❤️ using Node.js, Express, MongoDB & EJS</b>
</p>
