const User = require('../models/User');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendAttendanceAlert, sendLoginAlert: sendWhatsAppLoginAlert } = require('../services/whatsappService');
const { 
    sendWelcomeEmail, 
    sendPasswordResetOTP, 
    sendLoginNotification, 
    sendSignoutNotification, 
    sendPasswordChangeConfirmation 
} = require('../services/emailService');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d',
    });
};

const getEuclideanDistance = (desc1, desc2) => {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        sum += Math.pow(desc1[i] - desc2[i], 2);
    }
    return Math.sqrt(sum);
};

exports.register = async (req, res) => {
    try {
        const { staff_id, name, email, username, password, role, department, designation, phone } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({
            staff_id, name, email, username: username || email, password: hashedPassword, role: role || 'customer', department, designation, phone
        });

        // Send Welcome Email (Non-blocking)
        if (email) {
            sendWelcomeEmail(email, name || username).catch(err => console.error('Greeting Error:', err));
        }

        res.status(201).json(user);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.login = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const identifier = username || email;
        const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
        if (user && await bcrypt.compare(password, user.password)) {
            // Send Notifications (Awaited for Vercel/Lambda stability)
            if (user.email) {
                await sendLoginNotification(user.email, user.name || user.username).catch(err => console.error('Login Notify Error:', err));
            }
            if (user.phoneNumber || user.phone) {
                await sendWhatsAppLoginAlert(user).catch(err => console.error('WhatsApp Notify Error:', err));
            }

            res.json({
                _id: user._id, name: user.name, role: user.role, token: generateToken(user._id, user.role)
            });
        } else { res.status(401).json({ message: 'Invalid credentials' }); }
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const FaceData = require('../models/FaceData');

exports.verifyFace = async (req, res) => {
    try {
        const { descriptor } = req.body;
        const allFaceData = await FaceData.find({}).populate('userId');
        let bestMatch = null;
        let minDistance = 0.6;
        for (const record of allFaceData) {
            if (!record.userId) continue;
            const distance = getEuclideanDistance(descriptor, record.faceEmbedding);
            if (distance < minDistance) { minDistance = distance; bestMatch = record.userId; }
        }
        if (bestMatch) {
            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            let attendance = await Attendance.findOne({ staff_id: bestMatch._id, date: today, check_out: { $exists: false } }).sort({ login_time: -1 });
            let logType = 'IN';
            if (attendance) {
                logType = 'OUT';
                attendance.check_out = now;
                attendance.duration_minutes = Math.round((now - attendance.login_time) / 60000);
                attendance.type = 'OUT';
                await attendance.save();
            } else {
                attendance = await Attendance.create({
                    staff_id: bestMatch._id, full_name: bestMatch.name, login_time: now, date: today, face_verified: true, type: 'IN'
                });
            }

            // Send Notifications for Face Auth (Awaited for stability)
            if (bestMatch.email) {
                await sendLoginNotification(bestMatch.email, bestMatch.name || bestMatch.username).catch(err => console.error('Face Login Notify Error:', err));
            }
            if (bestMatch.phoneNumber || bestMatch.phone) {
                await sendWhatsAppLoginAlert(bestMatch).catch(err => console.error('Face WhatsApp Notify Error:', err));
            }

            res.json({ success: true, logType, user: bestMatch, attendance });
        } else { res.status(401).json({ message: 'Face Not Recognized' }); }
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.query;
        const users = await User.find(role ? { role } : {}).select('_id name email role phone staff_id base_salary');
        res.json(users);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.logout = async (req, res) => {
    res.status(200).json({ message: 'Signed out' });
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(200).json({ message: 'If email exists, OTP sent.' });
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOTP = otp;
        user.otpExpiry = Date.now() + 300000;
        await user.save();

        const emailSent = await sendPasswordResetOTP(email, otp);
        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to dispatch recovery signal. Check SMTP configuration.' });
        }

        res.json({ message: 'OTP sent to your email' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email, resetOTP: otp, otpExpiry: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ message: 'Invalid or expired OTP.' });
        res.json({ message: 'Verified', verified: true });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email, resetOTP: otp, otpExpiry: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ message: 'Invalid OTP.' });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetOTP = undefined;
        user.otpExpiry = undefined;
        await user.save();

        // Send Password Change Confirmation (Non-blocking)
        if (email) {
            sendPasswordChangeConfirmation(email, user.name || user.username).catch(err => console.error('Security Notify Error:', err));
        }

        res.json({ message: 'Success' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
