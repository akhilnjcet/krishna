import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, CreditCard, Smartphone, CheckCircle2, 
    ShieldCheck, IndianRupee, Zap, Droplets, Info
} from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';

const PaymentSystem = () => {
    const { roomNumber, type } = useParams();
    const navigate = useNavigate();
    const room = useLodgeStore(state => state.getRoomByNumber(roomNumber));
    const addPayment = useLodgeStore(state => state.addPayment);
    const markBillPaid = useLodgeStore(state => state.markBillPaid);
    const appSettings = useLodgeStore(state => state.appSettings);
    
    const [amount, setAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [screenshotPreview, setScreenshotPreview] = useState(null);

    useEffect(() => {
        if (room) {
            if (type === 'rent') setAmount(room.rent.toString());
            else if (type === 'electricity') setAmount(room.electricityBill.toString());
            else if (type === 'water') setAmount(room.waterBill.toString());
        }
    }, [room, type]);

    const takeNativePicture = async () => {
        try {
            const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
            const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
            
            await Haptics.impact({ style: ImpactStyle.Light });
            
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: CameraSource.Prompt
            });
            
            if (image && image.dataUrl) {
                setScreenshotPreview(image.dataUrl);
            }
        } catch (e) {
            console.error('Native Camera Error:', e);
            // Fallback for strict browser mode if ever needed, though Capacitor handles it
        }
    };

    const handlePayment = async (method) => {
        if (!amount || parseFloat(amount) <= 0) return;
        
        try {
            const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
            await Haptics.impact({ style: ImpactStyle.Medium });
        } catch(e){}

        if (method === 'UPI') {
            setShowQR(true);
            return;
        }

        submitPayment(method);
    };

    const submitPayment = (method) => {
        setProcessing(true);
        // Simulate gateway
        setTimeout(() => {
            const isWaiting = method === 'UPI';
            addPayment({
                roomNumber,
                type,
                amount: parseFloat(amount),
                method,
                screenshot: isWaiting ? screenshotPreview : null,
                status: isWaiting ? 'Waiting for Approval' : 'Completed'
            });

            if (!isWaiting) {
                if (type === 'electricity' || type === 'water') {
                    markBillPaid(room.id, type);
                }
            }

            setProcessing(false);
            setSuccess(isWaiting ? 'approval' : 'completed');
            setTimeout(() => navigate(`/lodge/room/${roomNumber}`), 3000);
        }, 1500);
    };

    if (success) {
        const isApprovalPhase = success === 'approval';
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 border-4 ${isApprovalPhase ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}
                >
                    <CheckCircle2 className={`w-12 h-12 ${isApprovalPhase ? 'text-amber-500' : 'text-emerald-500'}`} />
                </motion.div>
                <h1 className="text-2xl font-black text-slate-800 mb-2 font-poppins text-center">
                    {isApprovalPhase ? "Sent for Verification" : "Transaction Validated"}
                </h1>
                <p className="text-slate-500 font-medium text-center">
                    {isApprovalPhase ? "Your screenshot was uploaded successfully. Waiting for admin approval. Redirecting..." : "Receipt has been generated and saved. Redirecting..."}
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-[#2D5BE3] pt-12 pb-20 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl text-white"></div>
                <div className="relative z-10 flex items-center gap-4">
                    <button 
                        onClick={() => showQR ? setShowQR(false) : navigate(-1)}
                        className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-white font-poppins capitalize">{showQR ? 'Scan & Pay' : `${type} Settlement`}</h1>
                </div>
            </div>

            <div className="px-6 -mt-10 pb-12 max-w-lg mx-auto">
                <div className="space-y-6">
                    {/* Amount Card  - Only show if not in QR mode */}
                    {!showQR && (
                        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-slate-100 text-center">
                            <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-[#2D5BE3] rounded-2xl mb-4">
                                {type === 'rent' ? <CreditCard className="w-6 h-6"/> : 
                                 type === 'electricity' ? <Zap className="w-6 h-6"/> : <Droplets className="w-6 h-6"/>}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Outstanding</p>
                            <div className="flex items-center justify-center gap-1 mb-2">
                                <span className="text-2xl font-bold text-slate-400">₹</span>
                                <input 
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="text-5xl font-black text-slate-900 w-full max-w-[200px] text-center bg-transparent border-0 focus:ring-0 p-0"
                                />
                            </div>
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Room {roomNumber} • {appSettings?.buildingLocation || 'Krishna Building'}</p>
                        </div>
                    )}

                    {/* QR Code Section */}
                    {showQR && (
                        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-slate-100 flex flex-col items-center">
                            <p className="text-sm font-bold text-slate-800 mb-2 font-poppins">Pay ₹{amount}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-6 max-w-[200px] mx-auto">Scan with any UPI app to pay Admin</p>
                            
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${appSettings?.upiId || 'krishnaengineering@upi'}&pn=KrishnaAdmin&am=${amount}&cu=INR`} 
                                alt="UPI QR Code" 
                                className="w-48 h-48 rounded-2xl border-4 border-slate-100 object-cover mb-8 shadow-sm"
                            />
                            
                            <div className="w-full">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Upload Payment Screenshot</label>
                                <button 
                                    onClick={takeNativePicture}
                                    className="w-full py-4 bg-[#2D5BE3]/10 text-[#2D5BE3] border-2 border-dashed border-[#2D5BE3]/30 rounded-2xl font-bold text-sm hover:bg-[#2D5BE3]/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Smartphone className="w-5 h-5" /> 
                                    {screenshotPreview ? 'Retake Screenshot' : 'Open Camera / Gallery'}
                                </button>
                            </div>

                            {screenshotPreview && (
                                <img src={screenshotPreview} alt="Screenshot" className="w-full max-h-32 object-contain mt-4 rounded-xl border border-slate-100" />
                            )}
                            
                            <button
                                onClick={() => submitPayment('UPI')}
                                disabled={!screenshotPreview || processing}
                                className={`w-full mt-6 py-4 rounded-2xl font-bold uppercase tracking-wider transition-all shadow-lg ${screenshotPreview ? 'bg-[#2D5BE3] text-white shadow-blue-500/30' : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'}`}
                            >
                                Mark as Paid
                            </button>
                        </div>
                    )}

                    {/* Payment Hub */}
                    {!showQR && (
                        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Execution Hub</p>
                            
                            <div className="space-y-3">
                                <button
                                    onClick={() => handlePayment('UPI')}
                                    disabled={processing}
                                    className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-[#2D5BE3]/30 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-600">
                                            <Smartphone className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-800">Unified Payments Interface</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">GPay, PhonePe, Paytm</p>
                                        </div>
                                    </div>
                                    <ShieldCheck className="w-5 h-5 text-slate-200 group-hover:text-emerald-500 transition-colors" />
                                </button>

                                <button
                                    onClick={() => handlePayment('Cash')}
                                    disabled={processing}
                                    className="w-full flex items-center justify-between p-5 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-[#2D5BE3]/30 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                                            <IndianRupee className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-800">Direct Cash Settlement</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Handover to Admin</p>
                                        </div>
                                    </div>
                                    <ShieldCheck className="w-5 h-5 text-slate-200 group-hover:text-blue-500 transition-colors" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Security Footer */}
                    <div className="flex items-center justify-center gap-2 p-4">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End-to-End Encrypted Settlement</span>
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {processing && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#2D5BE3] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">Establishing Secure link...</p>
                </div>
            )}
        </div>

    );
};

export default PaymentSystem;
