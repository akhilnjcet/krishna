import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Truck, Plus, ArrowRight, AlertTriangle, CheckCircle2, 
    X, RefreshCw, Clock, FileText, User, ShieldCheck, MapPin, Building,
    Scale, Package
} from 'lucide-react';

const StockTransfersTab = ({ materials = [], warehouses = [], onRefreshWarehouses }) => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [companyVehicles, setCompanyVehicles] = useState([]);
    const [loadingVehicles, setLoadingVehicles] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);

    // Form state for creating transfer
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
    const [transportMethod, setTransportMethod] = useState('Internal Vehicle');
    const [vehicleMode, setVehicleMode] = useState('saved'); // 'saved' | 'manual'
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleName, setVehicleName] = useState('');
    const [driverName, setDriverName] = useState('');
    const [driverPhone, setDriverPhone] = useState('');
    const [totalWeight, setTotalWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState('Kg');
    const [notes, setNotes] = useState('');

    // State for receiving transfer
    const [receivedItems, setReceivedItems] = useState([]);

    useEffect(() => {
        fetchTransfers();
        fetchCompanyVehicles();
    }, []);

    const fetchTransfers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/stock-transfers');
            if (res.data.success) {
                setTransfers(res.data.transfers);
            }
        } catch (err) {
            console.error('Error fetching transfers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanyVehicles = async () => {
        setLoadingVehicles(true);
        try {
            const res = await api.get('/vehicles');
            if (res.data?.success && Array.isArray(res.data.vehicles)) {
                setCompanyVehicles(res.data.vehicles);
            }
        } catch (err) {
            console.warn('Could not load company fleet vehicles:', err);
        } finally {
            setLoadingVehicles(false);
        }
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
            if (v.assignedDriverName || v.assignedDriverId?.name) {
                setDriverName(v.assignedDriverName || v.assignedDriverId?.name || '');
            }
            if (v.assignedDriverId?.phone) {
                setDriverPhone(v.assignedDriverId.phone);
            }
        }
    };

    const handleOpenCreateModal = () => {
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
            // 0 warehouses saved - allow direct manual entry without requiring warehouses
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
            setDriverName(firstV.assignedDriverName || firstV.assignedDriverId?.name || '');
            setDriverPhone(firstV.assignedDriverId?.phone || '');
        } else {
            setVehicleMode('manual');
            setSelectedVehicleId('');
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

    const handleCreateTransferSubmit = async (e) => {
        e.preventDefault();

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

        // Prevent choosing identical source and destination
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
                driverName: (driverName || '').trim(),
                driverPhone: (driverPhone || '').trim(),
                totalWeight: totalWeight !== '' && totalWeight !== null ? Number(totalWeight) : null,
                weightUnit: weightUnit || 'Kg',
                notes
            };

            const res = await api.post('/stock-transfers', payload);
            if (res.data.success) {
                setShowCreateModal(false);
                if (saveSourceLoc || saveDestLoc) {
                    if (typeof onRefreshWarehouses === 'function') {
                        onRefreshWarehouses();
                    }
                }
                fetchTransfers();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating transfer request');
        }
    };

    const handleDispatch = async (transferId) => {
        if (!window.confirm('Dispatch goods now? Stock will be deducted from source location and marked In Transit.')) return;
        try {
            const res = await api.put(`/stock-transfers/${transferId}/dispatch`);
            if (res.data.success) {
                fetchTransfers();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to dispatch transfer');
        }
    };

    const handleOpenReceive = (transfer) => {
        setSelectedTransfer(transfer);
        setReceivedItems(transfer.items.map(it => ({
            _id: it._id,
            inventoryItemId: it.inventoryItemId,
            itemName: it.itemName,
            unit: it.unit,
            dispatchedQuantity: it.dispatchedQuantity,
            receivedQuantity: it.dispatchedQuantity,
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
            if (res.data.success) {
                setShowReceiveModal(false);
                fetchTransfers();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to receive transfer');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Requested':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200';
            case 'In Transit':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200';
            case 'Received':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200';
            case 'Discrepancy Reported':
                return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200';
            default:
                return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
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
                            <div key={tr._id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-300 transition bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2.5">
                                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
                                            {tr.transferNumber}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${getStatusBadge(tr.status)}`}>
                                            {tr.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs">
                                        {tr.status === 'Requested' && (
                                            <button
                                                onClick={() => handleDispatch(tr._id)}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <Truck className="w-3.5 h-3.5" /> Approve & Dispatch
                                            </button>
                                        )}
                                        {tr.status === 'In Transit' && (
                                            <button
                                                onClick={() => handleOpenReceive(tr)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Receive & Reconcile
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Route:</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                                            <span>{tr.sourceWarehouseName}</span>
                                            {tr.isManualSource && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md font-normal" title={tr.sourceAddress || 'Manual location'}>
                                                    Manual
                                                </span>
                                            )}
                                            <ArrowRight className="w-3 h-3 text-slate-400" />
                                            <span>{tr.destinationWarehouseName}</span>
                                            {tr.isManualDestination && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md font-normal" title={tr.destinationAddress || 'Manual location'}>
                                                    Manual
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicle:</span>{' '}
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {tr.vehicleNumber ? `${tr.vehicleNumber}${tr.vehicleName ? ` (${tr.vehicleName})` : ''} · ${tr.driverName || 'Driver'}` : tr.transportMethod}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Requested:</span>{' '}
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {new Date(tr.createdAt).toLocaleDateString()} by {tr.requestedByName}
                                        </span>
                                    </div>
                                </div>

                                {/* Items table */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase text-slate-400">Transferred Line Items:</span>
                                        {tr.totalWeight && (
                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                <Scale className="w-3 h-3" /> Cargo Wt: {tr.totalWeight} {tr.weightUnit || 'Kg'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        {tr.items.map((it, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs flex-wrap gap-2">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">{it.itemName}</span>
                                                    {it.isManualItem && (
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded font-medium border border-amber-200 dark:border-amber-800">
                                                            Manual / Unlisted
                                                        </span>
                                                    )}
                                                    {it.weight && (
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            ({it.weight} {it.weightUnit || 'Kg'})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-500">Requested: {it.requestedQuantity} {it.unit}</span>
                                                    {it.dispatchedQuantity > 0 && (
                                                        <span className="text-blue-600 font-bold">Dispatched: {it.dispatchedQuantity}</span>
                                                    )}
                                                    {it.receivedQuantity > 0 && (
                                                        <span className="text-emerald-600 font-black">Received: {it.receivedQuantity}</span>
                                                    )}
                                                    {it.damagedQuantity > 0 && (
                                                        <span className="text-rose-600 font-bold">Damaged: {it.damagedQuantity}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Create Transfer Request */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                Create Stock Transfer Request
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTransferSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                                {/* Source Location */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                            <Building className="w-3.5 h-3.5 text-blue-500" /> Source Location *
                                        </label>
                                        {warehouses.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (sourceMode === 'saved') {
                                                        setSourceMode('manual');
                                                    } else {
                                                        setSourceMode('saved');
                                                        if (!sourceW && warehouses.length > 0) setSourceW(warehouses[0]._id);
                                                    }
                                                }}
                                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {sourceMode === 'saved' ? '✏️ Enter manually' : '📁 Choose saved'}
                                            </button>
                                        )}
                                    </div>

                                    {sourceMode === 'saved' && warehouses.length > 0 ? (
                                        <div>
                                            <select
                                                required
                                                value={sourceW}
                                                onChange={(e) => {
                                                    if (e.target.value === '__MANUAL__') {
                                                        setSourceMode('manual');
                                                        setSourceW('');
                                                    } else {
                                                        setSourceW(e.target.value);
                                                    }
                                                }}
                                                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-medium"
                                            >
                                                <option value="">Select Origin Location...</option>
                                                {warehouses.map(w => (
                                                    <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                                                ))}
                                                <option value="__MANUAL__">✏️ Enter location manually...</option>
                                            </select>
                                            {sourceW && (
                                                <p className="text-[10px] text-slate-400 mt-1 truncate">
                                                    {warehouses.find(w => w._id === sourceW)?.address || 'Saved warehouse'}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Location name (e.g. Site A / Main Yard) *"
                                                    value={sourceManualName}
                                                    onChange={(e) => setSourceManualName(e.target.value)}
                                                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-medium"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Location address / landmark (optional)"
                                                    value={sourceManualAddress}
                                                    onChange={(e) => setSourceManualAddress(e.target.value)}
                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-700 dark:text-slate-200 text-xs"
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer pt-0.5 text-[11px] text-slate-600 dark:text-slate-400 select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={saveSourceLoc}
                                                    onChange={(e) => setSaveSourceLoc(e.target.checked)}
                                                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                                />
                                                <span>Save this location for future reuse</span>
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* Destination Location */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Destination Location *
                                        </label>
                                        {warehouses.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (destMode === 'saved') {
                                                        setDestMode('manual');
                                                    } else {
                                                        setDestMode('saved');
                                                        const fallback = warehouses.find(w => w._id !== sourceW) || warehouses[0];
                                                        if (!destW && fallback) setDestW(fallback._id);
                                                    }
                                                }}
                                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {destMode === 'saved' ? '✏️ Enter manually' : '📁 Choose saved'}
                                            </button>
                                        )}
                                    </div>

                                    {destMode === 'saved' && warehouses.length > 0 ? (
                                        <div>
                                            <select
                                                required
                                                value={destW}
                                                onChange={(e) => {
                                                    if (e.target.value === '__MANUAL__') {
                                                        setDestMode('manual');
                                                        setDestW('');
                                                    } else {
                                                        setDestMode('saved');
                                                        setDestW(e.target.value);
                                                    }
                                                }}
                                                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-medium"
                                            >
                                                <option value="">Select Destination...</option>
                                                {warehouses.filter(w => sourceMode !== 'saved' || w._id !== sourceW).map(w => (
                                                    <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                                                ))}
                                                <option value="__MANUAL__">✏️ Enter location manually...</option>
                                            </select>
                                            {destW && (
                                                <p className="text-[10px] text-slate-400 mt-1 truncate">
                                                    {warehouses.find(w => w._id === destW)?.address || 'Saved warehouse'}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Location name (e.g. Site B / Client Premise) *"
                                                    value={destManualName}
                                                    onChange={(e) => setDestManualName(e.target.value)}
                                                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-medium"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Location address / landmark (optional)"
                                                    value={destManualAddress}
                                                    onChange={(e) => setDestManualAddress(e.target.value)}
                                                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-700 dark:text-slate-200 text-xs"
                                                />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer pt-0.5 text-[11px] text-slate-600 dark:text-slate-400 select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={saveDestLoc}
                                                    onChange={(e) => setSaveDestLoc(e.target.checked)}
                                                    className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                                />
                                                <span>Save this location for future reuse</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Item Rows */}
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5 text-blue-500" /> Materials to Transfer *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddItemRow}
                                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 text-xs"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Material Line
                                    </button>
                                </div>

                                {itemsList.map((row, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-black uppercase text-slate-500">
                                                Line #{idx + 1} &middot; {row.isManualItem ? 'Custom / Unlisted Material' : 'Inventory Catalog Material'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...itemsList];
                                                        const nextIsManual = !row.isManualItem;
                                                        updated[idx].isManualItem = nextIsManual;
                                                        if (nextIsManual) {
                                                            updated[idx].inventoryItemId = '';
                                                            if (!updated[idx].unit) updated[idx].unit = 'Pcs';
                                                        } else {
                                                            const fallback = materials[0];
                                                            updated[idx].inventoryItemId = fallback?._id || '';
                                                            updated[idx].itemName = fallback?.name || '';
                                                            updated[idx].itemCode = fallback?.code || '';
                                                            updated[idx].unit = fallback?.unit || 'Pcs';
                                                        }
                                                        setItemsList(updated);
                                                    }}
                                                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                >
                                                    {row.isManualItem ? '📦 Select from inventory' : '✏️ Enter material manually'}
                                                </button>
                                                {itemsList.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItemRow(idx)}
                                                        className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                        title="Remove item line"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {row.isManualItem ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                                <div className="sm:col-span-6">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Material Name *</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="e.g. MS Angle 50x50x6 / Custom Flange"
                                                        value={row.itemName || ''}
                                                        onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-100 text-xs font-medium"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Quantity *</label>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        required
                                                        placeholder="Qty"
                                                        value={row.requestedQuantity}
                                                        onChange={(e) => handleItemChange(idx, 'requestedQuantity', e.target.value)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold outline-none text-slate-800 dark:text-slate-100 text-xs"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Unit</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Pcs, Kg, Mtr"
                                                        value={row.unit || 'Pcs'}
                                                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-100 text-xs text-center"
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5" title="Optional weight">
                                                        Weight (Kg) <span className="text-[8px] font-normal lowercase">(opt)</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        placeholder="Optional"
                                                        value={row.weight || ''}
                                                        onChange={(e) => handleItemChange(idx, 'weight', e.target.value)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right outline-none text-slate-700 dark:text-slate-300 text-xs"
                                                        title="Optional weight in Kg (leave blank if unavailable)"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                                <div className="sm:col-span-6">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Select Catalog Material *</label>
                                                    <select
                                                        required
                                                        value={row.inventoryItemId}
                                                        onChange={(e) => {
                                                            if (e.target.value === '__MANUAL__') {
                                                                const updated = [...itemsList];
                                                                updated[idx].isManualItem = true;
                                                                updated[idx].inventoryItemId = '';
                                                                updated[idx].itemName = '';
                                                                updated[idx].unit = 'Pcs';
                                                                setItemsList(updated);
                                                            } else {
                                                                const selMat = materials.find(m => m._id === e.target.value);
                                                                const updated = [...itemsList];
                                                                updated[idx].inventoryItemId = e.target.value;
                                                                if (selMat) {
                                                                    updated[idx].itemName = selMat.name;
                                                                    updated[idx].itemCode = selMat.code || '';
                                                                    updated[idx].unit = selMat.unit || 'Pcs';
                                                                }
                                                                setItemsList(updated);
                                                            }
                                                        }}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-100 text-xs font-medium"
                                                    >
                                                        <option value="">Select Material / Item...</option>
                                                        {materials.map(m => (
                                                            <option key={m._id} value={m._id}>
                                                                {m.name} ({m.quantity} {m.unit} in stock){m.location ? ` - ${m.location}` : ''}
                                                            </option>
                                                        ))}
                                                        <option value="__MANUAL__">✏️ Enter material manually (not listed)...</option>
                                                    </select>
                                                </div>
                                                <div className="sm:col-span-3">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Quantity ({row.unit || 'Pcs'}) *</label>
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="any"
                                                        required
                                                        placeholder="Qty"
                                                        value={row.requestedQuantity}
                                                        onChange={(e) => handleItemChange(idx, 'requestedQuantity', e.target.value)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right font-bold outline-none text-slate-800 dark:text-slate-100 text-xs"
                                                    />
                                                </div>
                                                <div className="sm:col-span-3">
                                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5" title="Optional weight">
                                                        Weight (Kg) <span className="text-[8px] font-normal lowercase">(opt)</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        placeholder="Optional"
                                                        value={row.weight || ''}
                                                        onChange={(e) => handleItemChange(idx, 'weight', e.target.value)}
                                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-right outline-none text-slate-700 dark:text-slate-300 text-xs"
                                                        title="Optional weight in Kg (leave blank if unavailable)"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Transport Vehicle & Dispatch Details */}
                            <div className="space-y-3 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                        <Truck className="w-3.5 h-3.5 text-blue-500" /> Transport Vehicle & Dispatch Details
                                    </label>
                                    {companyVehicles.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (vehicleMode === 'saved') {
                                                    setVehicleMode('manual');
                                                    setSelectedVehicleId('');
                                                } else {
                                                    setVehicleMode('saved');
                                                    if (companyVehicles.length > 0) {
                                                        handleSelectCompanyVehicle(companyVehicles[0]._id);
                                                    }
                                                }
                                            }}
                                            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            {vehicleMode === 'saved' ? '✏️ Enter vehicle manually' : '🚛 Select company vehicle'}
                                        </button>
                                    )}
                                </div>

                                {vehicleMode === 'saved' && companyVehicles.length > 0 ? (
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Company Fleet Vehicle</label>
                                            <select
                                                value={selectedVehicleId}
                                                onChange={(e) => handleSelectCompanyVehicle(e.target.value)}
                                                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 font-medium text-xs"
                                            >
                                                <option value="">Select Company Vehicle...</option>
                                                {companyVehicles.map(v => (
                                                    <option key={v._id} value={v._id}>
                                                        {v.registrationNumber} &middot; {v.vehicleName || v.vehicleType || 'Vehicle'} {v.assignedDriverName ? `(Driver: ${v.assignedDriverName})` : ''}
                                                    </option>
                                                ))}
                                                <option value="__MANUAL__">✏️ Enter vehicle details manually...</option>
                                            </select>
                                        </div>
                                        {selectedVehicleId && (
                                            <div className="text-[11px] text-slate-500 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                                <span>
                                                    Selected: <strong className="text-slate-800 dark:text-slate-200 font-mono">{vehicleNumber}</strong> {vehicleName ? `(${vehicleName})` : ''}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                                                    Fleet Verified
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Vehicle Registration / No</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. KL-07-CD-1234 / External Truck"
                                                value={vehicleNumber}
                                                onChange={(e) => setVehicleNumber(e.target.value)}
                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 text-xs font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Vehicle Model / Description (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Tata 407 / Mahindra Bolero / 3rd Party Truck"
                                                value={vehicleName}
                                                onChange={(e) => setVehicleName(e.target.value)}
                                                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 text-xs"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Transport Method, Driver Name & Phone, Optional Consignment Weight */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Transport Method</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Internal Vehicle, Courier"
                                            value={transportMethod}
                                            onChange={(e) => setTransportMethod(e.target.value)}
                                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Driver Name</label>
                                        <input
                                            type="text"
                                            placeholder="Driver full name"
                                            value={driverName}
                                            onChange={(e) => setDriverName(e.target.value)}
                                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Driver Contact Phone</label>
                                        <input
                                            type="text"
                                            placeholder="+91 9876543210"
                                            value={driverPhone}
                                            onChange={(e) => setDriverPhone(e.target.value)}
                                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1">
                                            <Scale className="w-3 h-3 text-amber-500" />
                                            <span>Consignment Wt</span>
                                            <span className="text-slate-400 font-normal lowercase">(opt)</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            placeholder="e.g. 500 Kg"
                                            value={totalWeight}
                                            onChange={(e) => setTotalWeight(e.target.value)}
                                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100 text-xs text-right"
                                            title="Consignment cargo weight in Kg (optional - leave blank if not weighed)"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Transfer Purpose / Notes</label>
                                <textarea
                                    rows="2"
                                    placeholder="Purpose of transfer, site urgency, handling instructions..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md"
                                >
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Receive & Reconcile Transfer */}
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
                                        <div>
                                            <input
                                                type="text"
                                                placeholder="Remarks or discrepancy explanation..."
                                                value={it.discrepancyNotes}
                                                onChange={(e) => {
                                                    const updated = [...receivedItems];
                                                    updated[idx].discrepancyNotes = e.target.value;
                                                    setReceivedItems(updated);
                                                }}
                                                className="w-full p-1.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                                            />
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
        </div>
    );
};

export default StockTransfersTab;
