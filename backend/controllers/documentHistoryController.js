const DocumentHistory = require('../models/DocumentHistory');
const User = require('../models/User');
const Project = require('../models/Project');

// Save or Update document history (Auto-Save / Versioning)
exports.saveDocument = async (req, res) => {
    try {
        const {
            documentType,
            documentNumber,
            customerId,
            projectId,
            status,
            totalAmount,
            data,
            pdfData
        } = req.body;

        const createdBy = req.user ? req.user.id : null;
        if (!createdBy) {
            return res.status(401).json({ message: 'Authentication required to save document history.' });
        }

        // Check if document already exists
        let document = await DocumentHistory.findOne({ documentType, documentNumber });

        if (document) {
            // Versioning: If changes are found or a new PDF is saved, archive the current version
            const nextVersionNum = document.version + 1;
            
            // Push current state to versions history
            document.versions.push({
                version: document.version,
                data: document.data,
                pdfData: document.pdfData,
                updatedBy: createdBy,
                updatedAt: Date.now()
            });

            // Update main document fields with the new version
            document.version = nextVersionNum;
            document.data = data;
            if (pdfData) {
                document.pdfData = pdfData;
            }
            if (customerId) document.customerId = customerId;
            if (projectId) document.projectId = projectId;
            if (status) document.status = status;
            if (totalAmount !== undefined) document.totalAmount = totalAmount;
            document.updatedAt = Date.now();

            await document.save();
            return res.status(200).json({ message: 'Document updated successfully.', document });
        } else {
            // Create a new document history
            const newDocument = new DocumentHistory({
                documentType,
                documentNumber,
                customerId: customerId || null,
                projectId: projectId || null,
                createdBy,
                status: status || 'Draft',
                totalAmount: totalAmount || 0,
                version: 1,
                data,
                pdfData
            });

            await newDocument.save();
            return res.status(201).json({ message: 'Document created successfully.', document: newDocument });
        }
    } catch (err) {
        console.error('Error saving document history:', err);
        res.status(500).json({ message: 'Internal server error saving document.', error: err.message });
    }
};

// Retrieve documents (with Search, Filter, Sort, Pagination)
exports.getDocuments = async (req, res) => {
    try {
        const {
            search,
            category,
            status,
            dateRange,
            startDate,
            endDate,
            sort,
            page = 1,
            limit = 20,
            archived = 'false'
        } = req.query;

        const query = {};

        // Security check: restrict visibility based on user role
        if (req.user.role === 'customer') {
            query.customerId = req.user.id;
        } else if (req.user.role === 'staff') {
            // Staff can only view documents they created or are authorized to view
            query.$or = [
                { createdBy: req.user.id },
                { documentType: { $in: ['General Report', 'Attendance Report', 'Labour Bill'] } }
            ];
        }

        // Archive flag
        query.archived = archived === 'true';

        // Filter by category
        if (category) {
            // Map category queries to document types
            if (category === 'Quotations') query.documentType = 'Quotation';
            else if (category === 'Estimates') query.documentType = 'Estimate';
            else if (category === 'Invoices') query.documentType = 'Invoice';
            else if (category === 'Labour Bills') query.documentType = 'Labour Bill';
            else if (category === 'Salary Slips') query.documentType = 'Salary Slip';
            else if (category === 'Reports') query.documentType = { $in: ['Attendance Report', 'Project Report', 'General Report', 'Expense Report'] };
            else if (category === 'Receipts') query.documentType = 'Payment Receipt';
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by date
        if (dateRange) {
            const startOfToday = new Date();
            startOfToday.setHours(0,0,0,0);
            const endOfToday = new Date();
            endOfToday.setHours(23,59,59,999);

            if (dateRange === 'Today') {
                query.createdAt = { $gte: startOfToday, $lte: endOfToday };
            } else if (dateRange === 'Yesterday') {
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                const endOfYesterday = new Date(endOfToday);
                endOfYesterday.setDate(endOfYesterday.getDate() - 1);
                query.createdAt = { $gte: startOfYesterday, $lte: endOfYesterday };
            } else if (dateRange === 'This Week') {
                const startOfWeek = new Date(startOfToday);
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                query.createdAt = { $gte: startOfWeek };
            } else if (dateRange === 'This Month') {
                const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
                query.createdAt = { $gte: startOfMonth };
            } else if (dateRange === 'This Year') {
                const startOfYear = new Date(startOfToday.getFullYear(), 0, 1);
                query.createdAt = { $gte: startOfYear };
            } else if (dateRange === 'Custom' && startDate) {
                const start = new Date(startDate);
                start.setHours(0,0,0,0);
                const end = endDate ? new Date(endDate) : new Date();
                end.setHours(23,59,59,999);
                query.createdAt = { $gte: start, $lte: end };
            }
        }

        // Search functionality
        if (search) {
            // Find users/projects matching search query
            const matchedUsers = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { phone: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');
            const userIds = matchedUsers.map(u => u._id);

            const matchedProjects = await Project.find({
                title: { $regex: search, $options: 'i' }
            }).select('_id');
            const projectIds = matchedProjects.map(p => p._id);

            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { documentNumber: { $regex: search, $options: 'i' } },
                    { status: { $regex: search, $options: 'i' } },
                    { customerId: { $in: userIds } },
                    { projectId: { $in: projectIds } }
                ]
            });
        }

        // Sorting
        let sortOption = { createdAt: -1 }; // Newest First by default
        if (sort) {
            if (sort === 'Oldest First') sortOption = { createdAt: 1 };
            else if (sort === 'Highest Amount') sortOption = { totalAmount: -1 };
            else if (sort === 'Lowest Amount') sortOption = { totalAmount: 1 };
            else if (sort === 'Document Number') sortOption = { documentNumber: 1 };
        }

        // Pagination
        const parsedPage = parseInt(page);
        const parsedLimit = parseInt(limit);
        const skip = (parsedPage - 1) * parsedLimit;

        const documents = await DocumentHistory.find(query)
            .populate('customerId', 'name phone email')
            .populate('projectId', 'title description')
            .populate('createdBy', 'name email')
            .sort(sortOption)
            .skip(skip)
            .limit(parsedLimit);

        const total = await DocumentHistory.countDocuments(query);

        res.status(200).json({
            documents,
            total,
            page: parsedPage,
            pages: Math.ceil(total / parsedLimit)
        });
    } catch (err) {
        console.error('Error fetching document history:', err);
        res.status(500).json({ message: 'Internal server error fetching documents.' });
    }
};

// Archive / Restore document
exports.toggleArchiveDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await DocumentHistory.findById(id);
        
        if (!document) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        // Access check
        if (req.user.role !== 'admin' && String(document.createdBy) !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to archive this document.' });
        }

        document.archived = !document.archived;
        document.updatedAt = Date.now();
        await document.save();

        res.status(200).json({ message: `Document ${document.archived ? 'archived' : 'restored'} successfully.`, document });
    } catch (err) {
        console.error('Error archiving document:', err);
        res.status(500).json({ message: 'Internal server error archiving document.' });
    }
};

// Delete document history record (Admin Only)
exports.deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await DocumentHistory.findById(id);

        if (!document) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only administrators can delete document history.' });
        }

        await DocumentHistory.findByIdAndDelete(id);
        res.status(200).json({ message: 'Document history entry permanently deleted.' });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ message: 'Internal server error deleting document.' });
    }
};

// Fetch document details (including version history)
exports.getDocumentById = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await DocumentHistory.findById(id)
            .populate('customerId', 'name phone email')
            .populate('projectId', 'title description')
            .populate('createdBy', 'name email')
            .populate('versions.updatedBy', 'name email');

        if (!document) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        // Security check
        if (req.user.role === 'customer' && String(document.customerId?._id || document.customerId) !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to view this document.' });
        }

        res.status(200).json(document);
    } catch (err) {
        console.error('Error fetching document detail:', err);
        res.status(500).json({ message: 'Internal server error fetching document details.' });
    }
};
