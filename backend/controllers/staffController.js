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
        const { 
            staff_id, full_name, name, phone_number, phone, email, 
            department, designation, username, password, role, status,
            upi_id, bank_name, account_number, ifsc_code, base_salary
        } = req.body;

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
            phoneNumber: phone || phone_number,
            email,
            department,
            designation,
            username: username || email,
            password: hashedPassword,
            role: role || 'staff',
            status: status || 'active',
            upi_id,
            bank_name,
            account_number,
            ifsc_code,
            base_salary: parseFloat(base_salary) || 0
        });

        // Send Welcome Message via WhatsApp
        const { sendWhatsAppMessage } = require('../services/whatsappService');
        const welcomeMsg = `*Welcome to Krishna Engineering*\n\nHello *${staff.name}*,\nYour staff account has been created.\n\n*ID:* ${staff.staff_id}\n*Role:* ${staff.designation}\n\nPlease register your biometrics on your first day.`;
        console.log(`Attempting to send welcome message to: ${staff.phoneNumber}`);
        sendWhatsAppMessage(staff.phoneNumber, welcomeMsg).catch(err => console.error('WhatsApp Welcome Error:', err));

        res.status(201).json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStaff = async (req, res) => {
    try {
        const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        const { 
            full_name, name, phone_number, phone, email, 
            department, designation, status, role,
            upi_id, bank_name, account_number, ifsc_code, base_salary
        } = req.body;

        staff.name = name || full_name || staff.name;
        staff.phone = phone || phone_number || staff.phone;
        staff.phoneNumber = phone || phone_number || staff.phoneNumber;
        staff.email = email || staff.email;
        staff.department = department || staff.department;
        staff.designation = designation || staff.designation;
        staff.status = status || staff.status;
        staff.role = role || staff.role;
        staff.upi_id = upi_id !== undefined ? upi_id : staff.upi_id;
        staff.bank_name = bank_name !== undefined ? bank_name : staff.bank_name;
        staff.account_number = account_number !== undefined ? account_number : staff.account_number;
        staff.ifsc_code = ifsc_code !== undefined ? ifsc_code : staff.ifsc_code;
        staff.base_salary = base_salary !== undefined ? parseFloat(base_salary) : staff.base_salary;

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

const FaceData = require('../models/FaceData');

exports.registerFace = async (req, res) => {
    try {
        const { descriptor } = req.body;
        const userId = req.params.id;

        // 1. One Face Per User Rule: Check if face already exists
        const existingFace = await FaceData.findOne({ userId });
        if (existingFace) {
            return res.status(400).json({ 
                message: 'Face already registered for this user. Admin must delete old face before re-registering.' 
            });
        }

        const staff = await User.findOne({ _id: userId, role: 'staff' });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        // 2. Store in FaceData collection
        await FaceData.create({
            userId: userId,
            faceEmbedding: descriptor
        });

        // Keep a reference in User model for convenience if needed, 
        // but the core logic will now use FaceData
        staff.faceDescriptor = descriptor;
        await staff.save();

        res.json({ message: 'Face data registered successfully', success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteFaceData = async (req, res) => {
    try {
        const userId = req.params.id;
        await FaceData.deleteOne({ userId });
        
        const staff = await User.findById(userId);
        if (staff) {
            staff.faceDescriptor = [];
            await staff.save();
        }

        res.json({ message: 'Face data removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

