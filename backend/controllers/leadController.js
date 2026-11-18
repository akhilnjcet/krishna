const Lead = require('../models/Lead');
const User = require('../models/User');
const Quote = require('../models/Quote');
const bcrypt = require('bcryptjs');

// @desc Get all leads with stage & search filters
// @route GET /api/leads
exports.getLeads = async (req, res) => {
    try {
        const { stage, search, overdueOnly } = req.query;
        const query = {};

        if (stage && stage !== 'All') {
            query.pipelineStage = stage;
        }

        if (search) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [{ name: regex }, { phone: regex }, { email: regex }, { requiredService: regex }];
        }

        if (overdueOnly === 'true') {
            query.nextFollowUpDate = { $lt: new Date() };
            query.pipelineStage = { $nin: ['Won', 'Lost'] };
        }

        const leads = await Lead.find(query).sort({ createdAt: -1 });

        // Calculate summary metrics
        const stageCounts = {
            'New Enquiry': 0,
            'Contacted': 0,
            'Site Visit Required': 0,
            'Site Inspection Completed': 0,
            'Quotation Preparation': 0,
            'Quotation Sent': 0,
            'Negotiation': 0,
            'Won': 0,
            'Lost': 0
        };

        let totalPipelineValue = 0;
        let overdueFollowUpsCount = 0;
        const now = new Date();

        leads.forEach(l => {
            if (stageCounts[l.pipelineStage] !== undefined) {
                stageCounts[l.pipelineStage] += 1;
            }
            if (['Quotation Preparation', 'Quotation Sent', 'Negotiation'].includes(l.pipelineStage)) {
                totalPipelineValue += Number(l.estimatedBudget) || 0;
            }
            if (l.nextFollowUpDate && new Date(l.nextFollowUpDate) < now && !['Won', 'Lost'].includes(l.pipelineStage)) {
                overdueFollowUpsCount += 1;
            }
        });

        res.json({
            success: true,
            count: leads.length,
            leads,
            summary: {
                stageCounts,
                totalPipelineValue,
                overdueFollowUpsCount
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Create a new CRM Lead manually
// @route POST /api/leads/manual
exports.createManualLead = async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            location,
            source,
            requiredService,
            projectDescription,
            estimatedBudget,
            expectedCompletionDate,
            assignedTo,
            assignedToName,
            notes
        } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ success: false, message: 'Name and Phone are required' });
        }

        const lead = await Lead.create({
            name: name.trim(),
            phone: phone.trim(),
            email: (email || '').trim().toLowerCase(),
            location: location || '',
            source: source || 'Walk-in customers',
            requiredService: requiredService || 'General Fabrication',
            projectDescription: projectDescription || '',
            estimatedBudget: Number(estimatedBudget) || 0,
            expectedCompletionDate: expectedCompletionDate || null,
            assignedTo: assignedTo || null,
            assignedToName: assignedToName || '',
            notes: notes || '',
            pipelineStage: 'New Enquiry'
        });

        res.status(201).json({ success: true, lead });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Update Lead details & pipeline stage
// @route PUT /api/leads/:id
exports.updateLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        const allowedFields = [
            'name', 'phone', 'email', 'location', 'requiredService', 'projectDescription',
            'estimatedBudget', 'expectedCompletionDate', 'pipelineStage', 'assignedTo',
            'assignedToName', 'notes', 'lostReason'
        ];

        allowedFields.forEach(f => {
            if (req.body[f] !== undefined) {
                lead[f] = req.body[f];
            }
        });

        await lead.save();
        res.json({ success: true, lead });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Add a follow-up task to lead
// @route POST /api/leads/:id/follow-up
exports.addFollowUp = async (req, res) => {
    try {
        const { scheduledDate, followUpType, notes, ownerName } = req.body;
        if (!scheduledDate) {
            return res.status(400).json({ success: false, message: 'Scheduled date is required' });
        }

        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        lead.followUps.push({
            scheduledDate: new Date(scheduledDate),
            followUpType: followUpType || 'Call',
            notes: notes || '',
            ownerName: ownerName || (req.user ? req.user.name : 'Sales Staff'),
            status: 'Pending'
        });

        await lead.save();
        res.json({ success: true, message: 'Follow-up scheduled successfully', lead });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Complete a follow-up task
// @route PUT /api/leads/:id/follow-up/:followUpId/complete
exports.completeFollowUp = async (req, res) => {
    try {
        const { outcome, nextStage } = req.body;
        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        const fUp = lead.followUps.id(req.params.followUpId);
        if (!fUp) {
            return res.status(404).json({ success: false, message: 'Follow-up not found' });
        }

        fUp.status = 'Completed';
        fUp.completedAt = new Date();
        fUp.outcome = outcome || 'Follow-up successfully performed';

        if (nextStage && nextStage !== lead.pipelineStage) {
            lead.pipelineStage = nextStage;
        }

        await lead.save();
        res.json({ success: true, message: 'Follow-up marked completed', lead });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Convert Lead to Existing Customer & generate Quote/Project without duplicates
// @route POST /api/leads/:id/convert
exports.convertLeadToCustomer = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        // 1. Check if user already exists by phone or email
        let customer = null;
        if (lead.phone) {
            customer = await User.findOne({ phone: lead.phone });
        }
        if (!customer && lead.email) {
            customer = await User.findOne({ email: lead.email });
        }

        let isNewCustomer = false;
        if (!customer) {
            // Create user with customer role
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Krishna@123', salt);
            const generatedEmail = lead.email || `customer_${lead.phone.slice(-4)}_${Date.now().toString().slice(-4)}@krishnaerp.local`;

            customer = await User.create({
                name: lead.name,
                phone: lead.phone,
                email: generatedEmail,
                password: hashedPassword,
                role: 'customer'
            });
            isNewCustomer = true;
        }

        // 2. Optionally create a formal Quote linked to this customer
        let newQuote = null;
        if (req.body.createQuote) {
            newQuote = await Quote.create({
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
                serviceType: lead.requiredService || 'General Fabrication',
                description: lead.projectDescription || lead.message || '',
                estimatedCost: lead.estimatedBudget || 0,
                status: 'Draft',
                userId: customer._id
            });
        }

        // 3. Mark Lead as Won & Converted
        lead.pipelineStage = 'Won';
        lead.convertedCustomer = {
            isConverted: true,
            customerId: customer._id,
            convertedAt: new Date(),
            quoteId: newQuote ? newQuote._id : null
        };

        await lead.save();

        res.json({
            success: true,
            message: isNewCustomer
                ? 'Lead converted and new Customer record created!'
                : 'Lead linked to existing Customer record without duplication!',
            customer: {
                _id: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email
            },
            quote: newQuote,
            lead
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Delete Lead
// @route DELETE /api/leads/:id
exports.deleteLead = async (req, res) => {
    try {
        await Lead.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Lead deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
