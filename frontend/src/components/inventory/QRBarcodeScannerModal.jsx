import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { 
    QrCode, Camera, Scan, Search, CheckCircle2, 
    AlertTriangle, X, ArrowDownRight, ArrowUpRight, Truck, RefreshCw 
} from 'lucide-react';

const QRBarcodeScannerModal = ({ isOpen, onClose, warehouses = [], onStockUpdated }) => {
    const [scanInput, setScanInput] = useState('');
    const [scannedItem, setScannedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionType, setActionType] = useState('IN'); // 'IN' | 'OUT'
    const [actionQty, setActionQty] = useState(1);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [reference, setReference] = useState('');
    const [actionMsg, setActionMsg] = useState(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const bufferRef = useRef('');
    const lastKeyTimeRef = useRef(Date.now());

    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setScannedItem(null);
            setScanInput('');
            setActionMsg(null);
            return;
        }

        if (warehouses.length > 0 && !selectedWarehouse) {
            setSelectedWarehouse(warehouses[0]._id);
        }

        // Global USB Barcode Scanner Keyboard Listener
        // USB scanners type characters rapidly (< 50ms) and send Enter (keyCode 13)
        const handleKeyDown = (e) => {
            const now = Date.now();
            if (now - lastKeyTimeRef.current > 100) {
                bufferRef.current = '';
            }
            lastKeyTimeRef.current = now;

            if (e.key === 'Enter') {
                if (bufferRef.current.length >= 3) {
                    performLookup(bufferRef.current.trim());
                    bufferRef.current = '';
                }
            } else if (e.key.length === 1) {
                bufferRef.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            stopCamera();
        };
    }, [isOpen]);

    const performLookup = async (code) => {
        if (!code) return;
        setLoading(true);
        setActionMsg(null);
        try {
            const res = await api.get(`/inventory/scan-lookup/${encodeURIComponent(code)}`);
            if (res.data.success) {
                setScannedItem(res.data.item);
                setScanInput(code);
                setActionQty(1);
            }
        } catch (err) {
            alert(err.response?.data?.message || `No inventory item matches code "${code}"`);
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        setIsCameraActive(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            // Check if native BarcodeDetector API is available (Android Chrome, Edge)
            if ('BarcodeDetector' in window) {
                const barcodeDetector = new window.BarcodeDetector({
                    formats: ['qr_code', 'code_128', 'ean_13', 'upc_a']
                });
                const scanInterval = setInterval(async () => {
                    if (!videoRef.current || videoRef.current.readyState < 2) return;
                    try {
                        const barcodes = await barcodeDetector.detect(videoRef.current);
                        if (barcodes.length > 0) {
                            clearInterval(scanInterval);
                            const detectedRaw = barcodes[0].rawValue;
                            stopCamera();
                            performLookup(detectedRaw);
                        }
                    } catch (_) {}
                }, 400);
            }
        } catch (err) {
            console.warn('Camera access error:', err);
            setIsCameraActive(false);
            alert('Camera could not be activated. You can use manual code search or USB scanner.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const handleExecuteScanAction = async (e) => {
        e.preventDefault();
        if (!scannedItem || Number(actionQty) <= 0) return;

        setLoading(true);
        try {
            const payload = {
                itemId: scannedItem._id,
                actionType,
                quantity: Number(actionQty),
                warehouseId: selectedWarehouse || undefined,
                reference: reference || 'QR_SCANNER',
                reason: `${actionType} transaction scanned via terminal`
            };

            const res = await api.post('/inventory/scan-action', payload);
            if (res.data.success) {
                setActionMsg({
                    type: 'success',
                    text: res.data.message
                });
                // Update local scanned item view
                setScannedItem({
                    ...scannedItem,
                    quantity: res.data.newQuantity
                });
                if (onStockUpdated) onStockUpdated();
            }
        } catch (err) {
            setActionMsg({
                type: 'error',
                text: err.response?.data?.message || 'Transaction failed'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <Scan className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                Barcode & QR Inventory Terminal
                            </h2>
                            <p className="text-[11px] text-slate-400">Supports Camera, USB Scanners & Rapid Manual Lookup</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search / Scan Input */}
                <div className="space-y-3 mb-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Scan Barcode / QR or enter Item Code..."
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') performLookup(scanInput.trim());
                                }}
                                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold outline-none text-slate-900 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={() => performLookup(scanInput.trim())}
                            disabled={loading || !scanInput.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl"
                        >
                            Lookup
                        </button>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-400 font-medium">
                            USB Scanner Status: <span className="text-emerald-600 font-bold">Ready & Listening</span>
                        </span>
                        {!isCameraActive ? (
                            <button
                                onClick={startCamera}
                                className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                            >
                                <Camera className="w-3.5 h-3.5" /> Start Camera Scan
                            </button>
                        ) : (
                            <button
                                onClick={stopCamera}
                                className="text-rose-600 font-bold hover:underline flex items-center gap-1"
                            >
                                <X className="w-3.5 h-3.5" /> Stop Camera
                            </button>
                        )}
                    </div>
                </div>

                {/* Camera Viewport */}
                {isCameraActive && (
                    <div className="relative rounded-2xl overflow-hidden bg-black mb-4 aspect-video flex items-center justify-center">
                        <video ref={videoRef} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 border-2 border-indigo-500/50 m-8 rounded-xl pointer-events-none animate-pulse" />
                    </div>
                )}

                {/* Scanned Item Details Card */}
                {scannedItem && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-indigo-600">
                                        {scannedItem.type === 'tool' ? 'Tool Asset' : 'Fabrication Material'}
                                    </span>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">{scannedItem.name}</h3>
                                    <p className="text-xs font-mono text-slate-500">Code: {scannedItem.code || scannedItem.qrCode}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">In Stock</span>
                                    <span className="text-xl font-black text-slate-900 dark:text-white">
                                        {scannedItem.quantity} {scannedItem.unit}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900 text-xs text-slate-600 dark:text-slate-400">
                                <div>Category: <span className="font-bold text-slate-800 dark:text-slate-200">{scannedItem.category}</span></div>
                                <div>Base Location: <span className="font-bold text-slate-800 dark:text-slate-200">{scannedItem.location}</span></div>
                            </div>
                        </div>

                        {/* Scan Action Form */}
                        <form onSubmit={handleExecuteScanAction} className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                            <div className="font-black uppercase text-[10px] text-slate-500">Execute Confirmed Stock Movement</div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActionType('IN')}
                                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                                        actionType === 'IN' 
                                            ? 'bg-emerald-600 text-white shadow-sm' 
                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <ArrowDownRight className="w-4 h-4" /> Scan IN (Receive)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActionType('OUT')}
                                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                                        actionType === 'OUT' 
                                            ? 'bg-rose-600 text-white shadow-sm' 
                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <ArrowUpRight className="w-4 h-4" /> Scan OUT (Issue)
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Quantity ({scannedItem.unit}) *</label>
                                    <input
                                        type="number"
                                        min="0.1"
                                        step="any"
                                        required
                                        value={actionQty}
                                        onChange={(e) => setActionQty(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-right text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Target Location</label>
                                    <select
                                        value={selectedWarehouse}
                                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="">Default Plant Store</option>
                                        {warehouses.map(w => (
                                            <option key={w._id} value={w._id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Reference / PO / Job No</label>
                                <input
                                    type="text"
                                    placeholder="e.g. JOB-4412, GRN-881"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            {actionMsg && (
                                <div className={`p-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${
                                    actionMsg.type === 'success' 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                    {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                    {actionMsg.text}
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white shadow-md flex items-center justify-center gap-2 ${
                                        actionType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                                    }`}
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Confirm Scan {actionType} ({actionQty} {scannedItem.unit})
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QRBarcodeScannerModal;
