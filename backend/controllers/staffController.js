const Staff = require('../models/Staff');
const bcrypt = require('bcrypt');

exports.getStaff = async (req, res) => {
    try {
        const { search, department, status } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { full_name: { $regex: search, $options: 'i' } },
                { staff_id: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        if (department) query.department = department;
        if (status) query.status = status;

        const staff = await Staff.find(query).select('-password').sort({ created_at: -1 });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getStaffById = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id).select('-password');
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.addStaff = async (req, res) => {
    try {
        const { staff_id, full_name, phone_number, email, department, designation, username, password, role, status } = req.body;

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
            status: status || 'active'
        });

        res.status(201).json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        const { full_name, phone_number, email, department, designation, status, role } = req.body;

        staff.full_name = full_name || staff.full_name;
        staff.phone_number = phone_number || staff.phone_number;
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
        const staff = await Staff.findById(req.params.id);
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
        const staff = await Staff.findById(req.params.id);
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        staff.face_descriptor = descriptor;
        await staff.save();

        res.json({ message: 'Face data registered successfully', success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

