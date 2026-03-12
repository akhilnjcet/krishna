const Staff = require('../models/Staff');
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
        const { staff_id, full_name, phone_number, email, department, designation, username, password, role } = req.body;

        const staffExists = await Staff.findOne({ $or: [{ email }, { username }, { staff_id }] });
        if (staffExists) {
            return res.status(400).json({ message: 'Staff with this email, username, or ID already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const staff = await Staff.create({
            staff_id,
            full_name,
            phone_number,
            email,
            department,
            designation,
            username,
            password: hashedPassword,
            role: role || 'staff',
        });

        res.status(201).json({
            _id: staff._id,
            full_name: staff.full_name,
            username: staff.username,
            email: staff.email,
            role: staff.role,
            token: generateToken(staff._id, staff.role),
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Find staff by username OR email
        const identifier = username || email;
        const staff = await Staff.findOne({ 
            $or: [{ username: identifier }, { email: identifier }] 
        });

        if (staff && (await bcrypt.compare(password, staff.password))) {
            res.json({
                _id: staff._id,
                full_name: staff.full_name,
                username: staff.username,
                email: staff.email,
                role: staff.role,
                token: generateToken(staff._id, staff.role),
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
        const { descriptor } = req.body; // Array of 128 numbers
        if (!descriptor || descriptor.length === 0) {
            return res.status(400).json({ message: 'Face descriptor is required' });
        }

        const allStaff = await Staff.find({ face_descriptor: { $exists: true, $not: { $size: 0 } } });
        
        let bestMatch = null;
        let minDistance = 0.6; // Threshold for face-api.js (usually 0.5 or 0.6)

        for (const staff of allStaff) {
            const distance = getEuclideanDistance(descriptor, staff.face_descriptor);
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = staff;
            }
        }

        if (bestMatch) {
            // Create an attendance log
            const today = new Date().toISOString().split('T')[0];
            
            const attendance = await Attendance.create({
                staff_id: bestMatch._id,
                full_name: bestMatch.full_name,
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
                    full_name: bestMatch.full_name,
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
        const staff = await Staff.findById(req.user.id).select('-password');
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

