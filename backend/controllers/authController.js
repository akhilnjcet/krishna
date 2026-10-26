const User = require('../models/User');
const Attendance = require('../models/Attendance');
const DailyAttendance = require('../models/DailyAttendance');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateToken, verifyToken, hashToken } = require('../config/jwtConfig');
const { sendAttendanceAlert, sendLoginAlert: sendWhatsAppLoginAlert } = require('../services/whatsappService');
const { 
    sendWelcomeEmail, 
    sendPasswordResetOTP, 
    sendLoginOTP,
    sendLoginNotification, 
    sendSignoutNotification, 
    sendPasswordChangeConfirmation,
    sendEmailVerificationOTP
} = require('../services/emailService');
const { logAuthSuccess, logAuthFailure } = require('../utils/securityLogger');

const BCRYPT_SALT_ROUNDS = 12;

const getEuclideanDistance = (desc1, desc2) => {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        sum += Math.pow(desc1[i] - desc2[i], 2);
    }
    return Math.sqrt(sum);
};

// Password complexity validation helper
const validatePasswordStrength = (password) => {
    if (!password || typeof password !== 'string') {
        return 'Password is required.';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters long.';
    }
    return null;
};

// 1. User Registration with Password Hashing & Email Verification Trigger
exports.register = async (req, res) => {
    try {
        const { staff_id, name, email, username, password, role, department, designation, phone, termsAccepted, policyVersion } = req.body;
        
        // Backend validation: Acceptance of Terms of Service & Privacy Policy is mandatory
        if (termsAccepted !== true && termsAccepted !== 'true') {
            return res.status(400).json({ 
                message: 'You must read and agree to the Terms of Service and acknowledge the Privacy Policy before creating an account.' 
            });
        }

        const passwordError = validatePasswordStrength(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        const normalizedEmail = (email || '').trim().toLowerCase();
        if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({ message: 'A valid email address is required.' });
        }

        const normalizedUsername = (username || normalizedEmail).trim().toLowerCase();

        // Check for existing user
        const existing = await User.findOne({
            $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
        });
        if (existing) {
            return res.status(400).json({ message: 'User with this email or username already exists.' });
        }

        // Salt and hash password with cost factor 12
        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const acceptedVersion = (policyVersion || '1.0').trim();
        const acceptanceTimestamp = new Date();

        // Generate email verification OTP (valid for 15 minutes)
        const verificationOtp = crypto.randomInt(100000, 1000000).toString();
        const verificationHash = hashToken(verificationOtp);
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

        const user = await User.create({
            staff_id, 
            name: (name || normalizedUsername).trim(), 
            email: normalizedEmail, 
            username: normalizedUsername, 
            password: hashedPassword, 
            role: role || 'customer', 
            department, 
            designation, 
            phone,
            termsAccepted: true,
            privacyAcknowledged: true,
            policyAcceptedAt: acceptanceTimestamp,
            policyVersionAccepted: acceptedVersion,
            isEmailVerified: false,
            emailVerificationHash: verificationHash,
            emailVerificationExpires: verificationExpires,
            failedLoginAttempts: 0
        });

        // Record persistent Policy Acceptance audit entry
        try {
            const PolicyAcceptance = require('../models/PolicyAcceptance');
            await PolicyAcceptance.create({
                userId: user._id,
                userEmail: normalizedEmail,
                userName: user.name,
                policyType: 'both',
                policyVersion: acceptedVersion,
                acceptedAt: acceptanceTimestamp,
                ipAddress: req.ip || req.connection?.remoteAddress || '',
                userAgent: req.get('User-Agent') || ''
            });
        } catch (auditErr) {
            console.error('Policy acceptance record log error:', auditErr.message);
        }

        // Send Welcome Email & Verification OTP
        sendWelcomeEmail(normalizedEmail, user.name).catch(err => console.error('Greeting Error:', err));
        sendEmailVerificationOTP(normalizedEmail, verificationOtp, user.name).catch(err => console.error('Verification Dispatch Error:', err));

        const token = generateToken(user._id.toString(), user.role || 'customer');
        const userObj = user.toObject();
        delete userObj.password;
        delete userObj.emailVerificationHash;

        res.status(201).json({
            user: userObj,
            token,
            message: 'Registration successful! An email verification code has been dispatched.'
        });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

// 2. User Login with Brute-Force Defense & Account Lockout
exports.login = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!password || (!username && !email)) {
            logAuthFailure(req, { identifier: 'missing_credentials', reason: 'Username or email and password are required', statusCode: 400 });
            return res.status(400).json({ message: 'Username or email and password are required.' });
        }

        const identifier = (username || email || "").trim().toLowerCase();

        // Strict query: find user by normalized username or email
        const user = await User.findOne({ 
            $or: [{ username: identifier }, { email: identifier }] 
        });

        if (!user) {
            logAuthFailure(req, { identifier, reason: 'Invalid credentials - account not found', statusCode: 401 });
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Check if account is currently locked out from too many failed attempts
        if (user.isLocked()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
            logAuthFailure(req, { identifier, reason: `Account is temporarily locked (${minutesLeft}m remaining)`, statusCode: 423 });
            return res.status(423).json({ 
                message: `Account is temporarily locked due to 5 consecutive failed login attempts. Please wait ${minutesLeft} minute(s) or reset your password.` 
            });
        }

        // Check active status
        if (user.status === 'inactive' || user.deletionStatus === 'deleted') {
            logAuthFailure(req, { identifier, reason: 'Account is inactive or deleted', statusCode: 403 });
            return res.status(403).json({ message: 'Account is inactive. Please contact administrator.' });
        }

        // Secure password comparison via bcrypt
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
            }
            await user.save();

            const attemptsRemaining = Math.max(0, 5 - user.failedLoginAttempts);
            if (attemptsRemaining === 0) {
                logAuthFailure(req, { identifier, reason: 'Account locked due to 5 consecutive failed login attempts', statusCode: 423 });
                return res.status(423).json({ 
                    message: 'Account is temporarily locked due to 5 consecutive failed login attempts. Please wait 15 minutes or reset your password.' 
                });
            }

            logAuthFailure(req, { identifier, reason: `Invalid password (${user.failedLoginAttempts}/5 attempts)`, statusCode: 401 });
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Authentication Success: Clear lockout counters
        if (user.failedLoginAttempts > 0 || user.lockUntil) {
            user.failedLoginAttempts = 0;
            user.lockUntil = undefined;
        }
        user.last_login = new Date();
        await user.save();

        // Non-blocking security notifications
        if (user.email) {
            sendLoginNotification(user.email, user.name || user.username).catch(e => console.error('Email Fail:', e));
        }
        if (user.phoneNumber || user.phone) {
            sendWhatsAppLoginAlert(user).catch(e => console.error('WA Fail:', e));
        }

        const role = user.role || 'customer';
        const token = generateToken(user._id.toString(), role);

        logAuthSuccess(req, { identifier, userId: user._id, role });

        return res.json({
            _id: user._id, 
            name: user.name, 
            email: user.email,
            role: role, 
            token: token,
            isEmailVerified: user.isEmailVerified
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
};

const FaceData = require('../models/FaceData');

exports.verifyFace = async (req, res) => {
    try {
        const { descriptor, device } = req.body;
        const LoginLog = require('../models/LoginLog');
        const DailyAttendance = require('../models/DailyAttendance');

        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            await LoginLog.create({
                login_status: 'failed',
                device: device || req.headers['user-agent'] || 'unknown',
                reason: 'No Face Descriptor Provided or Invalid Format',
                IP_address: req.ip || req.headers['x-forwarded-for']
            });
            return res.status(400).json({ message: 'Face not registered. Please contact the administrator.' });
        }

        // Check for authenticated user from optional Bearer token
        let authenticatedUser = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = verifyToken(token);
                authenticatedUser = decoded;
            } catch (err) {
                console.error('Failed to verify token in face verification:', err.message);
            }
        }

        const allFaceData = await FaceData.find({}).populate('userId');
        let bestMatch = null;
        let minDistance = 0.52; // Optimal biometric threshold (Euclidean <= 0.52)

        for (const record of allFaceData) {
            if (!record.userId) continue;
            const distance = getEuclideanDistance(descriptor, record.faceEmbedding);
            if (distance < minDistance) { 
                minDistance = distance; 
                bestMatch = record.userId; 
            }
        }

        // Fallback: Check direct faceDescriptor on User model
        if (!bestMatch) {
            const users = await User.find({ faceDescriptor: { $exists: true, $ne: [] } });
            for (const u of users) {
                const distance = getEuclideanDistance(descriptor, u.faceDescriptor);
                if (distance < minDistance) { 
                    minDistance = distance; 
                    bestMatch = u; 
                }
            }
        }

        if (bestMatch) {
            if (authenticatedUser && authenticatedUser.role === 'customer') {
                await LoginLog.create({
                    login_status: 'failed',
                    device: device || req.headers['user-agent'] || 'unknown',
                    reason: 'Unauthorized Face - Customer Attempted Staff Face Verification',
                    IP_address: req.ip || req.headers['x-forwarded-for']
                });
                return res.status(403).json({ message: 'Customer accounts cannot record staff attendance.' });
            }

            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const cosineSim = Math.max(0, 1 - (Math.pow(minDistance, 2) / 2));
            const faceMatchConfidence = Math.min(100, Math.round(cosineSim * 100));

            let attendance = await Attendance.findOne({ staff_id: bestMatch._id, date: today, check_out: { $exists: false } }).sort({ login_time: -1 });
            let logType = 'IN';

            if (attendance) {
                logType = 'OUT';
                attendance.check_out = now;
                const durationMins = Math.max(1, Math.round((now - new Date(attendance.login_time)) / 60000));
                attendance.duration_minutes = durationMins;
                attendance.face_match_confidence = faceMatchConfidence;
                attendance.type = 'OUT';
                await attendance.save();

                const workedHours = parseFloat((durationMins / 60).toFixed(2));
                await DailyAttendance.findOneAndUpdate(
                    { staffId: bestMatch._id, date: today },
                    { 
                        status: 'Present',
                        checkOut: timeStr,
                        workedHours,
                        updatedAt: now
                    },
                    { upsert: true, new: true }
                );
            } else {
                attendance = await Attendance.create({
                    staff_id: bestMatch._id,
                    full_name: bestMatch.name || bestMatch.username,
                    login_time: now,
                    date: today,
                    face_verified: true,
                    face_match_confidence: faceMatchConfidence,
                    device_ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
                    type: 'IN'
                });

                await DailyAttendance.findOneAndUpdate(
                    { staffId: bestMatch._id, date: today },
                    { 
                        status: 'Present', 
                        checkIn: timeStr, 
                        markedBy: bestMatch._id, 
                        updatedAt: now 
                    },
                    { upsert: true, new: true }
                );
            }

            try {
                const { recalculateSalary } = require('../utils/salaryCalculator');
                const monthStr = today.substring(0, 7);
                await recalculateSalary(bestMatch._id, monthStr);
            } catch (salErr) {
                console.warn('Salary recalculation warning:', salErr.message);
            }

            try {
                const socketUtil = require('../utils/socket');
                const io = socketUtil.getIO();
                if (io) {
                    const monthStr = today.substring(0, 7);
                    io.emit('attendance_updated', { staffId: String(bestMatch._id), date: today, logType, status: 'Present' });
                    io.emit('attendance_recorded', { staffId: String(bestMatch._id), date: today, logType, staffName: bestMatch.name });
                    io.emit('daily_attendance_changed', { staffId: String(bestMatch._id), date: today, logType });
                    io.emit(logType === 'IN' ? 'clock_in' : 'clock_out', { staffId: String(bestMatch._id), date: today, time: now });
                    io.emit('payroll_updated', { staffId: String(bestMatch._id), month: monthStr });
                    io.emit('salary_updated', { staffId: String(bestMatch._id), month: monthStr });
                }
            } catch (sErr) {
                console.warn('Socket notification warning:', sErr.message);
            }

            await LoginLog.create({
                login_status: 'success',
                device: device || req.headers['user-agent'] || 'unknown',
                reason: `Face Verified (${logType}) - ${faceMatchConfidence}% confidence`,
                IP_address: req.ip || req.headers['x-forwarded-for']
            });

            logAuthSuccess(req, { identifier: bestMatch.name || bestMatch.username, userId: bestMatch._id, role: bestMatch.role });

            if (bestMatch.email) {
                sendLoginNotification(bestMatch.email, bestMatch.name || bestMatch.username).catch(err => console.error('Face Login Notify Error:', err));
            }
            if (bestMatch.phoneNumber || bestMatch.phone) {
                sendWhatsAppLoginAlert(bestMatch).catch(err => console.error('Face WhatsApp Notify Error:', err));
            }

            return res.json({ 
                success: true, 
                logType, 
                user: bestMatch, 
                attendance, 
                confidence: faceMatchConfidence 
            });
        } else {
            await LoginLog.create({
                login_status: 'failed',
                device: device || req.headers['user-agent'] || 'unknown',
                reason: 'Unauthorized Face - Face Not Registered',
                IP_address: req.ip || req.headers['x-forwarded-for']
            });
            logAuthFailure(req, { identifier: 'face_recognition', reason: 'Face not registered', statusCode: 401 });
            return res.status(401).json({ message: 'Face not registered. Please contact the administrator.' });
        }
    } catch (error) {
        console.error('Face verification error:', error.message);
        res.status(401).json({ message: 'Face not registered. Please contact the administrator.' });
    }
};

// 3. User Profile / Session Check
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id).select('-password -faceDescriptor -resetPasswordHash -emailVerificationHash');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(user);
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        const user = await User.findById(req.user._id || req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        if (name) user.name = name.trim();
        if (phone !== undefined) {
            user.phone = phone.trim();
            user.phoneNumber = phone.trim();
        }
        
        await user.save();
        const userObj = user.toObject();
        delete userObj.password;
        res.json({ message: 'Profile updated successfully', user: userObj });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.query;
        const isAdmin = req.user && req.user.role === 'admin';
        const fields = isAdmin 
            ? '_id name email role phone staff_id base_salary isEmailVerified'
            : '_id name email role phone staff_id isEmailVerified';
        const users = await User.find(role ? { role } : {}).select(fields);
        res.json(users);
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

exports.adminEditUser = async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        if (name) user.name = name.trim();
        if (phone !== undefined) {
             user.phone = phone.trim();
             user.phoneNumber = phone.trim();
        }
        if (password) {
             const passwordError = validatePasswordStrength(password);
             if (passwordError) return res.status(400).json({ message: passwordError });
             const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
             user.password = await bcrypt.hash(password, salt);
        }
        await user.save();
        const userObj = user.toObject();
        delete userObj.password;
        res.json({ message: 'User updated successfully', user: userObj });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

exports.logout = async (req, res) => {
    if (req.user && req.user.email) {
        sendSignoutNotification(req.user.email, req.user.name || req.user.username).catch(() => {});
    }
    res.status(200).json({ message: 'Signed out successfully.' });
};

// 4. Cryptographically Hashed Password Reset with Short Expiry
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email address is required.' });

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        
        // Anti-Enumeration: Always respond with success message
        if (!user) {
            return res.status(200).json({ message: 'If this email is registered, a password recovery code has been sent.' });
        }

        // Generate cryptographically secure 6-digit numeric OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = hashToken(otp);

        // Store HMAC hash with strict 15-minute expiration
        user.resetPasswordHash = otpHash;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        user.resetPasswordAttempts = 0;
        // Legacy fallback
        user.resetOTP = otp;
        user.otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        const emailSent = await sendPasswordResetOTP(normalizedEmail, otp);
        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to dispatch password recovery email. Check SMTP setup.' });
        }

        res.json({ message: 'If this email is registered, a password recovery code has been sent.' });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' });

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        // Check expiration
        const isExpired = (!user.resetPasswordExpires || user.resetPasswordExpires <= Date.now()) &&
                          (!user.otpExpiry || user.otpExpiry <= Date.now());
        if (isExpired) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
        }

        // Rate limit attempts per OTP (max 5 failed attempts)
        user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
        if (user.resetPasswordAttempts > 5) {
            user.resetPasswordHash = undefined;
            user.resetPasswordExpires = undefined;
            user.resetOTP = undefined;
            user.otpExpiry = undefined;
            await user.save();
            return res.status(400).json({ message: 'Too many incorrect attempts. This OTP has been invalidated.' });
        }

        const inputHash = hashToken(otp);
        const isMatch = (user.resetPasswordHash && user.resetPasswordHash === inputHash) ||
                        (user.resetOTP && user.resetOTP === String(otp).trim());

        if (!isMatch) {
            await user.save();
            return res.status(400).json({ message: 'Invalid verification code.' });
        }

        await user.save();
        res.json({ message: 'Code verified successfully', verified: true });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
        }

        const passwordError = validatePasswordStrength(newPassword);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        const isExpired = (!user.resetPasswordExpires || user.resetPasswordExpires <= Date.now()) &&
                          (!user.otpExpiry || user.otpExpiry <= Date.now());
        if (isExpired) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
        }

        const inputHash = hashToken(otp);
        const isMatch = (user.resetPasswordHash && user.resetPasswordHash === inputHash) ||
                        (user.resetOTP && user.resetOTP === String(otp).trim());

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid OTP code.' });
        }

        // Salt and hash new password with 12 rounds
        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        user.password = await bcrypt.hash(newPassword, salt);

        // Invalidate all reset tokens immediately
        user.resetPasswordHash = undefined;
        user.resetPasswordExpires = undefined;
        user.resetPasswordAttempts = 0;
        user.resetOTP = undefined;
        user.otpExpiry = undefined;

        // Reset any failed login lockout
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        sendPasswordChangeConfirmation(normalizedEmail, user.name || user.username).catch(err => console.error('Security Notify Error:', err));

        res.json({ message: 'Password has been reset successfully. You may now log in.' });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

// 5. Passwordless Email OTP Login
exports.requestLoginOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email address is required.' });
        
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'Email not registered. Please register first.' });
        }

        if (user.isLocked()) {
            const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
            return res.status(423).json({ 
                message: `Account is temporarily locked. Please wait ${minutesLeft} minute(s).` 
            });
        }

        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = hashToken(otp);

        user.resetPasswordHash = otpHash;
        user.resetPasswordExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        user.resetOTP = otp;
        user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        const emailSent = await sendLoginOTP(user.email, otp);
        if (!emailSent) {
            return res.status(500).json({ message: 'Failed to send OTP email.' });
        }

        res.json({ message: 'OTP sent to your email.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.loginWithOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({ message: 'Invalid or expired OTP.' });
        }

        const isExpired = (!user.resetPasswordExpires || user.resetPasswordExpires <= Date.now()) &&
                          (!user.otpExpiry || user.otpExpiry <= Date.now());
        if (isExpired) {
            return res.status(401).json({ message: 'OTP has expired.' });
        }

        const inputHash = hashToken(otp);
        const isMatch = (user.resetPasswordHash && user.resetPasswordHash === inputHash) ||
                        (user.resetOTP && user.resetOTP === String(otp).trim());

        if (!isMatch) {
            logAuthFailure(req, { identifier: normalizedEmail, reason: 'Invalid OTP provided', statusCode: 401 });
            return res.status(401).json({ message: 'Invalid or expired OTP.' });
        }

        user.resetPasswordHash = undefined;
        user.resetPasswordExpires = undefined;
        user.resetOTP = undefined;
        user.otpExpiry = undefined;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        user.last_login = new Date();
        await user.save();

        sendLoginNotification(user.email, user.name || user.username).catch(err => console.error('Notify fail:', err));

        const role = user.role || 'customer';
        const token = generateToken(user._id.toString(), role);

        logAuthSuccess(req, { identifier: normalizedEmail, userId: user._id, role });

        res.json({
            _id: user._id,
            name: user.name,
            role: role,
            token: token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 6. Email Verification Endpoints
exports.requestEmailVerification = async (req, res) => {
    try {
        const email = (req.body.email || (req.user && req.user.email) || '').trim().toLowerCase();
        if (!email) return res.status(400).json({ message: 'Email address is required.' });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (user.isEmailVerified) {
            return res.status(200).json({ message: 'Email address is already verified.', isEmailVerified: true });
        }

        const otp = crypto.randomInt(100000, 1000000).toString();
        user.emailVerificationHash = hashToken(otp);
        user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        user.emailVerificationAttempts = 0;
        await user.save();

        const dispatched = await sendEmailVerificationOTP(user.email, otp, user.name);
        if (!dispatched) {
            return res.status(500).json({ message: 'Failed to dispatch email verification OTP.' });
        }

        res.json({ message: 'Verification code sent to your email address.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const targetEmail = (email || (req.user && req.user.email) || '').trim().toLowerCase();
        if (!targetEmail || !otp) {
            return res.status(400).json({ message: 'Email and verification code are required.' });
        }

        const user = await User.findOne({ email: targetEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.isEmailVerified) {
            return res.status(200).json({ message: 'Email address is already verified.', isEmailVerified: true });
        }

        if (!user.emailVerificationExpires || user.emailVerificationExpires <= Date.now()) {
            return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
        }

        user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
        if (user.emailVerificationAttempts > 5) {
            user.emailVerificationHash = undefined;
            user.emailVerificationExpires = undefined;
            await user.save();
            return res.status(400).json({ message: 'Too many incorrect attempts. Code has been invalidated.' });
        }

        const inputHash = hashToken(otp);
        if (user.emailVerificationHash !== inputHash) {
            await user.save();
            return res.status(400).json({ message: 'Invalid verification code.' });
        }

        user.isEmailVerified = true;
        user.emailVerificationHash = undefined;
        user.emailVerificationExpires = undefined;
        user.emailVerificationAttempts = 0;
        await user.save();

        res.json({ message: 'Email verified successfully!', isEmailVerified: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 7. Admin User Management
exports.adminGetAllUsers = async (req, res) => {
    try {
        const { search, role, status } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { staff_id: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) query.role = role;
        if (status) query.status = status;

        const users = await User.find(query).select('-password -faceDescriptor -resetPasswordHash -emailVerificationHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.adminCreateUser = async (req, res) => {
    try {
        const { 
            name, email, username, password, role, phone, 
            staff_id, department, designation, status, base_salary 
        } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Name, email, password, and role are required' });
        }

        const passwordError = validatePasswordStrength(password);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        const normalizedEmail = (email || '').trim().toLowerCase();
        const normalizedUsername = (username || email || '').trim().toLowerCase();

        const duplicateCheck = [{ email: normalizedEmail }];
        if (normalizedUsername) duplicateCheck.push({ username: normalizedUsername });
        if (staff_id) duplicateCheck.push({ staff_id });

        const userExists = await User.findOne({ $or: duplicateCheck });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email, username, or Staff ID already exists' });
        }

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            username: normalizedUsername,
            password: hashedPassword,
            role,
            phone,
            phoneNumber: phone,
            staff_id,
            department,
            designation,
            status: status || 'active',
            base_salary: parseFloat(base_salary) || 0,
            isEmailVerified: true // Admin created users are pre-verified
        });

        if (email) {
            sendWelcomeEmail(email, name).catch(err => console.error('Welcome email error:', err));
        }

        const userObj = newUser.toObject();
        delete userObj.password;
        res.status(201).json(userObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.adminUpdateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { 
            name, email, username, password, role, phone, 
            staff_id, department, designation, status, base_salary 
        } = req.body;

        if (email && email !== user.email) {
            const normalizedEmail = email.trim().toLowerCase();
            const emailDup = await User.findOne({ email: normalizedEmail });
            if (emailDup) return res.status(400).json({ message: 'Email already registered' });
            user.email = normalizedEmail;
        }

        if (username && username !== user.username) {
            const normalizedUsername = username.trim().toLowerCase();
            const usernameDup = await User.findOne({ username: normalizedUsername });
            if (usernameDup) return res.status(400).json({ message: 'Username already in use' });
            user.username = normalizedUsername;
        }

        if (staff_id && staff_id !== user.staff_id) {
            const staffIdDup = await User.findOne({ staff_id });
            if (staffIdDup) return res.status(400).json({ message: 'Staff ID already in use' });
            user.staff_id = staff_id;
        }

        if (name) user.name = name.trim();
        if (role) user.role = role;
        if (status) user.status = status;
        
        if (phone !== undefined) {
            user.phone = phone.trim();
            user.phoneNumber = phone.trim();
        }

        if (password) {
            const passwordError = validatePasswordStrength(password);
            if (passwordError) return res.status(400).json({ message: passwordError });
            const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
            user.password = await bcrypt.hash(password, salt);
        }

        if (role === 'staff') {
            if (department !== undefined) user.department = department;
            if (designation !== undefined) user.designation = designation;
            if (base_salary !== undefined) user.base_salary = parseFloat(base_salary) || 0;
            if (staff_id) user.staff_id = staff_id;
        } else {
            user.department = undefined;
            user.designation = undefined;
            user.staff_id = undefined;
        }

        await user.save();

        const userObj = user.toObject();
        delete userObj.password;
        res.json({ message: 'User updated successfully', user: userObj });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.adminDeleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        if (userId === "00000000000000000000ad14") {
            return res.status(400).json({ message: 'Cannot delete the master system administrator account' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const FaceData = require('../models/FaceData');
        await FaceData.deleteOne({ userId });

        await user.deleteOne();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
