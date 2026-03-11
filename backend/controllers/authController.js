const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'customer',
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;

        // Sanitize for bypass
        email = email ? email.trim().toLowerCase() : '';

        // --- DEVELOPMENT BYPASS: Allow admin/staff login without database ---
        if (email === 'admin@krishnaengg.com' && password === 'admin123') {
            return res.json({
                _id: 'mock-admin-id-123',
                name: 'Super Admin',
                email: 'admin@krishnaengg.com',
                role: 'admin',
                token: generateToken('mock-admin-id-123', 'admin'),
            });
        }

        if (email === 'staff@krishnaengg.com' && password === 'staff123') {
            return res.json({
                _id: 'mock-staff-id-456',
                name: 'Field Operator 01',
                email: 'staff@krishnaengg.com',
                role: 'staff',
                token: generateToken('mock-staff-id-456', 'staff'),
            });
        }

        if (email === 'customer@krishnaengg.com' && password === 'customer123') {
            return res.json({
                _id: 'mock-customer-id-789',
                name: 'ACME Corp Client',
                email: 'customer@krishnaengg.com',
                role: 'customer',
                token: generateToken('mock-customer-id-789', 'customer'),
            });
        }
        // --------------------------------------------------------------

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        // If DB is offline, but they didn't use the mock credentials, it will fail gracefully
        res.status(500).json({ message: 'Database unreachable or ' + error.message });
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
