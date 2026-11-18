const mongoose = require('mongoose');
const BillOfMaterials = require('../models/BillOfMaterials');
const MaterialRequest = require('../models/MaterialRequest');
const MaterialConsumption = require('../models/MaterialConsumption');
const ProjectLabourCost = require('../models/ProjectLabourCost');
const ProjectTransportCost = require('../models/ProjectTransportCost');
const Expense = require('../models/Expense');
const InventoryItem = require('../models/InventoryItem');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { calculateProjectCosting } = require('../utils/projectCostCalculator');

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BILL OF MATERIALS (BOM) MANAGEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 */

// GET /api/bom
exports.getAllBOMs = async (req, res) => {
    try {
        const { projectId, status, search } = req.query;
        let query = {};

        if (projectId) query.projectId = projectId;
        if (status && status !== 'All') query.status = status;
        if (search) {
            query.$or = [
                { bomNumber: { $regex: search, $options: 'i' } },
                { projectTitle: { $regex: search, $options: 'i' } },
                { jobOrderNumber: { $regex: search, $options: 'i' } },
                { customerName: { $regex: search, $options: 'i' } }
            ];
        }

        const boms = await BillOfMaterials.find(query)
            .populate('projectId', 'title status budget serviceType customerId')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: boms.length, boms });
    } catch (err) {
        console.error('Error fetching BOMs:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/bom/:id
exports.getBOMById = async (req, res) => {
    try {
        const bom = await BillOfMaterials.findById(req.params.id)
            .populate('projectId')
            .populate('customerId', 'name email phone')
            .populate('items.inventoryItemId', 'name code quantity unit unitPrice');

        if (!bom) {
            return res.status(404).json({ success: false, message: 'BOM not found' });
        }

        res.json({ success: true, bom });
    } catch (err) {
        console.error('Error fetching BOM details:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/bom
exports.createBOM = async (req, res) => {
    try {
        const {
            projectId,
            jobOrderNumber,
            description,
            items,
            estimatedLabourHours,
            estimatedLabourRate,
            estimatedTransportCost,
            estimatedOtherCost,
            warningThresholdPercentage,
            notes
        } = req.body;

        const project = await Project.findById(projectId).populate('customerId');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Referenced Project not found' });
        }

        // Generate unique BOM Number: BOM-YYYY-XXXX
        const year = new Date().getFullYear();
        const count = await BillOfMaterials.countDocuments();
        const bomNumber = `BOM-${year}-${String(count + 1).padStart(4, '0')}`;

        const newBOM = new BillOfMaterials({
            bomNumber,
            projectId: project._id,
            projectTitle: project.title,
            jobOrderNumber: jobOrderNumber || `JO-${project._id.toString().substring(18, 24).toUpperCase()}`,
            customerId: project.customerId?._id || project.customerId || null,
            customerName: project.customerId?.name || 'Valued Customer',
            customerPhone: project.customerId?.phone || '',
            description: description || project.description || '',
            items: Array.isArray(items) ? items : [],
            estimatedLabourHours: Number(estimatedLabourHours) || 0,
            estimatedLabourRate: Number(estimatedLabourRate) || 0,
            estimatedTransportCost: Number(estimatedTransportCost) || 0,
            estimatedOtherCost: Number(estimatedOtherCost) || 0,
            warningThresholdPercentage: Number(warningThresholdPercentage) || 100,
            createdBy: req.user?._id,
            createdByName: req.user?.name || 'System Admin',
            notes: notes || '',
            status: 'Draft'
        });

        await newBOM.save();

        res.status(201).json({
            success: true,
            message: `Bill of Materials ${bomNumber} created successfully.`,
            bom: newBOM
        });
    } catch (err) {
        console.error('Error creating BOM:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/bom/:id
exports.updateBOM = async (req, res) => {
    try {
        const bom = await BillOfMaterials.findById(req.params.id);
        if (!bom) {
            return res.status(404).json({ success: false, message: 'BOM not found' });
        }

        const {
            jobOrderNumber,
            description,
            items,
            estimatedLabourHours,
            estimatedLabourRate,
            estimatedTransportCost,
            estimatedOtherCost,
            warningThresholdPercentage,
            status,
            notes
        } = req.body;

        if (jobOrderNumber !== undefined) bom.jobOrderNumber = jobOrderNumber;
        if (description !== undefined) bom.description = description;
        if (Array.isArray(items)) bom.items = items;
        if (estimatedLabourHours !== undefined) bom.estimatedLabourHours = Number(estimatedLabourHours) || 0;
        if (estimatedLabourRate !== undefined) bom.estimatedLabourRate = Number(estimatedLabourRate) || 0;
        if (estimatedTransportCost !== undefined) bom.estimatedTransportCost = Number(estimatedTransportCost) || 0;
        if (estimatedOtherCost !== undefined) bom.estimatedOtherCost = Number(estimatedOtherCost) || 0;
        if (warningThresholdPercentage !== undefined) bom.warningThresholdPercentage = Number(warningThresholdPercentage) || 100;
        if (status) bom.status = status;
        if (notes !== undefined) bom.notes = notes;

        await bom.save();

        res.json({
            success: true,
            message: `BOM ${bom.bomNumber} updated successfully.`,
            bom
        });
    } catch (err) {
        console.error('Error updating BOM:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// PATCH /api/bom/:id/status
exports.updateBOMStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const bom = await BillOfMaterials.findById(req.params.id);
        if (!bom) {
            return res.status(404).json({ success: false, message: 'BOM not found' });
        }

        bom.status = status;
        if (status === 'Approved') {
            bom.approvedBy = req.user?._id;
            bom.approvedByName = req.user?.name || 'Admin';
            bom.approvedAt = new Date();
        }

        await bom.save();

        res.json({
            success: true,
            message: `BOM ${bom.bomNumber} status updated to ${status}.`,
            bom
        });
    } catch (err) {
        console.error('Error updating BOM status:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MATERIAL REQUEST & ADMIN APPROVAL WORKFLOW
 * ─────────────────────────────────────────────────────────────────────────────
 */

// GET /api/material-requests
exports.getAllMaterialRequests = async (req, res) => {
    try {
        const { projectId, status, priority } = req.query;
        let query = {};

        if (projectId) query.projectId = projectId;
        if (status && status !== 'All') query.status = status;
        if (priority && priority !== 'All') query.priority = priority;

        const requests = await MaterialRequest.find(query)
            .populate('projectId', 'title status budget')
            .populate('items.inventoryItemId', 'name code quantity unit unitPrice')
            .sort({ createdAt: -1 });

        res.json({ success: true, count: requests.length, requests });
    } catch (err) {
        console.error('Error fetching material requests:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/material-requests
exports.createMaterialRequest = async (req, res) => {
    try {
        const {
            projectId,
            bomId,
            priority,
            items,
            notes
        } = req.body;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Referenced Project not found' });
        }

        const year = new Date().getFullYear();
        const count = await MaterialRequest.countDocuments();
        const requestNumber = `MR-${year}-${String(count + 1).padStart(4, '0')}`;

        const reqItems = [];
        for (const item of (items || [])) {
            const inv = await InventoryItem.findById(item.inventoryItemId);
            reqItems.push({
                inventoryItemId: inv ? inv._id : item.inventoryItemId,
                materialName: inv ? inv.name : item.materialName,
                category: inv ? inv.category : (item.category || 'Raw Material'),
                specification: item.specification || inv?.notes || '',
                unit: inv ? inv.unit : (item.unit || 'Pcs'),
                requestedQty: Number(item.requestedQty) || 0,
                unitPrice: inv ? inv.unitPrice : (Number(item.unitPrice) || 0)
            });
        }

        const newRequest = new MaterialRequest({
            requestNumber,
            projectId: project._id,
            projectTitle: project.title,
            jobOrderNumber: project._id.toString().substring(18, 24).toUpperCase(),
            bomId: bomId || null,
            requestedBy: req.user?._id,
            requestedByName: req.user?.name || 'Staff Member',
            priority: priority || 'Normal',
            items: reqItems,
            status: 'Pending',
            notes: notes || '',
            auditLog: [{
                action: 'REQUESTED',
                performedBy: req.user?.name || 'Staff Member',
                timestamp: new Date(),
                details: `Material request created with ${reqItems.length} items.`
            }]
        });

        await newRequest.save();

        // Notify Admins about the new material request
        try {
            const adminUsers = await User.find({ role: { $in: ['admin', 'superadmin'] } });
            for (const admin of adminUsers) {
                await Notification.create({
                    recipient: admin._id,
                    title: 'New Material Request',
                    message: `${req.user?.name || 'Staff'} submitted Material Request ${requestNumber} for ${project.title}.`,
                    type: 'info',
                    category: 'inventory',
                    link: '/admin/bom-costing',
                    metadata: { type: 'MATERIAL_REQUEST', requestId: newRequest._id, requestNumber }
                });
            }
        } catch (notifErr) {
            console.error('Non-critical notification dispatch error:', notifErr);
        }

        res.status(201).json({
            success: true,
            message: `Material Request ${requestNumber} submitted for approval.`,
            request: newRequest
        });
    } catch (err) {
        console.error('Error creating material request:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/material-requests/:id/review (Approve, Partially Approve, Reject)
exports.reviewMaterialRequest = async (req, res) => {
    try {
        const { action, approvedItems, rejectionReason, allowNegativeStock } = req.body;
        // action: 'APPROVE' | 'REJECT' | 'PARTIAL'

        const request = await MaterialRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ success: false, message: 'Material request not found' });
        }

        if (request.status !== 'Pending') {
            return res.status(400).json({ 
                success: false, 
                message: `Request is already in ${request.status} state.` 
            });
        }

        // CASE 1: REJECTION
        if (action === 'REJECT') {
            request.status = 'Rejected';
            request.rejectionReason = rejectionReason || 'Rejected by administrator';
            request.approvedBy = req.user?._id;
            request.approvedByName = req.user?.name || 'Admin';
            request.approvedAt = new Date();
            request.auditLog.push({
                action: 'REJECTED',
                performedBy: req.user?.name || 'Admin',
                timestamp: new Date(),
                details: `Request rejected. Reason: ${request.rejectionReason}`
            });

            await request.save();

            return res.json({
                success: true,
                message: `Material Request ${request.requestNumber} has been rejected.`,
                request
            });
        }

        // CASE 2: APPROVE / PARTIAL APPROVAL & ISSUANCE
        // First check inventory stock availability for each item
        const approvalMap = new Map();
        if (Array.isArray(approvedItems)) {
            approvedItems.forEach(item => {
                approvalMap.set(item.inventoryItemId?.toString(), Number(item.approvedQty) || 0);
            });
        }

        const stockItemsToUpdate = [];
        const consumptionsToRecord = [];

        for (const reqItem of request.items) {
            const approvedQty = approvalMap.has(reqItem.inventoryItemId.toString())
                ? approvalMap.get(reqItem.inventoryItemId.toString())
                : reqItem.requestedQty;

            reqItem.approvedQty = approvedQty;

            if (approvedQty > 0) {
                const invItem = await InventoryItem.findById(reqItem.inventoryItemId);
                if (!invItem) {
                    return res.status(404).json({ 
                        success: false, 
                        message: `Inventory item "${reqItem.materialName}" not found.` 
                    });
                }

                // Check negative stock boundary rule
                if (!allowNegativeStock && invItem.quantity < approvedQty) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for "${invItem.name}". Available: ${invItem.quantity} ${invItem.unit}, Requested for issue: ${approvedQty} ${invItem.unit}. Admin exception required to allow negative stock.`
                    });
                }

                reqItem.issuedQty = approvedQty;
                stockItemsToUpdate.push({
                    invItem,
                    issuedQty: approvedQty,
                    unitPrice: invItem.unitPrice || reqItem.unitPrice || 0
                });
            }
        }

        // Execute Stock Deductions & Movement Logs
        for (const item of stockItemsToUpdate) {
            const { invItem, issuedQty, unitPrice } = item;
            const prevQty = invItem.quantity;
            invItem.quantity = Math.max(0, invItem.quantity - issuedQty);

            invItem.stockMovements.push({
                type: 'OUT',
                quantity: issuedQty,
                previousQuantity: prevQty,
                newQuantity: invItem.quantity,
                reason: `Material Issued to Project: ${request.projectTitle}`,
                reference: request.requestNumber,
                performedBy: req.user?.name || 'Admin',
                date: new Date()
            });

            await invItem.save();

            // Record Material Consumption 'ISSUE' entry
            const consRecord = new MaterialConsumption({
                projectId: request.projectId,
                projectTitle: request.projectTitle,
                jobOrderNumber: request.jobOrderNumber,
                bomId: request.bomId,
                materialRequestId: request._id,
                inventoryItemId: invItem._id,
                materialName: invItem.name,
                category: invItem.category,
                specification: invItem.notes || '',
                unit: invItem.unit,
                movementType: 'ISSUE',
                quantity: issuedQty,
                unitCost: unitPrice,
                totalCost: parseFloat((issuedQty * unitPrice).toFixed(2)),
                date: new Date(),
                issuedBy: req.user?._id,
                issuedByName: req.user?.name || 'Admin',
                receivedBy: request.requestedByName,
                notes: `Material issued under request ${request.requestNumber}`,
                auditTrail: [{
                    action: 'ISSUED',
                    performedBy: req.user?.name || 'Admin',
                    timestamp: new Date(),
                    details: `Issued ${issuedQty} ${invItem.unit} from stock.`
                }]
            });

            await consRecord.save();
        }

        const isPartial = request.items.some(i => i.approvedQty < i.requestedQty);
        request.status = isPartial ? 'Partially Approved' : 'Issued';
        request.approvedBy = req.user?._id;
        request.approvedByName = req.user?.name || 'Admin';
        request.approvedAt = new Date();
        request.allowNegativeStock = !!allowNegativeStock;
        request.auditLog.push({
            action: request.status.toUpperCase(),
            performedBy: req.user?.name || 'Admin',
            timestamp: new Date(),
            details: `Approved and issued materials from inventory stock. Status: ${request.status}.`
        });

        await request.save();

        // Notify Requester
        try {
            await Notification.create({
                recipient: request.requestedBy,
                title: `Material Request ${request.status}`,
                message: `Your material request ${request.requestNumber} for "${request.projectTitle}" has been ${request.status.toLowerCase()} and issued.`,
                type: 'success',
                category: 'inventory',
                link: '/admin/bom-costing',
                metadata: { requestId: request._id, requestNumber: request.requestNumber }
            });
        } catch (notifErr) {
            console.error('Non-critical notification dispatch error:', notifErr);
        }

        res.json({
            success: true,
            message: `Material Request ${request.requestNumber} processed. Stock updated and materials issued.`,
            request
        });
    } catch (err) {
        console.error('Error reviewing material request:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MATERIAL CONSUMPTION, RETURNS & WASTAGE RECORDING
 * ─────────────────────────────────────────────────────────────────────────────
 */

// POST /api/material-consumption/record (Record actual consumption & wastage)
exports.recordMaterialConsumption = async (req, res) => {
    try {
        const {
            projectId,
            materialRequestId,
            inventoryItemId,
            materialName,
            consumedQty,
            wastageQty,
            date,
            notes
        } = req.body;

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const inv = await InventoryItem.findById(inventoryItemId);
        const unitCost = inv ? inv.unitPrice : 0;
        const cQty = Number(consumedQty) || 0;
        const wQty = Number(wastageQty) || 0;

        if (cQty <= 0 && wQty <= 0) {
            return res.status(400).json({ success: false, message: 'Please provide valid consumed or wastage quantity.' });
        }

        const recordsCreated = [];

        // Record CONSUMPTION
        if (cQty > 0) {
            const consRecord = new MaterialConsumption({
                projectId: project._id,
                projectTitle: project.title,
                jobOrderNumber: project._id.toString().substring(18, 24).toUpperCase(),
                materialRequestId: materialRequestId || null,
                inventoryItemId: inv ? inv._id : inventoryItemId,
                materialName: inv ? inv.name : (materialName || 'Material'),
                category: inv ? inv.category : 'Raw Material',
                specification: inv ? inv.notes : '',
                unit: inv ? inv.unit : 'Pcs',
                movementType: 'CONSUMPTION',
                quantity: cQty,
                unitCost,
                totalCost: parseFloat((cQty * unitCost).toFixed(2)),
                date: date ? new Date(date) : new Date(),
                issuedBy: req.user?._id,
                issuedByName: req.user?.name || 'Staff',
                receivedBy: req.user?.name || 'Site Crew',
                notes: notes || 'Actual fabrication consumption recorded',
                auditTrail: [{
                    action: 'CONSUMED',
                    performedBy: req.user?.name || 'Staff',
                    timestamp: new Date(),
                    details: `Consumed ${cQty} ${inv?.unit || 'units'}.`
                }]
            });
            await consRecord.save();
            recordsCreated.push(consRecord);
        }

        // Record WASTAGE
        if (wQty > 0) {
            const wastageRecord = new MaterialConsumption({
                projectId: project._id,
                projectTitle: project.title,
                jobOrderNumber: project._id.toString().substring(18, 24).toUpperCase(),
                materialRequestId: materialRequestId || null,
                inventoryItemId: inv ? inv._id : inventoryItemId,
                materialName: inv ? inv.name : (materialName || 'Material'),
                category: inv ? inv.category : 'Raw Material',
                specification: inv ? inv.notes : '',
                unit: inv ? inv.unit : 'Pcs',
                movementType: 'WASTAGE',
                quantity: wQty,
                unitCost,
                totalCost: parseFloat((wQty * unitCost).toFixed(2)),
                date: date ? new Date(date) : new Date(),
                issuedBy: req.user?._id,
                issuedByName: req.user?.name || 'Staff',
                receivedBy: req.user?.name || 'Site Crew',
                notes: notes || 'Fabrication offcuts / wastage recorded',
                auditTrail: [{
                    action: 'WASTAGE',
                    performedBy: req.user?.name || 'Staff',
                    timestamp: new Date(),
                    details: `Wastage of ${wQty} ${inv?.unit || 'units'}.`
                }]
            });
            await wastageRecord.save();
            recordsCreated.push(wastageRecord);
        }

        // Update corresponding MaterialRequest if linked
        if (materialRequestId) {
            const matReq = await MaterialRequest.findById(materialRequestId);
            if (matReq) {
                const targetItem = matReq.items.find(i => i.inventoryItemId.toString() === inventoryItemId.toString());
                if (targetItem) {
                    targetItem.consumedQty = (targetItem.consumedQty || 0) + cQty;
                    targetItem.wastageQty = (targetItem.wastageQty || 0) + wQty;
                    await matReq.save();
                }
            }
        }

        res.status(201).json({
            success: true,
            message: `Recorded ${cQty} consumed and ${wQty} wastage for "${inv?.name || materialName}".`,
            records: recordsCreated
        });
    } catch (err) {
        console.error('Error recording material consumption:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/material-consumption/return (Return unused materials back to inventory)
exports.returnMaterialToInventory = async (req, res) => {
    try {
        const {
            projectId,
            materialRequestId,
            inventoryItemId,
            returnedQty,
            date,
            notes
        } = req.body;

        const retQty = Number(returnedQty) || 0;
        if (retQty <= 0) {
            return res.status(400).json({ success: false, message: 'Valid return quantity is required.' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const inv = await InventoryItem.findById(inventoryItemId);
        if (!inv) {
            return res.status(404).json({ success: false, message: 'Inventory item not found' });
        }

        const unitCost = inv.unitPrice || 0;

        // 1. Restore stock in Inventory
        const prevQty = inv.quantity;
        inv.quantity = prevQty + retQty;

        inv.stockMovements.push({
            type: 'IN',
            quantity: retQty,
            previousQuantity: prevQty,
            newQuantity: inv.quantity,
            reason: `Return from Project: ${project.title}`,
            reference: `RET-${project._id.toString().substring(18, 24).toUpperCase()}`,
            performedBy: req.user?.name || 'Staff',
            date: new Date()
        });

        await inv.save();

        // 2. Record Material Return movement
        const returnRecord = new MaterialConsumption({
            projectId: project._id,
            projectTitle: project.title,
            jobOrderNumber: project._id.toString().substring(18, 24).toUpperCase(),
            materialRequestId: materialRequestId || null,
            inventoryItemId: inv._id,
            materialName: inv.name,
            category: inv.category,
            specification: inv.notes || '',
            unit: inv.unit,
            movementType: 'RETURN',
            quantity: retQty,
            unitCost,
            totalCost: parseFloat((retQty * unitCost).toFixed(2)),
            date: date ? new Date(date) : new Date(),
            issuedBy: req.user?._id,
            issuedByName: req.user?.name || 'Staff',
            receivedBy: 'Store In-Charge',
            notes: notes || 'Unused material returned to workshop inventory',
            auditTrail: [{
                action: 'RETURNED',
                performedBy: req.user?.name || 'Staff',
                timestamp: new Date(),
                details: `Returned ${retQty} ${inv.unit} back to inventory store. Stock increased from ${prevQty} to ${inv.quantity}.`
            }]
        });

        await returnRecord.save();

        // 3. Update MaterialRequest if linked
        if (materialRequestId) {
            const matReq = await MaterialRequest.findById(materialRequestId);
            if (matReq) {
                const targetItem = matReq.items.find(i => i.inventoryItemId.toString() === inventoryItemId.toString());
                if (targetItem) {
                    targetItem.returnedQty = (targetItem.returnedQty || 0) + retQty;
                    await matReq.save();
                }
            }
        }

        res.json({
            success: true,
            message: `Successfully returned ${retQty} ${inv.unit} of "${inv.name}" back to stock. Current inventory: ${inv.quantity} ${inv.unit}.`,
            returnRecord
        });
    } catch (err) {
        console.error('Error returning material to inventory:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/material-consumption/history
exports.getConsumptionHistory = async (req, res) => {
    try {
        const { projectId, movementType, startDate, endDate } = req.query;
        let query = {};

        if (projectId) query.projectId = projectId;
        if (movementType && movementType !== 'All') query.movementType = movementType;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const history = await MaterialConsumption.find(query)
            .populate('inventoryItemId', 'name code unit unitPrice')
            .populate('projectId', 'title status customerId')
            .sort({ date: -1 });

        res.json({ success: true, count: history.length, history });
    } catch (err) {
        console.error('Error fetching consumption history:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROJECT COSTING & PROFITABILITY ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 */

// GET /api/project-costing
exports.getAllProjectsCosting = async (req, res) => {
    try {
        const projects = await Project.find({ status: { $nin: ['cancelled', 'CANCELLED', 'Cancelled'] } })
            .select('_id title budget status progress customerId deadline createdAt')
            .populate('customerId', 'name phone email')
            .sort({ createdAt: -1 });

        const results = [];
        for (const p of projects) {
            try {
                const costing = await calculateProjectCosting(p._id);
                results.push(costing);
            } catch (calcErr) {
                console.error(`Costing calculation failed for project ${p._id}:`, calcErr);
            }
        }

        res.json({ success: true, count: results.length, projectsCosting: results });
    } catch (err) {
        console.error('Error fetching projects costing:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/project-costing/:projectId
exports.getSingleProjectCosting = async (req, res) => {
    try {
        const costing = await calculateProjectCosting(req.params.projectId);
        res.json({ success: true, costing });
    } catch (err) {
        console.error('Error fetching single project costing:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/project-costing/dashboard/summary
exports.getCostingDashboardSummary = async (req, res) => {
    try {
        // 1. Inventory Valuation
        const inventoryItems = await InventoryItem.find();
        let totalInventoryValue = 0;
        let totalMaterialCount = 0;
        let totalToolCount = 0;

        inventoryItems.forEach(item => {
            if (item.type === 'material') {
                totalMaterialCount += 1;
                totalInventoryValue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
            } else if (item.type === 'tool') {
                totalToolCount += 1;
                totalInventoryValue += Number(item.purchaseCost) || 0;
            }
        });

        // 2. Material Consumption Totals
        const allConsumptions = await MaterialConsumption.find();
        let totalMaterialConsumptionValue = 0;
        let totalWastageQuantity = 0;
        let totalConsumedQuantity = 0;

        allConsumptions.forEach(c => {
            if (c.movementType === 'CONSUMPTION') {
                totalMaterialConsumptionValue += Number(c.totalCost) || 0;
                totalConsumedQuantity += Number(c.quantity) || 0;
            } else if (c.movementType === 'RETURN') {
                totalMaterialConsumptionValue -= Number(c.totalCost) || 0;
            } else if (c.movementType === 'WASTAGE') {
                totalWastageQuantity += Number(c.quantity) || 0;
            }
        });

        totalMaterialConsumptionValue = Math.max(0, parseFloat(totalMaterialConsumptionValue.toFixed(2)));

        // 3. Active Projects Costing & Profitability
        const activeProjects = await Project.find({ 
            status: { $in: ['in-progress', 'In Progress', 'pending', 'Delayed', 'Restarted'] } 
        });

        let totalActiveProjectCosts = 0;
        let totalOutstandingPayments = 0;
        const overrunProjects = [];
        const allCostingList = [];

        for (const p of activeProjects) {
            try {
                const costing = await calculateProjectCosting(p._id);
                totalActiveProjectCosts += costing.actuals.totalCost;
                totalOutstandingPayments += costing.financials.outstandingAmount;
                allCostingList.push(costing);

                if (costing.financials.isCostOverrun || costing.financials.isBudgetWarningTriggered) {
                    overrunProjects.push({
                        id: costing.project.id,
                        title: costing.project.title,
                        budget: costing.financials.approvedProjectValue,
                        actualCost: costing.actuals.totalCost,
                        overrun: costing.financials.costVariance,
                        overrunPct: costing.financials.costUsagePercentage
                    });
                }
            } catch (err) {
                // Ignore single project calculation failure
            }
        }

        // Highest Cost Projects (Top 5)
        const highestCostProjects = [...allCostingList]
            .sort((a, b) => b.actuals.totalCost - a.actuals.totalCost)
            .slice(0, 5)
            .map(c => ({
                id: c.project.id,
                title: c.project.title,
                actualCost: c.actuals.totalCost,
                approvedBudget: c.financials.approvedProjectValue,
                progress: c.project.progress
            }));

        // Most Profitable Projects (Top 5)
        const mostProfitableProjects = [...allCostingList]
            .sort((a, b) => b.actuals.actualProfit - a.actuals.actualProfit)
            .slice(0, 5)
            .map(c => ({
                id: c.project.id,
                title: c.project.title,
                profit: c.actuals.actualProfit,
                profitMargin: c.actuals.actualProfitMargin,
                revenue: c.actuals.recognizedRevenue
            }));

        // Wastage percentage overall
        const totalMaterialsProcessed = totalConsumedQuantity + totalWastageQuantity;
        const overallWastagePercentage = totalMaterialsProcessed > 0 
            ? parseFloat(((totalWastageQuantity / totalMaterialsProcessed) * 100).toFixed(2))
            : 0;

        res.json({
            success: true,
            summary: {
                totalMaterialConsumptionValue,
                inventoryValuation: parseFloat(totalInventoryValue.toFixed(2)),
                totalMaterialItems: totalMaterialCount,
                totalToolItems: totalToolCount,
                totalActiveProjectCosts: parseFloat(totalActiveProjectCosts.toFixed(2)),
                totalOutstandingPayments: parseFloat(totalOutstandingPayments.toFixed(2)),
                budgetOverrunCount: overrunProjects.length,
                overrunProjects,
                highestCostProjects,
                mostProfitableProjects,
                wastageSummary: {
                    totalConsumedQuantity,
                    totalWastageQuantity,
                    overallWastagePercentage
                }
            }
        });
    } catch (err) {
        console.error('Error fetching costing dashboard summary:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/project-costing/reports/wastage
exports.getWastageReports = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        let dateQuery = {};
        if (month) {
            const start = new Date(`${month}-01T00:00:00.000Z`);
            const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
            dateQuery = { date: { $gte: start, $lt: end } };
        }

        const consumptions = await MaterialConsumption.find(dateQuery)
            .populate('projectId', 'title status customerId')
            .populate('inventoryItemId', 'name code unit unitPrice')
            .sort({ date: -1 });

        // Group by project
        const projectMap = new Map();
        consumptions.forEach(c => {
            const pId = c.projectId?._id?.toString() || 'unassigned';
            const pTitle = c.projectId?.title || c.projectTitle || 'General Project';

            if (!projectMap.has(pId)) {
                projectMap.set(pId, {
                    projectId: pId,
                    projectTitle: pTitle,
                    totalIssued: 0,
                    totalConsumed: 0,
                    totalReturned: 0,
                    totalWastage: 0,
                    wastageCost: 0
                });
            }

            const pData = projectMap.get(pId);
            const qty = Number(c.quantity) || 0;
            const cost = Number(c.totalCost) || 0;

            if (c.movementType === 'ISSUE') pData.totalIssued += qty;
            else if (c.movementType === 'CONSUMPTION') pData.totalConsumed += qty;
            else if (c.movementType === 'RETURN') pData.totalReturned += qty;
            else if (c.movementType === 'WASTAGE') {
                pData.totalWastage += qty;
                pData.wastageCost += cost;
            }
        });

        const projectReports = Array.from(projectMap.values()).map(p => {
            const processed = p.totalConsumed + p.totalWastage;
            const wastagePct = processed > 0 ? parseFloat(((p.totalWastage / processed) * 100).toFixed(2)) : 0;
            return {
                ...p,
                wastagePercentage: wastagePct,
                wastageCost: parseFloat(p.wastageCost.toFixed(2))
            };
        });

        res.json({
            success: true,
            month: month || 'all-time',
            count: projectReports.length,
            reports: projectReports
        });
    } catch (err) {
        console.error('Error generating wastage reports:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * INDEPENDENT PROJECT LABOUR COST MANAGEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 */

// GET /api/bom/labour-cost
exports.getAllLabourCosts = async (req, res) => {
    try {
        const { projectId, category, search, startDate, endDate, status } = req.query;
        let query = {};

        if (projectId) query.projectId = projectId;
        if (category && category !== 'All') query.labourCategory = category;
        if (status && status !== 'All') query.status = status;
        else query.status = { $ne: 'Cancelled' };

        if (startDate || endDate) {
            query.workDate = {};
            if (startDate) query.workDate.$gte = new Date(startDate);
            if (endDate) query.workDate.$lte = new Date(endDate);
        }

        if (search) {
            query.$or = [
                { workDescription: { $regex: search, $options: 'i' } },
                { workerName: { $regex: search, $options: 'i' } },
                { projectTitle: { $regex: search, $options: 'i' } },
                { labourCategory: { $regex: search, $options: 'i' } }
            ];
        }

        const labourCosts = await ProjectLabourCost.find(query)
            .populate('projectId', 'title status budget')
            .sort({ workDate: -1, createdAt: -1 });

        const totalAmount = labourCosts.reduce((acc, curr) => acc + (Number(curr.totalAmount) || 0), 0);

        res.json({
            success: true,
            count: labourCosts.length,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            labourCosts
        });
    } catch (err) {
        console.error('Error fetching labour costs:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/bom/labour-cost/:id
exports.getLabourCostById = async (req, res) => {
    try {
        const labourCost = await ProjectLabourCost.findById(req.params.id)
            .populate('projectId')
            .populate('createdBy', 'name email role');

        if (!labourCost) {
            return res.status(404).json({ success: false, message: 'Labour cost record not found' });
        }

        res.json({ success: true, labourCost });
    } catch (err) {
        console.error('Error fetching labour cost details:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/bom/labour-cost
exports.createLabourCost = async (req, res) => {
    try {
        const {
            projectId,
            labourCategory,
            workDescription,
            workerName,
            numberOfWorkers,
            workDate,
            rateType,
            quantity,
            rate,
            totalAmount,
            notes,
            attachmentUrl,
            status
        } = req.body;

        if (!projectId) {
            return res.status(400).json({ success: false, message: 'Project selection is required' });
        }
        if (!labourCategory) {
            return res.status(400).json({ success: false, message: 'Labour category is required' });
        }
        if (!workDescription) {
            return res.status(400).json({ success: false, message: 'Work description is required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const numWorkers = Number(numberOfWorkers) > 0 ? Number(numberOfWorkers) : 1;
        const qty = Number(quantity) || 0;
        const r = Number(rate) || 0;
        let computedTotal = Number(totalAmount);

        if (isNaN(computedTotal) || computedTotal <= 0) {
            if (rateType === 'Fixed Job') {
                computedTotal = r;
            } else {
                computedTotal = qty * r * numWorkers;
            }
        }

        const newLabour = new ProjectLabourCost({
            projectId: project._id,
            projectTitle: project.title,
            jobOrderNumber: project._id.toString().substring(18, 24).toUpperCase(),
            labourCategory,
            workDescription,
            workerName: workerName || '',
            numberOfWorkers: numWorkers,
            workDate: workDate ? new Date(workDate) : new Date(),
            rateType: rateType || 'Daily',
            quantity: qty,
            rate: r,
            totalAmount: parseFloat(computedTotal.toFixed(2)),
            notes: notes || '',
            attachmentUrl: attachmentUrl || '',
            status: status || 'Approved',
            createdBy: req.user?._id,
            createdByName: req.user?.name || 'Staff',
            auditTrail: [{
                action: 'CREATED',
                performedBy: req.user?.name || 'Staff',
                timestamp: new Date(),
                details: `Recorded ₹${computedTotal.toFixed(2)} labour cost (${labourCategory}) for ${numWorkers} worker(s).`
            }]
        });

        await newLabour.save();

        res.status(201).json({
            success: true,
            message: 'Labour cost recorded successfully',
            labourCost: newLabour
        });
    } catch (err) {
        console.error('Error creating labour cost:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/bom/labour-cost/:id
exports.updateLabourCost = async (req, res) => {
    try {
        const labourCost = await ProjectLabourCost.findById(req.params.id);
        if (!labourCost) {
            return res.status(404).json({ success: false, message: 'Labour cost record not found' });
        }

        const {
            labourCategory,
            workDescription,
            workerName,
            numberOfWorkers,
            workDate,
            rateType,
            quantity,
            rate,
            totalAmount,
            notes,
            attachmentUrl,
            status
        } = req.body;

        if (labourCategory) labourCost.labourCategory = labourCategory;
        if (workDescription) labourCost.workDescription = workDescription;
        if (workerName !== undefined) labourCost.workerName = workerName;
        if (numberOfWorkers) labourCost.numberOfWorkers = Number(numberOfWorkers);
        if (workDate) labourCost.workDate = new Date(workDate);
        if (rateType) labourCost.rateType = rateType;
        if (quantity !== undefined) labourCost.quantity = Number(quantity);
        if (rate !== undefined) labourCost.rate = Number(rate);

        if (totalAmount !== undefined && !isNaN(Number(totalAmount))) {
            labourCost.totalAmount = Number(totalAmount);
        } else {
            const numW = labourCost.numberOfWorkers || 1;
            const q = labourCost.quantity || 0;
            const r = labourCost.rate || 0;
            labourCost.totalAmount = labourCost.rateType === 'Fixed Job' ? r : (q * r * numW);
        }

        if (notes !== undefined) labourCost.notes = notes;
        if (attachmentUrl !== undefined) labourCost.attachmentUrl = attachmentUrl;
        if (status) labourCost.status = status;

        labourCost.auditTrail.push({
            action: 'UPDATED',
            performedBy: req.user?.name || 'Staff',
            timestamp: new Date(),
            details: `Updated labour record. New Total: ₹${labourCost.totalAmount}`
        });

        await labourCost.save();

        res.json({
            success: true,
            message: 'Labour cost record updated successfully',
            labourCost
        });
    } catch (err) {
        console.error('Error updating labour cost:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/bom/labour-cost/:id
exports.deleteLabourCost = async (req, res) => {
    try {
        const labourCost = await ProjectLabourCost.findById(req.params.id);
        if (!labourCost) {
            return res.status(404).json({ success: false, message: 'Labour cost record not found' });
        }

        await ProjectLabourCost.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Labour cost record deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting labour cost:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * INDEPENDENT PROJECT TRANSPORT COST MANAGEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 */

// GET /api/bom/transport-cost
exports.getAllTransportCosts = async (req, res) => {
    try {
        const { projectId, transportType, search, startDate, endDate, status } = req.query;
        let query = {};

        if (projectId) query.projectId = projectId;
        if (transportType && transportType !== 'All') query.transportType = transportType;
        if (status && status !== 'All') query.status = status;
        else query.status = { $ne: 'Cancelled' };

        if (startDate || endDate) {
            query.transportDate = {};
            if (startDate) query.transportDate.$gte = new Date(startDate);
            if (endDate) query.transportDate.$lte = new Date(endDate);
        }

        if (search) {
            query.$or = [
                { transportDescription: { $regex: search, $options: 'i' } },
                { vehicleNumber: { $regex: search, $options: 'i' } },
                { driverName: { $regex: search, $options: 'i' } },
                { startingLocation: { $regex: search, $options: 'i' } },
                { destination: { $regex: search, $options: 'i' } },
                { projectTitle: { $regex: search, $options: 'i' } }
            ];
        }

        const transportCosts = await ProjectTransportCost.find(query)
            .populate('projectId', 'title status budget')
            .sort({ transportDate: -1, createdAt: -1 });

        const totalTransportCost = transportCosts.reduce((acc, curr) => acc + (Number(curr.totalTransportCost) || 0), 0);

        res.json({
            success: true,
            count: transportCosts.length,
            totalTransportCost: parseFloat(totalTransportCost.toFixed(2)),
            transportCosts
        });
    } catch (err) {
        console.error('Error fetching transport costs:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/bom/transport-cost/:id
exports.getTransportCostById = async (req, res) => {
    try {
        const transportCost = await ProjectTransportCost.findById(req.params.id)
            .populate('projectId')
            .populate('createdBy', 'name email role');

        if (!transportCost) {
            return res.status(404).json({ success: false, message: 'Transport cost record not found' });
        }

        res.json({ success: true, transportCost });
    } catch (err) {
        console.error('Error fetching transport cost details:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/bom/transport-cost
exports.createTransportCost = async (req, res) => {
    try {
        const {
            projectId,
            transportDate,
            transportType,
            vehicleNumber,
            driverName,
            startingLocation,
            destination,
            transportDescription,
            numberOfTrips,
            freightCharge,
            fuelCharge,
            loadingUnloadingCharge,
            tollCharge,
            otherCharge,
            totalTransportCost,
            notes,
            attachmentUrl,
            status
        } = req.body;

        if (!projectId) {
            return res.status(400).json({ success: false, message: 'Project selection is required' });
        }
        if (!transportType) {
            return res.status(400).json({ success: false, message: 'Transport type is required' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const freight = Number(freightCharge) || 0;
        const fuel = Number(fuelCharge) || 0;
        const loading = Number(loadingUnloadingCharge) || 0;
        const toll = Number(tollCharge) || 0;
        const other = Number(otherCharge) || 0;
        const sum = freight + fuel + loading + toll + other;

        let finalTotal = Number(totalTransportCost);
        if (isNaN(finalTotal) || (finalTotal <= 0 && sum > 0)) {
            finalTotal = sum;
        }

        const newTransport = new ProjectTransportCost({
            projectId: project._id,
            projectTitle: project.title,
            jobOrderNumber: project._id.toString().substring(18, 24).toUpperCase(),
            transportDate: transportDate ? new Date(transportDate) : new Date(),
            transportType,
            vehicleNumber: vehicleNumber || '',
            driverName: driverName || '',
            startingLocation: startingLocation || '',
            destination: destination || '',
            transportDescription: transportDescription || '',
            numberOfTrips: Number(numberOfTrips) > 0 ? Number(numberOfTrips) : 1,
            freightCharge: freight,
            fuelCharge: fuel,
            loadingUnloadingCharge: loading,
            tollCharge: toll,
            otherCharge: other,
            totalTransportCost: parseFloat(finalTotal.toFixed(2)),
            notes: notes || '',
            attachmentUrl: attachmentUrl || '',
            status: status || 'Approved',
            createdBy: req.user?._id,
            createdByName: req.user?.name || 'Staff',
            auditTrail: [{
                action: 'CREATED',
                performedBy: req.user?.name || 'Staff',
                timestamp: new Date(),
                details: `Recorded ₹${finalTotal.toFixed(2)} transport cost (${transportType}).`
            }]
        });

        await newTransport.save();

        res.status(201).json({
            success: true,
            message: 'Transport cost recorded successfully',
            transportCost: newTransport
        });
    } catch (err) {
        console.error('Error creating transport cost:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/bom/transport-cost/:id
exports.updateTransportCost = async (req, res) => {
    try {
        const transportCost = await ProjectTransportCost.findById(req.params.id);
        if (!transportCost) {
            return res.status(404).json({ success: false, message: 'Transport cost record not found' });
        }

        const {
            transportDate,
            transportType,
            vehicleNumber,
            driverName,
            startingLocation,
            destination,
            transportDescription,
            numberOfTrips,
            freightCharge,
            fuelCharge,
            loadingUnloadingCharge,
            tollCharge,
            otherCharge,
            totalTransportCost,
            notes,
            attachmentUrl,
            status
        } = req.body;

        if (transportDate) transportCost.transportDate = new Date(transportDate);
        if (transportType) transportCost.transportType = transportType;
        if (vehicleNumber !== undefined) transportCost.vehicleNumber = vehicleNumber;
        if (driverName !== undefined) transportCost.driverName = driverName;
        if (startingLocation !== undefined) transportCost.startingLocation = startingLocation;
        if (destination !== undefined) transportCost.destination = destination;
        if (transportDescription !== undefined) transportCost.transportDescription = transportDescription;
        if (numberOfTrips) transportCost.numberOfTrips = Number(numberOfTrips);
        if (freightCharge !== undefined) transportCost.freightCharge = Number(freightCharge);
        if (fuelCharge !== undefined) transportCost.fuelCharge = Number(fuelCharge);
        if (loadingUnloadingCharge !== undefined) transportCost.loadingUnloadingCharge = Number(loadingUnloadingCharge);
        if (tollCharge !== undefined) transportCost.tollCharge = Number(tollCharge);
        if (otherCharge !== undefined) transportCost.otherCharge = Number(otherCharge);

        if (totalTransportCost !== undefined && !isNaN(Number(totalTransportCost))) {
            transportCost.totalTransportCost = Number(totalTransportCost);
        } else {
            transportCost.totalTransportCost = transportCost.freightCharge + transportCost.fuelCharge + 
                transportCost.loadingUnloadingCharge + transportCost.tollCharge + transportCost.otherCharge;
        }

        if (notes !== undefined) transportCost.notes = notes;
        if (attachmentUrl !== undefined) transportCost.attachmentUrl = attachmentUrl;
        if (status) transportCost.status = status;

        transportCost.auditTrail.push({
            action: 'UPDATED',
            performedBy: req.user?.name || 'Staff',
            timestamp: new Date(),
            details: `Updated transport record. New Total: ₹${transportCost.totalTransportCost}`
        });

        await transportCost.save();

        res.json({
            success: true,
            message: 'Transport cost record updated successfully',
            transportCost
        });
    } catch (err) {
        console.error('Error updating transport cost:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/bom/transport-cost/:id
exports.deleteTransportCost = async (req, res) => {
    try {
        const transportCost = await ProjectTransportCost.findById(req.params.id);
        if (!transportCost) {
            return res.status(404).json({ success: false, message: 'Transport cost record not found' });
        }

        await ProjectTransportCost.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Transport cost record deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting transport cost:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * COMPLETE PROJECT COST HISTORY (ITEMIZED AUDIT)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// GET /api/bom/project-costing/:projectId/history
exports.getProjectCostHistory = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findById(projectId).populate('customerId', 'name email phone');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // 1. Material Consumptions
        const materials = await MaterialConsumption.find({ projectId: project._id }).sort({ date: -1 });

        // 2. Labour Costs
        const labours = await ProjectLabourCost.find({ 
            projectId: project._id, 
            status: { $ne: 'Cancelled' } 
        }).sort({ workDate: -1 });

        // 3. Transport Costs
        const transports = await ProjectTransportCost.find({ 
            projectId: project._id, 
            status: { $ne: 'Cancelled' } 
        }).sort({ transportDate: -1 });

        // 4. Other Expenses
        const otherExpenses = await Expense.find({ 
            projectId: project._id, 
            type: 'expense' 
        }).sort({ date: -1 });

        // Totals
        let materialCost = 0;
        materials.forEach(m => {
            if (m.movementType === 'CONSUMPTION') materialCost += Number(m.totalCost) || 0;
            else if (m.movementType === 'RETURN') materialCost -= Number(m.totalCost) || 0;
        });
        materialCost = Math.max(0, materialCost);

        const labourCost = labours.reduce((sum, l) => sum + (Number(l.totalAmount) || 0), 0);
        const transportCost = transports.reduce((sum, t) => sum + (Number(t.totalTransportCost) || 0), 0);
        const otherCost = otherExpenses.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

        const totalActualCost = parseFloat((materialCost + labourCost + transportCost + otherCost).toFixed(2));

        // Format unified complete history
        const completeHistory = [];

        materials.forEach(m => {
            completeHistory.push({
                id: m._id,
                costType: 'Material',
                date: m.date,
                title: m.materialName,
                description: `${m.movementType}: ${m.materialName} (${m.specification || m.category})`,
                quantity: m.quantity,
                unit: m.unit,
                rate: m.unitCost,
                amount: m.movementType === 'RETURN' ? -Number(m.totalCost) : Number(m.totalCost),
                createdBy: m.issuedByName || 'Storekeeper',
                status: m.movementType,
                notes: m.notes
            });
        });

        labours.forEach(l => {
            completeHistory.push({
                id: l._id,
                costType: 'Labour',
                date: l.workDate,
                title: `${l.labourCategory} - ${l.workerName || 'Worker Crew'}`,
                description: l.workDescription,
                quantity: l.quantity,
                unit: l.rateType,
                rate: l.rate,
                amount: Number(l.totalAmount),
                createdBy: l.createdByName || 'Supervisor',
                status: l.status,
                notes: l.notes
            });
        });

        transports.forEach(t => {
            completeHistory.push({
                id: t._id,
                costType: 'Transport',
                date: t.transportDate,
                title: `${t.transportType} ${t.vehicleNumber ? `(${t.vehicleNumber})` : ''}`,
                description: t.transportDescription || `Route: ${t.startingLocation || 'Yard'} -> ${t.destination || 'Site'}`,
                quantity: t.numberOfTrips,
                unit: 'Trips',
                rate: t.freightCharge,
                amount: Number(t.totalTransportCost),
                createdBy: t.createdByName || 'Logistics',
                status: t.status,
                notes: t.notes
            });
        });

        otherExpenses.forEach(e => {
            completeHistory.push({
                id: e._id,
                costType: 'Other',
                date: e.date,
                title: e.category || 'Direct Expense',
                description: e.title || e.description || 'Project direct expense',
                quantity: 1,
                unit: 'Item',
                rate: Number(e.amount),
                amount: Number(e.amount),
                createdBy: e.createdByName || 'Accounts',
                status: e.status || 'Paid',
                notes: e.notes || ''
            });
        });

        // Sort unified chronological history by date descending
        completeHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            success: true,
            project: {
                id: project._id,
                title: project.title,
                status: project.status,
                budget: project.budget,
                customer: project.customerId
            },
            summary: {
                materialCost: parseFloat(materialCost.toFixed(2)),
                labourCost: parseFloat(labourCost.toFixed(2)),
                transportCost: parseFloat(transportCost.toFixed(2)),
                otherCost: parseFloat(otherCost.toFixed(2)),
                totalActualCost
            },
            history: {
                materials,
                labours,
                transports,
                otherExpenses,
                completeHistory
            }
        });
    } catch (err) {
        console.error('Error fetching project cost history:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
