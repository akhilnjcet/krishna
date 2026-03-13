const User = require('../models/User');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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

        const userExists = await User.findOne({ $or: [{ email }, { username }, { staff_id }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email, username, or ID already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            staff_id,
            name: name || full_name,
            phone: phone || phone_number,
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
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const identifier = username || email;
        const user = await User.findOne({ 
            $or: [{ username: identifier }, { email: identifier }] 
        });

        if (user && (await bcrypt.compare(password, user.password))) {
            user.last_login = Date.now();
            await user.save();
            
            res.json({
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.verifyFace = async (req, res) => {
    try {
        const { descriptor } = req.body; 
        if (!descriptor || descriptor.length === 0) {
            return res.status(400).json({ message: 'Face descriptor is required' });
        }

        const allStaff = await User.find({ 
            role: 'staff',
            faceDescriptor: { $exists: true, $not: { $size: 0 } } 
        });
        
        let bestMatch = null;
        let minDistance = 0.6;

        for (const staff of allStaff) {
            const distance = getEuclideanDistance(descriptor, staff.faceDescriptor);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = staff;
            }
        }

        if (bestMatch) {
            const today = new Date().toISOString().split('T')[0];
            
            const attendance = await Attendance.create({
                staff_id: bestMatch._id,
                full_name: bestMatch.name,
                date: today,
                face_match_confidence: 1 - minDistance,
                device_ip: req.ip || req.connection.remoteAddress,
                status: 'success'
            });

            res.json({
                success: true,
                message: 'Face verified successfully',
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
            res.status(401).json({ message: 'Face match failed' });
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

