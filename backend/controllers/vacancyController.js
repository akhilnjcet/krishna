const Vacancy = require('../models/Vacancy');
const VacancyBanner = require('../models/VacancyBanner');

// @desc    Get active vacancies for public view
// @route   GET /api/vacancies
// @access  Public
exports.getPublicVacancies = async (req, res) => {
    try {
        const vacancies = await Vacancy.find({ status: 'open' })
            .sort({ isUrgent: -1, createdAt: -1 });
        res.json({ success: true, count: vacancies.length, data: vacancies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all vacancies for admin (open and closed)
// @route   GET /api/vacancies/admin
// @access  Private/Admin
exports.getAdminVacancies = async (req, res) => {
    try {
        const vacancies = await Vacancy.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: vacancies.length, data: vacancies });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new vacancy
// @route   POST /api/vacancies
// @access  Private/Admin
exports.createVacancy = async (req, res) => {
    try {
        const {
            title,
            department,
            jobType,
            experience,
            location,
            salary,
            openings,
            description,
            requirements,
            circularUrl,
            circularType,
            driveUrl,
            deadline,
            isUrgent
        } = req.body;

        if (!title || !department || !description) {
            return res.status(400).json({ 
                success: false, 
                message: 'Job Title, Department, and Job Description are required.' 
            });
        }

        // Process requirements into array if given as string
        let processedRequirements = [];
        if (Array.isArray(requirements)) {
            processedRequirements = requirements.map(r => String(r).trim()).filter(Boolean);
        } else if (typeof requirements === 'string' && requirements.trim()) {
            processedRequirements = requirements.split('\n').map(r => r.trim()).filter(Boolean);
        }

        // Detect circular type if not explicitly passed
        let inferredType = circularType || 'none';
        if (circularUrl) {
            if (circularUrl.toLowerCase().endsWith('.pdf') || circularUrl.includes('application/pdf')) {
                inferredType = 'pdf';
            } else {
                inferredType = 'image';
            }
        } else if (driveUrl) {
            inferredType = 'drive';
        }

        const vacancy = await Vacancy.create({
            title: title.trim(),
            department: department.trim(),
            jobType: jobType || 'Full-time',
            experience: experience || 'Freshers / Experienced',
            location: location || 'Industrial Area, Thiruvazhiyode, Palakkad, Kerala',
            salary: salary || 'Best in Industry',
            openings: parseInt(openings, 10) || 1,
            description: description.trim(),
            requirements: processedRequirements,
            circularUrl: circularUrl || '',
            circularType: inferredType,
            driveUrl: driveUrl ? driveUrl.trim() : '',
            deadline: deadline ? new Date(deadline) : null,
            isUrgent: Boolean(isUrgent),
            status: 'open',
            createdBy: req.user?._id
        });

        res.status(201).json({ success: true, data: vacancy, message: 'Job vacancy published successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update vacancy
// @route   PUT /api/vacancies/:id
// @access  Private/Admin
exports.updateVacancy = async (req, res) => {
    try {
        const updates = { ...req.body };
        if (typeof updates.requirements === 'string') {
            updates.requirements = updates.requirements.split('\n').map(r => r.trim()).filter(Boolean);
        }

        const vacancy = await Vacancy.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!vacancy) {
            return res.status(404).json({ success: false, message: 'Vacancy not found.' });
        }

        res.json({ success: true, data: vacancy, message: 'Vacancy updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete vacancy
// @route   DELETE /api/vacancies/:id
// @access  Private/Admin
exports.deleteVacancy = async (req, res) => {
    try {
        const vacancy = await Vacancy.findByIdAndDelete(req.params.id);
        if (!vacancy) {
            return res.status(404).json({ success: false, message: 'Vacancy not found.' });
        }
        res.json({ success: true, message: 'Vacancy removed successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── Vacancy Ad Banner ─────────────────────────────────────────────────────────

// @desc    Get active vacancy banner
// @route   GET /api/vacancies/banner
// @access  Public
exports.getBanner = async (req, res) => {
    try {
        const banner = await VacancyBanner.findOne({ isActive: true }).sort({ updatedAt: -1 });
        res.json({ success: true, data: banner || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Save/Update vacancy ad banner
// @route   POST /api/vacancies/banner
// @access  Private/Admin
exports.saveBanner = async (req, res) => {
    try {
        const { title, description, imageUrl, driveUrl, actionLink, isActive, isUrgent } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ success: false, message: 'Banner Image URL is required.' });
        }

        // We keep one primary active banner
        let banner = await VacancyBanner.findOne();
        if (banner) {
            banner.title = title || banner.title;
            banner.description = description !== undefined ? description : banner.description;
            banner.imageUrl = imageUrl;
            banner.driveUrl = driveUrl !== undefined ? driveUrl : banner.driveUrl;
            banner.actionLink = actionLink || banner.actionLink;
            banner.isActive = isActive !== undefined ? Boolean(isActive) : true;
            banner.isUrgent = isUrgent !== undefined ? Boolean(isUrgent) : true;
            banner.updatedAt = new Date();
            banner.updatedBy = req.user?._id;
            await banner.save();
        } else {
            banner = await VacancyBanner.create({
                title: title || 'Urgent Job Vacancies',
                description: description || '',
                imageUrl,
                driveUrl: driveUrl || '',
                actionLink: actionLink || '#/careers',
                isActive: isActive !== undefined ? Boolean(isActive) : true,
                isUrgent: isUrgent !== undefined ? Boolean(isUrgent) : true,
                updatedAt: new Date(),
                updatedBy: req.user?._id
            });
        }

        res.json({ success: true, data: banner, message: 'Vacancy Ad Banner updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete/Remove vacancy ad banner
// @route   DELETE /api/vacancies/banner
// @access  Private/Admin
exports.deleteBanner = async (req, res) => {
    try {
        await VacancyBanner.deleteMany({});
        res.json({ success: true, message: 'Vacancy Ad Banner removed successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
