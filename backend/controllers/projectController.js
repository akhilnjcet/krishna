const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const crypto = require('crypto');
const { sendProgressUpdate } = require('../services/whatsappService');
const { 
    sendProjectAssignmentEmail, 
    sendProjectTimelineUpdateEmail 
} = require('../services/emailService');

const analyzeTimelineChanges = (oldTimeline = [], newTimeline = [], currentDeadline = null) => {
    const changes = {
        hasChanges: false,
        newMilestones: [],
        completedMilestones: [],
        delayedMilestones: [],
        modifiedMilestones: [],
        upcomingMilestones: [],
        previousLatestDate: null,
        newLatestDate: null,
        deadlineRevised: false
    };

    const oldMap = new Map();
    oldTimeline.forEach((m, idx) => {
        const key = m._id ? m._id.toString() : (m.title ? m.title.trim().toLowerCase() : `idx_${idx}`);
        oldMap.set(key, m);
    });

    const now = new Date();

    newTimeline.forEach((newM, idx) => {
        const key = newM._id ? newM._id.toString() : (newM.title ? newM.title.trim().toLowerCase() : `idx_${idx}`);
        const oldM = oldMap.get(key);

        const newDate = newM.date ? new Date(newM.date) : null;
        const oldDate = oldM && oldM.date ? new Date(oldM.date) : null;

        if (newM.status === 'Pending' && newDate && newDate >= now) {
            changes.upcomingMilestones.push(newM);
        }

        if (!oldM) {
            changes.hasChanges = true;
            changes.newMilestones.push(newM);
            if (newM.status === 'Completed') {
                changes.completedMilestones.push(newM);
            }
        } else {
            const statusChanged = oldM.status !== newM.status;
            const dateChanged = oldDate && newDate && oldDate.toISOString().split('T')[0] !== newDate.toISOString().split('T')[0];
            const descChanged = (oldM.description || '').trim() !== (newM.description || '').trim();
            const titleChanged = (oldM.title || '').trim() !== (newM.title || '').trim();

            if (statusChanged || dateChanged || descChanged || titleChanged) {
                changes.hasChanges = true;
                changes.modifiedMilestones.push({
                    title: newM.title,
                    oldDate: oldDate ? oldDate.toISOString().split('T')[0] : 'N/A',
                    newDate: newDate ? newDate.toISOString().split('T')[0] : 'N/A',
                    oldStatus: oldM.status,
                    newStatus: newM.status
                });
            }

            if (newM.status === 'Completed' && oldM.status !== 'Completed') {
                changes.completedMilestones.push(newM);
            }

            if (dateChanged && newDate && oldDate && newDate > oldDate) {
                changes.delayedMilestones.push({
                    title: newM.title,
                    previousDate: oldDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    revisedDate: newDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                });
            } else if (newM.status === 'Pending' && newDate && newDate < now) {
                changes.delayedMilestones.push({
                    title: newM.title,
                    previousDate: newDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                    revisedDate: 'Overdue / Pending Action'
                });
            }
        }
    });

    if (oldTimeline.length > 0 && newTimeline.length < oldTimeline.length) {
        changes.hasChanges = true;
    }

    const getLatestDate = (arr) => {
        let max = null;
        arr.forEach(m => {
            if (m.date) {
                const d = new Date(m.date);
                if (!max || d > max) max = d;
            }
        });
        return max;
    };

    changes.previousLatestDate = getLatestDate(oldTimeline);
    changes.newLatestDate = getLatestDate(newTimeline) || (currentDeadline ? new Date(currentDeadline) : null);

    if (changes.previousLatestDate && changes.newLatestDate) {
        if (changes.previousLatestDate.toISOString().split('T')[0] !== changes.newLatestDate.toISOString().split('T')[0]) {
            changes.deadlineRevised = true;
            changes.hasChanges = true;
        }
    }

    return changes;
};

exports.createProject = async (req, res) => {
    try {
        const { title, customerId, serviceType } = req.body;
        
        if (!title || !customerId || !serviceType) {
            return res.status(400).json({ 
                message: "Title, Customer ID, and Service Type are required." 
            });
        }

        const project = new Project(req.body);
        const savedProject = await project.save();
        
        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        await recalculateProjectPaymentStatus(savedProject._id);
        
        console.log(`✅ Project Created: ${savedProject.title}`);

        // Automatically send Project Assignment Email to the client
        let emailNotification = { sent: false, skipped: false };
        try {
            const customer = await User.findById(savedProject.customerId);
            if (customer && customer.email) {
                let staffNames = [];
                if (savedProject.assignedStaff && savedProject.assignedStaff.length > 0) {
                    const staffMembers = await User.find({ _id: { $in: savedProject.assignedStaff } });
                    staffNames = staffMembers.map(s => s.designation ? `${s.name} (${s.designation})` : s.name);
                }

                const emailResult = await sendProjectAssignmentEmail({
                    clientEmail: customer.email,
                    clientName: customer.name,
                    project: savedProject,
                    assignedStaffNames: staffNames,
                    portalUrl: process.env.FRONTEND_URL
                });

                if (emailResult.success) {
                    await Project.findByIdAndUpdate(savedProject._id, { lastAssignmentEmailSentAt: new Date() });
                    emailNotification = { sent: true, recipient: customer.email };
                } else {
                    emailNotification = { sent: false, error: emailResult.error };
                }
            } else {
                emailNotification = { sent: false, error: 'Customer not found or has no email address' };
            }
        } catch (emailErr) {
            console.error('Project assignment email dispatch exception:', emailErr.message);
            emailNotification = { sent: false, error: emailErr.message };
        }

        res.status(201).json({
            ...savedProject.toObject(),
            emailNotification
        });
    } catch (error) {
        console.error('❌ Project Creation Error:', error);
        res.status(500).json({ 
            message: error.message,
            tip: "Check if Customer ID is a valid MongoDB ID"
        });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const filter = {};
        if (req.user.role === 'customer') {
            filter.customerId = req.user.id;
        } else if (req.user.role === 'staff') {
            filter.assignedStaff = req.user.id;
        }

        // Status filtering (Requirement 5 & 8)
        if (req.query.status && req.query.status !== 'all') {
            const st = req.query.status.toLowerCase();
            if (st === 'cancelled') {
                filter.status = { $in: ['cancelled', 'CANCELLED', 'Cancelled'] };
            } else if (st === 'in-progress' || st === 'in progress') {
                filter.status = { $in: ['in-progress', 'In Progress'] };
            } else if (st === 'delayed') {
                filter.status = 'Delayed';
            } else if (st === 'completed') {
                filter.status = { $in: ['completed', 'Completed'] };
            } else {
                filter.status = new RegExp(`^${req.query.status}$`, 'i');
            }
        }

        // Search filtering across title, ID, client, staff, serviceType (Requirement 3 & 8)
        if (req.query.search && req.query.search.trim()) {
            const query = req.query.search.trim();
            const regex = new RegExp(query, 'i');

            // Find matching customer or staff IDs
            const matchedUsers = await User.find({
                $or: [{ name: regex }, { email: regex }]
            }).select('_id');
            const userIds = matchedUsers.map(u => u._id);

            const searchConditions = [
                { title: regex },
                { serviceType: regex },
                { description: regex },
                { status: regex },
                { customerId: { $in: userIds } },
                { assignedStaff: { $in: userIds } }
            ];

            // If query is a valid 24-character hex ObjectId
            if (mongoose.Types.ObjectId.isValid(query) && query.length === 24) {
                searchConditions.push({ _id: new mongoose.Types.ObjectId(query) });
            }

            if (filter.$or) {
                filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
                delete filter.$or;
            } else {
                filter.$or = searchConditions;
            }
        }

        // Sorting options (Requirement 4 & 8)
        let sortOption = { createdAt: -1 };
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'createdAt-asc':
                    sortOption = { createdAt: 1 };
                    break;
                case 'createdAt-desc':
                    sortOption = { createdAt: -1 };
                    break;
                case 'title-asc':
                    sortOption = { title: 1 };
                    break;
                case 'title-desc':
                    sortOption = { title: -1 };
                    break;
                case 'budget-asc':
                    sortOption = { budget: 1 };
                    break;
                case 'budget-desc':
                    sortOption = { budget: -1 };
                    break;
                case 'deadline-asc':
                    sortOption = { deadline: 1 };
                    break;
                case 'deadline-desc':
                    sortOption = { deadline: -1 };
                    break;
                case 'status-asc':
                    sortOption = { status: 1 };
                    break;
                default:
                    sortOption = { createdAt: -1 };
            }
        }

        const projects = await Project.find(filter)
            .populate('customerId', 'name email phone')
            .populate('assignedStaff', 'name email designation phone')
            .populate('cancelledBy', 'name email')
            .sort(sortOption);

        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const existingProject = await Project.findById(req.params.id);
        if (!existingProject) return res.status(404).json({ message: 'Project not found' });

        // If staff, verify assignment and restrict editable fields
        if (req.user.role === 'staff') {
            const isAssigned = existingProject.assignedStaff.some(s => s.toString() === req.user.id);
            if (!isAssigned) {
                return res.status(403).json({ message: 'Access denied: You are not assigned to this project.' });
            }
            // Staff can only update operational fields
            const allowedFields = ['progress', 'status', 'updateNotes', 'nextNotes'];
            Object.keys(req.body).forEach(key => {
                if (!allowedFields.includes(key)) {
                    delete req.body[key];
                }
            });
        }

        const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('customerId');
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Recalculate payment status in case budget, discount, or advancePaid changed
        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        const updatedProject = await recalculateProjectPaymentStatus(project._id);
        const finalProject = updatedProject ? await Project.findById(project._id).populate('customerId') : project;

        // If progress or status is updated, notify customer
        if (req.body.progress !== undefined || req.body.status !== undefined) {
            sendProgressUpdate(finalProject, {
                progress: finalProject.progress,
                todayWork: req.body.updateNotes || 'Project status updated.',
                nextWork: req.body.nextNotes || 'Check dashboard for details.'
            }).catch(err => console.error('WhatsApp Error:', err));
        }

        res.json(finalProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });
        res.json({ message: 'Project removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Safe Project Cancellation with Permanent Audit History (Requirements 1, 2, 6, 8, 9)
exports.cancelProject = async (req, res) => {
    try {
        const { reason } = req.body;
        if (!reason || !reason.trim() || reason.trim().length < 3) {
            return res.status(400).json({ 
                message: "A mandatory cancellation reason is required (minimum 3 characters)." 
            });
        }

        const project = await Project.findById(req.params.id)
            .populate('customerId', 'name email phone')
            .populate('assignedStaff', 'name email designation');
            
        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        // Prevent accidental duplicate cancellation (Requirement 6)
        const isAlreadyCancelled = ['cancelled', 'CANCELLED', 'Cancelled'].includes(project.status);
        if (isAlreadyCancelled) {
            return res.status(400).json({ 
                message: "Project is already cancelled. Accidental duplicate cancellation is prevented.",
                cancelledAt: project.cancelledAt,
                cancelledByName: project.cancelledByName || 'Administrator',
                reason: project.cancellationReason
            });
        }

        // Check payment records (Requirement 6: preserve all payments without deleting or auto-refunding)
        const Payment = require('../models/Payment');
        const projectPayments = await Payment.find({ projectId: project._id });
        const totalPaidAmount = projectPayments
            .filter(p => p.status === 'Completed' || p.status === 'Verified')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        const previousStatus = project.status || 'pending';
        const now = new Date();
        const adminId = req.user._id || req.user.id;
        const adminName = req.user.name || 'Administrator';
        const adminEmail = req.user.email || '';

        // Update Project document
        project.previousStatus = previousStatus;
        project.status = 'CANCELLED';
        project.cancelledAt = now;
        project.cancelledBy = adminId;
        project.cancelledByName = adminName;
        project.cancelledByEmail = adminEmail;
        project.cancellationReason = reason.trim();
        
        if (!project.cancellationAudit) {
            project.cancellationAudit = [];
        }
        project.cancellationAudit.push({
            cancelledAt: now,
            cancelledBy: adminId,
            cancelledByName: adminName,
            cancelledByEmail: adminEmail,
            reason: reason.trim(),
            previousStatus
        });

        await project.save();

        // Record in ProjectStatusHistory (Requirement 2 & 8)
        try {
            const ProjectStatusHistory = require('../models/ProjectStatusHistory');
            await ProjectStatusHistory.create({
                projectId: project._id,
                projectName: project.title,
                status: 'Cancelled',
                reason: reason.trim(),
                remarks: `Cancelled by Admin ${adminName} (${adminEmail}). Previous status was "${previousStatus}". Preserved ${projectPayments.length} financial transactions totaling ₹${totalPaidAmount}.`,
                reportedBy: adminId,
                reportedAt: now
            });
        } catch (histErr) {
            console.warn('ProjectStatusHistory creation warning:', histErr.message);
        }

        // Emit Socket event for real-time notification
        try {
            const { getSocket } = require('../utils/socket');
            const socket = getSocket();
            if (socket) {
                socket.emit('project-updated', {
                    projectId: project._id.toString(),
                    status: 'CANCELLED',
                    cancelledAt: now,
                    cancelledByName: adminName,
                    cancellationReason: reason.trim(),
                    previousStatus
                });
                socket.emit('project-cancelled', {
                    projectId: project._id.toString(),
                    title: project.title,
                    cancelledBy: adminName,
                    reason: reason.trim()
                });
            }
        } catch (sockErr) {
            // non-fatal
        }

        console.log(`🚫 Project Cancelled: ${project.title} (ID: ${project._id}) by ${adminName}. Reason: ${reason.trim()}`);

        res.status(200).json({
            message: `Project "${project.title}" has been successfully cancelled. Audit records and financial data have been preserved.`,
            project,
            financialPreservationNotice: {
                paymentsCount: projectPayments.length,
                totalPaidPreserved: totalPaidAmount,
                notice: "All payments and receipts remain intact in database."
            }
        });
    } catch (error) {
        console.error('Cancel Project Error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.proposeTimeline = async (req, res) => {
    try {
        const { timeline } = req.body;
        if (!timeline || !Array.isArray(timeline)) {
            return res.status(400).json({ message: "Timeline array is required." });
        }

        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (req.user.role === 'staff') {
            const isAssigned = project.assignedStaff.some(s => s.toString() === req.user.id);
            if (!isAssigned) {
                return res.status(403).json({ message: 'You are not assigned to this project.' });
            }
        }

        project.timeline = timeline;
        project.timelineStatus = 'Proposed by Staff';
        const savedProject = await project.save();
        res.json(savedProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.sendTimeline = async (req, res) => {
    try {
        const { timeline, notifyClient = false, additionalMessage = '' } = req.body;
        if (!timeline || !Array.isArray(timeline)) {
            return res.status(400).json({ message: "Timeline array is required." });
        }

        const project = await Project.findById(req.params.id).populate('customerId', 'name email');
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const previousTimeline = project.timeline ? JSON.parse(JSON.stringify(project.timeline)) : [];

        project.timeline = timeline;
        project.timelineStatus = 'Sent to Client';
        const savedProject = await project.save();

        let emailNotification = { sent: false, skipped: true, reason: 'Client email notification checkbox was not enabled.' };

        // Analyze meaningful diffs between previous and new timeline
        const changes = analyzeTimelineChanges(previousTimeline, timeline, project.deadline);

        // Compute hash of timeline to prevent duplicate transmissions
        const timelineHash = crypto.createHash('md5').update(JSON.stringify(timeline)).digest('hex');

        if (notifyClient) {
            const hasCustomMessage = Boolean(additionalMessage && additionalMessage.trim().length > 0);
            const isUnchanged = !changes.hasChanges;
            const alreadySentSameHash = project.lastTimelineEmailHash === timelineHash;

            if (isUnchanged && alreadySentSameHash && !hasCustomMessage) {
                console.log('Skipping duplicate timeline email dispatch: timeline is unchanged and was already emailed.');
                emailNotification = { 
                    sent: false, 
                    skipped: true, 
                    reason: 'Timeline is identical to previously published schedule. No duplicate email sent.' 
                };
            } else {
                const customer = project.customerId;
                if (customer && customer.email) {
                    let latestDateStr = null;
                    if (changes.newLatestDate) {
                        latestDateStr = changes.newLatestDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    } else if (project.deadline) {
                        latestDateStr = new Date(project.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    }

                    try {
                        const emailResult = await sendProjectTimelineUpdateEmail({
                            clientEmail: customer.email,
                            clientName: customer.name,
                            project: savedProject,
                            timelineDiff: changes,
                            fullTimeline: timeline,
                            latestCompletionDate: latestDateStr,
                            additionalMessage: additionalMessage ? additionalMessage.trim() : '',
                            portalUrl: process.env.FRONTEND_URL
                        });

                        if (emailResult.success) {
                            await Project.findByIdAndUpdate(savedProject._id, {
                                lastTimelineEmailSentAt: new Date(),
                                lastTimelineEmailHash: timelineHash
                            });
                            emailNotification = { 
                                sent: true, 
                                recipient: customer.email, 
                                messageId: emailResult.messageId 
                            };
                        } else {
                            emailNotification = { 
                                sent: false, 
                                error: emailResult.error || 'Failed to dispatch email' 
                            };
                        }
                    } catch (emailErr) {
                        console.error('Timeline update email dispatch failed:', emailErr.message);
                        emailNotification = { sent: false, error: emailErr.message };
                    }
                } else {
                    emailNotification = { sent: false, error: 'Customer has no email address configured on project.' };
                }
            }
        }

        res.json({
            ...savedProject.toObject(),
            emailNotification
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.requestAdditionalWork = async (req, res) => {
    try {
        const { title, description, amount, status } = req.body;
        if (!title) return res.status(400).json({ message: "Title is required for additional work." });

        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const isCustomer = req.user.role === 'customer';
        // Enforce ownership: customer can only request additional work on their own project
        if (isCustomer && project.customerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: "Access denied: You do not own this project." });
        }

        const workItem = {
            title,
            description,
            amount: isCustomer ? 0 : (parseFloat(amount) || 0),
            status: isCustomer ? 'Pending' : (status || 'Approved')
        };

        project.additionalWork.push(workItem);
        await project.save();

        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        const updatedProject = await recalculateProjectPaymentStatus(project._id);
        const finalProject = updatedProject ? await Project.findById(project._id).populate('customerId') : project;

        res.status(201).json(finalProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateAdditionalWorkStatus = async (req, res) => {
    try {
        const { status, amount, title, description } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        const workItem = project.additionalWork.id(req.params.workId);
        if (!workItem) return res.status(404).json({ message: "Additional work item not found" });

        if (status !== undefined) workItem.status = status;
        if (amount !== undefined) workItem.amount = parseFloat(amount) || 0;
        if (title !== undefined) workItem.title = title;
        if (description !== undefined) workItem.description = description;

        await project.save();

        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        const updatedProject = await recalculateProjectPaymentStatus(project._id);
        const finalProject = updatedProject ? await Project.findById(project._id).populate('customerId') : project;

        res.json(finalProject);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteAdditionalWork = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: "Project not found" });

        project.additionalWork.pull({ _id: req.params.workId });
        await project.save();

        const { recalculateProjectPaymentStatus } = require('../utils/projectHelper');
        const updatedProject = await recalculateProjectPaymentStatus(project._id);
        const finalProject = updatedProject ? await Project.findById(project._id).populate('customerId') : project;

        res.json(finalProject);
    } catch (error) {
        res.status(550).json({ message: error.message });
    }
};

exports.analyzeTimelineChanges = analyzeTimelineChanges;
