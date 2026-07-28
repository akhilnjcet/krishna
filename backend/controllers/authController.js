const User = require('../models/User');
const Attendance = require('../models/Attendance');
const DailyAttendance = require('../models/DailyAttendance');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendAttendanceAlert, sendLoginAlert: sendWhatsAppLoginAlert } = require('../services/whatsappService');
const { 
    sendWelcomeEmail, 
    sendPasswordResetOTP, 
    sendLoginOTP,
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
        const normalizedEmail = (email || '').trim().toLowerCase();
        const normalizedUsername = (username || email || '').trim().toLowerCase();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({
            staff_id, 
            name, 
            email: normalizedEmail, 
            username: normalizedUsername, 
            password: hashedPassword, 
            role: role || 'customer', 
            department, 
            designation, 
            phone
        });

        // Send Welcome Email (Non-blocking)
        if (email) {
            sendWelcomeEmail(email, name || username).catch(err => console.error('Greeting Error:', err));
        }

        const token = generateToken(user._id.toString(), user.role || 'customer');
        res.status(201).json({
            user,
            token
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const findOrCreateMasterAdmin = async () => {
    const MASTER_ADMIN_ID = "00000000000000000000ad14";
    let master = await User.findById(MASTER_ADMIN_ID);
    if (master) return master;

    master = await User.findOne({ $or: [{ username: 'admin' }, { email: 'admin@krishna.com' }] });
    if (master) return master;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123', salt);
    master = new User({
        _id: MASTER_ADMIN_ID,
        name: 'Master Admin',
        email: 'admin@krishna.com',
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        status: 'active'
    });
    try {
        await master.save();
    } catch (e) {
        master = await User.findOne({ $or: [{ username: 'admin' }, { email: 'admin@krishna.com' }] });
    }
    return master;
};

exports.login = async (req, res) => {
    const startTime = performance.now();
    try {
        const { username, email, password } = req.body;
        const identifier = (username || email || "").trim().toLowerCase();
        
        const dbStart = performance.now();
        // Simplified Master Failsafe (Valid ObjectId Format Required for MongoDB Stability)
        if ((identifier === 'admin' || identifier === 'admin@krishna.com') && password === '123') {
            const master = await findOrCreateMasterAdmin();
            console.log(`[PERF] Admin Login query: ${(performance.now() - dbStart).toFixed(2)}ms`);
            return res.json({
                _id: master._id,
                name: master.name,
                role: 'admin',
                token: generateToken(master._id.toString(), 'admin')
            });
        }

        const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
        const dbTime = performance.now() - dbStart;
        console.log(`[PERF] Database User lookup: ${dbTime.toFixed(2)}ms`);

        if (user) {
            if (user.status === 'inactive') {
                return res.status(401).json({ message: 'Account is inactive. Please contact administrator.' });
            }
            const bcryptStart = performance.now();
            const isMatch = await bcrypt.compare(password, user.password);
            const bcryptTime = performance.now() - bcryptStart;
            console.log(`[PERF] Password hash comparison (bcrypt): ${bcryptTime.toFixed(2)}ms`);

            if (isMatch) {
                // Send Notifications (Non-blocking / background dispatch to prevent login latency)
                const notifyStart = performance.now();
                if (user.email) {
                    sendLoginNotification(user.email, user.name || user.username).catch(e => console.error('Email Fail:', e));
                }
                if (user.phoneNumber || user.phone) {
                    sendWhatsAppLoginAlert(user).catch(e => console.error('WA Fail:', e));
                }
                const notifyTime = performance.now() - notifyStart;
                console.log(`[PERF] Notification dispatch initiated: ${notifyTime.toFixed(2)}ms`);

                const tokenStart = performance.now();
                const role = user.role || 'customer';
                const token = generateToken(user._id.toString(), role);
                const tokenTime = performance.now() - tokenStart;
                console.log(`[PERF] Token generation: ${tokenTime.toFixed(2)}ms`);

                const totalTime = performance.now() - startTime;
                console.log(`[PERF] Total login processing time: ${totalTime.toFixed(2)}ms`);

                return res.json({
                    _id: user._id, 
                    name: user.name, 
                    role: role, 
                    token: token
                });
            }
        }
        res.status(401).json({ message: 'Invalid credentials' });
    } catch (error) {
        console.error('[PERF] Login failed with error:', error);
        res.status(500).json({ message: error.message });
    }
};

const FaceData = require('../models/FaceData');

exports.verifyFace = async (req, res) => {
    try {
        const { descriptor, device } = req.body;
        const LoginLog = require('../models/LoginLog');

        if (!descriptor || !Array.isArray(descriptor) || descriptor.length === 0) {
            await LoginLog.create({
                login_status: 'failed',
                device: device || req.headers['user-agent'] || 'unknown',
                reason: 'Unauthorized Face',
                IP_address: req.ip || req.headers['x-forwarded-for']
            });
            return res.status(400).json({ message: 'Face Not Recognized' });
        }

        // Check for authenticated user from optional Bearer token
        let authenticatedUser = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
                authenticatedUser = decoded;
            } catch (err) {
                console.error('Failed to verify token in face verification:', err.message);
            }
        }

        const allFaceData = await FaceData.find({}).populate('userId');
        let bestMatch = null;
        let minDistance = 0.6;
        for (const record of allFaceData) {
            if (!record.userId) continue;
            const distance = getEuclideanDistance(descriptor, record.faceEmbedding);
            if (distance < minDistance) { minDistance = distance; bestMatch = record.userId; }
        }

        if (bestMatch) {
            // Only proceed with attendance/verification when face matches the authenticated staff member
            if (authenticatedUser && bestMatch._id.toString() !== authenticatedUser.id) {
                await LoginLog.create({
                    login_status: 'failed',
                    device: device || req.headers['user-agent'] || 'unknown',
                    reason: 'Unauthorized Face',
                    IP_address: req.ip || req.headers['x-forwarded-for']
                });
                return res.status(401).json({ message: 'Face Not Recognized' });
            }

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
                await DailyAttendance.findOneAndUpdate(
                    { staffId: bestMatch._id, date: today },
                    { status: 'Present', markedBy: bestMatch._id, updatedAt: now },
                    { upsert: true, new: true }
                );
            }

            // Send Notifications for Face Auth (Non-blocking — fire and forget)
            if (bestMatch.email) {
                sendLoginNotification(bestMatch.email, bestMatch.name || bestMatch.username).catch(err => console.error('Face Login Notify Error:', err));
            }
            if (bestMatch.phoneNumber || bestMatch.phone) {
                sendWhatsAppLoginAlert(bestMatch).catch(err => console.error('Face WhatsApp Notify Error:', err));
            }

            res.json({ success: true, logType, user: bestMatch, attendance });
        } else {
            await LoginLog.create({
                login_status: 'failed',
                device: device || req.headers['user-agent'] || 'unknown',
                reason: 'Unauthorized Face',
                IP_address: req.ip || req.headers['x-forwarded-for']
            });
            res.status(401).json({ message: 'Face Not Recognized' });
        }
    } catch (error) {
        console.error('Gracefully caught face verification error:', error.message);
        try {
            const LoginLog = require('../models/LoginLog');
            await LoginLog.create({
                login_status: 'failed',
                device: req.body.device || req.headers['user-agent'] || 'unknown',
                reason: 'Unauthorized Face',
                IP_address: req.ip || req.headers['x-forwarded-for']
            });
        } catch (logErr) {
            console.error('Failed to log biometric error to db:', logErr.message);
        }
        res.status(401).json({ message: 'Face Not Recognized' });
    }
};

exports.getMe = async (req, res) => {
    try {
        let user = await User.findById(req.user.id).select('-password -faceDescriptor');
        if (!user && (req.user.id === '00000000000000000000ad14' || req.user.role === 'admin')) {
            user = await findOrCreateMasterAdmin();
            if (user) {
                // Return a copy without password field
                const userObj = user.toObject();
                delete userObj.password;
                return res.json(userObj);
            }
        }
        res.json(user);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;
        let user = await User.findById(req.user.id);
        if (!user) {
            if (req.user.id === '00000000000000000000ad14' || req.user.role === 'admin') {
                user = await findOrCreateMasterAdmin();
            } else {
                return res.status(404).json({ message: 'User not found' });
            }
        }
        
        if (name) user.name = name;
        if (phone !== undefined) {
            user.phone = phone;
            user.phoneNumber = phone;
        }
        
        await user.save();
        res.json({ message: 'Profile updated successfully', user });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getUsersByRole = async (req, res) => {
    try {
        const { role } = req.query;
        const users = await User.find(role ? { role } : {}).select('_id name email role phone staff_id base_salary');
        res.json(users);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.adminEditUser = async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        if (name) user.name = name;
        if (phone !== undefined) {
             user.phone = phone;
             user.phoneNumber = phone;
        }
        if (password) {
             const salt = await bcrypt.genSalt(10);
             user.password = await bcrypt.hash(password, salt);
        }
        await user.save();
        res.json({ message: 'User updated successfully', user });
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

exports.requestLoginOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email address is required.' });
        
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ message: 'Email not registered. Please register first.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetOTP = otp;
        user.otpExpiry = Date.now() + 300000; // 5 minutes
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

        const user = await User.findOne({ 
            email: email.toLowerCase().trim(), 
            resetOTP: otp, 
            otpExpiry: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid or expired OTP.' });
        }

        user.resetOTP = undefined;
        user.otpExpiry = undefined;
        user.last_login = new Date();
        await user.save();

        // Send login alert notification
        sendLoginNotification(user.email, user.name || user.username).catch(err => console.error('Notify fail:', err));

        const role = user.role || 'customer';
        const token = generateToken(user._id.toString(), role);

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

        const users = await User.find(query).select('-password').sort({ createdAt: -1 });
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

        const normalizedEmail = (email || '').trim().toLowerCase();
        const normalizedUsername = (username || email || '').trim().toLowerCase();

        // Build query to check duplicate
        const duplicateCheck = [{ email: normalizedEmail }];
        if (normalizedUsername) duplicateCheck.push({ username: normalizedUsername });
        if (staff_id) duplicateCheck.push({ staff_id });

        const userExists = await User.findOne({ $or: duplicateCheck });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email, username, or Staff ID already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
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
            base_salary: parseFloat(base_salary) || 0
        });

        // Try sending welcome email
        if (email) {
            sendWelcomeEmail(email, name).catch(err => console.error('Welcome email error:', err));
        }

        // Send WhatsApp welcome if phone is staff
        if (role === 'staff' && phone) {
            try {
                const { sendWhatsAppMessage } = require('../services/whatsappService');
                const welcomeMsg = `*Welcome to Krishna Engineering*\n\nHello *${name}*,\nYour staff account has been created.\n\n*ID:* ${staff_id || 'N/A'}\n*Role:* ${designation || 'Staff'}\n\nPlease register your biometrics on your first day.`;
                sendWhatsAppMessage(phone, welcomeMsg).catch(err => console.error('WhatsApp Welcome Error:', err));
            } catch (waErr) {
                console.error("WhatsApp welcome skipped / failed:", waErr.message);
            }
        }

        // Return new user without password
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

        // Validation for uniqueness if changing email/username/staff_id
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

        if (name) user.name = name;
        if (role) user.role = role;
        if (status) user.status = status;
        
        if (phone !== undefined) {
            user.phone = phone;
            user.phoneNumber = phone;
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        // Handle role specific parameters
        if (role === 'staff') {
            if (department !== undefined) user.department = department;
            if (designation !== undefined) user.designation = designation;
            if (base_salary !== undefined) user.base_salary = parseFloat(base_salary) || 0;
            // Retain staff_id or allocate if new
            if (staff_id) user.staff_id = staff_id;
        } else {
            // Clear staff properties if role changed
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

        // Clean up face biometrics if it exists
        const FaceData = require('../models/FaceData');
        await FaceData.deleteOne({ userId });

        await user.deleteOne();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

