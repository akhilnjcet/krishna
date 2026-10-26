const SupportRequest = require('../models/SupportRequest');
const AdminNotification = require('../models/AdminNotification');
const Project = require('../models/Project');
const SystemSetting = require('../models/SystemSetting');
const socketUtil = require('../utils/socket');
const { 
    sendAdminSupportRequestEmail, 
    sendClientSupportApprovedEmail,
    sendTestSupportAlertEmail 
} = require('../services/emailService');

const DEFAULT_SETTINGS = {
    soundEnabled: true,
    selectedTone: 'chime', // 'chime' | 'bell' | 'ding' | 'modern'
    soundVolume: 80, // 0 - 100
    emailAlertsEnabled: true,
    adminRecipientEmail: process.env.EMAIL_USER || 'admin@krishnaengg.com',
    browserNotificationsEnabled: true,
    notifyOnNewRequest: true,
    notifyOnApproval: true,
    notifyOnLinkCreation: true
};

const getEffectiveSettings = async () => {
    try {
        const doc = await SystemSetting.findOne({ key: 'support_notification_settings' });
        if (doc && doc.value) {
            return { ...DEFAULT_SETTINGS, ...doc.value };
        }
    } catch (err) {
        console.error("Error reading support_notification_settings:", err.message);
    }
    return { ...DEFAULT_SETTINGS };
};

/**
 * Client or Staff creates a technical support request
 */
exports.createSupportRequest = async (req, res) => {
    try {
        const { 
            projectId, 
            projectTitle, 
            reason, 
            description, 
            firestoreId,
            requestType,
            clientRole
        } = req.body;

        if (!projectId || !projectTitle || !reason) {
            return res.status(400).json({ message: "Project and inquiry reason are required." });
        }

        const clientName = req.user?.name || req.body.userName || 'Client';
        const clientEmail = req.user?.email || req.body.userEmail || '';
        const role = clientRole || req.user?.role || req.body.userRole || 'customer';
        const clientId = req.user?._id || req.body.userId;

        // Idempotency & deduplication: check if an identical pending request was created within the last 60 seconds
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        const existingRecent = await SupportRequest.findOne({
            projectId: projectId.toString(),
            clientEmail: clientEmail.toLowerCase(),
            status: 'pending',
            createdAt: { $gte: oneMinuteAgo }
        });

        if (existingRecent) {
            console.log(`[SupportRequest] Deduplication: Returning existing pending request ${existingRecent._id}`);
            return res.json({ 
                success: true, 
                request: existingRecent, 
                deduplicated: true,
                message: "Request already recorded." 
            });
        }

        const supportRequest = new SupportRequest({
            client: clientId,
            clientName,
            clientEmail: clientEmail.toLowerCase(),
            clientRole: role,
            projectId: projectId.toString(),
            projectTitle,
            reason,
            description: description || '',
            firestoreId: firestoreId || '',
            status: 'pending'
        });

        await supportRequest.save();

        // 1. Try to link and create AdminNotification in MongoDB for the admin alert system
        try {
            let matchedProject = null;
            if (projectId.match(/^[0-9a-fA-F]{24}$/)) {
                matchedProject = await Project.findById(projectId);
            }

            if (matchedProject) {
                await AdminNotification.create({
                    projectId: matchedProject._id,
                    projectName: projectTitle,
                    type: 'In Progress',
                    title: `Technical Support Request: ${projectTitle}`,
                    message: `${clientName} submitted a support request for: ${reason}`,
                    updatedBy: req.user?._id || matchedProject.assignedStaff?.[0] || matchedProject.customerId,
                    reason: reason,
                    remarks: description || 'Client requested direct engineering consultation.',
                    priority: 'High',
                    status: 'Active'
                });
            }
        } catch (notifErr) {
            console.warn("[SupportRequest] Notice: AdminNotification record creation bypassed:", notifErr.message);
        }

        // 2. Fetch admin alert preferences
        const settings = await getEffectiveSettings();

        // 3. Emit real-time Socket.IO event to admin room with sound configuration
        socketUtil.emitToAdmin('technical-support-request', {
            requestId: supportRequest._id,
            firestoreId: firestoreId || '',
            projectId: supportRequest.projectId,
            projectTitle: supportRequest.projectTitle,
            clientName: supportRequest.clientName,
            clientEmail: supportRequest.clientEmail,
            clientRole: supportRequest.clientRole,
            reason: supportRequest.reason,
            description: supportRequest.description,
            submittedAt: supportRequest.createdAt,
            soundEnabled: settings.soundEnabled,
            selectedTone: settings.selectedTone,
            soundVolume: settings.soundVolume,
            notifyOnNewRequest: settings.notifyOnNewRequest
        });

        // 4. Send Email Notification to admin if enabled
        let emailDelivery = { sent: false, error: null };
        if (settings.emailAlertsEnabled && settings.notifyOnNewRequest) {
            const adminEmail = settings.adminRecipientEmail || process.env.EMAIL_USER;
            const emailResult = await sendAdminSupportRequestEmail({
                adminEmail,
                projectTitle,
                projectId: supportRequest.projectId,
                clientName,
                clientEmail,
                clientRole: role,
                reason,
                description,
                submittedAt: supportRequest.createdAt
            });

            emailDelivery = {
                sent: emailResult.success,
                sentAt: new Date(),
                to: adminEmail,
                error: emailResult.error || null
            };

            supportRequest.adminEmailDelivery = emailDelivery;
            await supportRequest.save();
        } else {
            console.log("[SupportRequest] Admin email alert skipped per admin settings preferences.");
        }

        res.status(201).json({
            success: true,
            request: supportRequest,
            emailNotification: emailDelivery
        });
    } catch (err) {
        console.error("createSupportRequest Error:", err);
        res.status(500).json({ message: err.message || "Failed to create support request." });
    }
};

/**
 * Get all support requests (Admin)
 */
exports.getSupportRequests = async (req, res) => {
    try {
        const { status, projectId } = req.query;
        const query = {};
        if (status && status !== 'all') {
            query.status = status;
        }
        if (projectId) {
            query.projectId = projectId;
        }

        const requests = await SupportRequest.find(query)
            .sort({ createdAt: -1 })
            .limit(100);

        res.json(requests);
    } catch (err) {
        console.error("getSupportRequests Error:", err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * Admin Approves Support Request & Establishes Support Link
 */
exports.approveSupportRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { chatId, supportLink, firestoreId } = req.body;

        let request = await SupportRequest.findOne({
            $or: [
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                { firestoreId: id },
                { firestoreId: firestoreId }
            ].filter(Boolean)
        });

        if (!request) {
            // If request was created solely in Firestore, instantiate a MongoDB record so tracking is preserved
            request = new SupportRequest({
                firestoreId: firestoreId || id,
                clientName: req.body.clientName || req.body.userName || 'Client',
                clientEmail: (req.body.clientEmail || req.body.userEmail || '').toLowerCase(),
                projectId: req.body.projectId || 'N/A',
                projectTitle: req.body.projectTitle || 'Support Project',
                reason: req.body.reason || 'Technical Assistance',
                description: req.body.description || ''
            });
        }

        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const targetChatId = chatId || request.chatId || request.firestoreId || id;
        const generatedLink = supportLink || `${frontendUrl}/customer/support?chatId=${targetChatId}&requestId=${request._id || id}`;

        request.status = 'approved';
        request.chatId = targetChatId;
        request.supportLink = generatedLink;
        request.approvedBy = req.user?._id;
        request.approvedAt = new Date();

        // Check settings
        const settings = await getEffectiveSettings();

        // 1. Send Email Notification to client
        let emailDelivery = { sent: false, error: null };
        if (request.clientEmail && settings.notifyOnApproval) {
            const emailResult = await sendClientSupportApprovedEmail({
                clientEmail: request.clientEmail,
                clientName: request.clientName,
                projectTitle: request.projectTitle,
                projectId: request.projectId,
                supportLink: generatedLink,
                instructions: "Log in to your Client Portal at " + frontendUrl + "/customer/support to enter the live technical consultation session."
            });

            emailDelivery = {
                sent: emailResult.success,
                sentAt: new Date(),
                to: request.clientEmail,
                error: emailResult.error || null
            };
            request.clientEmailDelivery = emailDelivery;
        }

        await request.save();

        // 2. Real-time in-app notification to client via Socket.IO
        if (request.client) {
            socketUtil.emitToUser(request.client, 'technical-support-approved', {
                requestId: request._id,
                firestoreId: request.firestoreId,
                projectId: request.projectId,
                projectTitle: request.projectTitle,
                supportLink: generatedLink,
                status: 'approved'
            });
        } else {
            // Broad emit with email / identifier for client layout listener
            socketUtil.emitToRoom('customer', 'technical-support-approved', {
                requestId: request._id,
                clientEmail: request.clientEmail,
                projectId: request.projectId,
                projectTitle: request.projectTitle,
                supportLink: generatedLink,
                status: 'approved'
            });
        }

        // 3. Admin confirmation tone if enabled in settings
        if (settings.soundEnabled && settings.notifyOnApproval) {
            socketUtil.emitToAdmin('technical-support-approved-admin', {
                requestId: request._id,
                projectId: request.projectId,
                clientName: request.clientName,
                selectedTone: settings.selectedTone,
                soundVolume: settings.soundVolume
            });
        }

        res.json({
            success: true,
            request,
            supportLink: generatedLink,
            emailNotification: emailDelivery
        });
    } catch (err) {
        console.error("approveSupportRequest Error:", err);
        res.status(500).json({ message: err.message || "Failed to approve support request." });
    }
};

/**
 * Admin Rejects / Terminates Support Request
 */
exports.rejectSupportRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await SupportRequest.findOne({
            $or: [
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                { firestoreId: id }
            ].filter(Boolean)
        });

        if (request) {
            request.status = 'rejected';
            await request.save();
        }

        res.json({ success: true, message: "Support request terminated." });
    } catch (err) {
        console.error("rejectSupportRequest Error:", err);
        res.status(500).json({ message: err.message || "Failed to reject request." });
    }
};

/**
 * Get Alert & Notification Settings
 */
exports.getAlertSettings = async (req, res) => {
    try {
        const settings = await getEffectiveSettings();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Update Alert & Notification Settings (Admin)
 */
exports.updateAlertSettings = async (req, res) => {
    try {
        const newSettings = req.body;
        if (!newSettings || typeof newSettings !== 'object') {
            return res.status(400).json({ message: "Invalid settings payload." });
        }

        const merged = { ...DEFAULT_SETTINGS, ...newSettings };

        await SystemSetting.findOneAndUpdate(
            { key: 'support_notification_settings' },
            { 
                value: merged, 
                category: 'notifications', 
                description: 'Technical Support Sound & Email Notification Directives',
                updatedAt: Date.now() 
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: "Notification & Alert settings synchronized successfully.",
            settings: merged
        });
    } catch (err) {
        console.error("updateAlertSettings Error:", err);
        res.status(500).json({ message: err.message || "Failed to save alert settings." });
    }
};

/**
 * Test Alert Email Configuration (Admin)
 */
exports.testAlertEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const settings = await getEffectiveSettings();
        const targetEmail = email || settings.adminRecipientEmail || process.env.EMAIL_USER;

        const result = await sendTestSupportAlertEmail(targetEmail);
        if (result.success) {
            res.json({ success: true, message: `Diagnostic email successfully dispatched to ${targetEmail}`, result });
        } else {
            res.status(500).json({ success: false, message: result.error || "Failed to dispatch test email.", error: result.error });
        }
    } catch (err) {
        console.error("testAlertEmail Error:", err);
        res.status(500).json({ message: err.message });
    }
};
