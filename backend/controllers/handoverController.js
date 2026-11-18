const Project = require('../models/Project');
const DocumentHistory = require('../models/DocumentHistory');
const AdminNotification = require('../models/AdminNotification');
const socketUtil = require('../utils/socket');

// 1. Get Project Handover & Checklist Details
exports.getHandoverDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findById(id)
            .populate('customerId', 'name email phone companyName address')
            .populate('assignedStaff', 'name email role phone');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        return res.json({
            success: true,
            handover: project.handover || {},
            project: {
                _id: project._id,
                title: project.title,
                serviceType: project.serviceType,
                status: project.status,
                clientName: project.clientName || project.customerId?.name,
                customer: project.customerId,
                assignedStaff: project.assignedStaff,
                deadline: project.deadline,
                progress: project.progress,
                budget: project.budget,
                milestones: project.milestones || []
            }
        });
    } catch (err) {
        console.error('Error fetching handover details:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching handover details.', error: err.message });
    }
};

// 2. Request Project Handover (Staff / Project Manager)
exports.requestHandover = async (req, res) => {
    try {
        const { id } = req.params;
        const { handoverNotes, pendingWorkNotes, finalPhotos } = req.body;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        if (project.handover && project.handover.status === 'Completed') {
            return res.status(400).json({ success: false, message: 'Project handover is already completed and certified.' });
        }

        project.handover = project.handover || {};
        project.handover.status = 'Pending Approval';
        project.handover.requestedBy = req.user.id;
        project.handover.requestedByName = req.user.name || 'Project Manager';
        project.handover.requestedAt = new Date();
        project.handover.handoverNotes = handoverNotes || project.handover.handoverNotes || '';
        project.handover.pendingWorkNotes = pendingWorkNotes || '';
        if (Array.isArray(finalPhotos) && finalPhotos.length > 0) {
            project.handover.finalPhotos = finalPhotos;
        }

        // Add milestone audit log
        project.milestoneActivity.push({
            action: 'HANDOVER_REQUESTED',
            timestamp: new Date(),
            performedBy: req.user.name || 'Project Lead',
            performedById: req.user.id,
            notes: `Formal project handover requested. Notes: ${handoverNotes || 'None'}`
        });

        await project.save();

        // Broadcast alert to admin
        try {
            const notif = await AdminNotification.create({
                type: 'PROJECT_ALERT',
                title: `Project Handover Requested: ${project.title}`,
                message: `Formal handover approval requested by ${req.user.name}. Quality inspection & checklist verification required.`,
                priority: 'high',
                metadata: { projectId: project._id }
            });
            socketUtil.emitToAdmin('admin-notification', notif);
        } catch (nErr) {}

        return res.json({
            success: true,
            message: 'Project handover initiated and submitted for final administrative approval.',
            handover: project.handover
        });
    } catch (err) {
        console.error('Error requesting handover:', err);
        return res.status(500).json({ success: false, message: 'Server error requesting handover.', error: err.message });
    }
};

// 3. Update Handover Completion Checklist
exports.updateChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            checklist,
            qualityInspectionStatus,
            pendingWorkNotes,
            deliveryVerificationNotes,
            handoverNotes,
            finalPhotos
        } = req.body;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        project.handover = project.handover || {};
        project.handover.checklist = project.handover.checklist || {};

        if (checklist) {
            Object.keys(checklist).forEach(key => {
                if (typeof checklist[key] === 'boolean') {
                    project.handover.checklist[key] = checklist[key];
                }
            });
        }

        if (qualityInspectionStatus) project.handover.qualityInspectionStatus = qualityInspectionStatus;
        if (pendingWorkNotes !== undefined) project.handover.pendingWorkNotes = pendingWorkNotes;
        if (deliveryVerificationNotes !== undefined) project.handover.deliveryVerificationNotes = deliveryVerificationNotes;
        if (handoverNotes !== undefined) project.handover.handoverNotes = handoverNotes;
        if (Array.isArray(finalPhotos)) project.handover.finalPhotos = finalPhotos;

        await project.save();

        return res.json({
            success: true,
            message: 'Handover checklist and verification items updated.',
            handover: project.handover
        });
    } catch (err) {
        console.error('Error updating handover checklist:', err);
        return res.status(500).json({ success: false, message: 'Server error updating checklist.', error: err.message });
    }
};

// 4. Record Customer Acceptance & Feedback
exports.recordCustomerAcceptance = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comments, acceptedBy, signatureUrl } = req.body;

        const project = await Project.findById(id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        project.handover = project.handover || {};
        project.handover.customerFeedback = {
            rating: Number(rating) || 5,
            comments: comments || 'Work inspected and fully accepted per specifications.',
            acceptedBy: acceptedBy || req.user.name || 'Client Representative',
            acceptanceDate: new Date(),
            signatureUrl: signatureUrl || ''
        };

        project.handover.checklist = project.handover.checklist || {};
        project.handover.checklist.customerAcceptanceReceived = true;
        project.handover.checklist.customerInspectionCompleted = true;

        project.milestoneActivity.push({
            action: 'CUSTOMER_ACCEPTANCE_RECORDED',
            timestamp: new Date(),
            performedBy: acceptedBy || req.user.name || 'Client',
            performedById: req.user.id,
            notes: `Customer signed off with rating ${rating || 5}/5. Comments: ${comments || 'None'}`
        });

        await project.save();

        return res.json({
            success: true,
            message: 'Customer acceptance and satisfaction feedback recorded successfully.',
            handover: project.handover
        });
    } catch (err) {
        console.error('Error recording customer acceptance:', err);
        return res.status(500).json({ success: false, message: 'Server error recording customer acceptance.', error: err.message });
    }
};

// 5. Approve Handover & Issue Completion Certificate (Admin / Authorized Engineer)
exports.approveHandover = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvalNotes, handoverDate } = req.body;

        const project = await Project.findById(id).populate('customerId', 'name email companyName');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        project.handover = project.handover || {};
        const chk = project.handover.checklist || {};

        // Validation: Verify mandatory completion criteria
        const incompleteItems = [];
        if (!chk.fabricationCompleted) incompleteItems.push('Fabrication Work Completed');
        if (!chk.qualityInspectionPassed) incompleteItems.push('Quality Inspection Passed');
        if (!chk.defectsResolved) incompleteItems.push('Pending Defects Resolved');
        if (!chk.deliveryCompleted) incompleteItems.push('Delivery / Erection Completed');

        if (incompleteItems.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot approve handover. Incomplete requirements: ${incompleteItems.join(', ')}.`
            });
        }

        // Generate unique Certificate Number: KEC-CERT-YYYY-XXXX
        const year = new Date().getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const certNumber = `KEC-CERT-${year}-${rand}`;

        project.handover.status = 'Completed';
        project.handover.approvedBy = req.user.id;
        project.handover.approvedByName = req.user.name || 'Chief Technical Officer';
        project.handover.approvedAt = new Date();
        project.handover.handoverDate = handoverDate ? new Date(handoverDate) : new Date();
        if (approvalNotes) project.handover.handoverNotes = approvalNotes;
        project.handover.certificateNumber = certNumber;
        project.handover.certificateIssuedAt = new Date();

        // Update overall Project Status to Completed
        project.status = 'Completed';
        project.progress = 100;

        // Auto-register in DocumentHistory for permanent retrieval
        try {
            const doc = await DocumentHistory.create({
                documentType: 'Project Completion Certificate',
                title: `Project Completion Certificate - ${project.title}`,
                documentNumber: certNumber,
                customerId: project.customerId?._id || project.customerId || null,
                projectId: project._id,
                fileUrl: '', // generated client-side/server-side
                fileName: `${certNumber}_Completion_Certificate.pdf`,
                tags: ['Handover', 'Completion Certificate', 'Sign-Off'],
                accessRoles: ['admin', 'manager', 'staff', 'customer'],
                createdBy: req.user.id,
                createdByName: req.user.name || 'Admin',
                data: {
                    certificateNumber: certNumber,
                    projectTitle: project.title,
                    clientName: project.clientName || project.customerId?.name,
                    handoverDate: project.handover.handoverDate,
                    checklist: chk,
                    rating: project.handover.customerFeedback?.rating || 5
                },
                status: 'Approved',
                approvalStatus: 'Approved'
            });
            project.handover.documentHistoryId = doc._id;
        } catch (dErr) {
            console.error('Non-critical DocumentHistory error:', dErr.message);
        }

        project.milestoneActivity.push({
            action: 'PROJECT_HANDOVER_COMPLETED',
            timestamp: new Date(),
            performedBy: req.user.name || 'Admin',
            performedById: req.user.id,
            notes: `Project certified as fully handed over and completed. Certificate: ${certNumber}`
        });

        await project.save();

        // Broadcast notifications
        try {
            const notif = await AdminNotification.create({
                type: 'PROJECT_ALERT',
                title: `Project Completed & Handed Over: ${project.title}`,
                message: `Certificate ${certNumber} issued. Client: ${project.clientName || 'Valued Client'}.`,
                priority: 'high',
                metadata: { projectId: project._id, certificateNumber: certNumber }
            });
            socketUtil.emitToAdmin('admin-notification', notif);
            socketUtil.emitToStaff('staff-notification', {
                type: 'PROJECT_COMPLETED',
                projectId: project._id,
                title: project.title,
                certificateNumber: certNumber
            });
        } catch (nErr) {}

        return res.json({
            success: true,
            message: `Project handover approved successfully! Certificate ${certNumber} generated.`,
            certificateNumber: certNumber,
            handover: project.handover,
            projectStatus: project.status
        });
    } catch (err) {
        console.error('Error approving handover:', err);
        return res.status(500).json({ success: false, message: 'Server error approving handover.', error: err.message });
    }
};
