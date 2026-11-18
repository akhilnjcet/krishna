const Warehouse = require('../models/Warehouse');
const StockTransfer = require('../models/StockTransfer');
const InventoryItem = require('../models/InventoryItem');

// ─── WAREHOUSE LOCATION MANAGEMENT ───

// @desc Get all warehouses/locations
// @route GET /api/warehouses
exports.getAllWarehouses = async (req, res) => {
    try {
        const warehouses = await Warehouse.find().sort({ createdAt: -1 });
        res.json({ success: true, count: warehouses.length, warehouses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Create a new warehouse location
// @route POST /api/warehouses
exports.createWarehouse = async (req, res) => {
    try {
        const { name, code, type, address, managerId, managerName, managerPhone, capacityNotes } = req.body;
        if (!name || !code) {
            return res.status(400).json({ success: false, message: 'Name and Code are required' });
        }

        const existing = await Warehouse.findOne({ $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }] });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Warehouse with this Name or Code already exists' });
        }

        const warehouse = await Warehouse.create({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            type: type || 'Main Warehouse',
            address: address || '',
            managerId: managerId || null,
            managerName: managerName || '',
            managerPhone: managerPhone || '',
            capacityNotes: capacityNotes || ''
        });

        res.status(201).json({ success: true, warehouse });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Update warehouse details
// @route PUT /api/warehouses/:id
exports.updateWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse not found' });
        }
        res.json({ success: true, warehouse });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Get location-wise stock breakdown across all items
// @route GET /api/warehouses/stock-overview
exports.getLocationStockOverview = async (req, res) => {
    try {
        const { warehouseId } = req.query;
        const warehouses = await Warehouse.find({ status: 'Active' });
        const items = await InventoryItem.find();

        const stockMatrix = warehouses.map(w => {
            const locId = w._id.toString();
            let totalItems = 0;
            let totalQuantity = 0;
            let totalValuation = 0;

            const matchingItems = [];

            items.forEach(item => {
                let locQty = 0;
                // If item has explicit locationStock entry for this warehouse
                if (Array.isArray(item.locationStock)) {
                    const found = item.locationStock.find(ls => ls.warehouseId && ls.warehouseId.toString() === locId);
                    if (found) {
                        locQty = Number(found.quantity) || 0;
                    }
                }
                // Fallback: If no locationStock array yet, assign default location to Main Warehouse
                if (locQty === 0 && (!item.locationStock || item.locationStock.length === 0)) {
                    if (w.name.toLowerCase().includes('main') || w.type === 'Main Warehouse') {
                        locQty = Number(item.quantity) || 0;
                    }
                }

                if (locQty > 0) {
                    totalItems += 1;
                    totalQuantity += locQty;
                    totalValuation += locQty * (Number(item.unitPrice) || Number(item.purchaseCost) || 0);
                    matchingItems.push({
                        _id: item._id,
                        name: item.name,
                        code: item.code,
                        type: item.type,
                        category: item.category,
                        unit: item.unit,
                        quantity: locQty,
                        unitPrice: item.unitPrice || 0,
                        minThreshold: item.minThreshold || 5,
                        isLowStock: locQty <= (item.minThreshold || 5)
                    });
                }
            });

            return {
                warehouse: {
                    _id: w._id,
                    name: w.name,
                    code: w.code,
                    type: w.type,
                    managerName: w.managerName,
                    address: w.address
                },
                totalItems,
                totalQuantity,
                totalValuation: parseFloat(totalValuation.toFixed(2)),
                items: matchingItems
            };
        });

        if (warehouseId) {
            const single = stockMatrix.find(m => m.warehouse._id.toString() === warehouseId);
            return res.json({ success: true, stockOverview: single || null });
        }

        res.json({ success: true, stockMatrix });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── STOCK TRANSFERS WORKFLOW ───

// @desc Get all stock transfers
// @route GET /api/stock-transfers
exports.getAllStockTransfers = async (req, res) => {
    try {
        const { status, warehouseId } = req.query;
        const query = {};
        if (status) query.status = status;
        if (warehouseId) {
            query.$or = [{ sourceWarehouseId: warehouseId }, { destinationWarehouseId: warehouseId }];
        }

        const transfers = await StockTransfer.find(query).sort({ createdAt: -1 });
        res.json({ success: true, count: transfers.length, transfers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Create a Stock Transfer Request
// @route POST /api/stock-transfers
exports.createStockTransfer = async (req, res) => {
    try {
        const { 
            sourceWarehouseId, 
            destinationWarehouseId, 
            projectId, 
            projectTitle,
            items, 
            transportMethod, 
            vehicleNumber, 
            driverName, 
            driverPhone, 
            notes 
        } = req.body;

        if (!sourceWarehouseId || !destinationWarehouseId) {
            return res.status(400).json({ success: false, message: 'Source and destination warehouses are required' });
        }
        if (sourceWarehouseId.toString() === destinationWarehouseId.toString()) {
            return res.status(400).json({ success: false, message: 'Source and destination cannot be identical' });
        }
        if (!items || !items.length) {
            return res.status(400).json({ success: false, message: 'At least one item must be added to transfer' });
        }

        const [sourceW, destW] = await Promise.all([
            Warehouse.findById(sourceWarehouseId),
            Warehouse.findById(destinationWarehouseId)
        ]);
        if (!sourceW || !destW) {
            return res.status(404).json({ success: false, message: 'Specified warehouse not found' });
        }

        // Validate items and source stock availability
        const formattedItems = [];
        for (const it of items) {
            const inv = await InventoryItem.findById(it.inventoryItemId);
            if (!inv) {
                return res.status(404).json({ success: false, message: `Item ${it.itemName || it.inventoryItemId} not found` });
            }

            // Check stock in source warehouse
            let sourceQty = 0;
            if (Array.isArray(inv.locationStock)) {
                const found = inv.locationStock.find(ls => ls.warehouseId && ls.warehouseId.toString() === sourceWarehouseId.toString());
                if (found) sourceQty = Number(found.quantity) || 0;
            }
            if (sourceQty === 0 && (!inv.locationStock || inv.locationStock.length === 0)) {
                // If not yet sharded, check total quantity
                sourceQty = Number(inv.quantity) || 0;
            }

            const reqQty = Number(it.requestedQuantity) || 0;
            if (reqQty <= 0) {
                return res.status(400).json({ success: false, message: `Invalid requested quantity for ${inv.name}` });
            }
            if (reqQty > sourceQty) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient stock at ${sourceW.name} for ${inv.name}. Available: ${sourceQty}, Requested: ${reqQty}` 
                });
            }

            formattedItems.push({
                inventoryItemId: inv._id,
                itemName: inv.name,
                itemCode: inv.code || '',
                unit: inv.unit || 'Pcs',
                requestedQuantity: reqQty,
                dispatchedQuantity: reqQty,
                receivedQuantity: 0,
                conditionOnArrival: 'Good'
            });
        }

        const transferNumber = `ST-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const transfer = await StockTransfer.create({
            transferNumber,
            sourceWarehouseId: sourceW._id,
            sourceWarehouseName: sourceW.name,
            destinationWarehouseId: destW._id,
            destinationWarehouseName: destW.name,
            projectId: projectId || null,
            projectTitle: projectTitle || '',
            items: formattedItems,
            status: 'Requested',
            transportMethod: transportMethod || 'Internal Vehicle',
            vehicleNumber: vehicleNumber || '',
            driverName: driverName || '',
            driverPhone: driverPhone || '',
            notes: notes || '',
            requestedBy: req.user ? req.user._id : null,
            requestedByName: req.user ? req.user.name : 'Store Staff',
            auditTrail: [{
                action: 'REQUESTED',
                performedBy: req.user ? req.user.name : 'Store Staff',
                timestamp: new Date(),
                details: `Transfer request created for ${formattedItems.length} line items.`
            }]
        });

        res.status(201).json({ success: true, transfer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Approve & Dispatch Stock Transfer (Deducts stock from source warehouse)
// @route PUT /api/stock-transfers/:id/dispatch
exports.dispatchStockTransfer = async (req, res) => {
    try {
        const transfer = await StockTransfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }
        if (transfer.status !== 'Requested' && transfer.status !== 'Approved') {
            return res.status(400).json({ success: false, message: `Cannot dispatch transfer in status ${transfer.status}` });
        }

        const sourceLocId = transfer.sourceWarehouseId.toString();

        // Atomic deduction from source warehouse
        for (const it of transfer.items) {
            const inv = await InventoryItem.findById(it.inventoryItemId);
            if (!inv) continue;

            const qty = Number(it.requestedQuantity);
            it.dispatchedQuantity = qty;

            // Deduct from locationStock
            if (Array.isArray(inv.locationStock)) {
                let found = inv.locationStock.find(ls => ls.warehouseId && ls.warehouseId.toString() === sourceLocId);
                if (found) {
                    found.quantity = Math.max(0, (Number(found.quantity) || 0) - qty);
                } else {
                    // Create entry
                    inv.locationStock.push({
                        warehouseId: transfer.sourceWarehouseId,
                        warehouseName: transfer.sourceWarehouseName,
                        quantity: 0
                    });
                }
            }

            // Log movement
            inv.stockMovements.push({
                type: 'OUT',
                quantity: qty,
                reference: transfer.transferNumber,
                reason: `Transfer dispatched to ${transfer.destinationWarehouseName}`,
                performedBy: req.user ? req.user.name : 'Warehouse Admin',
                date: new Date()
            });

            await inv.save();
        }

        transfer.status = 'In Transit';
        transfer.approvedBy = req.user ? req.user._id : null;
        transfer.approvedByName = req.user ? req.user.name : 'Warehouse Admin';
        transfer.approvedAt = new Date();
        transfer.dispatchedBy = req.user ? req.user._id : null;
        transfer.dispatchedByName = req.user ? req.user.name : 'Warehouse Admin';
        transfer.dispatchedAt = new Date();
        transfer.auditTrail.push({
            action: 'DISPATCHED',
            performedBy: req.user ? req.user.name : 'Warehouse Admin',
            timestamp: new Date(),
            details: `Goods dispatched in transit. Stock deducted from ${transfer.sourceWarehouseName}.`
        });

        await transfer.save();
        res.json({ success: true, message: 'Transfer dispatched successfully', transfer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Receive Stock Transfer at destination (Credits destination stock, handles discrepancies)
// @route PUT /api/stock-transfers/:id/receive
exports.receiveStockTransfer = async (req, res) => {
    try {
        const { receivedItems } = req.body;
        const transfer = await StockTransfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }
        if (transfer.status !== 'In Transit') {
            return res.status(400).json({ success: false, message: `Transfer is not In Transit (status: ${transfer.status})` });
        }

        const destLocId = transfer.destinationWarehouseId.toString();
        let hasDiscrepancy = false;

        // Process each item received
        for (const item of transfer.items) {
            const userUpdate = Array.isArray(receivedItems) 
                ? receivedItems.find(r => r._id?.toString() === item._id.toString() || r.inventoryItemId?.toString() === item.inventoryItemId.toString())
                : null;

            const recQty = userUpdate ? Number(userUpdate.receivedQuantity) : item.dispatchedQuantity;
            const damQty = userUpdate ? Number(userUpdate.damagedQuantity) || 0 : 0;
            const misQty = userUpdate ? Number(userUpdate.missingQuantity) || 0 : 0;
            const condition = userUpdate ? userUpdate.conditionOnArrival || 'Good' : 'Good';
            const discNotes = userUpdate ? userUpdate.discrepancyNotes || '' : '';

            item.receivedQuantity = recQty;
            item.damagedQuantity = damQty;
            item.missingQuantity = misQty;
            item.conditionOnArrival = condition;
            item.discrepancyNotes = discNotes;

            if (recQty < item.dispatchedQuantity || damQty > 0 || misQty > 0) {
                hasDiscrepancy = true;
            }

            // Credit received quantity to destination warehouse
            const inv = await InventoryItem.findById(item.inventoryItemId);
            if (inv) {
                if (!Array.isArray(inv.locationStock)) {
                    inv.locationStock = [];
                }
                let destEntry = inv.locationStock.find(ls => ls.warehouseId && ls.warehouseId.toString() === destLocId);
                if (destEntry) {
                    destEntry.quantity = (Number(destEntry.quantity) || 0) + recQty;
                } else {
                    inv.locationStock.push({
                        warehouseId: transfer.destinationWarehouseId,
                        warehouseName: transfer.destinationWarehouseName,
                        quantity: recQty,
                        minThreshold: 5
                    });
                }

                // If goods were damaged or missing, overall total quantity decreases by difference
                const discrepancyLoss = Math.max(0, item.dispatchedQuantity - recQty);
                if (discrepancyLoss > 0) {
                    inv.quantity = Math.max(0, (Number(inv.quantity) || 0) - discrepancyLoss);
                }

                inv.stockMovements.push({
                    type: 'IN',
                    quantity: recQty,
                    reference: transfer.transferNumber,
                    reason: `Transfer received at ${transfer.destinationWarehouseName}${discrepancyLoss > 0 ? ` (Loss: ${discrepancyLoss})` : ''}`,
                    performedBy: req.user ? req.user.name : 'Store In-Charge',
                    date: new Date()
                });

                await inv.save();
            }
        }

        transfer.status = hasDiscrepancy ? 'Discrepancy Reported' : 'Received';
        transfer.receivedBy = req.user ? req.user._id : null;
        transfer.receivedByName = req.user ? req.user.name : 'Store In-Charge';
        transfer.receivedAt = new Date();
        transfer.auditTrail.push({
            action: hasDiscrepancy ? 'DISCREPANCY_REPORTED' : 'RECEIVED',
            performedBy: req.user ? req.user.name : 'Store In-Charge',
            timestamp: new Date(),
            details: hasDiscrepancy 
                ? 'Transfer received with quantity discrepancies or damages reported.' 
                : `Transfer received in full. Stock credited to ${transfer.destinationWarehouseName}.`
        });

        await transfer.save();
        res.json({ success: true, message: 'Stock received and reconciled', transfer });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── BARCODE & QR CODE RAPID ACTIONS ───

// @desc Resolve item by scanned QR code, barcode, or ID
// @route GET /api/inventory/scan-lookup/:code
exports.scanLookup = async (req, res) => {
    try {
        const { code } = req.params;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Scan code is required' });
        }

        const trimmed = code.trim();
        // Query by qrCode, barcode, item code, or ObjectId
        let query = {
            $or: [
                { qrCode: trimmed },
                { barcode: trimmed },
                { code: trimmed }
            ]
        };

        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(trimmed)) {
            query.$or.push({ _id: trimmed });
        }

        const item = await InventoryItem.findOne(query);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found for scanned code' });
        }

        res.json({
            success: true,
            item: {
                _id: item._id,
                name: item.name,
                code: item.code,
                qrCode: item.qrCode || `KE-INV-${item._id.toString().slice(-6).toUpperCase()}`,
                barcode: item.barcode || item.code,
                type: item.type,
                category: item.category,
                location: item.location,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                condition: item.condition,
                status: item.status,
                locationStock: item.locationStock || [],
                recentMovements: (item.stockMovements || []).slice(-5).reverse()
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Record quick stock transaction via scanner (IN / OUT / TRANSFER)
// @route POST /api/inventory/scan-action
exports.scanAction = async (req, res) => {
    try {
        const { itemId, actionType, quantity, warehouseId, reference, reason } = req.body;
        if (!itemId || !actionType || !quantity) {
            return res.status(400).json({ success: false, message: 'Item, action type, and quantity are required' });
        }

        const item = await InventoryItem.findById(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        const qty = Number(quantity);
        if (qty <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be greater than zero' });
        }

        const prevQty = item.quantity;
        if (actionType === 'OUT') {
            if (qty > item.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock. Current: ${item.quantity}, Requested: ${qty}` });
            }
            item.quantity -= qty;
        } else if (actionType === 'IN') {
            item.quantity += qty;
        }

        // Update locationStock if warehouseId provided
        if (warehouseId && Array.isArray(item.locationStock)) {
            const locEntry = item.locationStock.find(ls => ls.warehouseId && ls.warehouseId.toString() === warehouseId.toString());
            if (locEntry) {
                if (actionType === 'OUT') {
                    locEntry.quantity = Math.max(0, (Number(locEntry.quantity) || 0) - qty);
                } else if (actionType === 'IN') {
                    locEntry.quantity = (Number(locEntry.quantity) || 0) + qty;
                }
            }
        }

        item.stockMovements.push({
            type: actionType,
            quantity: qty,
            previousQuantity: prevQty,
            newQuantity: item.quantity,
            reason: reason || `Scanned ${actionType} transaction`,
            reference: reference || 'QR_BARCODE_SCAN',
            performedBy: req.user ? req.user.name : 'Scanner Operator',
            date: new Date()
        });

        await item.save();
        res.json({ 
            success: true, 
            message: `Stock updated successfully via scan. New quantity: ${item.quantity} ${item.unit}`,
            newQuantity: item.quantity 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
