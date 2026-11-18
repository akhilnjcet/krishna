const Warranty = require('../models/Warranty');
const ServiceRequest = require('../models/ServiceRequest');
const Project = require('../models/Project');
const User = require('../models/User');
const InventoryItem = require('../models/InventoryItem');

// ─── WARRANTY MANAGEMENT ───

// @desc Get all warranties with filters
// @route GET /api/warranties
exports.getAllWarranties = async (req, res) => {
    try {
        const { customerId, projectId, status, expiringSoon } = req.query;
        const query = {};

        if (customerId) query.customerId = customerId;
        if (projectId) query.projectId = projectId;
        if (status) query.status = status;

        if (expiringSoon === 'true') {
            const now = new Date();
            const in30Days = new Date();
            in30Days.setDate(in30Days.getDate() + 30);
            query.expiryDate = { $gte: now, $lte: in30Days };
            query.status = 'Active';
        }

        const warranties = await Warranty.find(query).sort({ expiryDate: 1 });

        // Dynamically evaluate active vs expired status
        const now = new Date();
        for (const w of warranties) {
            if (w.status === 'Active' && new Date(w.expiryDate) < now) {
                w.status = 'Expired';
                await w.save();
            }
        }

        res.json({ success: true, count: warranties.length, warranties });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Register a new Warranty
// @route POST /api/warranties
exports.createWarranty = async (req, res) => {
    try {
        const { 
            customerId, 
            projectId, 
            invoiceId, 
            invoiceNumber, 
            deliveredItem, 
            serialNumber, 
            category, 
            startDate, 
            durationMonths, 
            coverageTerms, 
            exclusions, 
            notes 
        } = req.body;

        if (!customerId || !projectId || !deliveredItem) {
            return res.status(400).json({ success: false, message: 'Customer, Project, and Delivered Item are required' });
        }

        const [customer, project] = await Promise.all([
            User.findById(customerId),
            Project.findById(projectId)
        ]);
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        const warrantyNumber = `WAR-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const warranty = await Warranty.create({
            warrantyNumber,
            customerId: customer._id,
            customerName: customer.name,
            customerPhone: customer.phone || '',
            customerEmail: customer.email || '',
            projectId: project._id,
            projectTitle: project.title,
            invoiceId: invoiceId || null,
            invoiceNumber: invoiceNumber || '',
            deliveredItem: deliveredItem.trim(),
            serialNumber: serialNumber || '',
            category: category || 'General Fabrication',
            startDate: startDate ? new Date(startDate) : new Date(),
            durationMonths: Number(durationMonths) || 12,
            coverageTerms: coverageTerms || undefined,
            exclusions: exclusions || undefined,
            status: 'Active',
            notes: notes || ''
        });

        res.status(201).json({ success: true, warranty });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── SERVICE REQUESTS WORKFLOW ───

// @desc Get all service requests
// @route GET /api/service-requests
exports.getAllServiceRequests = async (req, res) => {
    try {
        const { customerId, status, priority, technicianId } = req.query;
        const query = {};

        if (customerId) query.customerId = customerId;
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (technicianId) query.assignedTechnicianId = technicianId;

        const requests = await ServiceRequest.find(query).sort({ createdAt: -1 });
        res.json({ success: true, count: requests.length, requests });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Create a new Service Request / Complaint
// @route POST /api/service-requests
exports.createServiceRequest = async (req, res) => {
    try {
        const { 
            customerId, 
            projectId, 
            warrantyId, 
            deliveredItem, 
            issueDescription, 
            photographs, 
            priority 
        } = req.body;

        if (!customerId || !projectId || !issueDescription) {
            return res.status(400).json({ success: false, message: 'Customer, Project, and Issue Description are required' });
        }

        const [customer, project] = await Promise.all([
            User.findById(customerId),
            Project.findById(projectId)
        ]);
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        // Check warranty status if warrantyId supplied or exists for customer/project
        let warranty = null;
        if (warrantyId) {
            warranty = await Warranty.findById(warrantyId);
        } else {
            warranty = await Warranty.findOne({ customerId: customer._id, projectId: project._id, status: 'Active' });
        }

        let warrantyStatus = 'Under Verification';
        if (warranty) {
            warrantyStatus = (new Date(warranty.expiryDate) >= new Date() && warranty.status === 'Active')
                ? 'Under Warranty'
                : 'Out of Warranty';
        } else {
            warrantyStatus = 'Out of Warranty';
        }

        const complaintNumber = `SRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const serviceRequest = await ServiceRequest.create({
            complaintNumber,
            warrantyId: warranty ? warranty._id : null,
            warrantyNumber: warranty ? warranty.warrantyNumber : '',
            customerId: customer._id,
            customerName: customer.name,
            customerPhone: customer.phone || '',
            customerEmail: customer.email || '',
            projectId: project._id,
            projectTitle: project.title,
            deliveredItem: deliveredItem || project.title,
            issueDescription: issueDescription.trim(),
            photographs: Array.isArray(photographs) ? photographs : [],
            priority: priority || 'Medium',
            warrantyStatus,
            status: 'Complaint Received',
            auditTrail: [{
                action: 'COMPLAINT_RECEIVED',
                performedBy: req.user ? req.user.name : customer.name,
                timestamp: new Date(),
                notes: `Complaint logged with priority: ${priority || 'Medium'}, Warranty: ${warrantyStatus}`
            }]
        });

        res.status(201).json({ success: true, serviceRequest });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Assign Technician & Schedule Site Visit
// @route PUT /api/service-requests/:id/assign
exports.assignTechnician = async (req, res) => {
    try {
        const { technicianId, scheduledVisitDate, warrantyStatusOverride } = req.body;
        const request = await ServiceRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Service request not found' });
        }

        let techName = '';
        if (technicianId) {
            const tech = await User.findById(technicianId);
            if (tech) {
                request.assignedTechnicianId = tech._id;
                request.assignedTechnicianName = tech.name;
                techName = tech.name;
            }
        }

        if (scheduledVisitDate) {
            request.scheduledVisitDate = new Date(scheduledVisitDate);
            request.status = 'Visit Scheduled';
        } else {
            request.status = 'Technician Assigned';
        }

        if (warrantyStatusOverride) {
            request.warrantyStatus = warrantyStatusOverride;
        }

        request.auditTrail.push({
            action: scheduledVisitDate ? 'VISIT_SCHEDULED' : 'TECHNICIAN_ASSIGNED',
            performedBy: req.user ? req.user.name : 'Service Manager',
            timestamp: new Date(),
            notes: `Assigned to ${techName || 'Staff'}${scheduledVisitDate ? `. Visit scheduled: ${new Date(scheduledVisitDate).toLocaleDateString()}` : ''}`
        });

        await request.save();
        res.json({ success: true, serviceRequest: request });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Record diagnosis, repair actions, parts consumed, and labour hours
// @route PUT /api/service-requests/:id/record-repair
exports.recordRepair = async (req, res) => {
    try {
        const { 
            diagnosisNotes, 
            repairActionsTaken, 
            partsConsumed, 
            labourHours, 
            labourCost, 
            customerChargeableAmount,
            status 
        } = req.body;

        const request = await ServiceRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Service request not found' });
        }

        if (diagnosisNotes) request.diagnosisNotes = diagnosisNotes;
        if (repairActionsTaken) request.repairActionsTaken = repairActionsTaken;
        if (labourHours !== undefined) request.labourHours = Number(labourHours);
        if (labourCost !== undefined) request.labourCost = Number(labourCost);
        if (customerChargeableAmount !== undefined) request.customerChargeableAmount = Number(customerChargeableAmount);

        // Deduct consumed service parts from inventory
        if (Array.isArray(partsConsumed)) {
            for (const p of partsConsumed) {
                if (p.inventoryItemId && Number(p.quantity) > 0) {
                    const inv = await InventoryItem.findById(p.inventoryItemId);
                    if (inv) {
                        inv.quantity = Math.max(0, inv.quantity - Number(p.quantity));
                        inv.stockMovements.push({
                            type: 'OUT',
                            quantity: Number(p.quantity),
                            reference: request.complaintNumber,
                            reason: `After-sales service part for ${request.customerName}`,
                            performedBy: req.user ? req.user.name : 'Service Technician',
                            date: new Date()
                        });
                        await inv.save();
                    }
                }
            }
            request.partsConsumed = partsConsumed;
        }

        request.status = status || 'Customer Confirmation';
        request.auditTrail.push({
            action: 'REPAIR_RECORDED',
            performedBy: req.user ? req.user.name : 'Technician',
            timestamp: new Date(),
            notes: `Repair actions documented. Total Service Cost: ₹${request.totalServiceCost}, Chargeable: ₹${request.customerChargeableAmount}`
        });

        await request.save();
        res.json({ success: true, message: 'Repair record saved', serviceRequest: request });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Customer Signoff & Close Ticket
// @route PUT /api/service-requests/:id/signoff
exports.customerSignOff = async (req, res) => {
    try {
        const { rating, remarks } = req.body;
        const request = await ServiceRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Service request not found' });
        }

        request.customerFeedbackRating = Number(rating) || 5;
        request.customerFeedbackRemarks = remarks || 'Satisfactory work';
        request.customerSignOffDate = new Date();
        request.status = 'Closed';

        request.auditTrail.push({
            action: 'CUSTOMER_SIGNOFF_CLOSED',
            performedBy: req.user ? req.user.name : 'Customer',
            timestamp: new Date(),
            notes: `Customer gave rating ${request.customerFeedbackRating}/5. Service successfully closed.`
        });

        await request.save();
        res.json({ success: true, message: 'Service ticket closed with customer signoff', serviceRequest: request });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
