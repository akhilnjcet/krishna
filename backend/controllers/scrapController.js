const ScrapRecord = require('../models/ScrapRecord');
const InventoryItem = require('../models/InventoryItem');
const Project = require('../models/Project');
const Expense = require('../models/Expense');
const AdminNotification = require('../models/AdminNotification');
const socketUtil = require('../utils/socket');

// 1. Record scrap generated on shopfloor / site
exports.createScrapRecord = async (req, res) => {
    try {
        const {
            projectId,
            jobOrderNumber,
            materialId,
            materialName,
            materialType,
            grade,
            quantity,
            unit = 'kg',
            estimatedUnitValue = 0,
            wastageReason,
            scrapType = 'Non-Reusable Waste',
            storageLocation = 'Yard Scrap Bay 1',
            notes
        } = req.body;

        const qty = Number(quantity);
        if (!materialName || !qty || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Material name and valid scrap quantity (> 0) are required.'
            });
        }

        let projectTitle = '';
        if (projectId) {
            const proj = await Project.findById(projectId).select('title');
            if (proj) projectTitle = proj.title;
        }

        // Generate unique scrap code: SCR-YYYY-XXXX
        const year = new Date().getFullYear();
        const count = await ScrapRecord.countDocuments();
        const scrapCode = `SCR-${year}-${String(count + 1).padStart(4, '0')}`;

        const unitVal = Number(estimatedUnitValue) || 0;
        const totalVal = parseFloat((qty * unitVal).toFixed(2));

        const scrap = new ScrapRecord({
            scrapCode,
            projectId: projectId || null,
            projectTitle,
            jobOrderNumber: jobOrderNumber || '',
            materialId: materialId || null,
            materialName: materialName.trim(),
            materialType: materialType || 'Mild Steel (MS)',
            grade: grade || 'IS 2062',
            quantity: qty,
            unit,
            estimatedUnitValue: unitVal,
            estimatedTotalValue: totalVal,
            wastageReason: wastageReason || 'Offcuts / Trimming',
            scrapType: scrapType || 'Non-Reusable Waste',
            storageLocation: storageLocation || 'Yard Scrap Bay 1',
            status: 'Recorded',
            recordedBy: req.user.id,
            recordedByName: req.user.name || 'Staff Operator',
            notes: notes || ''
        });

        await scrap.save();

        // Broadcast notification to Admin
        try {
            const notif = await AdminNotification.create({
                type: 'INVENTORY_ALERT',
                title: `Scrap Lot Recorded: ${scrapCode}`,
                message: `${qty} ${unit} of ${materialName} (${scrapType}) logged from ${projectTitle || 'General Shopfloor'}.`,
                priority: 'low',
                metadata: { scrapId: scrap._id }
            });
            socketUtil.emitToAdmin('admin-notification', notif);
        } catch (nErr) {}

        return res.status(201).json({
            success: true,
            message: `Scrap record ${scrapCode} registered successfully.`,
            scrap
        });
    } catch (err) {
        console.error('Error recording scrap:', err);
        return res.status(500).json({ success: false, message: 'Server error recording scrap.', error: err.message });
    }
};

// 2. Verify scrap lot (Admin / Manager)
exports.verifyScrapRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { verifiedQuantity, storageLocation, scrapType, notes } = req.body;

        const scrap = await ScrapRecord.findById(id);
        if (!scrap) {
            return res.status(404).json({ success: false, message: 'Scrap record not found.' });
        }

        if (scrap.status === 'Sold' || scrap.status === 'Returned to Stock') {
            return res.status(400).json({
                success: false,
                message: `Cannot re-verify scrap that is already ${scrap.status}.`
            });
        }

        if (verifiedQuantity && Number(verifiedQuantity) > 0) {
            scrap.quantity = Number(verifiedQuantity);
            scrap.estimatedTotalValue = parseFloat((scrap.quantity * scrap.estimatedUnitValue).toFixed(2));
        }

        if (storageLocation) scrap.storageLocation = storageLocation;
        if (scrapType) scrap.scrapType = scrapType;

        scrap.status = 'Verified';
        scrap.verifiedBy = req.user.id;
        scrap.verifiedByName = req.user.name || 'Yard Supervisor';
        scrap.verifiedAt = new Date();
        scrap.verificationNotes = notes || 'Quantity and scrap classification verified physically in yard';

        await scrap.save();

        return res.json({
            success: true,
            message: `Scrap record ${scrap.scrapCode} verified successfully.`,
            scrap
        });
    } catch (err) {
        console.error('Error verifying scrap:', err);
        return res.status(500).json({ success: false, message: 'Server error verifying scrap.', error: err.message });
    }
};

// 3. Return Reusable Scrap to Stock (Approved Inventory Transaction)
exports.returnScrapToStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { targetInventoryItemId, returnQuantity, notes } = req.body;

        const scrap = await ScrapRecord.findById(id);
        if (!scrap) {
            return res.status(404).json({ success: false, message: 'Scrap record not found.' });
        }

        // Safeguard: Check if reusable and not already returned
        if (scrap.scrapType !== 'Reusable Offcut') {
            return res.status(400).json({
                success: false,
                message: 'Only scrap marked as "Reusable Offcut" can be returned to active inventory.'
            });
        }

        if (scrap.reuseAction && scrap.reuseAction.isReturnedToStock) {
            return res.status(400).json({
                success: false,
                message: 'This scrap record has already been returned to inventory. Duplicate transaction blocked.'
            });
        }

        const qtyToReturn = Number(returnQuantity) || scrap.quantity;
        if (qtyToReturn <= 0 || qtyToReturn > scrap.quantity) {
            return res.status(400).json({
                success: false,
                message: `Return quantity must be between 0.01 and available scrap quantity (${scrap.quantity} ${scrap.unit}).`
            });
        }

        // Find or link InventoryItem
        const itemId = targetInventoryItemId || scrap.materialId;
        if (!itemId) {
            return res.status(400).json({
                success: false,
                message: 'Target inventory item ID is required to credit stock.'
            });
        }

        const invItem = await InventoryItem.findById(itemId);
        if (!invItem) {
            return res.status(404).json({ success: false, message: 'Target inventory item not found.' });
        }

        // Update inventory stock safely
        invItem.currentStock = (invItem.currentStock || 0) + qtyToReturn;
        await invItem.save();

        // Update scrap record
        scrap.reuseAction = {
            isReturnedToStock: true,
            targetInventoryItemId: invItem._id,
            targetItemName: invItem.name,
            returnedQuantity: qtyToReturn,
            returnedAt: new Date(),
            approvedBy: req.user.id,
            approvedByName: req.user.name || 'Store Manager',
            approvalNotes: notes || `Returned ${qtyToReturn} ${scrap.unit} reusable offcuts to stock.`
        };
        scrap.status = 'Returned to Stock';
        await scrap.save();

        return res.json({
            success: true,
            message: `Successfully returned ${qtyToReturn} ${scrap.unit} of "${invItem.name}" to inventory stock. New stock: ${invItem.currentStock} ${invItem.unit}.`,
            scrap,
            currentStock: invItem.currentStock
        });
    } catch (err) {
        console.error('Error returning scrap to stock:', err);
        return res.status(500).json({ success: false, message: 'Server error returning scrap to stock.', error: err.message });
    }
};

// 4. Record External Scrap Sale (Strictly integrated with Expense model)
exports.recordScrapSale = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            buyerName,
            buyerPhone,
            buyerGst,
            salePricePerUnit,
            paymentMethod = 'cash',
            invoiceNumber,
            saleNotes
        } = req.body;

        const scrap = await ScrapRecord.findById(id);
        if (!scrap) {
            return res.status(404).json({ success: false, message: 'Scrap record not found.' });
        }

        // Safeguard: Prevent double sales or selling returned stock
        if (scrap.status === 'Sold' || (scrap.saleAction && scrap.saleAction.isSold)) {
            return res.status(400).json({
                success: false,
                message: 'This scrap record has already been marked as Sold. Duplicate transaction blocked.'
            });
        }

        if (scrap.status === 'Returned to Stock') {
            return res.status(400).json({
                success: false,
                message: 'Cannot sell scrap that has already been returned to active inventory stock.'
            });
        }

        const pricePerUnit = Number(salePricePerUnit);
        if (!buyerName || !pricePerUnit || pricePerUnit <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Buyer Name and valid Sale Price per Unit (> 0) are required.'
            });
        }

        const totalSaleAmount = parseFloat((scrap.quantity * pricePerUnit).toFixed(2));
        const finalInvoiceNumber = invoiceNumber || `SCR-INV-${Date.now().toString().slice(-6)}`;

        // STRICT FINANCIAL INTEGRATION: Create income transaction in existing Expense model
        const financeRecord = new Expense({
            type: 'income',
            title: `Scrap Sale: ${scrap.quantity} ${scrap.unit} ${scrap.materialName} (${buyerName})`,
            amount: totalSaleAmount,
            category: 'scrap_sale',
            projectId: scrap.projectId || null,
            costType: 'material',
            description: `Sale of scrap lot ${scrap.scrapCode} to ${buyerName}. Price: ₹${pricePerUnit}/${scrap.unit}. Invoice: ${finalInvoiceNumber}. ${saleNotes || ''}`,
            date: new Date(),
            recordedBy: req.user.id
        });
        await financeRecord.save();

        // Update ScrapRecord with sale details and link to Expense
        scrap.saleAction = {
            isSold: true,
            buyerName: buyerName.trim(),
            buyerPhone: buyerPhone || '',
            buyerGst: buyerGst || '',
            salePricePerUnit: pricePerUnit,
            totalSaleAmount,
            paymentMethod,
            saleDate: new Date(),
            invoiceNumber: finalInvoiceNumber,
            expenseId: financeRecord._id,
            processedBy: req.user.id,
            processedByName: req.user.name || 'Accountant',
            saleNotes: saleNotes || ''
        };
        scrap.status = 'Sold';
        await scrap.save();

        return res.json({
            success: true,
            message: `Scrap sale of ₹${totalSaleAmount.toLocaleString()} recorded successfully and synced to Financial Ledger.`,
            scrap,
            expenseId: financeRecord._id
        });
    } catch (err) {
        console.error('Error recording scrap sale:', err);
        return res.status(500).json({ success: false, message: 'Server error recording scrap sale.', error: err.message });
    }
};

// 5. Query Scrap Records with Search, Filter & Pagination
exports.getScrapRecords = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 25,
            search = '',
            projectId,
            materialType,
            scrapType,
            status,
            startDate,
            endDate
        } = req.query;

        const query = {};

        if (projectId) query.projectId = projectId;
        if (materialType && materialType !== 'all') query.materialType = materialType;
        if (scrapType && scrapType !== 'all') query.scrapType = scrapType;
        if (status && status !== 'all') query.status = status;

        if (startDate || endDate) {
            query.recordedAt = {};
            if (startDate) query.recordedAt.$gte = new Date(startDate);
            if (endDate) query.recordedAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        if (search) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { scrapCode: regex },
                { materialName: regex },
                { projectTitle: regex },
                { jobOrderNumber: regex },
                { storageLocation: regex },
                { 'saleAction.buyerName': regex }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [records, total] = await Promise.all([
            ScrapRecord.find(query)
                .sort({ recordedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            ScrapRecord.countDocuments(query)
        ]);

        return res.json({
            success: true,
            records,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)) || 1
            }
        });
    } catch (err) {
        console.error('Error fetching scrap records:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching scrap records.', error: err.message });
    }
};

// 6. Scrap & Wastage Analytics Report
exports.getScrapAnalytics = async (req, res) => {
    try {
        const records = await ScrapRecord.find({});

        let totalScrapQtyKg = 0;
        let totalEstimatedValue = 0;
        let totalSoldValue = 0;
        let reusableOffcutQtyKg = 0;
        let nonReusableQtyKg = 0;
        let returnedToStockQtyKg = 0;

        const materialBreakdown = {};
        const reasonBreakdown = {};
        const projectBreakdown = {};

        records.forEach(r => {
            const qty = Number(r.quantity) || 0;
            const estVal = Number(r.estimatedTotalValue) || 0;
            totalScrapQtyKg += qty;
            totalEstimatedValue += estVal;

            if (r.scrapType === 'Reusable Offcut') {
                reusableOffcutQtyKg += qty;
            } else {
                nonReusableQtyKg += qty;
            }

            if (r.status === 'Returned to Stock') {
                returnedToStockQtyKg += Number(r.reuseAction?.returnedQuantity) || qty;
            }

            if (r.status === 'Sold' && r.saleAction?.totalSaleAmount) {
                totalSoldValue += Number(r.saleAction.totalSaleAmount);
            }

            // Material breakdown
            const mType = r.materialType || 'Other';
            if (!materialBreakdown[mType]) {
                materialBreakdown[mType] = { quantity: 0, estimatedValue: 0, count: 0 };
            }
            materialBreakdown[mType].quantity += qty;
            materialBreakdown[mType].estimatedValue += estVal;
            materialBreakdown[mType].count += 1;

            // Reason breakdown
            const reason = r.wastageReason || 'Other';
            if (!reasonBreakdown[reason]) {
                reasonBreakdown[reason] = { quantity: 0, count: 0 };
            }
            reasonBreakdown[reason].quantity += qty;
            reasonBreakdown[reason].count += 1;

            // Project breakdown
            const pKey = r.projectTitle || 'Unassigned / General Shopfloor';
            if (!projectBreakdown[pKey]) {
                projectBreakdown[pKey] = { quantity: 0, estimatedValue: 0, count: 0 };
            }
            projectBreakdown[pKey].quantity += qty;
            projectBreakdown[pKey].estimatedValue += estVal;
            projectBreakdown[pKey].count += 1;
        });

        return res.json({
            success: true,
            summary: {
                totalLots: records.length,
                totalScrapQtyKg: parseFloat(totalScrapQtyKg.toFixed(2)),
                totalEstimatedValue: parseFloat(totalEstimatedValue.toFixed(2)),
                totalSoldValue: parseFloat(totalSoldValue.toFixed(2)),
                reusableOffcutQtyKg: parseFloat(reusableOffcutQtyKg.toFixed(2)),
                nonReusableQtyKg: parseFloat(nonReusableQtyKg.toFixed(2)),
                returnedToStockQtyKg: parseFloat(returnedToStockQtyKg.toFixed(2)),
                reusableRecoveryPercentage: totalScrapQtyKg > 0 
                    ? parseFloat(((reusableOffcutQtyKg / totalScrapQtyKg) * 100).toFixed(1)) 
                    : 0
            },
            materialBreakdown,
            reasonBreakdown,
            projectBreakdown
        });
    } catch (err) {
        console.error('Error generating scrap analytics:', err);
        return res.status(500).json({ success: false, message: 'Server error generating scrap analytics.', error: err.message });
    }
};
