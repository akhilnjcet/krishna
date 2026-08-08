import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Printer, Download, QrCode, ShieldCheck, 
    Building2, Phone, Mail, User, Calendar, MapPin, AlertCircle 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getDirectImageUrl } from '../utils/imageUtils';

const StaffIdCardModal = ({ staff, onClose }) => {
    const [cardSide, setCardSide] = useState('front'); // 'front', 'back', 'both'
    const cardRef = useRef(null);

    if (!staff) return null;

    const verificationUrl = `${window.location.origin}/verify-staff/${staff._id || staff.staff_id}`;

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert('Pop-up blocked. Please allow pop-ups to print ID card.');

        const frontHtml = `
            <div class="id-card">
                <div class="card-header">
                    <img src="${window.location.origin}/logo512.png" class="logo" />
                    <div>
                        <div class="company-name">KRISHNA ENGINEERING WORKS</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="photo-container">
                        <img src="${getDirectImageUrl(staff.profilePhoto) || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'}" class="photo" />
                    </div>
                    <div class="details">
                        <div class="name">${(staff.name || 'EMPLOYEE NAME').toUpperCase()}</div>
                        <div class="designation">${staff.designation || 'Staff Member'}</div>
                        <div class="emp-id">ID: ${staff.staff_id || 'KEW-000'}</div>
                        <div class="info-row"><span>Dept:</span> <strong>${staff.department || 'Operations'}</strong></div>
                        <div class="info-row"><span>Phone:</span> <strong>${staff.phone || 'N/A'}</strong></div>
                        <div class="info-row"><span>Joining:</span> <strong>${staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : 'Active'}</strong></div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="status-badge">ACTIVE STAFF</div>
                    <div class="qr-code">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(verificationUrl)}" width="45" height="45" />
                    </div>
                </div>
            </div>
        `;

        const backHtml = `
            <div class="id-card back-card">
                <div class="back-header">
                    <h3>EMPLOYEE IDENTIFICATION CARD</h3>
                    <p>Property of Krishna Engineering Works</p>
                </div>
                <div class="back-body">
                    <div class="info-block">
                        <strong>EMERGENCY CONTACT:</strong>
                        <p>${staff.emergencyContact || staff.phone || '+91 98765 43210'}</p>
                    </div>
                    <div class="info-block">
                        <strong>BLOOD GROUP:</strong>
                        <p>${staff.bloodGroup || 'O+ positive'}</p>
                    </div>
                    <div class="info-block">
                        <strong>OFFICE ADDRESS:</strong>
                        <p>Industrial Development Area, Kanjikode, Palakkad, Kerala</p>
                    </div>
                    <div class="disclaimer">
                        If found, please return to the nearest Krishna Engineering Works office or contact administrator.
                    </div>
                </div>
                <div class="back-footer">
                    <span>www.krishnaengineering.com</span>
                </div>
            </div>
        `;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Staff ID Card - ${staff.name}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; gap: 20px; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8fafc; }
                    .id-card { width: 335px; height: 535px; background: #ffffff; color: #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; position: relative; padding: 24px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
                    .card-header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
                    .logo { width: 42px; height: 42px; border-radius: 8px; border: 1px solid #e2e8f0; }
                    .company-name { font-size: 13px; font-weight: 800; tracking-widest: 0.5px; color: #0f172a; text-transform: uppercase; }
                    .card-body { text-align: center; margin-top: 15px; }
                    .photo-container { width: 110px; height: 110px; margin: 0 auto 12px; border-radius: 50%; border: 3px solid #0f172a; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                    .photo { width: 100%; height: 100%; object-fit: cover; }
                    .name { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; }
                    .designation { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 12px; text-transform: uppercase; }
                    .emp-id { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 14px; border-radius: 12px; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 12px; }
                    .info-row { font-size: 11px; color: #475569; display: flex; justify-content: space-between; margin-bottom: 6px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
                    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
                    .status-badge { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; font-size: 9px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; }
                    .back-card { background: #ffffff; text-align: left; }
                    .back-header h3 { font-size: 12px; color: #0f172a; margin: 0; font-weight: 800; }
                    .back-header p { font-size: 9px; color: #64748b; margin: 2px 0 15px; }
                    .info-block { margin-bottom: 12px; }
                    .info-block strong { font-size: 9px; color: #64748b; display: block; text-transform: uppercase; }
                    .info-block p { font-size: 11px; color: #1e293b; margin: 2px 0; font-weight: 600; }
                    .disclaimer { font-size: 9px; color: #64748b; font-style: italic; margin-top: 20px; line-height: 1.4; background: #f8fafc; padding: 8px; border-radius: 8px; border: 1px solid #f1f5f9; }
                    .back-footer { text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #0f172a; font-weight: 700; }
                    @media print {
                        body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                ${cardSide === 'back' ? backHtml : cardSide === 'both' ? frontHtml + backHtml : frontHtml}
                <script>window.onload = function() { window.print(); window.close(); }</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white overflow-hidden"
                >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Dynamic Employee ID Card</h3>
                                <p className="text-xs text-slate-400">Verifiable Biometric Credentials</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* View Switcher */}
                    <div className="flex justify-center gap-2 mb-6 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                        <button 
                            onClick={() => setCardSide('front')}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${cardSide === 'front' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Front Side
                        </button>
                        <button 
                            onClick={() => setCardSide('back')}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${cardSide === 'back' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Back Side
                        </button>
                    </div>

                    {/* ID Card Rendering Container */}
                    <div className="flex justify-center py-4">
                        {cardSide === 'front' && (
                            <div className="w-[300px] h-[480px] bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl flex flex-col justify-between relative overflow-hidden text-slate-800">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-full blur-3xl pointer-events-none" />
                                
                                {/* Front Header */}
                                <div className="flex items-center gap-3 border-b border-slate-950 pb-3">
                                    <img src="/logo512.png" alt="Logo" className="w-9 h-9 rounded-lg shadow-sm border border-slate-200" />
                                    <div>
                                        <h4 className="font-extrabold text-[11px] tracking-wider text-slate-950 uppercase">KRISHNA ENGINEERING WORKS</h4>
                                    </div>
                                </div>

                                {/* Front Body */}
                                <div className="text-center my-auto">
                                    <div className="relative w-24 h-24 mx-auto mb-3 rounded-full border-2 border-slate-950 p-1 shadow-md">
                                        <img 
                                            src={getDirectImageUrl(staff.profilePhoto) || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200'} 
                                            alt={staff.name}
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    </div>
                                    <h3 className="font-extrabold text-sm text-slate-950 uppercase tracking-tight">{staff.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wide">{staff.designation || 'Staff Member'}</p>
                                    
                                    <span className="inline-block px-3 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[9px] font-mono text-slate-700 font-bold mb-4">
                                        ID: {staff.staff_id || 'KEW-000'}
                                    </span>

                                    <div className="space-y-1 text-[10px] text-slate-600 text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="flex justify-between"><span className="text-slate-400 font-semibold">Department:</span> <strong className="text-slate-900">{staff.department || 'Operations'}</strong></div>
                                        <div className="flex justify-between"><span className="text-slate-400 font-semibold">Phone:</span> <strong className="text-slate-900">{staff.phone || 'N/A'}</strong></div>
                                        <div className="flex justify-between"><span className="text-slate-400 font-semibold">Email:</span> <strong className="text-slate-900 truncate max-w-[140px]">{staff.email || 'N/A'}</strong></div>
                                    </div>
                                </div>

                                {/* Front Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold rounded-full uppercase">
                                        {staff.status || 'ACTIVE'}
                                    </span>
                                    <div className="bg-white p-0.5 rounded-lg border border-slate-200">
                                        <QRCodeSVG value={verificationUrl} size={36} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {cardSide === 'back' && (
                            <div className="w-[300px] h-[480px] bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl flex flex-col justify-between text-left text-slate-800">
                                <div>
                                    <div className="border-b border-slate-200 pb-3 mb-4">
                                        <h4 className="font-extrabold text-[11px] text-slate-950 uppercase tracking-wider">EMPLOYEE CREDENTIALS</h4>
                                        <p className="text-[9px] text-slate-400">Krishna Engineering Works Official Identification</p>
                                    </div>

                                    <div className="space-y-3 text-[10px]">
                                        <div>
                                            <span className="text-slate-400 font-bold block text-[8px] uppercase tracking-wider">Emergency Contact</span>
                                            <p className="text-slate-950 font-semibold">{staff.emergencyContact || staff.phone || '+91 98765 43210'}</p>
                                        </div>

                                        <div>
                                            <span className="text-slate-400 font-bold block text-[8px] uppercase tracking-wider">Blood Group</span>
                                            <p className="text-slate-950 font-semibold">{staff.bloodGroup || 'O+ Positive'}</p>
                                        </div>

                                        <div>
                                            <span className="text-slate-400 font-bold block text-[8px] uppercase tracking-wider">Office Address</span>
                                            <p className="text-slate-600 leading-relaxed">Industrial Development Area, Kanjikode, Palakkad, Kerala - 678621</p>
                                        </div>

                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[9px] text-slate-400 italic">
                                            This card remains the property of Krishna Engineering Works. If found, please return to office address.
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center border-t border-slate-200 pt-3">
                                    <p className="text-[9px] font-bold text-slate-950">www.krishnaengineering.com</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-800">
                        <button 
                            onClick={handlePrint}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                        >
                            <Printer className="w-4 h-4" /> Print / Download PDF
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default StaffIdCardModal;
