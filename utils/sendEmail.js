// utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendWelcomeEmail = async (userEmail, username) => {
    try {
        // 1. SMTP Transporter Configure karna
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // 2. Email Content & Design HTML Layout Setup
        const mailOptions = {
            from: `"Wanderlust Team ✈️" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "Welcome to Wanderlust! 🎉 Your Ultimate Travel Escape",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
                    <h2 style="color: #fe424d; text-align: center;">Hey ${username}, Welcome Abroad! 🎒</h2>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Thank you for joining <strong>Wanderlust</strong>! Your account has been successfully created. Now you can explore premium destinations, lock incredible stays, or even host your own properties!
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://sneha-wanderlust.onrender.com/listings" style="background-color: #fe424d; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 25px; font-size: 16px;">Explore Destinations Now</a>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #777; text-align: center;">
                        © 2026 Wanderlust Inc. | Designed with ❤️ by Sneha Rajput
                    </p>
                </div>
            `
        };

        // 3. Trigger dispatch flow
        await transporter.sendMail(mailOptions);
        console.log(`Welcome email successfully dispatched to ${userEmail}! ✉️`);
    } catch (error) {
        console.log("Nodemailer Email Error Boilerplate:", error);
    }
};

// utils/sendEmail.js ke andar sabse neeche jodhien:

const sendResetEmail = async (userEmail, resetLink) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `"Wanderlust Security 🔒" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: "Wanderlust Account - Password Reset Request",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px;">
                    <h2 style="color: #fe424d; text-align: center;">Password Reset Request 🔐</h2>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        You are receiving this email because you (or someone else) requested a password reset for your Wanderlust account. Please click the button below to complete the process:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #fe424d; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 25px; font-size: 16px;">Reset Password</a>
                    </div>
                    <p style="font-size: 14px; color: #555;">
                        <strong>Note:</strong> This link is strictly valid for the next 1 hour only. If you did not request this, please ignore this email.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #777; text-align: center;">
                        © 2026 Wanderlust Inc. | Security Infrastructure Management
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Password reset link dispatched securely to ${userEmail}! 🔒`);
    } catch (error) {
        console.log("Reset Email Error:", error);
    }
};

module.exports = { sendWelcomeEmail, sendResetEmail };

