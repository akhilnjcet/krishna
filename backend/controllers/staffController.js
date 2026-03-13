const User = require('../models/User');
const bcrypt = require('bcrypt');

exports.getStaff = async (req, res) => {
    try {
        const { search, department, status } = req.query;
        let query = { role: 'staff' };

        if (search) {
            query.$and = [
                { role: 'staff' },
                {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { staff_id: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                }
            ];
        }

        if (department) query.department = department;
        if (status) query.status = status;

        const staff = await User.find(query).select('-password').sort({ createdAt: -1 });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getStaffById = async (req, res) => {
    try {
        const staff = await User.findOne({ _id: req.params.id, role: 'staff' }).select('-password');
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addStaff = async (req, res) => {
    try {
        const { staff_id, full_name, name, phone_number, phone, email, department, designation, username, password, role, status } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { username }, { staff_id }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email, username, or ID already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const staff = await User.create({
            staff_id,
            name: name || full_name,
            phone: phone || phone_number,
            email,
            department,
            designation,
            username: username || email,
            password: hashedPassword,
            role: role || 'staff',
            status: status || 'active'
        });

        res.status(201).json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        const { full_name, name, phone_number, phone, email, department, designation, status, role } = req.body;

        staff.name = name || full_name || staff.name;
        staff.phone = phone || phone_number || staff.phone;
        staff.email = email || staff.email;
        staff.department = department || staff.department;
        staff.designation = designation || staff.designation;
        staff.status = status || staff.status;
        staff.role = role || staff.role;

        const updatedStaff = await staff.save();
        res.json(updatedStaff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        await staff.deleteOne();
        res.json({ message: 'Staff member removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.registerFace = async (req, res) => {
    try {
        const { descriptor } = req.body;
        const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        staff.faceDescriptor = descriptor;
        await staff.save();

        res.json({ message: 'Face data registered successfully', success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

