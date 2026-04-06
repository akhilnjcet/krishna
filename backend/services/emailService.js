const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

const sendWelcomeEmail = async (email, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to Krishna Engineering Works',
            text: `Hello ${name || 'User'},

Welcome to Krishna Engineering Works.
Your account has been successfully created.

We are happy to have you with us!
– Team Krishna Engineering Works`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Welcome email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
};

const sendPasswordResetOTP = async (email, otp) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}

Valid for 5 minutes. Do not share this OTP.`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Reset OTP email sent: ' + info.response);
        return true;
    } catch (error) {
        console.error('Error sending reset OTP email:', error);
        return false;
    }
};

const sendLoginNotification = async (email, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Login Alert: Krishna Engineering Portal',
            text: `Hello ${name},

Your account was just logged into on the Krishna Engineering Works Portal.

If this was you, you can safely ignore this message.
If you do not recognize this activity, please contact support immediately.`
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending login notification:', error);
        return false;
    }
};

const sendSignoutNotification = async (email, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Sign-out Notification',
            text: `Hello ${name},

You have been successfully signed out of your session at Krishna Engineering Works.

Thank you for using our digital portal!`
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending signout notification:', error);
        return false;
    }
};

const sendPasswordChangeConfirmation = async (email, name) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Security Alert: Password Changed',
            text: `Hello ${name},

This is an automated confirmation that your password for the Krishna Engineering Works portal has been successfully changed.

If you did not perform this action, please reset your password immediately or contact our administrators.`
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending password change confirmation:', error);
        return false;
    }
};

const sendStatusUpdateEmail = async (email, name, itemType, status) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Krishna Engineering Works" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Update: Your ${itemType} has been ${status}`,
            text: `Hello ${name},

Your ${itemType} request has been reviewed.

Current Status: ${status.toUpperCase()}

You can log in to your dashboard to view more details.`
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending status update email:', error);
        return false;
    }
};

module.exports = {
    sendWelcomeEmail,
    sendPasswordResetOTP,
    sendLoginNotification,
    sendSignoutNotification,
    sendPasswordChangeConfirmation,
    sendStatusUpdateEmail
};
