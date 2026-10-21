const InventoryItem = require('../models/InventoryItem');
const ToolRepair = require('../models/ToolRepair');
const User = require('../models/User');

// ─── 1. Get Inventory Items (Tools or Materials) ─────────────────────────────
exports.getItems = async (req, res) => {
    try {
        const { type, status, category, search, includeTotalLoss } = req.query;
        const query = {};

        if (type) query.type = type;
        if (category && category !== 'All') query.category = category;

        if (status && status !== 'All') {
            query.status = status;
        } else if (type === 'tool' && includeTotalLoss !== 'true') {
            // By default for tools, users view active inventory unless explicitly filtering for total loss
            // We can allow all statuses if user requests
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { name: regex },
                { code: regex },
                { brand: regex },
                { category: regex },
                { location: regex }
            ];
        }

        const items = await InventoryItem.find(query).sort({ updatedAt: -1, createdAt: -1 });
        res.json({ success: true, count: items.length, items });
    } catch (err) {
        console.error('Error fetching inventory items:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch inventory items', error: err.message });
    }
};

// ─── 2. Get Single Item ─────────────────────────────────────────────────────
exports.getItemById = async (req, res) => {
    try {
        const item = await InventoryItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }
        res.json({ success: true, item });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching item', error: err.message });
    }
};

// ─── 3. Create Item (Tool or Material) ──────────────────────────────────────
exports.createItem = async (req, res) => {
    try {
        const {
            type, name, code, category, location, notes,
            brand, modelNumber, serialNumber, purchaseCost, purchaseDate, condition,
            quantity, unit, unitPrice, minThreshold
        } = req.body;

        if (!type || !name) {
            return res.status(400).json({ success: false, message: 'Type and name are required' });
        }

        // Generate smart unique code if not provided
        let itemCode = (code || '').trim();
        if (!itemCode) {
            const prefix = type === 'tool' ? 'TL' : 'MAT';
            itemCode = `${prefix}-${Date.now().toString().slice(-6)}`;
        }

        const newItem = new InventoryItem({
            type,
            name: name.trim(),
            code: itemCode,
            category: category || (type === 'tool' ? 'Hand Tools' : 'Raw Materials'),
            location: location || 'Main Store',
            notes: notes || '',
            // Tool fields
            brand: brand || '',
            modelNumber: modelNumber || '',
            serialNumber: serialNumber || '',
            purchaseCost: Number(purchaseCost) || 0,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
            condition: condition || 'Good',
            status: 'Available',
            // Material fields
            quantity: Number(quantity) || 0,
            unit: unit || (type === 'tool' ? 'Pcs' : 'Kg'),
            unitPrice: Number(unitPrice) || 0,
            minThreshold: Number(minThreshold) || 5,
            stockMovements: Number(quantity) > 0 ? [{
                type: 'IN',
                quantity: Number(quantity),
                previousQuantity: 0,
                newQuantity: Number(quantity),
                reason: 'Initial stock intake upon item creation',
                performedBy: req.user?.name || 'Administrator',
                date: new Date()
            }] : []
        });

        await newItem.save();
        res.status(201).json({ success: true, item: newItem });
    } catch (err) {
        console.error('Error creating inventory item:', err);
        res.status(500).json({ success: false, message: 'Failed to create item', error: err.message });
    }
};

// ─── 4. Update Item ─────────────────────────────────────────────────────────
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const item = await InventoryItem.findById(id);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Apply permitted fields
        const allowedFields = [
            'name', 'code', 'category', 'location', 'notes',
            'brand', 'modelNumber', 'serialNumber', 'purchaseCost', 'purchaseDate', 'condition',
            'unit', 'unitPrice', 'minThreshold'
        ];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                item[field] = updates[field];
            }
        });

        await item.save();
        res.json({ success: true, item });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update item', error: err.message });
    }
};

// ─── 5. Delete Item ─────────────────────────────────────────────────────────
exports.deleteItem = async (req, res) => {
    try {
        const item = await InventoryItem.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        if (item.status === 'Assigned') {
            return res.status(400).json({ success: false, message: 'Cannot delete a tool that is currently assigned to staff' });
        }

        await InventoryItem.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Item deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete item', error: err.message });
    }
};

// ─── 6. Assign Tool to Staff Member ─────────────────────────────────────────
exports.assignTool = async (req, res) => {
    try {
        const { id } = req.params;
        const { staffId, staffName, returnByDate, purpose } = req.body;

        if (!staffName && !staffId) {
            return res.status(400).json({ success: false, message: 'Staff member name or ID is required' });
        }
        if (!returnByDate) {
            return res.status(400).json({ success: false, message: 'Return-by date is required' });
        }

        const tool = await InventoryItem.findById(id);
        if (!tool || tool.type !== 'tool') {
            return res.status(404).json({ success: false, message: 'Tool not found' });
        }

        if (tool.status === 'Assigned') {
            return res.status(400).json({ 
                success: false, 
                message: `Tool is already assigned to ${tool.currentAssignment?.staffName || 'another staff'}` 
            });
        }
        if (tool.status === 'In Repair') {
            return res.status(400).json({ success: false, message: 'Tool is currently undergoing repair and cannot be assigned' });
        }
        if (tool.status === 'Total Loss') {
            return res.status(400).json({ success: false, message: 'Tool was classified as Total Loss and cannot be assigned' });
        }

        let assignedStaffName = staffName;
        let staffCode = '';
        if (staffId) {
            const user = await User.findById(staffId);
            if (user) {
                assignedStaffName = user.name;
                staffCode = user.staff_id || '';
            }
        }

        tool.status = 'Assigned';
        tool.currentAssignment = {
            staffId: staffId || undefined,
            staffName: assignedStaffName,
            staffCode,
            assignedDate: new Date(),
            returnByDate: new Date(returnByDate),
            purpose: purpose || 'Job / Workshop Usage',
            assignedBy: req.user?.name || 'Administrator'
        };

        await tool.save();
        res.json({ success: true, message: `Tool assigned to ${assignedStaffName}`, tool });
    } catch (err) {
        console.error('Assign tool error:', err);
        res.status(500).json({ success: false, message: 'Failed to assign tool', error: err.message });
    }
};

// ─── 7. Record Tool Return ──────────────────────────────────────────────────
exports.returnTool = async (req, res) => {
    try {
        const { id } = req.params;
        const { returnCondition, returnNotes, sendToRepair, repairIssueDescription, repairVendor } = req.body;

        const tool = await InventoryItem.findById(id);
        if (!tool || tool.type !== 'tool') {
            return res.status(404).json({ success: false, message: 'Tool not found' });
        }

        if (tool.status !== 'Assigned') {
            return res.status(400).json({ success: false, message: 'This tool is not currently marked as assigned' });
        }

        const assignment = tool.currentAssignment || {};
        const returnDate = new Date();
        const condition = returnCondition || 'Good';

        // Archive into assignment history
        tool.assignmentHistory.unshift({
            staffId: assignment.staffId,
            staffName: assignment.staffName || 'Staff Member',
            staffCode: assignment.staffCode,
            assignedDate: assignment.assignedDate || returnDate,
            returnByDate: assignment.returnByDate,
            actualReturnDate: returnDate,
            returnCondition: condition,
            returnNotes: returnNotes || '',
            assignedBy: assignment.assignedBy || 'Admin',
            receivedBy: req.user?.name || 'Store In-Charge'
        });

        // Clear active assignment
        tool.currentAssignment = undefined;
        tool.condition = condition;

        let createdRepair = null;
        const needsRepair = sendToRepair || condition === 'Needs Repair' || condition === 'Damaged';

        if (needsRepair) {
            tool.status = 'In Repair';
            // Automatically spawn a repair ticket
            createdRepair = new ToolRepair({
                toolId: tool._id,
                toolName: tool.name,
                toolCode: tool.code,
                reportedBy: req.user?.name || assignment.staffName || 'Staff Return',
                reportedDate: returnDate,
                issueDescription: repairIssueDescription || returnNotes || `Tool returned in ${condition} condition needing service`,
                repairVendor: repairVendor || 'In-House Workshop',
                status: 'Pending',
                outcome: 'Pending'
            });
            await createdRepair.save();
        } else {
            tool.status = 'Available';
        }

        await tool.save();

        res.json({ 
            success: true, 
            message: needsRepair ? 'Tool returned and sent to repairs' : 'Tool returned and made available',
            tool,
            repair: createdRepair
        });
    } catch (err) {
        console.error('Return tool error:', err);
        res.status(500).json({ success: false, message: 'Failed to record tool return', error: err.message });
    }
};

// ─── 8. Adjust Material Stock (IN, OUT, ADJUSTMENT) ─────────────────────────
exports.adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, quantity, reason, reference } = req.body;

        const qtyNum = Number(quantity);
        if (!qtyNum || qtyNum <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be a positive number' });
        }

        const material = await InventoryItem.findById(id);
        if (!material || material.type !== 'material') {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        const previousQuantity = material.quantity || 0;
        let newQuantity = previousQuantity;

        if (type === 'IN') {
            newQuantity = previousQuantity + qtyNum;
        } else if (type === 'OUT') {
            if (previousQuantity < qtyNum) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient stock. Current available: ${previousQuantity} ${material.unit}` 
                });
            }
            newQuantity = previousQuantity - qtyNum;
        } else if (type === 'ADJUSTMENT') {
            newQuantity = qtyNum; // Set exact quantity
        } else {
            return res.status(400).json({ success: false, message: 'Invalid movement type (IN, OUT, ADJUSTMENT)' });
        }

        material.quantity = newQuantity;
        material.stockMovements.unshift({
            type,
            quantity: qtyNum,
            previousQuantity,
            newQuantity,
            reason: reason || 'Manual Stock Update',
            reference: reference || '',
            performedBy: req.user?.name || 'Administrator',
            date: new Date()
        });

        await material.save();
        res.json({ success: true, message: 'Stock updated successfully', material });
    } catch (err) {
        console.error('Adjust stock error:', err);
        res.status(500).json({ success: false, message: 'Failed to update stock', error: err.message });
    }
};

// ─── 9. Get Repair Tickets ──────────────────────────────────────────────────
exports.getRepairs = async (req, res) => {
    try {
        const { status, outcome, search } = req.query;
        const query = {};

        if (status && status !== 'All') query.status = status;
        if (outcome && outcome !== 'All') query.outcome = outcome;

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            query.$or = [
                { toolName: regex },
                { toolCode: regex },
                { repairVendor: regex },
                { issueDescription: regex }
            ];
        }

        const repairs = await ToolRepair.find(query).sort({ reportedDate: -1, createdAt: -1 });
        res.json({ success: true, count: repairs.length, repairs });
    } catch (err) {
        console.error('Error fetching repairs:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch repairs', error: err.message });
    }
};

// ─── 10. Create Repair Ticket Manually ──────────────────────────────────────
exports.createRepair = async (req, res) => {
    try {
        const { toolId, issueDescription, repairVendor, repairCost } = req.body;

        if (!toolId || !issueDescription) {
            return res.status(400).json({ success: false, message: 'Tool and issue description are required' });
        }

        const tool = await InventoryItem.findById(toolId);
        if (!tool || tool.type !== 'tool') {
            return res.status(404).json({ success: false, message: 'Tool not found' });
        }

        const repair = new ToolRepair({
            toolId: tool._id,
            toolName: tool.name,
            toolCode: tool.code,
            reportedBy: req.user?.name || 'Store Supervisor',
            reportedDate: new Date(),
            issueDescription,
            repairVendor: repairVendor || 'In-House Workshop',
            status: 'In Workshop',
            repairCost: Number(repairCost) || 0,
            outcome: 'Pending'
        });

        await repair.save();

        // Update tool status
        tool.status = 'In Repair';
        tool.condition = 'Needs Repair';
        await tool.save();

        res.status(201).json({ success: true, message: 'Tool sent for repair', repair, tool });
    } catch (err) {
        console.error('Create repair error:', err);
        res.status(500).json({ success: false, message: 'Failed to create repair ticket', error: err.message });
    }
};

// ─── 11. Update Repair Ticket & Final Outcome (Repaired or Total loss) ───────
exports.updateRepair = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, repairCost, outcome, resolutionNotes, repairVendor } = req.body;

        const repair = await ToolRepair.findById(id);
        if (!repair) {
            return res.status(404).json({ success: false, message: 'Repair record not found' });
        }

        if (status) repair.status = status;
        if (repairVendor) repair.repairVendor = repairVendor;
        if (repairCost !== undefined) repair.repairCost = Number(repairCost) || 0;
        if (resolutionNotes !== undefined) repair.resolutionNotes = resolutionNotes;

        // Process final outcome if provided
        if (outcome && outcome !== 'Pending') {
            repair.outcome = outcome;
            repair.completionDate = new Date();

            const tool = await InventoryItem.findById(repair.toolId);
            if (tool) {
                if (outcome === 'Repaired') {
                    // Tool is restored and made Available again
                    repair.status = 'Repaired';
                    tool.status = 'Available';
                    tool.condition = 'Good';
                    tool.notes = tool.notes ? `${tool.notes} | Repaired: ${resolutionNotes || 'Serviced'}` : `Repaired: ${resolutionNotes || 'Serviced'}`;
                    await tool.save();
                } else if (outcome === 'Total loss') {
                    // Tool is decommissioned/removed from available inventory
                    repair.status = 'Total loss';
                    tool.status = 'Total Loss';
                    tool.condition = 'Total Loss';
                    tool.notes = tool.notes ? `${tool.notes} | Decommissioned as Total Loss` : 'Decommissioned as Total Loss';
                    await tool.save();
                }
            }
        }

        await repair.save();
        res.json({ success: true, message: `Repair record updated (${repair.outcome})`, repair });
    } catch (err) {
        console.error('Update repair error:', err);
        res.status(500).json({ success: false, message: 'Failed to update repair record', error: err.message });
    }
};

// ─── 12. Inventory Overview & Stats ─────────────────────────────────────────
exports.getStats = async (req, res) => {
    try {
        const [
            totalTools,
            availableTools,
            assignedTools,
            inRepairTools,
            totalLossTools,
            totalMaterials,
            allMaterials,
            repairs
        ] = await Promise.all([
            InventoryItem.countDocuments({ type: 'tool' }),
            InventoryItem.countDocuments({ type: 'tool', status: 'Available' }),
            InventoryItem.countDocuments({ type: 'tool', status: 'Assigned' }),
            InventoryItem.countDocuments({ type: 'tool', status: 'In Repair' }),
            InventoryItem.countDocuments({ type: 'tool', status: 'Total Loss' }),
            InventoryItem.countDocuments({ type: 'material' }),
            InventoryItem.find({ type: 'material' }, 'quantity minThreshold'),
            ToolRepair.find({}, 'repairCost status outcome')
        ]);

        const lowStockCount = allMaterials.filter(m => (m.quantity || 0) <= (m.minThreshold || 0)).length;
        const totalRepairSpend = repairs.reduce((acc, r) => acc + (Number(r.repairCost) || 0), 0);
        const activeRepairsCount = repairs.filter(r => r.status !== 'Repaired' && r.status !== 'Total loss').length;

        res.json({
            success: true,
            stats: {
                tools: {
                    total: totalTools,
                    available: availableTools,
                    assigned: assignedTools,
                    inRepair: inRepairTools,
                    totalLoss: totalLossTools
                },
                materials: {
                    total: totalMaterials,
                    lowStock: lowStockCount
                },
                repairs: {
                    active: activeRepairsCount,
                    totalLogged: repairs.length,
                    totalSpend: totalRepairSpend
                }
            }
        });
    } catch (err) {
        console.error('Inventory stats error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch inventory stats', error: err.message });
    }
};
