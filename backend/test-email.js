require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('--- Email Debug Test ---');
    console.log('User:', process.env.EMAIL_USER);
    console.log('Pass:', process.env.EMAIL_PASS ? 'PRESENCE_CONFIRMED' : 'MISSING');
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    try {
        console.log('Attempting to send test email...');
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 'System Debug: Email Check',
            text: 'This is a test to verify Nodemailer credentials.'
        });
        console.log('Success!', info.response);
    } catch (error) {
        console.error('FAILED TO SEND!');
        console.error('Error Name:', error.name);
        console.error('Error Msg:', error.message);
        if (error.code) console.error('Error Code:', error.code);
        if (error.command) console.error('Error Command:', error.command);
    }
};

testEmail();
