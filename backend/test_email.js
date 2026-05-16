const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // Send to self
    subject: 'Krisha Buildings: Email System Test',
    text: 'If you see this, the Krisha Buildings notification system is operational.'
};

console.log('Attempting to send test email to:', process.env.EMAIL_USER);

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error('❌ Email Test FAILED:', error.message);
        process.exit(1);
    } else {
        console.log('✅ Email Test SUCCESSFUL:', info.response);
        process.exit(0);
    }
});
