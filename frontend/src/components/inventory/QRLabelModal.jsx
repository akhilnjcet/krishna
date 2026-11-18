import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, QrCode } from 'lucide-react';

const QRLabelModal = ({ isOpen, onClose, items = [] }) => {
    const printAreaRef = useRef(null);

    if (!isOpen || items.length === 0) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 print:hidden">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                Print Inventory QR & Barcode Labels
                            </h2>
                            <p className="text-[11px] text-slate-400">Industrial Waterproof Label Format (50mm x 30mm standard)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                        >
                            <Printer className="w-4 h-4" /> Print Labels
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Label Grid */}
                <div ref={printAreaRef} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {items.map((item, idx) => {
                        const qrPayload = item.code || item.qrCode || `KE-INV-${item._id?.toString().slice(-6).toUpperCase()}`;

                        return (
                            <div 
                                key={idx}
                                className="border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-xl flex items-center gap-4 bg-white dark:bg-slate-900 shadow-xs"
                            >
                                <div className="p-1 bg-white rounded-lg border border-slate-200 flex-shrink-0">
                                    <QRCodeSVG 
                                        value={qrPayload}
                                        size={85}
                                        level="M"
                                        includeMargin={false}
                                    />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        Krishna Engineering
                                    </div>
                                    <h3 className="font-black text-xs text-slate-900 dark:text-white truncate">
                                        {item.name}
                                    </h3>
                                    <p className="font-mono text-[10px] text-slate-500 font-bold mt-0.5">
                                        CODE: {qrPayload}
                                    </p>
                                    <div className="text-[9px] text-slate-400 mt-1 flex justify-between">
                                        <span>Unit: {item.unit || 'Pcs'}</span>
                                        <span>{item.category}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default QRLabelModal;
