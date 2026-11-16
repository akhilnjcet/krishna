const User = require('../models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

/**
 * Normalizes and stores a staff profile photo:
 * - If empty/null/undefined: returns empty string
 * - If hosted URL or /uploads/ path: preserves URL
 * - If Base64 data URI (data:image/...): uploads to Cloudinary or saves to local uploads directory
 */
const processProfilePhoto = async (photo) => {
    if (!photo || typeof photo !== 'string') return '';
    const trimmed = photo.trim();
    if (!trimmed) return '';

    // If it's already a hosted or relative URL, return as-is
    if (!trimmed.startsWith('data:image/')) {
        return trimmed;
    }

    // Handle Base64 Data URI
    const isMock = !process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY.includes('mock');
    if (!isMock && process.env.CLOUDINARY_CLOUD_NAME) {
        try {
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
            });
            const cloudRes = await cloudinary.uploader.upload(trimmed, {
                folder: 'krishna-erp/profile_photos',
                resource_type: 'image',
                transformation: [{ width: 600, height: 600, crop: 'limit', quality: 'auto' }]
            });
            if (cloudRes?.secure_url) {
                return cloudRes.secure_url;
            }
        } catch (cloudErr) {
            console.error('[STAFF_PHOTO] Cloudinary upload error:', cloudErr.message);
        }
    }

    // Local Disk Fallback
    try {
        const matches = trimmed.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
            let ext = matches[1].toLowerCase();
            if (ext === 'jpeg') ext = 'jpg';
            const buffer = Buffer.from(matches[2], 'base64');
            const safeName = `staff-profile-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
            const isVercel = process.env.VERCEL === '1';
            const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = path.join(uploadDir, safeName);
            fs.writeFileSync(filePath, buffer);
            return `/uploads/${safeName}`;
        }
    } catch (fsErr) {
        console.error('[STAFF_PHOTO] Local filesystem save error:', fsErr.message);
    }

    return trimmed;
};

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
            upi_id, bank_name, account_number, ifsc_code, base_salary,
            joiningDate, address, emergencyContact, salaryType, overtimeRate,
            bonusAmount, advanceAmount, deductionAmount,
            standardWorkingHoursPerDay, workingDaysPerMonth, autoSalaryCalculation, otApprovalRequired,
            profilePhoto
        } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { username }, { staff_id }] });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email, username, or ID already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const processedPhoto = await processProfilePhoto(profilePhoto);

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
            base_salary: parseFloat(base_salary) || 0,
            joiningDate: joiningDate || Date.now(),
            address,
            emergencyContact,
            salaryType: salaryType || 'Monthly',
            overtimeRate: parseFloat(overtimeRate) || 0,
            bonusAmount: parseFloat(bonusAmount) || 0,
            advanceAmount: parseFloat(advanceAmount) || 0,
            deductionAmount: parseFloat(deductionAmount) || 0,
            standardWorkingHoursPerDay: standardWorkingHoursPerDay !== undefined ? Number(standardWorkingHoursPerDay) : 8,
            workingDaysPerMonth: workingDaysPerMonth !== undefined ? Number(workingDaysPerMonth) : 26,
            autoSalaryCalculation: autoSalaryCalculation !== undefined ? (autoSalaryCalculation === true || autoSalaryCalculation === 'true') : true,
            otApprovalRequired: otApprovalRequired !== undefined ? (otApprovalRequired === true || otApprovalRequired === 'true') : true,
            profilePhoto: processedPhoto
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
        const staff = await User.findById(req.params.id);
        if (!staff) {
            return res.status(404).json({ message: 'Staff member not found with the requested ID.' });
        }

        const { 
            staff_id, username, full_name, name, phone_number, phone, email, 
            department, designation, status, role,
            upi_id, bank_name, account_number, ifsc_code, base_salary,
            joiningDate, address, emergencyContact, salaryType, overtimeRate,
            bonusAmount, advanceAmount, deductionAmount,
            standardWorkingHoursPerDay, workingDaysPerMonth, autoSalaryCalculation, otApprovalRequired,
            profilePhoto, password
        } = req.body;

        // Verify and prevent email collision
        if (email && email.toLowerCase().trim() !== (staff.email || '').toLowerCase()) {
            const existingEmail = await User.findOne({ 
                email: email.toLowerCase().trim(), 
                _id: { $ne: staff._id } 
            });
            if (existingEmail) {
                return res.status(400).json({ message: `Email "${email}" is already used by another account.` });
            }
            staff.email = email.toLowerCase().trim();
        }

        // Verify and prevent username collision
        if (username && username.trim() !== staff.username) {
            const existingUsername = await User.findOne({ 
                username: username.trim(), 
                _id: { $ne: staff._id } 
            });
            if (existingUsername) {
                return res.status(400).json({ message: `Username "${username}" is already in use.` });
            }
            staff.username = username.trim();
        }

        // Verify and prevent staff_id collision
        if (staff_id && staff_id.trim() !== staff.staff_id) {
            const existingId = await User.findOne({ 
                staff_id: staff_id.trim(), 
                _id: { $ne: staff._id } 
            });
            if (existingId) {
                return res.status(400).json({ message: `Staff ID "${staff_id}" is already assigned to another staff member.` });
            }
            staff.staff_id = staff_id.trim();
        }

        if (name || full_name) staff.name = (name || full_name).trim();
        if (phone || phone_number) {
            const cleanPhone = (phone || phone_number).trim();
            staff.phone = cleanPhone;
            staff.phoneNumber = cleanPhone;
        }
        if (department) staff.department = department.trim();
        if (designation) staff.designation = designation.trim();
        if (status) staff.status = status;
        if (role) staff.role = role;

        staff.upi_id = upi_id !== undefined ? upi_id : staff.upi_id;
        staff.bank_name = bank_name !== undefined ? bank_name : staff.bank_name;
        staff.account_number = account_number !== undefined ? account_number : staff.account_number;
        staff.ifsc_code = ifsc_code !== undefined ? ifsc_code : staff.ifsc_code;
        staff.base_salary = base_salary !== undefined ? parseFloat(base_salary) : staff.base_salary;
        
        staff.joiningDate = joiningDate !== undefined ? joiningDate : staff.joiningDate;
        staff.address = address !== undefined ? address : staff.address;
        staff.emergencyContact = emergencyContact !== undefined ? emergencyContact : staff.emergencyContact;
        staff.salaryType = salaryType !== undefined ? salaryType : staff.salaryType;
        staff.overtimeRate = overtimeRate !== undefined ? parseFloat(overtimeRate) : staff.overtimeRate;
        staff.bonusAmount = bonusAmount !== undefined ? parseFloat(bonusAmount) : staff.bonusAmount;
        staff.advanceAmount = advanceAmount !== undefined ? parseFloat(advanceAmount) : staff.advanceAmount;
        staff.deductionAmount = deductionAmount !== undefined ? parseFloat(deductionAmount) : staff.deductionAmount;

        staff.standardWorkingHoursPerDay = standardWorkingHoursPerDay !== undefined ? Number(standardWorkingHoursPerDay) : staff.standardWorkingHoursPerDay;
        staff.workingDaysPerMonth = workingDaysPerMonth !== undefined ? Number(workingDaysPerMonth) : staff.workingDaysPerMonth;
        staff.autoSalaryCalculation = autoSalaryCalculation !== undefined ? (autoSalaryCalculation === true || autoSalaryCalculation === 'true') : staff.autoSalaryCalculation;
        staff.otApprovalRequired = otApprovalRequired !== undefined ? (otApprovalRequired === true || otApprovalRequired === 'true') : staff.otApprovalRequired;
        
        // Handle profile photo update (URL, Base64 data URI, or cleared string)
        if (profilePhoto !== undefined) {
            staff.profilePhoto = await processProfilePhoto(profilePhoto);
        }

        // Optional password update if admin provided new password
        if (password && typeof password === 'string' && password.trim().length > 0) {
            const salt = await bcrypt.genSalt(10);
            staff.password = await bcrypt.hash(password.trim(), salt);
        }

        const updatedStaff = await staff.save();

        // Recalculate salary for current month in real time
        try {
            const today = new Date();
            const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const { recalculateSalary } = require('../utils/salaryCalculator');
            await recalculateSalary(updatedStaff._id, currentMonthStr);
        } catch (recalcErr) {
            console.error("Failed to automatically recalculate salary after profile update:", recalcErr.message);
        }

        const safeStaffResponse = updatedStaff.toObject();
        delete safeStaffResponse.password;
        return res.json(safeStaffResponse);
    } catch (error) {
        console.error("Failed to update staff:", error);
        return res.status(500).json({ message: error.message || 'Failed to update staff profile.' });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        // Clean up face biometrics associated with this staff
        await FaceData.deleteMany({ userId: staff._id });

        await staff.deleteOne();
        res.json({ message: 'Staff member removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const FaceData = require('../models/FaceData');

const getEuclideanDistance = (desc1, desc2) => {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        sum += Math.pow(desc1[i] - desc2[i], 2);
    }
    return Math.sqrt(sum);
};

exports.registerFace = async (req, res) => {
    try {
        const { descriptor, force } = req.body;
        const userId = req.params.id;

        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return res.status(400).json({ message: 'Invalid face descriptor format. Must be a 128-dimensional embedding vector.' });
        }

        const staff = await User.findOne({ _id: userId, role: 'staff' });
        if (!staff) return res.status(404).json({ message: 'Staff member not found' });

        // 1. Fetch all valid existing users to verify ownership and purge orphaned biometric records
        const existingUsers = await User.find({}).select('_id name full_name role staff_id email faceDescriptor');
        const existingUserMap = new Map(existingUsers.map(u => [u._id.toString(), u]));
        const existingIdSet = new Set(existingUsers.map(u => u._id.toString()));

        // Purge any orphaned FaceData records whose user was previously deleted
        const allFaceData = await FaceData.find({});
        for (const record of allFaceData) {
            const recordUid = record.userId ? record.userId.toString() : null;
            if (!recordUid || !existingIdSet.has(recordUid)) {
                await FaceData.deleteOne({ _id: record._id }).catch(() => {});
            }
        }

        // 2. Check for duplicate face match across FaceData and User collections
        let duplicateOwner = null;

        for (const record of allFaceData) {
            const recordUid = record.userId ? record.userId.toString() : null;
            if (!recordUid || !existingUserMap.has(recordUid)) continue;

            if (recordUid !== userId.toString()) {
                const distance = getEuclideanDistance(descriptor, record.faceEmbedding);
                if (distance < 0.42) {
                    duplicateOwner = existingUserMap.get(recordUid);
                    break;
                }
            }
        }

        if (!duplicateOwner) {
            for (const otherUser of existingUsers) {
                if (otherUser._id.toString() !== userId.toString() && Array.isArray(otherUser.faceDescriptor) && otherUser.faceDescriptor.length === 128) {
                    const distance = getEuclideanDistance(descriptor, otherUser.faceDescriptor);
                    if (distance < 0.42) {
                        duplicateOwner = otherUser;
                        break;
                    }
                }
            }
        }

        // If duplicate found and force is NOT enabled, ask user with detailed conflict info
        if (duplicateOwner && !force) {
            const ownerName = duplicateOwner.name || duplicateOwner.full_name || 'another account';
            const ownerRole = duplicateOwner.role || 'user';
            const ownerId = duplicateOwner.staff_id || duplicateOwner.email || '';
            return res.status(409).json({ 
                duplicate: true,
                ownerName,
                ownerRole,
                ownerId,
                message: `Duplicate face detected. This face is already registered to ${ownerName} (${ownerRole}${ownerId ? ` - ${ownerId}` : ''}).` 
            });
        }

        // If duplicate found and force IS enabled, unlink the face from the previous user
        if (duplicateOwner && force) {
            await FaceData.deleteMany({ userId: duplicateOwner._id });
            await User.updateOne({ _id: duplicateOwner._id }, { faceDescriptor: [] });
        }

        // Clean up any existing face records for the current staff member
        await FaceData.deleteMany({ userId: staff._id });

        // Store new face embedding vector in FaceData collection
        await FaceData.create({
            userId: staff._id,
            faceEmbedding: descriptor
        });

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
        await FaceData.deleteMany({ userId });
        
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

exports.cleanupBiometrics = async (req, res) => {
    try {
        const existingUsers = await User.find({}).select('_id name email role staff_id');
        const existingIdSet = new Set(existingUsers.map(u => u._id.toString()));
        
        const allFaces = await FaceData.find({});
        let deletedCount = 0;
        for (const face of allFaces) {
            const uid = face.userId ? face.userId.toString() : null;
            if (!uid || !existingIdSet.has(uid)) {
                await FaceData.deleteOne({ _id: face._id });
                deletedCount++;
            }
        }

        const remainingFaces = await FaceData.find({});
        const activeRegistrations = [];
        for (const f of remainingFaces) {
            const u = existingUsers.find(user => user._id.toString() === (f.userId ? f.userId.toString() : ''));
            if (u) {
                activeRegistrations.push(`${u.name} (${u.role})`);
            }
        }

        res.json({ 
            success: true, 
            deletedCount,
            message: `Cleaned up ${deletedCount} orphaned biometric records. Registered faces: ${activeRegistrations.length > 0 ? activeRegistrations.join(', ') : 'None'}.` 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.resetAllBiometrics = async (req, res) => {
    try {
        await FaceData.deleteMany({});
        await User.updateMany({}, { faceDescriptor: [] });
        res.json({ success: true, message: 'All biometric face registrations have been completely reset.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

