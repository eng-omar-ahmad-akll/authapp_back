/**
 * @file Email Dispatcher Utility
 * @description Sends automated transaction emails (OTP, Security Alerts) via Nodemailer.
 * 
 * @author 3akl
 */

const nodemailer = require("nodemailer");

/**
 * Transports email messages using standard Gmail SMTP credentials
 * @param {Object} options - Email parameters containing target email, subject, and body text
 */
const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `Blog API Admin <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;