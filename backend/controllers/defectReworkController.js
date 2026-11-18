const DefectRework = require('../models/DefectRework');
const Project = require('../models/Project');
const InventoryItem = require('../models/InventoryItem');

// @desc Get all defect/rework records with filters
// @route GET /api/defects
exports.getAllDefects = async (req, res) => {
    try {
        const { projectId, status, category, severity } = req.query;
        const query = {};
        if (projectId) query.projectId = projectId;
        if (status) query.status = status;
        if (category) query.defectCategory = category;
        if (severity) query.severity = severity;

        const defects = await DefectRework.find(query).sort({ createdAt: -1 });
        res.json({ success: true, count: defects.length, defects });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Log a new defect
// @route POST /api/defects
exports.createDefect = async (req, res) => {
    try {
        const { 
            projectId, 
            jobOrderNumber, 
            productItem, 
            defectCategory, 
            description, 
            photos, 
            responsibleDepartment, 
            severity,
            isRepeatDefect,
            previousDefectId
        } = req.body;

        if (!projectId || !productItem || !defectCategory || !description) {
            return res.status(400).json({ success: false, message: 'Project, product item, defect category, and description are required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const defectNumber = `DEF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const defect = await DefectRework.create({
            defectNumber,
            projectId: project._id,
            projectTitle: project.title,
            jobOrderNumber: jobOrderNumber || '',
            productItem: productItem.trim(),
            defectCategory,
            description: description.trim(),
            photos: Array.isArray(photos) ? photos : [],
            responsibleDepartment: responsibleDepartment || 'Fabrication',
            severity: severity || 'Moderate',
            status: 'Defect Reported',
            isRepeatDefect: !!isRepeatDefect,
            previousDefectId: previousDefectId || null,
            reportedBy: req.user ? req.user._id : null,
            reportedByName: req.user ? req.user.name : 'Quality Inspector',
            auditTrail: [{
                action: 'DEFECT_REPORTED',
                performedBy: req.user ? req.user.name : 'Quality Inspector',
                timestamp: new Date(),
                notes: `Defect logged under category "${defectCategory}" with ${severity} severity.`
            }]
        });

        res.status(201).json({ success: true, defect });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Assign rework and provide instructions
// @route PUT /api/defects/:id/assign-rework
exports.assignRework = async (req, res) => {
    try {
        const { assignedEmployeeId, assignedEmployeeName, reworkInstructions, hourlyRate } = req.body;
        const defect = await DefectRework.findById(req.params.id);
        if (!defect) {
            return res.status(404).json({ success: false, message: 'Defect record not found' });
        }

        defect.assignedEmployeeId = assignedEmployeeId || defect.assignedEmployeeId;
        defect.assignedEmployeeName = assignedEmployeeName || defect.assignedEmployeeName;
        defect.reworkInstructions = reworkInstructions || defect.reworkInstructions;
        if (hourlyRate) defect.labourHourlyRate = Number(hourlyRate);
        defect.status = 'Rework Assigned';
        defect.reworkStartTime = new Date();

        defect.auditTrail.push({
            action: 'REWORK_ASSIGNED',
            performedBy: req.user ? req.user.name : 'Supervisor',
            timestamp: new Date(),
            notes: `Rework assigned to ${defect.assignedEmployeeName}. Instructions: ${reworkInstructions || 'Standard procedure'}`
        });

        await defect.save();
        res.json({ success: true, message: 'Rework assigned successfully', defect });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Record rework completion, materials consumed, and labour hours
// @route PUT /api/defects/:id/complete-rework
exports.completeRework = async (req, res) => {
    try {
        const { labourHours, additionalMaterials, status } = req.body;
        const defect = await DefectRework.findById(req.params.id);
        if (!defect) {
            return res.status(404).json({ success: false, message: 'Defect record not found' });
        }

        if (labourHours !== undefined) {
            defect.labourHours = Number(labourHours);
        }

        if (Array.isArray(additionalMaterials)) {
            // Deduct materials from inventory if provided
            for (const mat of additionalMaterials) {
                if (mat.inventoryItemId && Number(mat.quantity) > 0) {
                    const inv = await InventoryItem.findById(mat.inventoryItemId);
                    if (inv) {
                        inv.quantity = Math.max(0, inv.quantity - Number(mat.quantity));
                        inv.stockMovements.push({
                            type: 'OUT',
                            quantity: Number(mat.quantity),
                            reference: defect.defectNumber,
                            reason: `Rework consumed for defect in ${defect.projectTitle}`,
                            performedBy: req.user ? req.user.name : 'Workshop Tech',
                            date: new Date()
                        });
                        await inv.save();
                    }
                }
            }
            defect.additionalMaterialsConsumed = additionalMaterials;
        }

        defect.reworkCompletionTime = new Date();
        defect.status = status || 'Reinspection';

        defect.auditTrail.push({
            action: 'REWORK_COMPLETED',
            performedBy: req.user ? req.user.name : 'Technician',
            timestamp: new Date(),
            notes: `Rework completed. Logged ${defect.labourHours} hrs labour and ${defect.additionalMaterialsConsumed.length} material items.`
        });

        await defect.save();
        res.json({ success: true, message: 'Rework recorded and submitted for reinspection', defect });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Quality Inspector Reinspection (Approve or Reject Rework)
// @route PUT /api/defects/:id/reinspect
exports.reinspectDefect = async (req, res) => {
    try {
        const { decision, notes } = req.body; // decision: 'Passed' | 'Failed'
        const defect = await DefectRework.findById(req.params.id);
        if (!defect) {
            return res.status(404).json({ success: false, message: 'Defect record not found' });
        }

        defect.reinspectionNotes = notes || '';
        defect.reinspectedBy = req.user ? req.user._id : null;
        defect.reinspectedByName = req.user ? req.user.name : 'Lead Quality Inspector';
        defect.reinspectedAt = new Date();

        if (decision === 'Passed') {
            defect.qcApprovalStatus = 'Passed';
            defect.status = 'Approved';
        } else {
            defect.qcApprovalStatus = 'Failed';
            defect.status = 'Rejected';
        }

        defect.auditTrail.push({
            action: `QC_${decision.toUpperCase()}`,
            performedBy: req.user ? req.user.name : 'QC Inspector',
            timestamp: new Date(),
            notes: `Reinspection outcome: ${decision}. Notes: ${notes || 'None'}`
        });

        await defect.save();
        res.json({ success: true, message: `QC Inspection marked as ${decision}`, defect });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Close defect ticket
// @route PUT /api/defects/:id/close
exports.closeDefect = async (req, res) => {
    try {
        const defect = await DefectRework.findById(req.params.id);
        if (!defect) {
            return res.status(404).json({ success: false, message: 'Defect record not found' });
        }
        defect.status = 'Closed';
        defect.auditTrail.push({
            action: 'CLOSED',
            performedBy: req.user ? req.user.name : 'Admin',
            timestamp: new Date(),
            notes: 'Defect lifecycle concluded and archived into QC records.'
        });
        await defect.save();
        res.json({ success: true, message: 'Defect ticket closed', defect });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Defect & Rework Analytics Report
// @route GET /api/defects/analytics/summary
exports.getDefectAnalytics = async (req, res) => {
    try {
        const allDefects = await DefectRework.find();

        let totalDefects = allDefects.length;
        let totalReworkCost = 0;
        let repeatDefectsCount = 0;
        const categoryCounts = {};
        const severityCounts = { Minor: 0, Moderate: 0, Critical: 0 };
        const statusCounts = {};

        allDefects.forEach(d => {
            totalReworkCost += Number(d.totalReworkCost) || 0;
            if (d.isRepeatDefect) repeatDefectsCount += 1;

            categoryCounts[d.defectCategory] = (categoryCounts[d.defectCategory] || 0) + 1;
            if (severityCounts[d.severity] !== undefined) {
                severityCounts[d.severity] += 1;
            }
            statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
        });

        const rejectionCount = (statusCounts['Rejected'] || 0);
        const rejectionRate = totalDefects > 0 ? parseFloat(((rejectionCount / totalDefects) * 100).toFixed(1)) : 0;

        res.json({
            success: true,
            analytics: {
                totalDefects,
                totalReworkCost: parseFloat(totalReworkCost.toFixed(2)),
                repeatDefectsCount,
                rejectionCount,
                rejectionRate,
                categoryCounts,
                severityCounts,
                statusCounts
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
