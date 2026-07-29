import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import useAuthStore from '../../stores/authStore';
import { 
  X, CreditCard, QrCode, Building2, Check, Copy, Upload, Camera, 
  Plus, Trash2, ArrowRight, ShieldCheck, AlertCircle, Sparkles, CheckCircle2, Settings, Edit3 
} from 'lucide-react';
import api from '../../services/api';

const DEFAULT_CATEGORIES = [
  'Electricity', 'Water', 'Wi-Fi', 'Internet', 'Maintenance', 'Parking',
  'Laundry', 'Housekeeping', 'Cleaning', 'Food', 'Gas', 'Cable TV',
  'Security Deposit', 'Advance Payment', 'Damage Charges', 'Miscellaneous'
];

export default function LodgeTenantPaymentModal({ isOpen, onClose, booking, isPayMore = false, onSuccess }) {
  if (!isOpen || !booking) return null;

  const user = useAuthStore(state => state.user);
  const isAdmin = user && (user.role === 'admin' || user.role === 'staff' || user.isAdmin);

  const room = booking.roomId || {};
  const lodge = booking.lodgeId || {};

  // Payment Modes & Amounts
  const totalRentDue = booking.outstandingAmount !== undefined ? booking.outstandingAmount : (booking.totalAmount || room.price || 0);
  const isRentFullyPaid = isPayMore || (booking.isPaid || booking.rentStatus === 'Paid' || totalRentDue <= 0);

  const [paymentMode, setPaymentMode] = useState('FULL'); // 'FULL' | 'CUSTOM'
  const [paymentMethod, setPaymentMethod] = useState('UPI QR'); // 'UPI QR' | 'UPI ID' | 'Bank Transfer' | 'Cash' | 'Card'
  const [customRentInput, setCustomRentInput] = useState('');
  
  // Calculate active rent payable amount
  const rentAmount = isRentFullyPaid 
    ? 0 
    : (paymentMode === 'FULL' ? totalRentDue : (parseFloat(customRentInput) || 0));

  const [previousDue, setPreviousDue] = useState(0);
  const [advanceBalance, setAdvanceBalance] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [selectedChargeCat, setSelectedChargeCat] = useState('Electricity');
  const [customChargeAmount, setCustomChargeAmount] = useState('');
  
  // Payment Proof & Details
  const [referenceId, setReferenceId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [skipProof, setSkipProof] = useState(false);

  // Admin Settings & Edit Modal
  const [paymentSettings, setPaymentSettings] = useState({
    upiId: 'krishnaengineering@upi',
    merchantName: 'Krishna Engineering Works',
    merchantDisplayName: 'Krishna Lodge & Complex',
    bankName: 'State Bank of India',
    accountHolder: 'Krishna Engineering Works',
    accountNumber: '39485720194',
    ifsc: 'SBIN0001234',
    branch: 'Kuttanassery, Palakkad',
    paymentInstructions: 'Please mention your Room Number and Booking ID in your payment notes.',
    allowedAdditionalCharges: DEFAULT_CATEGORIES
  });

  const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);
  const [editSettingsForm, setEditSettingsForm] = useState({ ...paymentSettings });
  const [savingSettings, setSavingSettings] = useState(false);

  const [copiedField, setCopiedField] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Load Admin Payment Settings
  useEffect(() => {
    api.get('/lodge-payments/settings')
      .then(res => {
        if (res.data) {
          setPaymentSettings(prev => ({ ...prev, ...res.data }));
          setEditSettingsForm(prev => ({ ...prev, ...res.data }));
        }
      })
      .catch(err => console.error('Failed to load payment settings', err));
  }, []);

  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.post('/lodge-payments/settings', editSettingsForm);
      if (res.data?.settings) {
        setPaymentSettings(res.data.settings);
        setEditSettingsForm(res.data.settings);
      }
      alert('✅ Payment Settings (UPI ID & Bank details) updated successfully!');
      setShowEditSettingsModal(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save payment settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Recalculate Live Balances & Status
  const extraTotal = additionalCharges.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const grandTotal = Math.max(0, rentAmount + previousDue + extraTotal - advanceBalance);
  
  const remainingRentBalance = isRentFullyPaid ? 0 : Math.max(0, totalRentDue - rentAmount);
  
  const livePaymentStatus = isRentFullyPaid
    ? 'ADDITIONAL_SERVICES'
    : remainingRentBalance === 0 
      ? 'FULLY PAID' 
      : rentAmount > 0 
        ? 'PARTIALLY PAID' 
        : 'UNPAID';

  const isAmountExceeded = !isRentFullyPaid && paymentMode === 'CUSTOM' && rentAmount > totalRentDue;

  // Dynamic UPI URL
  const txnNote = `Room ${room.roomNumber || 'Suite'} Rent/Bill ${booking._id ? booking._id.slice(-6).toUpperCase() : ''}`;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(paymentSettings.upiId)}&pn=${encodeURIComponent(paymentSettings.merchantDisplayName)}&am=${grandTotal}&tn=${encodeURIComponent(txnNote)}&tr=${referenceId || 'TXN' + Date.now()}`;

  // Copy helper
  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Add Custom Extra Charge
  const handleAddCharge = () => {
    const amt = parseFloat(customChargeAmount);
    if (!amt || amt <= 0) return alert('Enter a valid charge amount.');
    setAdditionalCharges(prev => [...prev, { id: Date.now(), name: selectedChargeCat, amount: amt }]);
    setCustomChargeAmount('');
  };

  const handleRemoveCharge = (id) => {
    setAdditionalCharges(prev => prev.filter(c => c.id !== id));
  };

  // Proof File Upload / Camera
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProofPreview(reader.result);
      reader.readAsDataURL(file);
      setSkipProof(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const fileInput = document.getElementById('modal-camera-input');
        if (fileInput) fileInput.click();
      } else {
        alert('Camera capture is not supported on this browser.');
      }
    } catch (err) {
      alert('Camera access failed.');
    }
  };

  // Submit Payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (isAmountExceeded) return alert(`Payment amount cannot exceed outstanding rent balance of ₹${totalRentDue.toLocaleString()}.`);
    if (grandTotal <= 0) return alert('Total payable amount must be greater than zero.');
    if (!skipProof && !referenceId) {
      if (!confirm('You have not entered a Transaction Reference ID/UTR. Do you want to continue?')) return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bookingId: booking._id,
        roomId: room._id || booking.roomId,
        amount: grandTotal,
        paymentMethod,
        referenceId: referenceId || `REF-${Date.now().toString(36).toUpperCase()}`,
        paymentType: isPayMore ? 'Additional Charge' : 'Rent',
        chargeCategory: isPayMore ? (additionalCharges[0]?.name || 'Additional Charges') : 'Rent',
        billingPeriodStart: booking.checkIn,
        billingPeriodEnd: booking.checkOut,
        previousDue,
        advanceBalance,
        additionalCharges,
        grandTotal,
        notes: remarks,
        uploadedProof: proofPreview || undefined
      };

      const res = await api.post('/lodge-payments/submit', payload);
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        onClose();
        if (onSuccess) onSuccess(res.data.payment);
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.message || 'Payment submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white flex justify-between items-center relative overflow-hidden flex-shrink-0">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div>
            <span className="px-3 py-1 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
              {isPayMore ? '➕ Additional Services Payment' : '💳 Lodge Rent Settlement'}
            </span>
            <h2 className="text-2xl font-black tracking-tight mt-1">
              {isPayMore ? 'Pay Custom / Utility Charges' : 'Settle Room Rent & Dues'}
            </h2>
            <p className="text-indigo-100 text-xs mt-0.5">
              Room #{room.roomNumber || 'Suite'} • {lodge.name || 'Krishna Building'}
            </p>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            {isAdmin && (
              <button 
                onClick={() => setShowEditSettingsModal(true)}
                className="px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 backdrop-blur-md transition-all shadow-sm"
                title="Edit UPI ID & Bank Account Details"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit UPI/Bank</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {submittedSuccess ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Payment Submitted!</h3>
            <p className="text-slate-500 max-w-sm text-sm">
              Your payment of <strong className="text-indigo-600 font-poppins">₹{grandTotal.toLocaleString()}</strong> has been submitted to Admin for verification.
            </p>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">

            {/* 1. Summary & Rent Mode Card */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Billing & Residency Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Tenant Name</p>
                  <p className="font-bold text-slate-800">{booking.tenantName || 'Valued Tenant'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Room / Class</p>
                  <p className="font-bold text-slate-800">#{room.roomNumber || '101'} ({room.type || 'Suite'})</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Outstanding Rent</p>
                  <p className="font-black text-rose-600 font-poppins text-sm">₹{totalRentDue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Status</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    livePaymentStatus === 'FULLY PAID' ? 'bg-emerald-100 text-emerald-700' :
                    livePaymentStatus === 'PARTIALLY PAID' ? 'bg-amber-100 text-amber-700' :
                    livePaymentStatus === 'ADDITIONAL_SERVICES' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {livePaymentStatus}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector (Full vs Custom Amount) */}
              {!isRentFullyPaid ? (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-2">Select Rent Payment Mode:</label>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <button
                      type="button"
                      onClick={() => { setPaymentMode('FULL'); setCustomRentInput(''); }}
                      className={`p-3 rounded-xl border-2 text-xs font-bold transition-all text-left flex items-center justify-between ${
                        paymentMode === 'FULL'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="font-black uppercase text-[10px] tracking-wider">① Pay Full Rent</p>
                        <p className="text-sm font-black font-poppins">₹{totalRentDue.toLocaleString()}</p>
                      </div>
                      {paymentMode === 'FULL' && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMode('CUSTOM')}
                      className={`p-3 rounded-xl border-2 text-xs font-bold transition-all text-left flex items-center justify-between ${
                        paymentMode === 'CUSTOM'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className="font-black uppercase text-[10px] tracking-wider">② Custom Amount</p>
                        <p className="text-[11px] font-semibold text-slate-500">Partial payment option</p>
                      </div>
                      {paymentMode === 'CUSTOM' && <CheckCircle2 className="w-5 h-5 text-indigo-600" />}
                    </button>
                  </div>

                  {paymentMode === 'CUSTOM' && (
                    <div className="mb-3">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                        Enter Custom Rent Payment Amount (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 500, 2500, 10000..."
                        value={customRentInput}
                        onChange={(e) => setCustomRentInput(e.target.value)}
                        className={`w-full bg-white border-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition ${
                          isAmountExceeded ? 'border-red-500 focus:border-red-600' : 'border-slate-200 focus:border-indigo-600'
                        }`}
                      />
                      {isAmountExceeded && (
                        <p className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Amount exceeds outstanding balance of ₹{totalRentDue.toLocaleString()}. Maximum allowed is ₹{totalRentDue.toLocaleString()}.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Live Calculation breakdown */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Paying Now</p>
                      <p className="font-black text-indigo-600 font-poppins">₹{rentAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Remaining Balance</p>
                      <p className="font-black text-rose-600 font-poppins">₹{remainingRentBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400">Result Status</p>
                      <p className="font-black text-slate-800">{livePaymentStatus}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-200 bg-emerald-50/80 p-3 rounded-xl border-emerald-200 text-xs">
                  <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Rent is fully settled for this billing cycle! Select additional utility/service charges below.
                  </p>
                </div>
              )}

              {/* Additional Charges Builder */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs font-bold text-slate-700 mb-2 flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  Add Additional Utility / Service Charges:
                </p>
                <div className="flex gap-2 mb-3">
                  <select
                    value={selectedChargeCat}
                    onChange={(e) => setSelectedChargeCat(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    {(paymentSettings.allowedAdditionalCharges || DEFAULT_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={customChargeAmount}
                    onChange={(e) => setCustomChargeAmount(e.target.value)}
                    className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={handleAddCharge}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </button>
                </div>

                {/* Additional Items List */}
                {additionalCharges.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {additionalCharges.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-xs">
                        <span className="font-medium text-slate-700">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-indigo-600">₹{item.amount}</span>
                          <button type="button" onClick={() => handleRemoveCharge(item.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Grand Total Bar */}
                <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 mt-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Total Amount Payable</p>
                    <p className="text-xs text-slate-500">Rent (₹{rentAmount}) + Additional (₹{extraTotal})</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-indigo-600 font-poppins">₹{grandTotal.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Select Payment Method */}
            <div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">Select Payment Method</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'UPI QR', name: 'UPI Dynamic QR', icon: QrCode },
                  { id: 'UPI ID', name: 'Direct UPI ID', icon: CreditCard },
                  { id: 'Bank Transfer', name: 'Bank Transfer', icon: Building2 },
                  { id: 'Cash', name: 'Cash Counter', icon: ShieldCheck },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === m.id
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600 shadow-sm'
                        : 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <m.icon className="w-5 h-5" />
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Method Details Panel */}
            {paymentMethod === 'UPI QR' && (
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl flex flex-col sm:flex-row items-center gap-6 shadow-xl">
                <div className="bg-white p-4 rounded-2xl shadow-2xl flex-shrink-0">
                  <QRCodeSVG value={upiUrl} size={150} level="H" includeMargin={false} />
                  <p className="text-[9px] font-black text-center text-slate-400 mt-2 uppercase tracking-widest">Scan with GPay / PhonePe / Paytm</p>
                </div>
                <div className="space-y-3 text-xs flex-1">
                  <div className="inline-block px-3 py-1 bg-indigo-500/30 text-indigo-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                    ⚡ Auto-updating QR
                  </div>
                  <h4 className="text-lg font-black text-white">Scan & Pay ₹{grandTotal.toLocaleString()}</h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Open any UPI app on your phone, scan this code, and complete the payment. The exact payable amount of <strong className="text-white">₹{grandTotal}</strong> is encoded directly into the QR code.
                  </p>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                    <span>UPI ID: <strong className="text-white font-mono">{paymentSettings.upiId}</strong></span>
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard(paymentSettings.upiId, 'upiQr')} 
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold flex items-center gap-1"
                    >
                      {copiedField === 'upiQr' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedField === 'upiQr' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'UPI ID' && (
              <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Official Merchant UPI ID</p>
                  <p className="text-lg font-black text-indigo-950 font-mono mt-0.5">{paymentSettings.upiId}</p>
                  <p className="text-xs text-indigo-600 mt-1">Merchant: {paymentSettings.merchantDisplayName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(paymentSettings.upiId, 'upiId')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
                >
                  {copiedField === 'upiId' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {copiedField === 'upiId' ? 'Copied!' : 'Copy UPI ID'}
                </button>
              </div>
            )}

            {paymentMethod === 'Bank Transfer' && (
              <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4">
                <h4 className="text-sm font-black text-indigo-300 uppercase tracking-wider flex items-center">
                  <Building2 className="w-4 h-4 mr-2" /> Direct Bank Transfer Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Bank Name</p>
                    <p className="font-bold text-white mt-0.5">{paymentSettings.bankName}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Account Holder</p>
                    <p className="font-bold text-white mt-0.5">{paymentSettings.accountHolder}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Account Number</p>
                      <p className="font-bold font-mono text-white mt-0.5">{paymentSettings.accountNumber}</p>
                    </div>
                    <button type="button" onClick={() => copyToClipboard(paymentSettings.accountNumber, 'acc')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">
                      {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">IFSC Code</p>
                      <p className="font-bold font-mono text-white mt-0.5">{paymentSettings.ifsc}</p>
                    </div>
                    <button type="button" onClick={() => copyToClipboard(paymentSettings.ifsc, 'ifsc')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">
                      {copiedField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'Cash' && (
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <p className="font-black text-sm mb-1 flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-amber-600" /> Cash Counter Settlement
                </p>
                <p>
                  Please visit the Lodge Manager reception desk to make a cash payment of <strong>₹{grandTotal}</strong>. The admin will verify and issue an instant digital receipt.
                </p>
              </div>
            )}

            {/* 4. Payment Reference & Proof Section */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Transaction Details & Proof (Optional)</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Ref / UTR / UPI ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 420912384910 or UTR Number"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Remarks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via GPay for July rent"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Upload Screenshot / Proof */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Upload Payment Screenshot / Receipt (Optional)</p>
                    <p className="text-[11px] text-slate-400">Supported formats: JPG, PNG, PDF</p>
                  </div>
                  <div className="flex gap-2">
                    <label className="bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 cursor-pointer flex items-center gap-1.5 shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{proofFile ? 'Change File' : 'Browse File'}</span>
                      <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                    </label>

                    <input type="file" id="modal-camera-input" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                    <button
                      type="button"
                      onClick={handleCameraCapture}
                      className="bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Camera</span>
                    </button>
                  </div>
                </div>

                {/* Proof Preview */}
                {proofPreview && (
                  <div className="mt-3 flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <img src={proofPreview} alt="Proof" className="w-10 h-10 object-cover rounded-lg" />
                      <span className="text-xs font-bold text-slate-700 truncate max-w-xs">{proofFile?.name || 'Payment_Proof.jpg'}</span>
                    </div>
                    <button type="button" onClick={() => { setProofFile(null); setProofPreview(''); }} className="text-red-500 p-1 hover:bg-red-50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Footer Action */}
        {!submittedSuccess && (
          <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white border-2 border-slate-200 hover:bg-slate-100 text-slate-700 hover:border-slate-300 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Back / Close</span>
            </button>
            <button
              type="button"
              onClick={handleSubmitPayment}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <span>Payment Completed</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

      </div>

      {/* Admin Edit Payment Settings (UPI & Bank Details) Overlay */}
      {showEditSettingsModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                  ⚙️ Admin Configuration
                </span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">Edit UPI ID & Bank Account Details</h3>
              </div>
              <button 
                onClick={() => setShowEditSettingsModal(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentSettings} className="space-y-4 text-xs">
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-3">
                <h4 className="font-black text-indigo-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-indigo-600" /> UPI & Dynamic QR Configuration
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official UPI ID (VPA)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. krishnaengineering@upi"
                      value={editSettingsForm.upiId || ''}
                      onChange={(e) => setEditSettingsForm({ ...editSettingsForm, upiId: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Merchant Display Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Krishna Lodge & Complex"
                      value={editSettingsForm.merchantDisplayName || ''}
                      onChange={(e) => setEditSettingsForm({ ...editSettingsForm, merchantDisplayName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" /> Bank Account Transfer Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="State Bank of India"
                      value={editSettingsForm.bankName || ''}
                      onChange={(e) => setEditSettingsForm({ ...editSettingsForm, bankName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      placeholder="Krishna Engineering Works"
                      value={editSettingsForm.accountHolder || ''}
                      onChange={(e) => setEditSettingsForm({ ...editSettingsForm, accountHolder: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="39485720194"
                      value={editSettingsForm.accountNumber || ''}
                      onChange={(e) => setEditSettingsForm({ ...editSettingsForm, accountNumber: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-800 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="SBIN0001234"
                      value={editSettingsForm.ifsc || ''}
                      onChange={(e) => setEditSettingsForm({ ...editSettingsForm, ifsc: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-mono font-bold text-slate-800 outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch Location</label>
                  <input
                    type="text"
                    placeholder="Palakkad, Kerala"
                    value={editSettingsForm.branch || ''}
                    onChange={(e) => setEditSettingsForm({ ...editSettingsForm, branch: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tenant Payment Instructions</label>
                <textarea
                  rows={2}
                  value={editSettingsForm.paymentInstructions || ''}
                  onChange={(e) => setEditSettingsForm({ ...editSettingsForm, paymentInstructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditSettingsModal(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-700 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingSettings ? 'Saving...' : 'Save UPI & Bank Details'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
