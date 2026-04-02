const User = require('../models/User');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendAttendanceAlert } = require('../services/whatsappService');
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

// Euclidean distance for face matching
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
        const { staff_id, name, full_name, phone, phone_number, email, department, designation, username, password, role } = req.body;

        // Build dynamic query to avoid matching on undefined fields
        const querySpecs = [];
        if (email) querySpecs.push({ email });
        if (username) querySpecs.push({ username });
        if (staff_id) querySpecs.push({ staff_id });

        if (querySpecs.length > 0) {
            const userExists = await User.findOne({ $or: querySpecs });
            if (userExists) {
                return res.status(400).json({ message: 'A profile with these credentials already exists in the registry.' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            staff_id,
            name: name || full_name,
            phone: phone || phone_number,
            phoneNumber: phone || phone_number,
            email,
            department,
            designation,
            username: username || email,
            password: hashedPassword,
            role: role || 'customer',
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role),
        });

        // Fire & Forget Welcome Email
        if (email) {
            sendWelcomeEmail(email, user.name).catch(console.error);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Return 200 anyway for security (prevent email enumeration)
            return res.status(200).json({ message: 'If that email exists, an OTP has been sent.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // 10 minutes expiry
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.resetOTP = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        const emailSent = await sendPasswordResetOTP(email, otp);
        if (emailSent) {
            res.status(200).json({ message: 'If that email exists, an OTP has been sent.' });
        } else {
            res.status(500).json({ message: 'Failed to send OTP email. Please try again later.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email, resetOTP: otp, otpExpiry: { $gt: Date.now() } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        res.status(200).json({ message: 'OTP verified successfully.', verified: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email, resetOTP: otp, otpExpiry: { $gt: Date.now() } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // Clear OTP fields
        user.resetOTP = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully.' });

        // Fire & Forget Password Change Email
        if (user.email) {
            sendPasswordChangeConfirmation(user.email, user.name).catch(console.error);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const identifier = username || email;
        console.log(`Login attempt for identifier: ${identifier}`);
        
        const user = await User.findOne({ 
            $or: [{ username: identifier }, { email: identifier }] 
        });

        if (user) {
            console.log(`User found: ${user.name}, Role: ${user.role}`);
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                user.last_login = Date.now();
                await user.save();
                
                console.log('Password match: Success');
                res.json({
                    _id: user._id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id, user.role),
                });

                // Fire & Forget Login Email
                if (user.email) {
                    sendLoginNotification(user.email, user.name).catch(console.error);
                }
            } else {
                console.log('Password match: Failed');
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            console.log('User not found in database');
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const FaceData = require('../models/FaceData');

exports.verifyFace = async (req, res) => {
    try {
        const { descriptor } = req.body; 
        if (!descriptor || descriptor.length === 0) {
            return res.status(400).json({ message: 'Face descriptor is required' });
        }

        // 1. Fetch all embeddings (Optimize: Could use memory cache for production)
        const allFaceData = await FaceData.find({}).populate('userId');
        
        console.log(`Verification: Checking against ${allFaceData.length} records...`);
        
        let bestMatch = null;
        let minDistance = 0.6; // Slightly more balanced threshold

        for (const record of allFaceData) {
            if (!record.userId) continue;
            
            const distance = getEuclideanDistance(descriptor, record.faceEmbedding);
            console.log(`Comparison against ${record.userId.name}: Distance = ${distance.toFixed(4)}`);
            
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = record.userId;
            }
        }

        if (bestMatch) {
            console.log(`✅ Match: ${bestMatch.name} (Dist: ${minDistance.toFixed(4)})`);
            const today = new Date().toISOString().split('T')[0];
            
            const attendance = await Attendance.create({
                staff_id: bestMatch._id,
                full_name: bestMatch.name,
                login_time: new Date(),
                date: today,
                face_match_confidence: 1 - minDistance,
                device_ip: req.ip || req.connection.remoteAddress,
                status: 'success',
                face_verified: true
            });

            sendAttendanceAlert(bestMatch, attendance).catch(err => console.error('WhatsApp Error:', err));

            res.json({
                success: true,
                message: 'Attendance marked successfully',
                user: {
                    _id: bestMatch._id,
                    name: bestMatch.name,
                    username: bestMatch.username,
                    email: bestMatch.email,
                    role: bestMatch.role,
                    token: generateToken(bestMatch._id, bestMatch.role),
                },
                attendance
            });
        } else {
            console.log('❌ Auth Failed: No match found under threshold.');
            res.status(401).json({ message: 'Authorization Failed' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.query;
        const query = role ? { role } : {};
        const users = await User.find(query).select('_id name email role phone phoneNumber');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



exports.logout = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user && user.email) {
            await sendSignoutNotification(user.email, user.name);
        }
        res.status(200).json({ message: 'Signed out successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
