const mongoose = require('mongoose');
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
        const { name, code, type, address, managerId, managerName, managerPhone, capacityNotes, status } = req.body;
        
        if (name || code) {
            const orConditions = [];
            if (name) orConditions.push({ name: name.trim() });
            if (code) orConditions.push({ code: code.trim().toUpperCase() });

            const existing = await Warehouse.findOne({
                _id: { $ne: req.params.id },
                $or: orConditions
            });
            if (existing) {
                return res.status(400).json({ success: false, message: 'Another warehouse with this Name or Code already exists' });
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (code !== undefined) updateData.code = code.trim().toUpperCase();
        if (type !== undefined) updateData.type = type;
        if (address !== undefined) updateData.address = address;
        if (managerId !== undefined) updateData.managerId = managerId || null;
        if (managerName !== undefined) updateData.managerName = managerName;
        if (managerPhone !== undefined) updateData.managerPhone = managerPhone;
        if (capacityNotes !== undefined) updateData.capacityNotes = capacityNotes;
        if (status !== undefined) updateData.status = status;

        const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse location not found' });
        }
        res.json({ success: true, warehouse });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc Delete warehouse location
// @route DELETE /api/warehouses/:id
exports.deleteWarehouse = async (req, res) => {
    try {
        const warehouse = await Warehouse.findById(req.params.id);
        if (!warehouse) {
            return res.status(404).json({ success: false, message: 'Warehouse location not found' });
        }

        // Clean up or remove locationStock references in InventoryItem
        await InventoryItem.updateMany(
            { 'locationStock.warehouseId': warehouse._id },
            { $pull: { locationStock: { warehouseId: warehouse._id } } }
        );

        await Warehouse.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: `Warehouse location "${warehouse.name}" (${warehouse.code}) deleted successfully`
        });
    } catch (err) {
        console.error('deleteWarehouse error:', err);
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
            sourceLocationName,
            sourceAddress,
            isManualSource,
            saveSourceLocation,
            destinationWarehouseId, 
            destinationLocationName,
            destinationAddress,
            isManualDestination,
            saveDestinationLocation,
            projectId, 
            projectTitle,
            items, 
            transportMethod, 
            vehicleId,
            vehicleNumber,
            vehicleName,
            isManualVehicle,
            driverName, 
            driverPhone, 
            totalWeight,
            weightUnit,
            notes 
        } = req.body;

        if (!items || !items.length) {
            return res.status(400).json({ success: false, message: 'At least one item must be added to transfer' });
        }

        // --- RESOLVE SOURCE LOCATION ---
        let finalSourceId = null;
        let finalSourceName = '';
        let finalSourceAddress = (sourceAddress || '').trim();
        let manualSource = Boolean(isManualSource) || !sourceWarehouseId || sourceWarehouseId === '__MANUAL__';

        if (!manualSource && sourceWarehouseId && mongoose.Types.ObjectId.isValid(sourceWarehouseId)) {
            const foundSourceW = await Warehouse.findById(sourceWarehouseId);
            if (foundSourceW) {
                finalSourceId = foundSourceW._id;
                finalSourceName = foundSourceW.name;
                finalSourceAddress = foundSourceW.address || finalSourceAddress;
                manualSource = false;
            } else {
                manualSource = true;
                finalSourceName = (sourceLocationName || '').trim();
            }
        } else {
            manualSource = true;
            finalSourceName = (sourceLocationName || '').trim();
        }

        if (!finalSourceName) {
            return res.status(400).json({ success: false, message: 'Source location is required' });
        }

        // If user opted to save manual source location for future reuse
        if (manualSource && saveSourceLocation) {
            let existingW = await Warehouse.findOne({ name: { $regex: new RegExp(`^${finalSourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
            if (existingW) {
                finalSourceId = existingW._id;
                finalSourceName = existingW.name;
                manualSource = false;
            } else {
                const whCode = `LOC-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
                const createdW = await Warehouse.create({
                    name: finalSourceName,
                    code: whCode,
                    type: 'Project Site',
                    address: finalSourceAddress || '',
                    status: 'Active'
                });
                finalSourceId = createdW._id;
                finalSourceName = createdW.name;
                manualSource = false;
            }
        }

        // --- RESOLVE DESTINATION LOCATION ---
        let finalDestId = null;
        let finalDestName = '';
        let finalDestAddress = (destinationAddress || '').trim();
        let manualDest = Boolean(isManualDestination) || !destinationWarehouseId || destinationWarehouseId === '__MANUAL__';

        if (!manualDest && destinationWarehouseId && mongoose.Types.ObjectId.isValid(destinationWarehouseId)) {
            const foundDestW = await Warehouse.findById(destinationWarehouseId);
            if (foundDestW) {
                finalDestId = foundDestW._id;
                finalDestName = foundDestW.name;
                finalDestAddress = foundDestW.address || finalDestAddress;
                manualDest = false;
            } else {
                manualDest = true;
                finalDestName = (destinationLocationName || '').trim();
            }
        } else {
            manualDest = true;
            finalDestName = (destinationLocationName || '').trim();
        }

        if (!finalDestName) {
            return res.status(400).json({ success: false, message: 'Destination location is required' });
        }

        // If user opted to save manual destination location for future reuse
        if (manualDest && saveDestinationLocation) {
            let existingW = await Warehouse.findOne({ name: { $regex: new RegExp(`^${finalDestName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
            if (existingW) {
                finalDestId = existingW._id;
                finalDestName = existingW.name;
                manualDest = false;
            } else {
                const whCode = `LOC-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
                const createdW = await Warehouse.create({
                    name: finalDestName,
                    code: whCode,
                    type: 'Project Site',
                    address: finalDestAddress || '',
                    status: 'Active'
                });
                finalDestId = createdW._id;
                finalDestName = createdW.name;
                manualDest = false;
            }
        }

        // Prevent identical source and destination
        if (finalSourceId && finalDestId && finalSourceId.toString() === finalDestId.toString()) {
            return res.status(400).json({ success: false, message: 'Source and destination locations cannot be identical' });
        }
        if (finalSourceName.trim().toLowerCase() === finalDestName.trim().toLowerCase()) {
            return res.status(400).json({ success: false, message: 'Source and destination locations cannot be identical' });
        }

        // Validate items and source stock availability
        const formattedItems = [];
        for (const it of items) {
            const isManual = Boolean(it.isManualItem) || !it.inventoryItemId || it.inventoryItemId === '__MANUAL__';

            if (isManual) {
                const itemName = (it.itemName || '').trim();
                if (!itemName) {
                    return res.status(400).json({ success: false, message: 'Item name is required for manual material entry' });
                }
                const reqQty = Number(it.requestedQuantity) || 0;
                if (reqQty <= 0) {
                    return res.status(400).json({ success: false, message: `Invalid requested quantity for "${itemName}"` });
                }

                // If user checked saveToInventory or provided an item to register in inventory
                let savedInvId = null;
                if (it.saveToInventory) {
                    try {
                        const newInv = await InventoryItem.create({
                            name: itemName,
                            code: (it.itemCode || `MAT-${Date.now().toString().slice(-4)}`).trim().toUpperCase(),
                            category: it.category || 'Raw Materials',
                            type: 'material',
                            quantity: 0,
                            unit: it.unit || 'Pcs',
                            location: finalSourceName || 'Main Workshop Store'
                        });
                        savedInvId = newInv._id;
                    } catch (_) {}
                }

                formattedItems.push({
                    inventoryItemId: savedInvId || null,
                    itemName,
                    itemCode: it.itemCode || '',
                    unit: it.unit || 'Pcs',
                    requestedQuantity: reqQty,
                    dispatchedQuantity: reqQty,
                    receivedQuantity: 0,
                    weight: it.weight !== undefined && it.weight !== null && it.weight !== '' ? Number(it.weight) : null,
                    weightUnit: it.weightUnit || weightUnit || 'Kg',
                    isManualItem: true,
                    conditionOnArrival: 'Good'
                });
            } else {
                const inv = await InventoryItem.findById(it.inventoryItemId);
                if (!inv) {
                    return res.status(404).json({ success: false, message: `Item ${it.itemName || it.inventoryItemId} not found` });
                }

                // Check stock in source warehouse/location
                let sourceQty = 0;
                if (finalSourceId && Array.isArray(inv.locationStock) && inv.locationStock.length > 0) {
                    const found = inv.locationStock.find(ls => ls.warehouseId && ls.warehouseId.toString() === finalSourceId.toString());
                    if (found) {
                        sourceQty = Number(found.quantity) || 0;
                    } else {
                        sourceQty = Number(inv.quantity) || 0;
                    }
                } else {
                    // If manual source location or not sharded, check total inventory quantity
                    sourceQty = Number(inv.quantity) || 0;
                }

                const reqQty = Number(it.requestedQuantity) || 0;
                if (reqQty <= 0) {
                    return res.status(400).json({ success: false, message: `Invalid requested quantity for ${inv.name}` });
                }
                if (reqQty > sourceQty) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Insufficient stock at ${finalSourceName} for ${inv.name}. Available: ${sourceQty}, Requested: ${reqQty}` 
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
                    weight: it.weight !== undefined && it.weight !== null && it.weight !== '' ? Number(it.weight) : null,
                    weightUnit: it.weightUnit || weightUnit || 'Kg',
                    isManualItem: false,
                    conditionOnArrival: 'Good'
                });
            }
        }

        const transferNumber = `ST-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const transfer = await StockTransfer.create({
            transferNumber,
            sourceWarehouseId: finalSourceId || null,
            sourceWarehouseName: finalSourceName,
            destinationWarehouseId: finalDestId || null,
            destinationWarehouseName: finalDestName,
            isManualSource: manualSource,
            isManualDestination: manualDest,
            sourceAddress: finalSourceAddress || '',
            destinationAddress: finalDestAddress || '',
            projectId: projectId || null,
            projectTitle: projectTitle || '',
            items: formattedItems,
            status: 'Requested',
            transportMethod: transportMethod || 'Internal Vehicle',
            vehicleId: vehicleId || null,
            vehicleNumber: (vehicleNumber || '').trim().toUpperCase(),
            vehicleName: (vehicleName || '').trim(),
            isManualVehicle: Boolean(isManualVehicle),
            driverName: (driverName || '').trim(),
            driverPhone: (driverPhone || '').trim(),
            totalWeight: totalWeight !== undefined && totalWeight !== null && totalWeight !== '' ? Number(totalWeight) : null,
            weightUnit: weightUnit || 'Kg',
            notes: notes || '',
            requestedBy: req.user ? req.user._id : null,
            requestedByName: req.user ? req.user.name : 'Store Staff',
            auditTrail: [{
                action: 'REQUESTED',
                performedBy: req.user ? req.user.name : 'Store Staff',
                timestamp: new Date(),
                details: `Transfer request created from ${finalSourceName} to ${finalDestName} for ${formattedItems.length} line items.`
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

        const sourceLocId = transfer.sourceWarehouseId ? transfer.sourceWarehouseId.toString() : null;

        // Atomic deduction from source warehouse
        for (const it of transfer.items) {
            if (!it.inventoryItemId) continue; // Manual unlisted item without inventory tracking
            const inv = await InventoryItem.findById(it.inventoryItemId);
            if (!inv) continue;

            const qty = Number(it.requestedQuantity);
            it.dispatchedQuantity = qty;

            // Deduct from locationStock if source has warehouse ID
            if (sourceLocId && Array.isArray(inv.locationStock)) {
                let found = inv.locationStock.find(ls => ls.warehouseId && ls.warehouseId.toString() === sourceLocId);
                if (found) {
                    found.quantity = Math.max(0, (Number(found.quantity) || 0) - qty);
                } else {
                    inv.locationStock.push({
                        warehouseId: transfer.sourceWarehouseId,
                        warehouseName: transfer.sourceWarehouseName,
                        quantity: 0
                    });
                }
            }

            // Deduct from overall stock if transferring outside saved warehouses (e.g., manual destination)
            if (!transfer.destinationWarehouseId) {
                inv.quantity = Math.max(0, (Number(inv.quantity) || 0) - qty);
            }

            // Log movement
            inv.stockMovements.push({
                type: 'OUT',
                quantity: qty,
                reference: transfer.transferNumber,
                reason: `Transfer dispatched from ${transfer.sourceWarehouseName} to ${transfer.destinationWarehouseName}`,
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
            details: `Goods dispatched in transit. Stock dispatched from ${transfer.sourceWarehouseName} to ${transfer.destinationWarehouseName}.`
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

        const destLocId = transfer.destinationWarehouseId ? transfer.destinationWarehouseId.toString() : null;
        let hasDiscrepancy = false;

        // Process each item received
        for (const item of transfer.items) {
            const userUpdate = Array.isArray(receivedItems) 
                ? receivedItems.find(r => 
                    (r._id && item._id && r._id.toString() === item._id.toString()) || 
                    (r.inventoryItemId && item.inventoryItemId && r.inventoryItemId.toString() === item.inventoryItemId.toString())
                )
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

            // Credit received quantity to destination warehouse if it is a tracked warehouse
            const inv = item.inventoryItemId ? await InventoryItem.findById(item.inventoryItemId) : null;
            if (inv) {
                if (destLocId) {
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

                    // If source was a manual external location, receiving into our warehouse increases total stock
                    if (!transfer.sourceWarehouseId) {
                        inv.quantity = (Number(inv.quantity) || 0) + recQty;
                    }
                }

                // If goods were damaged or missing and destination was a warehouse, overall total quantity decreases by discrepancy loss
                const discrepancyLoss = Math.max(0, item.dispatchedQuantity - recQty);
                if (discrepancyLoss > 0 && transfer.destinationWarehouseId && transfer.sourceWarehouseId) {
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
