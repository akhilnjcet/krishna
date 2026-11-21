import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Truck, Plus, ArrowRight, AlertTriangle, CheckCircle2, 
    X, RefreshCw, Clock, FileText, User, ShieldCheck, MapPin, Building,
    Scale, Package, Calendar, Phone, Check, Eye
} from 'lucide-react';

const StockTransfersTab = ({ materials = [], warehouses = [], onRefreshWarehouses }) => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [companyVehicles, setCompanyVehicles] = useState([]);
    const [companyDrivers, setCompanyDrivers] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [submittingAction, setSubmittingAction] = useState(false);

    // Form state for creating transfer
    const [previewTransferId, setPreviewTransferId] = useState('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
    const [plannedDispatchDate, setPlannedDispatchDate] = useState(new Date().toISOString().slice(0, 16));
    const [sourceMode, setSourceMode] = useState('saved'); // 'saved' | 'manual'
    const [sourceW, setSourceW] = useState('');
    const [sourceManualName, setSourceManualName] = useState('');
    const [sourceManualAddress, setSourceManualAddress] = useState('');
    const [saveSourceLoc, setSaveSourceLoc] = useState(false);

    const [destMode, setDestMode] = useState('saved'); // 'saved' | 'manual'
    const [destW, setDestW] = useState('');
    const [destManualName, setDestManualName] = useState('');
    const [destManualAddress, setDestManualAddress] = useState('');
    const [saveDestLoc, setSaveDestLoc] = useState(false);

    const [itemsList, setItemsList] = useState([
        { isManualItem: false, inventoryItemId: '', itemName: '', itemCode: '', unit: 'Pcs', requestedQuantity: 1, weight: '', weightUnit: 'Kg' }
    ]);
    const [packageCount, setPackageCount] = useState(1);
    const [loadingSupervisor, setLoadingSupervisor] = useState('');
    const [handlingInstructions, setHandlingInstructions] = useState('');
    const [attachmentUrl, setAttachmentUrl] = useState('');

    const [transportMethod, setTransportMethod] = useState('Internal Vehicle');
    const [vehicleMode, setVehicleMode] = useState('saved'); // 'saved' | 'manual'
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleName, setVehicleName] = useState('');
    const [selectedDriverId, setSelectedDriverId] = useState('');
    const [driverName, setDriverName] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [totalWeight, setTotalWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState('Kg');
    const [notes, setNotes] = useState('');

    // State for assigning trip modal
    const [assignDriverId, setAssignDriverId] = useState('');
    const [assignVehicleId, setAssignVehicleId] = useState('');
    const [assignPickupTime, setAssignPickupTime] = useState(new Date().toISOString().slice(0, 16));
    const [assignInstructions, setAssignInstructions] = useState('');

    // State for receiving & verifying transfer
    const [receivedItems, setReceivedItems] = useState([]);

    useEffect(() => {
        fetchTransfers();
        fetchFleetData();
    }, []);

    const fetchTransfers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/stock-transfers');
            if (res.data?.success) {
                setTransfers(res.data.transfers || []);
            }
        } catch (err) {
            console.error('Error fetching transfers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFleetData = async () => {
        try {
            const [vehsRes, driversRes] = await Promise.all([
                api.get('/vehicles'),
                api.get('/drivers')
            ]);
            if (vehsRes.data?.success && Array.isArray(vehsRes.data.vehicles)) {
                setCompanyVehicles(vehsRes.data.vehicles);
            }
            if (driversRes.data?.success && Array.isArray(driversRes.data.drivers)) {
                setCompanyDrivers(driversRes.data.drivers);
            }
        } catch (err) {
            console.warn('Could not load company fleet:', err);
        }
    };

    // Calculate available stock for item in selected source warehouse
    const getItemAvailableStock = (itemId) => {
        if (!itemId) return 0;
        const item = materials.find(m => m._id === itemId);
        if (!item) return 0;
        if (sourceMode === 'saved' && sourceW && Array.isArray(item.locationStock) && item.locationStock.length > 0) {
            const found = item.locationStock.find(ls => ls.warehouseId === sourceW || (ls.warehouseId?._id && ls.warehouseId._id === sourceW));
            if (found) return Number(found.quantity) || 0;
        }
        return Number(item.quantity) || 0;
    };

    const handleSelectCompanyVehicle = (vehId) => {
        if (vehId === '__MANUAL__') {
            setVehicleMode('manual');
            setSelectedVehicleId('');
            return;
        }
        setSelectedVehicleId(vehId);
        const v = companyVehicles.find(veh => veh._id === vehId);
        if (v) {
            setVehicleNumber(v.registrationNumber || '');
            setVehicleName(v.vehicleName || v.vehicleType || '');
            if (v.assignedDriverId?._id || v.assignedDriverId) {
                const dId = v.assignedDriverId?._id || v.assignedDriverId;
                setSelectedDriverId(dId);
                const d = companyDrivers.find(drv => drv._id === dId);
                if (d) {
                    setDriverName(d.name || '');
                    setDriverPhone(d.phone || '');
                }
            }
        }
    };

    const handleSelectDriver = (dId) => {
        setSelectedDriverId(dId);
        const d = companyDrivers.find(drv => drv._id === dId);
        if (d) {
            setDriverName(d.name || '');
            setDriverPhone(d.phone || '');
        }
    };

    const handleOpenCreateModal = () => {
        setPreviewTransferId(`ST-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`);
        setTransferDate(new Date().toISOString().slice(0, 10));
        setPlannedDispatchDate(new Date().toISOString().slice(0, 16));
        setPackageCount(1);
        setLoadingSupervisor('');
        setHandlingInstructions('');
        setAttachmentUrl('');

        if (warehouses && warehouses.length >= 2) {
            setSourceMode('saved');
            setSourceW(warehouses[0]._id);
            setDestMode('saved');
            setDestW(warehouses[1]._id);
        } else if (warehouses && warehouses.length === 1) {
            setSourceMode('saved');
            setSourceW(warehouses[0]._id);
            setDestMode('manual');
            setDestW('');
        } else {
            setSourceMode('manual');
            setSourceW('');
            setDestMode('manual');
            setDestW('');
        }
        setSourceManualName('');
        setSourceManualAddress('');
        setSaveSourceLoc(false);
        setDestManualName('');
        setDestManualAddress('');
        setSaveDestLoc(false);

        // Vehicle Setup
        if (companyVehicles && companyVehicles.length > 0) {
            setVehicleMode('saved');
            const firstV = companyVehicles[0];
            setSelectedVehicleId(firstV._id);
            setVehicleNumber(firstV.registrationNumber || '');
            setVehicleName(firstV.vehicleName || firstV.vehicleType || '');
            if (firstV.assignedDriverId?._id || firstV.assignedDriverId) {
                const dId = firstV.assignedDriverId?._id || firstV.assignedDriverId;
                setSelectedDriverId(dId);
                const d = companyDrivers.find(drv => drv._id === dId);
                if (d) {
                    setDriverName(d.name || '');
                    setDriverPhone(d.phone || '');
                }
            }
        } else {
            setVehicleMode('manual');
            setSelectedVehicleId('');
            setSelectedDriverId('');
            setVehicleNumber('');
            setVehicleName('');
            setDriverName('');
            setDriverPhone('');
        }

        const firstMat = materials[0];
        setItemsList([{
            isManualItem: false,
            inventoryItemId: firstMat?._id || '',
            itemName: firstMat?.name || '',
            itemCode: firstMat?.code || '',
            unit: firstMat?.unit || 'Pcs',
            requestedQuantity: 1,
            weight: '',
            weightUnit: 'Kg'
        }]);
        setTransportMethod('Internal Vehicle');
        setTotalWeight('');
        setWeightUnit('Kg');
        setNotes('');
        setShowCreateModal(true);
    };

    const handleAddItemRow = () => {
        const firstMat = materials[0];
        setItemsList([
            ...itemsList,
            {
                isManualItem: false,
                inventoryItemId: firstMat?._id || '',
                itemName: firstMat?.name || '',
                itemCode: firstMat?.code || '',
                unit: firstMat?.unit || 'Pcs',
                requestedQuantity: 1,
                weight: '',
                weightUnit: 'Kg'
            }
        ]);
    };

    const handleRemoveItemRow = (index) => {
        setItemsList(itemsList.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...itemsList];
        updated[index][field] = value;
        setItemsList(updated);
    };

    // Generic submit supporting Draft, Schedule, or Dispatch
    const handleCreateTransferSubmit = async (e, actionType = 'schedule') => {
        if (e && e.preventDefault) e.preventDefault();

        // Source validation
        const effectiveSourceName = sourceMode === 'saved'
            ? (warehouses.find(w => w._id === sourceW)?.name || '')
            : sourceManualName.trim();

        if (!effectiveSourceName) {
            alert('Source location is required.');
            return;
        }

        // Destination validation
        const effectiveDestName = destMode === 'saved'
            ? (warehouses.find(w => w._id === destW)?.name || '')
            : destManualName.trim();

        if (!effectiveDestName) {
            alert('Destination location is required.');
            return;
        }

        if (sourceMode === 'saved' && destMode === 'saved' && sourceW === destW) {
            alert('Source and destination locations cannot be identical.');
            return;
        }

        if (effectiveSourceName.toLowerCase() === effectiveDestName.toLowerCase()) {
            alert('Source and destination locations cannot be identical.');
            return;
        }

        const validItems = itemsList.filter(it => {
            const qty = Number(it.requestedQuantity);
            if (qty <= 0) return false;
            if (it.isManualItem) {
                return Boolean(it.itemName && it.itemName.trim());
            }
            return Boolean(it.inventoryItemId && it.inventoryItemId !== '__MANUAL__');
        });

        if (!validItems.length) {
            alert('Please add at least one material with a valid name and quantity.');
            return;
        }

        // Stock availability check for catalog materials
        if (actionType !== 'draft') {
            for (const it of validItems) {
                if (!it.isManualItem && it.inventoryItemId) {
                    const avail = getItemAvailableStock(it.inventoryItemId);
                    if (Number(it.requestedQuantity) > avail) {
                        alert(`Requested quantity (${it.requestedQuantity}) for "${it.itemName}" exceeds available stock (${avail}) at ${effectiveSourceName}. Please adjust.`);
                        return;
                    }
                }
            }
        }

        setSubmittingAction(true);
        try {
            const payload = {
                sourceWarehouseId: sourceMode === 'saved' ? sourceW : null,
                sourceLocationName: effectiveSourceName,
                sourceAddress: sourceMode === 'saved' 
                    ? (warehouses.find(w => w._id === sourceW)?.address || '') 
                    : sourceManualAddress.trim(),
                isManualSource: sourceMode === 'manual',
                saveSourceLocation: sourceMode === 'manual' ? saveSourceLoc : false,

                destinationWarehouseId: destMode === 'saved' ? destW : null,
                destinationLocationName: effectiveDestName,
                destinationAddress: destMode === 'saved' 
                    ? (warehouses.find(w => w._id === destW)?.address || '') 
                    : destManualAddress.trim(),
                isManualDestination: destMode === 'manual',
                saveDestinationLocation: destMode === 'manual' ? saveDestLoc : false,

                items: validItems.map(it => ({
                    isManualItem: Boolean(it.isManualItem),
                    inventoryItemId: it.isManualItem ? null : it.inventoryItemId,
                    itemName: it.isManualItem 
                        ? it.itemName.trim() 
                        : (materials.find(m => m._id === it.inventoryItemId)?.name || it.itemName || 'Material'),
                    itemCode: it.itemCode || '',
                    unit: it.unit || 'Pcs',
                    requestedQuantity: Number(it.requestedQuantity),
                    weight: it.weight !== undefined && it.weight !== null && it.weight !== '' ? Number(it.weight) : null,
                    weightUnit: it.weightUnit || weightUnit || 'Kg'
                })),
                transportMethod,
                vehicleId: vehicleMode === 'saved' && selectedVehicleId ? selectedVehicleId : null,
                vehicleNumber: (vehicleNumber || '').trim().toUpperCase(),
                vehicleName: (vehicleName || '').trim(),
                isManualVehicle: vehicleMode === 'manual',
                driverId: selectedDriverId || null,
                driverName: (driverName || '').trim(),
                driverPhone: (driverPhone || '').trim(),
                plannedDispatchDate: plannedDispatchDate || null,
                packageCount: Number(packageCount) || 1,
                loadingSupervisor: (loadingSupervisor || '').trim(),
                handlingInstructions: (handlingInstructions || '').trim(),
                attachments: attachmentUrl ? [{ name: 'Challan / Bill', fileUrl: attachmentUrl }] : [],
                totalWeight: totalWeight !== '' && totalWeight !== null ? Number(totalWeight) : null,
                weightUnit: weightUnit || 'Kg',
                notes,
                actionType // 'draft' | 'schedule' | 'dispatch'
            };

            const res = await api.post('/stock-transfers', payload);
            if (res.data?.success) {
                setShowCreateModal(false);
                if (saveSourceLoc || saveDestLoc) {
                    if (typeof onRefreshWarehouses === 'function') {
                        onRefreshWarehouses();
                    }
                }
                fetchTransfers();
                alert(`Stock transfer ${res.data.transfer?.transferNumber || ''} created successfully (${actionType.toUpperCase()}).`);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating transfer request');
        } finally {
            setSubmittingAction(false);
        }
    };

    // Assign Trip Modal Open
    const handleOpenAssignModal = (transfer) => {
        setSelectedTransfer(transfer);
        setAssignDriverId(transfer.driverId || (companyDrivers[0]?._id || ''));
        setAssignVehicleId(transfer.vehicleId || (companyVehicles[0]?._id || ''));
        setAssignPickupTime(transfer.plannedDispatchDate ? new Date(transfer.plannedDispatchDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
        setAssignInstructions(transfer.handlingInstructions || transfer.notes || '');
        setShowAssignModal(true);
    };

    const handleAssignTripSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTransfer) return;
        setSubmittingAction(true);
        try {
            const res = await api.put(`/stock-transfers/${selectedTransfer._id}/assign-trip`, {
                driverId: assignDriverId,
                vehicleId: assignVehicleId,
                pickupDateTime: assignPickupTime,
                specialInstructions: assignInstructions
            });
            if (res.data?.success) {
                setShowAssignModal(false);
                fetchTransfers();
                alert(`Driver and vehicle assigned! Linked to ${res.data.trip?.tripNumber || 'Trip'}.`);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to assign trip.');
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleDispatch = async (transferId) => {
        if (!window.confirm('Dispatch goods now? Stock will be deducted from source location and marked In Transit.')) return;
        try {
            const res = await api.put(`/stock-transfers/${transferId}/dispatch`);
            if (res.data?.success) {
                fetchTransfers();
                alert('Transfer dispatched successfully and stock deducted from origin warehouse.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error dispatching transfer');
        }
    };

    // Open Receive Modal
    const handleOpenReceive = (transfer) => {
        setSelectedTransfer(transfer);
        setReceivedItems(transfer.items.map(it => ({
            _id: it._id,
            inventoryItemId: it.inventoryItemId,
            itemName: it.itemName,
            unit: it.unit,
            dispatchedQuantity: it.dispatchedQuantity || it.requestedQuantity,
            receivedQuantity: it.dispatchedQuantity || it.requestedQuantity,
            damagedQuantity: 0,
            missingQuantity: 0,
            conditionOnArrival: 'Good',
            discrepancyNotes: ''
        })));
        setShowReceiveModal(true);
    };

    const handleReceiveSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put(`/stock-transfers/${selectedTransfer._id}/receive`, {
                receivedItems
            });
            if (res.data?.success) {
                setShowReceiveModal(false);
                fetchTransfers();
                alert('Stock received and credited to destination warehouse.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error receiving transfer');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Draft': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
            case 'Requested': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300';
            case 'Approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300';
            case 'In Transit': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 animate-pulse';
            case 'Received': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300';
            case 'Discrepancy Reported': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300';
            case 'Reconciled': return 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-400 font-black';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
                        <Truck className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Inter-Location Stock Transfers
                        </h2>
                        <p className="text-xs text-slate-500">
                            Strict transfer chain-of-custody: Request → Approval → Dispatch → Transit → Verification & Reconciliation
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchTransfers}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        title="Refresh Transfers"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleOpenCreateModal}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition"
                    >
                        <Plus className="w-4 h-4" /> New Transfer Request
                    </button>
                </div>
            </div>

            {/* Transfers List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">Loading stock transfer ledger...</div>
                ) : transfers.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-bold">No stock transfers recorded yet.</div>
                ) : (
                    <div className="space-y-4">
                        {transfers.map(tr => (
                            <div key={tr._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 transition bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                                            {tr.transferNumber}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(tr.status)}`}>
                                            {tr.status}
                                        </span>
                                        {tr.tripNumber && (
                                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                                Linked Trip: {tr.tripNumber}
                                            </span>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 text-xs flex-wrap">
                                        {tr.tripNumber && (
                                            <button
                                                onClick={() => {
                                                    setSelectedTransfer(tr);
                                                    setShowTimelineModal(true);
                                                }}
                                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 flex items-center gap-1"
                                            >
                                                <Clock className="w-3.5 h-3.5 text-blue-500" /> Timeline
                                            </button>
                                        )}

                                        {(tr.status === 'Draft' || tr.status === 'Requested') && (
                                            <button
                                                onClick={() => handleOpenAssignModal(tr)}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <User className="w-3.5 h-3.5" /> Assign Driver & Vehicle
                                            </button>
                                        )}

                                        {(tr.status === 'Requested' || tr.status === 'Approved') && (
                                            <button
                                                onClick={() => handleDispatch(tr._id)}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <Truck className="w-3.5 h-3.5" /> Approve & Dispatch
                                            </button>
                                        )}

                                        {(tr.status === 'In Transit' || tr.status === 'Discrepancy Reported') && (
                                            <button
                                                onClick={() => handleOpenReceive(tr)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Receive & Reconcile
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Route:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                                            <span>{tr.sourceWarehouseName}</span>
                                            <ArrowRight className="w-3 h-3 text-slate-400" />
                                            <span>{tr.destinationWarehouseName}</span>
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Transport:</span>{' '}
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {tr.vehicleNumber ? `${tr.vehicleNumber} · ${tr.driverName || 'Driver'}` : tr.transportMethod}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Packages & Weight:</span>{' '}
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {tr.packageCount || 1} Pkgs {tr.totalWeight ? `(${tr.totalWeight} ${tr.weightUnit || 'Kg'})` : ''}
                                        </span>
                                    </div>
                                </div>

                                {/* Items list preview */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                                        <span>Line Items ({tr.items?.length || 0}):</span>
                                        {tr.loadingSupervisor && <span>Supervisor: {tr.loadingSupervisor}</span>}
                                    </div>
                                    {tr.items?.map((it, idx) => (
                                        <div key={idx} className="flex justify-between items-center">
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{it.itemName}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-slate-500">Req: {it.requestedQuantity} {it.unit}</span>
                                                {it.dispatchedQuantity > 0 && <span className="text-blue-600 font-bold">Disp: {it.dispatchedQuantity}</span>}
                                                {it.receivedQuantity > 0 && <span className="text-emerald-600 font-black">Recv: {it.receivedQuantity}</span>}
                                                {it.damagedQuantity > 0 && <span className="text-rose-600 font-bold">Dam: {it.damagedQuantity}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL 1: CREATE STOCK TRANSFER (WITH DRAFT / SCHEDULE / DISPATCH ACTIONS) */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-blue-600" /> New Stock Transfer Request
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Transfer ID: <span className="font-mono font-bold text-blue-600">{previewTransferId}</span>
                                </p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={(e) => handleCreateTransferSubmit(e, 'schedule')} className="space-y-4 text-xs">
                            {/* Transfer Date & Planned Dispatch */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Transfer Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={transferDate}
                                        onChange={(e) => setTransferDate(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Planned Dispatch Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={plannedDispatchDate}
                                        onChange={(e) => setPlannedDispatchDate(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            {/* Source and Destination */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Origin / Source Warehouse *</label>
                                    <select
                                        value={sourceW}
                                        onChange={(e) => setSourceW(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    >
                                        <option value="">Select Origin...</option>
                                        {warehouses.map(w => (
                                            <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Destination Location / Site *</label>
                                    <select
                                        value={destW}
                                        onChange={(e) => setDestW(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    >
                                        <option value="">Select Destination...</option>
                                        {warehouses.filter(w => w._id !== sourceW).map(w => (
                                            <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Line items with available stock validation */}
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase text-slate-500">Materials to Transfer *</label>
                                    <button
                                        type="button"
                                        onClick={handleAddItemRow}
                                        className="text-blue-600 font-bold hover:underline flex items-center gap-1 text-xs"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Material Line
                                    </button>
                                </div>

                                {itemsList.map((row, idx) => {
                                    const availStock = getItemAvailableStock(row.inventoryItemId);
                                    const isExceeded = !row.isManualItem && Number(row.requestedQuantity) > availStock;

                                    return (
                                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-black uppercase text-slate-500">
                                                    Line #{idx + 1}
                                                </span>
                                                {itemsList.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItemRow(idx)}
                                                        className="text-rose-500 p-1 hover:bg-rose-50 rounded"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                                <div className="sm:col-span-6">
                                                    <select
                                                        value={row.inventoryItemId}
                                                        onChange={(e) => {
                                                            const selMat = materials.find(m => m._id === e.target.value);
                                                            const copy = [...itemsList];
                                                            copy[idx].inventoryItemId = e.target.value;
                                                            if (selMat) {
                                                                copy[idx].itemName = selMat.name;
                                                                copy[idx].itemCode = selMat.code || '';
                                                                copy[idx].unit = selMat.unit || 'Pcs';
                                                            }
                                                            setItemsList(copy);
                                                        }}
                                                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                                    >
                                                        <option value="">Select Catalog Material...</option>
                                                        {materials.map(m => (
                                                            <option key={m._id} value={m._id}>
                                                                {m.name} ({m.quantity} {m.unit} total)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="sm:col-span-3">
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        required
                                                        placeholder="Qty"
                                                        value={row.requestedQuantity}
                                                        onChange={(e) => handleItemChange(idx, 'requestedQuantity', e.target.value)}
                                                        className={`w-full p-2 bg-white dark:bg-slate-900 border rounded-lg text-xs text-right font-bold ${
                                                            isExceeded ? 'border-rose-500 text-rose-600' : 'border-slate-200 dark:border-slate-700'
                                                        }`}
                                                    />
                                                </div>

                                                <div className="sm:col-span-3 text-right">
                                                    <span className="text-[10px] text-slate-400 block">Unit: {row.unit}</span>
                                                    {!row.isManualItem && row.inventoryItemId && (
                                                        <span className={`text-[10px] font-bold block ${isExceeded ? 'text-rose-500' : 'text-slate-500'}`}>
                                                            Avail: {availStock} {row.unit}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {isExceeded && (
                                                <p className="text-[10px] text-rose-500 font-bold">
                                                    ⚠️ Warning: Requested quantity exceeds current available stock at origin location.
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Loading Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Number of Packages / Bundles</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={packageCount}
                                        onChange={(e) => setPackageCount(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Approx Load Weight (Kg)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="e.g. 500"
                                        value={totalWeight}
                                        onChange={(e) => setTotalWeight(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-right font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Loading Supervisor</label>
                                    <input
                                        type="text"
                                        placeholder="Supervisor name"
                                        value={loadingSupervisor}
                                        onChange={(e) => setLoadingSupervisor(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            {/* Driver and Vehicle Assignment (Optional at creation) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Assign Driver (Optional)</label>
                                    <select
                                        value={selectedDriverId}
                                        onChange={(e) => handleSelectDriver(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    >
                                        <option value="">Assign Later or Select Driver...</option>
                                        {companyDrivers.map(d => (
                                            <option key={d._id} value={d._id}>{d.name} ({d.phone || 'No phone'})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Assign Vehicle (Optional)</label>
                                    <select
                                        value={selectedVehicleId}
                                        onChange={(e) => handleSelectCompanyVehicle(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                    >
                                        <option value="">Assign Later or Select Vehicle...</option>
                                        {companyVehicles.map(v => (
                                            <option key={v._id} value={v._id}>{v.registrationNumber} &middot; {v.vehicleName || v.vehicleType}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Special instructions & attachments */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Special Handling Instructions</label>
                                    <input
                                        type="text"
                                        placeholder="Handle with care, keep dry, crane required..."
                                        value={handlingInstructions}
                                        onChange={(e) => setHandlingInstructions(e.target.value)}
                                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Attachment / Challan Image URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://... document or challan link"
                                        value={attachmentUrl}
                                        onChange={(e) => setAttachmentUrl(e.target.value)}
                                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    />
                                </div>
                            </div>

                            {/* ACTION BUTTONS: Draft, Assign, Schedule, Dispatch */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={submittingAction}
                                    onClick={(e) => handleCreateTransferSubmit(e, 'draft')}
                                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                                >
                                    Save as Draft
                                </button>
                                <button
                                    type="button"
                                    disabled={submittingAction}
                                    onClick={(e) => handleCreateTransferSubmit(e, 'schedule')}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                                >
                                    Schedule Trip
                                </button>
                                <button
                                    type="button"
                                    disabled={submittingAction}
                                    onClick={(e) => handleCreateTransferSubmit(e, 'dispatch')}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black shadow-md flex items-center gap-1.5"
                                >
                                    <Truck className="w-4 h-4" /> Dispatch Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: ASSIGN DRIVER & VEHICLE */}
            {showAssignModal && selectedTransfer && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                    <User className="w-5 h-5 text-indigo-600" /> Assign Driver & Vehicle to Transfer
                                </h2>
                                <p className="text-xs text-slate-500 font-mono">{selectedTransfer.transferNumber}</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAssignTripSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Select Driver *</label>
                                <select
                                    required
                                    value={assignDriverId}
                                    onChange={(e) => setAssignDriverId(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                >
                                    <option value="">Select active driver...</option>
                                    {companyDrivers.map(d => (
                                        <option key={d._id} value={d._id}>{d.name} ({d.phone || 'No phone'})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Select Company Vehicle *</label>
                                <select
                                    required
                                    value={assignVehicleId}
                                    onChange={(e) => setAssignVehicleId(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                >
                                    <option value="">Select fleet vehicle...</option>
                                    {companyVehicles.map(v => (
                                        <option key={v._id} value={v._id}>{v.registrationNumber} &middot; {v.vehicleName || v.vehicleType}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Planned Pickup / Departure Time</label>
                                <input
                                    type="datetime-local"
                                    value={assignPickupTime}
                                    onChange={(e) => setAssignPickupTime(e.target.value)}
                                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Special Driver Instructions</label>
                                <textarea
                                    rows="2"
                                    placeholder="Route instructions or site handover rules..."
                                    value={assignInstructions}
                                    onChange={(e) => setAssignInstructions(e.target.value)}
                                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingAction}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                                >
                                    {submittingAction ? 'Assigning...' : 'Schedule Trip & Assign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: RECEIVE & RECONCILE TRANSFER */}
            {showReceiveModal && selectedTransfer && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <div>
                                <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Receive & Verify Transfer
                                </h2>
                                <p className="text-xs text-blue-600 font-bold">{selectedTransfer.transferNumber}</p>
                            </div>
                            <button onClick={() => setShowReceiveModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleReceiveSubmit} className="space-y-4 text-xs">
                            <p className="text-xs text-slate-500">
                                Verify physical arrival of materials at <strong>{selectedTransfer.destinationWarehouseName}</strong>. 
                                Mark any damaged or missing quantities below.
                            </p>

                            <div className="space-y-3">
                                {receivedItems.map((it, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                                        <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                                            <span>{it.itemName}</span>
                                            <span className="text-blue-600">Dispatched: {it.dispatchedQuantity} {it.unit}</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Good Received Qty</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={it.receivedQuantity}
                                                    onChange={(e) => {
                                                        const updated = [...receivedItems];
                                                        updated[idx].receivedQuantity = Number(e.target.value);
                                                        setReceivedItems(updated);
                                                    }}
                                                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-black"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-rose-500 block mb-0.5">Damaged Qty</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={it.damagedQuantity}
                                                    onChange={(e) => {
                                                        const updated = [...receivedItems];
                                                        updated[idx].damagedQuantity = Number(e.target.value);
                                                        setReceivedItems(updated);
                                                    }}
                                                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold text-rose-600"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-amber-500 block mb-0.5">Missing Qty</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={it.missingQuantity}
                                                    onChange={(e) => {
                                                        const updated = [...receivedItems];
                                                        updated[idx].missingQuantity = Number(e.target.value);
                                                        setReceivedItems(updated);
                                                    }}
                                                    className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold text-amber-600"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReceiveModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Confirm & Credit Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: 10-STAGE TIMELINE MODAL */}
            {showTimelineModal && selectedTransfer && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Transfer Chain-of-Custody Timeline
                                </h3>
                                <p className="text-xs text-blue-600 font-mono font-bold">
                                    {selectedTransfer.transferNumber} {selectedTransfer.tripNumber ? `• Trip: ${selectedTransfer.tripNumber}` : ''}
                                </p>
                            </div>
                            <button onClick={() => setShowTimelineModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {(selectedTransfer.auditTrail || []).map((au, i) => (
                                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 space-y-1">
                                    <div className="flex items-center justify-between font-bold">
                                        <span className="text-blue-600 dark:text-blue-400">{au.action}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(au.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 text-[11px]">{au.details}</p>
                                    <p className="text-[10px] text-slate-400">By: {au.performedBy}</p>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                onClick={() => setShowTimelineModal(false)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockTransfersTab;
