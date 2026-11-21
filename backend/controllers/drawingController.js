const FabricationDrawing = require('../models/FabricationDrawing');
const Project = require('../models/Project');
const DocumentHistory = require('../models/DocumentHistory');
const AdminNotification = require('../models/AdminNotification');
const socketUtil = require('../utils/socket');

// Google Drive URL Parser & Embed Preview Helper
const parseDriveUrl = (url) => {
    if (!url || typeof url !== 'string') return { id: null, embedUrl: '', viewUrl: '', isDrive: false };
    const clean = url.trim();
    if (!clean) return { id: null, embedUrl: '', viewUrl: '', isDrive: false };

    // 1. Google Drive file pattern: /file/d/{id}
    const fileMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileMatch) {
        return {
            id: fileMatch[1],
            embedUrl: `https://drive.google.com/file/d/${fileMatch[1]}/preview`,
            viewUrl: `https://drive.google.com/file/d/${fileMatch[1]}/view`,
            isDrive: true
        };
    }
    // 2. id parameter pattern: ?id={id} or &id={id}
    const idMatch = clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) {
        return {
            id: idMatch[1],
            embedUrl: `https://drive.google.com/file/d/${idMatch[1]}/preview`,
            viewUrl: `https://drive.google.com/file/d/${idMatch[1]}/view`,
            isDrive: true
        };
    }
    // 3. Google Docs/Sheets/Slides pattern
    const docMatch = clean.match(/\/(document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]+)/);
    if (docMatch) {
        const docType = docMatch[1];
        const docId = docMatch[2];
        const embed = docType === 'presentation'
            ? `https://docs.google.com/presentation/d/${docId}/embed`
            : `https://docs.google.com/${docType}/d/${docId}/preview`;
        return {
            id: docId,
            embedUrl: embed,
            viewUrl: clean,
            isDrive: true
        };
    }
    // If it's a generic URL or drive folder
    if (clean.includes('drive.google.com') || clean.includes('docs.google.com')) {
        return {
            id: null,
            embedUrl: clean,
            viewUrl: clean,
            isDrive: true
        };
    }
    return { id: null, embedUrl: clean, viewUrl: clean, isDrive: false };
};

// 1. Create a new Fabrication Drawing with initial revision (R0 or custom)
exports.createDrawing = async (req, res) => {
    try {
        const {
            drawingNumber,
            title,
            description,
            projectId,
            jobOrderNumber,
            category,
            partName,
            materialGrade,
            tolerance,
            initialRevisionNumber = 'R0',
            revisionDescription = 'Initial Engineering Release',
            fileUrl,
            driveUrl,
            fileName,
            fileSize,
            fileType,
            tags,
            notes
        } = req.body;

        if (!drawingNumber || !title || !projectId || (!fileUrl && !driveUrl)) {
            return res.status(400).json({
                success: false,
                message: 'Drawing Number, Title, Project, and either a Drawing File or Google Drive link are required.'
            });
        }

        // Verify project exists
        const project = await Project.findById(projectId).select('title customerId');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Referenced Project not found.' });
        }

        // Check uniqueness of drawing number
        const existing = await FabricationDrawing.findOne({ drawingNumber: drawingNumber.trim().toUpperCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: `Drawing Number "${drawingNumber}" already exists.` });
        }

        const parsedDrive = parseDriveUrl(driveUrl);
        const resolvedDriveUrl = parsedDrive.viewUrl || (driveUrl ? driveUrl.trim() : '');
        const resolvedEmbedUrl = parsedDrive.embedUrl || '';
        const hasFile = Boolean(fileUrl && fileUrl.trim());
        const hasDrive = Boolean(resolvedDriveUrl);
        const sourceType = hasFile && hasDrive ? 'both' : hasDrive ? 'drive' : 'upload';

        const initialRevision = {
            revisionNumber: initialRevisionNumber.trim().toUpperCase(),
            revisionDate: new Date(),
            description: revisionDescription,
            fileUrl: fileUrl || resolvedDriveUrl,
            driveUrl: resolvedDriveUrl,
            driveEmbedUrl: resolvedEmbedUrl,
            driveFileId: parsedDrive.id || '',
            sourceType,
            fileName: fileName || (hasDrive && !hasFile ? `${drawingNumber.trim().toUpperCase()}_${initialRevisionNumber.trim().toUpperCase()}_GoogleDrive.pdf` : `${drawingNumber}_${initialRevisionNumber}.pdf`),
            fileSize: Number(fileSize) || 0,
            fileType: fileType || (hasDrive && !hasFile ? 'application/vnd.google-apps.drive-sdk' : 'application/pdf'),
            uploadedBy: req.user.id,
            uploadedByName: req.user.name || 'Engineer',
            status: 'Pending Approval'
        };

        const drawing = new FabricationDrawing({
            drawingNumber: drawingNumber.trim().toUpperCase(),
            title: title.trim(),
            description: description || '',
            projectId,
            projectTitle: project.title,
            jobOrderNumber: jobOrderNumber || '',
            category: category || 'Structural Fabrication',
            partName: partName || '',
            materialGrade: materialGrade || '',
            tolerance: tolerance || '±0.5mm',
            currentRevision: initialRevisionNumber.trim().toUpperCase(),
            activeRevisionFileUrl: initialRevision.fileUrl,
            activeRevisionDriveUrl: resolvedDriveUrl,
            activeRevisionEmbedUrl: resolvedEmbedUrl,
            activeRevisionSourceType: sourceType,
            driveUrl: resolvedDriveUrl,
            status: 'Pending Approval',
            isApprovedForProduction: false,
            revisions: [initialRevision],
            tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
            notes: notes || '',
            createdBy: req.user.id,
            createdByName: req.user.name || 'System User'
        });

        // Register in DocumentHistory for unified searchability
        try {
            const docHist = await DocumentHistory.create({
                documentType: 'Technical Drawings',
                title: `${drawing.drawingNumber} - ${drawing.title} (${initialRevision.revisionNumber})`,
                documentNumber: drawing.drawingNumber,
                customerId: project.customerId || null,
                projectId: project._id,
                jobOrderNumber: jobOrderNumber || '',
                fileUrl,
                fileName: initialRevision.fileName,
                fileSize: initialRevision.fileSize,
                mimeType: initialRevision.fileType,
                tags: drawing.tags,
                accessRoles: ['admin', 'manager', 'staff'],
                createdBy: req.user.id,
                createdByName: req.user.name || 'System User',
                data: {
                    drawingId: drawing._id,
                    revisionNumber: initialRevision.revisionNumber,
                    category: drawing.category
                },
                status: 'Draft',
                approvalStatus: 'Pending'
            });
            drawing.documentHistoryId = docHist._id;
        } catch (histErr) {
            console.error('Non-critical: DocumentHistory sync notice:', histErr.message);
        }

        await drawing.save();

        // Broadcast notification for review
        try {
            const notif = await AdminNotification.create({
                type: 'SYSTEM_ALERT',
                title: 'New Fabrication Drawing Uploaded',
                message: `Drawing ${drawing.drawingNumber} (${initialRevision.revisionNumber}) uploaded for project "${project.title}" by ${req.user.name}.`,
                priority: 'medium',
                metadata: { drawingId: drawing._id, projectId: project._id }
            });
            socketUtil.emitToAdmin('admin-notification', notif);
        } catch (nErr) {}

        return res.status(201).json({
            success: true,
            message: `Drawing ${drawing.drawingNumber} registered successfully with revision ${initialRevision.revisionNumber}.`,
            drawing
        });
    } catch (err) {
        console.error('Error creating drawing:', err);
        return res.status(500).json({ success: false, message: 'Server error creating drawing.', error: err.message });
    }
};

// 2. Add a new Revision to an existing drawing
exports.addRevision = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            revisionNumber,
            description,
            fileUrl,
            driveUrl,
            fileName,
            fileSize,
            fileType
        } = req.body;

        if (!revisionNumber || !description || (!fileUrl && !driveUrl)) {
            return res.status(400).json({
                success: false,
                message: 'Revision number, description, and either a drawing file or Google Drive link are required.'
            });
        }

        const drawing = await FabricationDrawing.findById(id);
        if (!drawing) {
            return res.status(404).json({ success: false, message: 'Drawing not found.' });
        }

        const revNum = revisionNumber.trim().toUpperCase();
        // Check for duplicate revision number
        const duplicate = drawing.revisions.find(r => r.revisionNumber === revNum);
        if (duplicate) {
            return res.status(400).json({
                success: false,
                message: `Revision ${revNum} already exists for this drawing.`
            });
        }

        const parsedDrive = parseDriveUrl(driveUrl);
        const resolvedDriveUrl = parsedDrive.viewUrl || (driveUrl ? driveUrl.trim() : '');
        const resolvedEmbedUrl = parsedDrive.embedUrl || '';
        const hasFile = Boolean(fileUrl && fileUrl.trim());
        const hasDrive = Boolean(resolvedDriveUrl);
        const sourceType = hasFile && hasDrive ? 'both' : hasDrive ? 'drive' : 'upload';

        const newRevision = {
            revisionNumber: revNum,
            revisionDate: new Date(),
            description: description.trim(),
            fileUrl: fileUrl || resolvedDriveUrl,
            driveUrl: resolvedDriveUrl,
            driveEmbedUrl: resolvedEmbedUrl,
            driveFileId: parsedDrive.id || '',
            sourceType,
            fileName: fileName || (hasDrive && !hasFile ? `${drawing.drawingNumber}_${revNum}_GoogleDrive.pdf` : `${drawing.drawingNumber}_${revNum}.pdf`),
            fileSize: Number(fileSize) || 0,
            fileType: fileType || (hasDrive && !hasFile ? 'application/vnd.google-apps.drive-sdk' : 'application/pdf'),
            uploadedBy: req.user.id,
            uploadedByName: req.user.name || 'Engineer',
            status: 'Pending Approval'
        };

        drawing.revisions.push(newRevision);
        drawing.currentRevision = revNum;
        drawing.status = 'Pending Approval';
        await drawing.save();

        // Broadcast alert
        try {
            const notif = await AdminNotification.create({
                type: 'SYSTEM_ALERT',
                title: `New Revision ${revNum} Submitted: ${drawing.drawingNumber}`,
                message: `Revision ${revNum} for drawing "${drawing.title}" requires engineering approval.`,
                priority: 'medium',
                metadata: { drawingId: drawing._id, revisionNumber: revNum }
            });
            socketUtil.emitToAdmin('admin-notification', notif);
        } catch (nErr) {}

        return res.json({
            success: true,
            message: `Revision ${revNum} submitted for approval.`,
            drawing
        });
    } catch (err) {
        console.error('Error adding revision:', err);
        return res.status(500).json({ success: false, message: 'Server error adding revision.', error: err.message });
    }
};

// 3. Review (Approve / Reject) a Revision
exports.reviewRevision = async (req, res) => {
    try {
        const { id, revId } = req.params;
        const { action, comments } = req.body; // action: 'approve' | 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject".' });
        }

        const drawing = await FabricationDrawing.findById(id);
        if (!drawing) {
            return res.status(404).json({ success: false, message: 'Drawing not found.' });
        }

        const targetRev = drawing.revisions.id(revId);
        if (!targetRev) {
            return res.status(404).json({ success: false, message: 'Revision not found.' });
        }

        const reviewerName = req.user.name || 'Chief Engineer';

        if (action === 'approve') {
            // 1. Mark target revision as Approved
            targetRev.status = 'Approved';
            targetRev.approvedBy = req.user.id;
            targetRev.approvedByName = reviewerName;
            targetRev.approvalDate = new Date();
            targetRev.approvalComments = comments || 'Approved for workshop fabrication';

            // 2. Mark all earlier revisions as Superseded to prevent workshop errors
            drawing.revisions.forEach(r => {
                if (r._id.toString() !== revId && (r.status === 'Approved' || r.status === 'Pending Approval')) {
                    r.status = 'Superseded';
                    r.supersededAt = new Date();
                    r.supersededBy = `${targetRev.revisionNumber} Approved by ${reviewerName}`;
                }
            });

            // 3. Promote this revision to the active production standard
            drawing.currentRevision = targetRev.revisionNumber;
            drawing.activeRevisionFileUrl = targetRev.fileUrl;
            drawing.activeRevisionDriveUrl = targetRev.driveUrl || '';
            drawing.activeRevisionEmbedUrl = targetRev.driveEmbedUrl || '';
            drawing.activeRevisionSourceType = targetRev.sourceType || 'upload';
            if (targetRev.driveUrl) {
                drawing.driveUrl = targetRev.driveUrl;
            }
            drawing.status = 'Approved';
            drawing.isApprovedForProduction = true;

            // Update DocumentHistory if linked
            if (drawing.documentHistoryId) {
                await DocumentHistory.findByIdAndUpdate(drawing.documentHistoryId, {
                    fileUrl: targetRev.fileUrl,
                    status: 'Approved',
                    approvalStatus: 'Approved',
                    title: `${drawing.drawingNumber} - ${drawing.title} (${targetRev.revisionNumber})`
                }).catch(() => {});
            }

            // 4. Notify workshop staff and broadcast realtime alert
            try {
                const notif = await AdminNotification.create({
                    type: 'PRODUCTION_ALERT',
                    title: `Drawing Approved: ${drawing.drawingNumber} (${targetRev.revisionNumber})`,
                    message: `Approved for production: "${drawing.title}". Superseded older revisions. Workshop staff must use ${targetRev.revisionNumber}.`,
                    priority: 'high',
                    metadata: { drawingId: drawing._id, revision: targetRev.revisionNumber }
                });
                socketUtil.emitToAdmin('admin-notification', notif);
                socketUtil.emitToStaff('staff-notification', {
                    type: 'DRAWING_APPROVED',
                    drawingNumber: drawing.drawingNumber,
                    revision: targetRev.revisionNumber,
                    title: drawing.title,
                    fileUrl: targetRev.fileUrl
                });
            } catch (nErr) {}

        } else {
            // Reject Revision
            targetRev.status = 'Rejected';
            targetRev.rejectionReason = comments || 'Revision rejected by engineering';
            targetRev.approvedByName = reviewerName;
            targetRev.approvalDate = new Date();

            // If this was the only revision or current revision, mark drawing as Rejected
            if (drawing.currentRevision === targetRev.revisionNumber && !drawing.revisions.some(r => r.status === 'Approved')) {
                drawing.status = 'Rejected';
                drawing.isApprovedForProduction = false;
            }
        }

        await drawing.save();

        return res.json({
            success: true,
            message: `Revision ${targetRev.revisionNumber} ${action === 'approve' ? 'Approved & marked active' : 'Rejected'}.`,
            drawing
        });
    } catch (err) {
        console.error('Error reviewing revision:', err);
        return res.status(500).json({ success: false, message: 'Server error reviewing revision.', error: err.message });
    }
};

// 4. List Drawings with Search, Filter & Pagination
exports.getDrawings = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            projectId,
            category,
            status,
            approvedOnly
        } = req.query;

        const query = {};

        if (projectId) {
            query.projectId = projectId;
        }

        if (category && category !== 'all') {
            query.category = category;
        }

        if (status && status !== 'all') {
            query.status = status;
        }

        if (approvedOnly === 'true') {
            query.isApprovedForProduction = true;
        }

        if (search) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { drawingNumber: regex },
                { title: regex },
                { projectTitle: regex },
                { jobOrderNumber: regex },
                { partName: regex },
                { tags: regex }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [drawings, total] = await Promise.all([
            FabricationDrawing.find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            FabricationDrawing.countDocuments(query)
        ]);

        return res.json({
            success: true,
            drawings,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)) || 1
            }
        });
    } catch (err) {
        console.error('Error fetching drawings:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching drawings.', error: err.message });
    }
};

// 5. Get Drawing by ID
exports.getDrawingById = async (req, res) => {
    try {
        const drawing = await FabricationDrawing.findById(req.params.id)
            .populate('projectId', 'title clientName deadline status');
        if (!drawing) {
            return res.status(404).json({ success: false, message: 'Drawing not found.' });
        }
        return res.json({ success: true, drawing });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error fetching drawing.', error: err.message });
    }
};

// 6. Delete / Archive Drawing
exports.deleteDrawing = async (req, res) => {
    try {
        const drawing = await FabricationDrawing.findById(req.params.id);
        if (!drawing) {
            return res.status(404).json({ success: false, message: 'Drawing not found.' });
        }
        await FabricationDrawing.findByIdAndDelete(req.params.id);
        return res.json({ success: true, message: `Drawing ${drawing.drawingNumber} deleted successfully.` });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error deleting drawing.', error: err.message });
    }
};
