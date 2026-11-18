const mongoose = require('mongoose');
const ProductionPlan = require('../models/ProductionPlan');
const Project = require('../models/Project');
const BillOfMaterials = require('../models/BillOfMaterials');
const InventoryItem = require('../models/InventoryItem');
const User = require('../models/User');

/**
 * Helper to detect schedule conflicts for machines and staff
 */
async function detectConflicts(stages, excludePlanId = null) {
    const conflicts = [];
    const activePlans = await ProductionPlan.find({
        _id: { $ne: excludePlanId },
        status: { $in: ['Scheduled', 'In Production'] }
    });

    for (const newStage of stages) {
        if (!newStage.plannedStartDate || !newStage.plannedEndDate) continue;
        const newStart = new Date(newStage.plannedStartDate).getTime();
        const newEnd = new Date(newStage.plannedEndDate).getTime();

        for (const existingPlan of activePlans) {
            for (const existStage of existingPlan.stages) {
                if (['Completed', 'Cancelled'].includes(existStage.status)) continue;
                if (!existStage.plannedStartDate || !existStage.plannedEndDate) continue;

                const exStart = new Date(existStage.plannedStartDate).getTime();
                const exEnd = new Date(existStage.plannedEndDate).getTime();

                // Overlap check
                const isOverlapping = (newStart <= exEnd && newEnd >= exStart);
                if (!isOverlapping) continue;

                // Machine overlap
                if (newStage.machineId && existStage.machineId && String(newStage.machineId) === String(existStage.machineId)) {
                    conflicts.push({
                        type: 'MACHINE_CONFLICT',
                        entityId: String(newStage.machineId),
                        entityName: newStage.machineName || existStage.machineName || 'Machinery',
                        conflictingPlanNumber: existingPlan.planNumber,
                        stageName: `${newStage.stageName} overlaps with ${existStage.stageName}`,
                        overlapStart: new Date(Math.max(newStart, exStart)),
                        overlapEnd: new Date(Math.min(newEnd, exEnd))
                    });
                }

                // Staff overlap
                const newStaffIds = (newStage.assignedStaff || []).map(s => String(s.staffId || s));
                const exStaffIds = (existStage.assignedStaff || []).map(s => String(s.staffId || s));
                for (const sId of newStaffIds) {
                    if (exStaffIds.includes(sId)) {
                        const staffMember = (newStage.assignedStaff || []).find(s => String(s.staffId || s) === sId);
                        conflicts.push({
                            type: 'STAFF_CONFLICT',
                            entityId: sId,
                            entityName: staffMember?.name || 'Assigned Staff',
                            conflictingPlanNumber: existingPlan.planNumber,
                            stageName: `${newStage.stageName} overlaps with ${existStage.stageName}`,
                            overlapStart: new Date(Math.max(newStart, exStart)),
                            overlapEnd: new Date(Math.min(newEnd, exEnd))
                        });
                    }
                }
            }
        }
    }
    return conflicts;
}

// ─── LIST PRODUCTION PLANS ──────────────────────────────────────────
exports.getProductionPlans = async (req, res) => {
    try {
        const { status, priority, search, delayOnly, projectId } = req.query;
        const query = {};

        if (status && status !== 'All') query.status = status;
        if (priority && priority !== 'All') query.priority = priority;
        if (projectId) query.projectId = projectId;

        if (delayOnly === 'true') {
            query.$or = [
                { status: 'Delayed' },
                { 'stages.status': 'Delayed' },
                { plannedCompletionDate: { $lt: new Date() }, status: { $nin: ['Completed', 'Cancelled'] } }
            ];
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { planNumber: regex },
                { title: regex },
                { projectTitle: regex },
                { jobOrderNumber: regex },
                { customerName: regex }
            ];
        }

        const plans = await ProductionPlan.find(query)
            .populate('projectId', 'title status deadline customerId')
            .populate('bomId', 'jobOrderNumber totalMaterialCost')
            .sort({ createdAt: -1 });

        // Auto-detect delays dynamically
        const now = new Date();
        const updatedPlans = plans.map(p => {
            const isOverdue = p.plannedCompletionDate < now && !['Completed', 'Cancelled'].includes(p.status);
            return {
                ...p.toObject(),
                isOverdue
            };
        });

        res.json({ success: true, count: updatedPlans.length, plans: updatedPlans });
    } catch (err) {
        console.error('getProductionPlans error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── GET SINGLE PLAN ────────────────────────────────────────────────
exports.getProductionPlanById = async (req, res) => {
    try {
        const plan = await ProductionPlan.findById(req.params.id)
            .populate('projectId')
            .populate('bomId')
            .populate('stages.machineId', 'name code brand status')
            .populate('stages.assignedStaff.staffId', 'name email phone role');

        if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });
        res.json({ success: true, plan });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── CREATE PRODUCTION PLAN ─────────────────────────────────────────
exports.createProductionPlan = async (req, res) => {
    try {
        const {
            title,
            description,
            projectId,
            jobOrderNumber,
            bomId,
            priority = 'Medium',
            totalPlannedQuantity = 1,
            unit = 'pcs',
            plannedStartDate,
            plannedCompletionDate,
            stages = [],
            notes
        } = req.body;

        if (!title || !projectId || !plannedStartDate || !plannedCompletionDate) {
            return res.status(400).json({ success: false, message: 'Title, project, start date, and completion date are required.' });
        }

        const project = await Project.findById(projectId).populate('customerId', 'name');
        if (!project) return res.status(404).json({ success: false, message: 'Linked project not found.' });

        const planNumber = `PP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        // Conflict check
        const conflicts = await detectConflicts(stages);

        const newPlan = new ProductionPlan({
            planNumber,
            title,
            description,
            projectId: project._id,
            projectTitle: project.title,
            jobOrderNumber: jobOrderNumber || project.title,
            bomId: bomId || null,
            customerId: project.customerId?._id || null,
            customerName: project.customerId?.name || 'Client',
            priority,
            status: 'Scheduled',
            totalPlannedQuantity: parseFloat(totalPlannedQuantity) || 1,
            unit,
            plannedStartDate: new Date(plannedStartDate),
            plannedCompletionDate: new Date(plannedCompletionDate),
            stages: stages.map((s, idx) => ({
                ...s,
                sequence: s.sequence || (idx + 1),
                status: s.status || 'Pending'
            })),
            hasConflicts: conflicts.length > 0,
            conflictDetails: conflicts,
            createdBy: req.user?._id,
            createdByName: req.user?.name || 'Production Supervisor',
            notes: notes || ''
        });

        await newPlan.save();
        res.status(201).json({ success: true, message: 'Production plan created successfully', plan: newPlan, conflicts });
    } catch (err) {
        console.error('createProductionPlan error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── UPDATE PRODUCTION PLAN ─────────────────────────────────────────
exports.updateProductionPlan = async (req, res) => {
    try {
        const plan = await ProductionPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });

        const {
            title,
            description,
            priority,
            status,
            totalPlannedQuantity,
            totalCompletedQuantity,
            plannedStartDate,
            plannedCompletionDate,
            stages,
            notes
        } = req.body;

        if (title) plan.title = title;
        if (description !== undefined) plan.description = description;
        if (priority) plan.priority = priority;
        if (status) plan.status = status;
        if (totalPlannedQuantity !== undefined) plan.totalPlannedQuantity = parseFloat(totalPlannedQuantity);
        if (totalCompletedQuantity !== undefined) plan.totalCompletedQuantity = parseFloat(totalCompletedQuantity);
        if (plannedStartDate) plan.plannedStartDate = new Date(plannedStartDate);
        if (plannedCompletionDate) plan.plannedCompletionDate = new Date(plannedCompletionDate);
        if (notes !== undefined) plan.notes = notes;

        if (stages && Array.isArray(stages)) {
            plan.stages = stages;
            // Re-check conflicts
            const conflicts = await detectConflicts(stages, plan._id);
            plan.hasConflicts = conflicts.length > 0;
            plan.conflictDetails = conflicts;
        }

        // Auto-calc overall completed quantity from final stage if completed
        if (plan.stages && plan.stages.length > 0) {
            const lastStage = plan.stages[plan.stages.length - 1];
            if (lastStage && lastStage.completedQuantity > 0) {
                plan.totalCompletedQuantity = lastStage.completedQuantity;
            }
            const allCompleted = plan.stages.every(s => s.status === 'Completed');
            if (allCompleted && plan.status !== 'Completed') {
                plan.status = 'Completed';
                plan.actualCompletionDate = new Date();
            }
        }

        await plan.save();
        res.json({ success: true, message: 'Production plan updated successfully', plan });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── RESCHEDULE PLAN OR STAGE ───────────────────────────────────────
exports.reschedulePlan = async (req, res) => {
    try {
        const plan = await ProductionPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });

        const { stageId, newStartDate, newEndDate, reason } = req.body;

        if (!newStartDate || !newEndDate) {
            return res.status(400).json({ success: false, message: 'New start and end dates are required.' });
        }

        if (stageId) {
            const stage = plan.stages.id(stageId);
            if (!stage) return res.status(404).json({ success: false, message: 'Stage not found.' });

            stage.plannedStartDate = new Date(newStartDate);
            stage.plannedEndDate = new Date(newEndDate);
            stage.delayReason = reason || 'Rescheduled by Production Manager';
            if (new Date(newEndDate) > plan.plannedCompletionDate) {
                plan.plannedCompletionDate = new Date(newEndDate);
            }
        } else {
            plan.plannedStartDate = new Date(newStartDate);
            plan.plannedCompletionDate = new Date(newEndDate);
            plan.notes = (plan.notes ? plan.notes + ' | ' : '') + `Rescheduled on ${new Date().toLocaleDateString()}: ${reason || 'Timeline revision'}`;
        }

        const conflicts = await detectConflicts(plan.stages, plan._id);
        plan.hasConflicts = conflicts.length > 0;
        plan.conflictDetails = conflicts;

        await plan.save();
        res.json({ success: true, message: 'Rescheduled successfully', plan, conflicts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── RECORD STAGE PROGRESS ──────────────────────────────────────────
exports.recordStageProgress = async (req, res) => {
    try {
        const plan = await ProductionPlan.findById(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: 'Production plan not found' });

        const stage = plan.stages.id(req.params.stageId);
        if (!stage) return res.status(404).json({ success: false, message: 'Stage not found' });

        const {
            quantityProduced = 0,
            hoursSpent = 0,
            status,
            qcStatus,
            delayReason,
            notes
        } = req.body;

        if (quantityProduced) {
            stage.completedQuantity = (stage.completedQuantity || 0) + parseFloat(quantityProduced);
        }
        if (status) {
            stage.status = status;
            if (status === 'In Progress' && !stage.actualStartDate) stage.actualStartDate = new Date();
            if (status === 'Completed') stage.actualEndDate = new Date();
        }
        if (qcStatus) stage.qcStatus = qcStatus;
        if (delayReason) stage.delayReason = delayReason;
        if (notes) stage.notes = notes;

        stage.logs.push({
            timestamp: new Date(),
            recordedBy: req.user?.name || 'Supervisor',
            quantityProduced: parseFloat(quantityProduced) || 0,
            hoursSpent: parseFloat(hoursSpent) || 0,
            notes: notes || ''
        });

        // If this is the final stage, update overall completed quantity
        const isFinalStage = String(plan.stages[plan.stages.length - 1]._id) === String(stage._id);
        if (isFinalStage) {
            plan.totalCompletedQuantity = stage.completedQuantity;
        }

        // If all stages completed
        if (plan.stages.every(s => s.status === 'Completed')) {
            plan.status = 'Completed';
            plan.actualCompletionDate = new Date();
        } else if (plan.status === 'Draft' || plan.status === 'Scheduled') {
            plan.status = 'In Production';
            if (!plan.actualStartDate) plan.actualStartDate = new Date();
        }

        await plan.save();
        res.json({ success: true, message: 'Stage progress updated', plan });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── CALENDAR / GANTT TIMELINE FEED ─────────────────────────────────
exports.getProductionCalendar = async (req, res) => {
    try {
        const plans = await ProductionPlan.find({
            status: { $nin: ['Cancelled'] }
        }).sort({ plannedStartDate: 1 });

        const calendarEvents = [];
        plans.forEach(plan => {
            // Overall plan event
            calendarEvents.push({
                id: `plan-${plan._id}`,
                planId: plan._id,
                planNumber: plan.planNumber,
                title: `${plan.planNumber}: ${plan.title}`,
                start: plan.plannedStartDate,
                end: plan.plannedCompletionDate,
                priority: plan.priority,
                status: plan.status,
                type: 'PLAN',
                hasConflicts: plan.hasConflicts
            });

            // Individual stage events
            (plan.stages || []).forEach(st => {
                calendarEvents.push({
                    id: `stage-${st._id}`,
                    planId: plan._id,
                    planNumber: plan.planNumber,
                    stageId: st._id,
                    title: `[${plan.planNumber}] ${st.stageName} (${st.completedQuantity}/${st.plannedQuantity} ${st.unit})`,
                    start: st.plannedStartDate,
                    end: st.plannedEndDate,
                    machine: st.machineName,
                    staff: (st.assignedStaff || []).map(s => s.name).join(', '),
                    status: st.status,
                    type: 'STAGE'
                });
            });
        });

        res.json({ success: true, events: calendarEvents });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── PRODUCTION SUMMARY & REPORTS ───────────────────────────────────
exports.getProductionReports = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalPlans = await ProductionPlan.countDocuments();
        const activePlans = await ProductionPlan.countDocuments({ status: { $in: ['Scheduled', 'In Production'] } });
        const completedPlans = await ProductionPlan.countDocuments({ status: 'Completed' });
        const delayedPlans = await ProductionPlan.countDocuments({
            $or: [
                { status: 'Delayed' },
                { 'stages.status': 'Delayed' },
                { plannedCompletionDate: { $lt: now }, status: { $nin: ['Completed', 'Cancelled'] } }
            ]
        });

        // Stage breakdown
        const allActivePlans = await ProductionPlan.find({ status: { $in: ['Scheduled', 'In Production', 'Delayed'] } });
        let totalPlannedQty = 0;
        let totalCompletedQty = 0;
        const stageStatusCounts = { Pending: 0, 'In Progress': 0, Completed: 0, Delayed: 0, Blocked: 0 };

        allActivePlans.forEach(p => {
            totalPlannedQty += (p.totalPlannedQuantity || 0);
            totalCompletedQty += (p.totalCompletedQuantity || 0);
            (p.stages || []).forEach(s => {
                stageStatusCounts[s.status] = (stageStatusCounts[s.status] || 0) + 1;
            });
        });

        res.json({
            success: true,
            summary: {
                totalPlans,
                activePlans,
                completedPlans,
                delayedPlans,
                totalPlannedQty,
                totalCompletedQty,
                throughputPercentage: totalPlannedQty > 0 ? Math.round((totalCompletedQty / totalPlannedQty) * 100) : 0,
                stageStatusCounts
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
