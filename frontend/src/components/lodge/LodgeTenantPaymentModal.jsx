import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import useAuthStore from '../../stores/authStore';
import useLodgeStore from '../../stores/lodgeStore';
import { 
  X, CreditCard, QrCode, Building2, Check, Copy, Upload, Camera, 
  Plus, Trash2, ArrowRight, ShieldCheck, AlertCircle, Sparkles, CheckCircle2, 
  Settings, Edit3, Clock, FileText, Printer, Download, History, RefreshCcw, 
  DollarSign, Receipt, ChevronDown, ChevronUp, AlertTriangle, ShieldAlert
} from 'lucide-react';
import api from '../../services/api';
import { initializeCashfree } from '../../utils/cashfreeLoader';

const DEFAULT_CATEGORIES = [
  'Electricity', 'Water', 'Wi-Fi', 'Internet', 'Maintenance', 'Parking',
  'Laundry', 'Housekeeping', 'Cleaning', 'Food', 'Gas', 'Cable TV',
  'Security Deposit', 'Advance Payment', 'Damage Charges', 'Service Fee', 'Miscellaneous'
];

export default function LodgeTenantPaymentModal({ 
  isOpen, 
  onClose, 
  booking, 
  isPayMore = false, 
  onSuccess, 
  isAdmin: isAdminProp,
  initialTab = 'PAY',
  initialTarget = 'ALL'
}) {
  if (!isOpen || !booking) return null;

  const user = useAuthStore(state => state.user);
  const storeUpiId = useLodgeStore(state => state.appSettings?.upiId);
  const isAdmin = isAdminProp !== undefined ? isAdminProp : (user?.role === 'admin' || user?.role === 'manager');

  const room = booking.roomId || {};
  const lodge = booking.lodgeId || {};

  // Financials State from Backend
  const [financials, setFinancials] = useState(null);
  const [loadingFinancials, setLoadingFinancials] = useState(true);

  // Active Tab: 'PAY' | 'MANAGE_DEPOSIT' | 'ADJUST_DEPOSIT' | 'ADD_CHARGE' | 'HISTORY' | 'RECEIPT'
  const [activeTab, setActiveTab] = useState(initialTab || 'PAY');

  // Payment Selection: Target item
  // 'ALL' | 'RENT' | 'DEPOSIT' | 'EXTRA'
  const [paymentTarget, setPaymentTarget] = useState(initialTarget || 'ALL');
  const [paymentMode, setPaymentMode] = useState('FULL'); // 'FULL' | 'CUSTOM'
  const [customPayInput, setCustomPayInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cashfree'); // 'Cashfree' | 'UPI QR' | 'UPI ID' | 'Bank Transfer' | 'Cash'

  // Manage Security Deposit (Admin / Owner)
  const [depositManageMode, setDepositManageMode] = useState('ADD'); // 'ADD' | 'SET'
  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [depositNotesInput, setDepositNotesInput] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState('');

  // Deposit Adjustment Form (Owner / Admin)
  const [adjustAmountInput, setAdjustAmountInput] = useState('');
  const [adjustPeriodInput, setAdjustPeriodInput] = useState('');
  const [adjustReasonInput, setAdjustReasonInput] = useState('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [adjustmentSuccessMsg, setAdjustmentSuccessMsg] = useState('');

  // Add Extra Charge Form (Owner / Admin)
  const [newChargeCategory, setNewChargeCategory] = useState('Electricity');
  const [newChargeCustomName, setNewChargeCustomName] = useState('');
  const [newChargeAmount, setNewChargeAmount] = useState('');
  const [newChargeNotes, setNewChargeNotes] = useState('');
  const [addingCharge, setAddingCharge] = useState(false);

  // Payment Proof & Reference
  const [referenceId, setReferenceId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [skipProof, setSkipProof] = useState(false);

  // Admin Direct Payment Entry Mode
  const [isAdminDirectPay, setIsAdminDirectPay] = useState(Boolean(isAdmin));
  const [adminPaymentDate, setAdminPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Refund Form (Admin)
  const [refundType, setRefundType] = useState('Security Deposit Refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('Bank Transfer');
  const [refundReference, setRefundReference] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundNotes, setRefundNotes] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [refundSuccessMsg, setRefundSuccessMsg] = useState('');

  // Payment Correction Form & Modal (Admin)
  const [correctingPayment, setCorrectingPayment] = useState(null);
  const [correctionForm, setCorrectionForm] = useState({
    amount: '',
    paymentType: 'Rent',
    chargeCategory: 'Rent',
    method: 'Cash',
    referenceId: '',
    paymentDate: '',
    reason: '',
    notes: ''
  });
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState(null);

  // Admin Payment Settings
  const [paymentSettings, setPaymentSettings] = useState({
    upiId: storeUpiId || 'krishnaengineering@upi',
    merchantName: 'Krishna Engineering Works',
    merchantDisplayName: 'Krishna Lodge & Residency',
    bankName: 'State Bank of India',
    accountHolder: 'Krishna Engineering Works',
    accountNumber: '39485720194',
    ifsc: 'SBIN0001234',
    branch: 'Thiruvazhiyode, Palakkad',
    paymentInstructions: 'Please specify your Room Number and Booking ID in your transaction remarks.',
    allowedAdditionalCharges: DEFAULT_CATEGORIES
  });

  const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);
  const [editSettingsForm, setEditSettingsForm] = useState({ ...paymentSettings });
  const [savingSettings, setSavingSettings] = useState(false);

  const [copiedField, setCopiedField] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState(null);

  // Load Financials for this Booking
  const fetchBookingFinancials = useCallback(async () => {
    if (!booking?._id) return;
    setLoadingFinancials(true);
    try {
      const res = await api.get(`/lodge-payments/booking-financials/${booking._id}`);
      if (res.data) {
        setFinancials(res.data);
      }
    } catch (err) {
      console.warn('Failed to load live booking financials:', err.message);
      // Fallback local calculation
      const rentDue = parseFloat(booking.totalAmount || room.price || 0);
      const depositDue = parseFloat(booking.securityDeposit || room.securityDeposit || 0);
      setFinancials({
        booking: {
          _id: booking._id,
          agreementNumber: booking.agreementNumber,
          tenantName: booking.tenantName || 'Valued Tenant',
          roomNumber: room.roomNumber || '101',
          roomType: room.type || 'Suite',
          lodgeName: lodge.name || 'Krishna Lodge'
        },
        lineItems: {
          rent: { due: rentDue, paid: 0, adjusted: 0, effectiveSettled: 0, remaining: rentDue, status: 'Payment Due' },
          securityDeposit: { original: depositDue, due: depositDue, paid: 0, usedForRent: 0, available: depositDue, remaining: depositDue, status: 'Payment Due' },
          extraCharges: [],
          extraChargesSummary: { due: 0, paid: 0, remaining: 0, status: 'None' }
        },
        overall: {
          totalDue: rentDue + depositDue,
          totalPaid: 0,
          totalAdjusted: 0,
          totalRemaining: rentDue + depositDue,
          status: 'Payment Due'
        },
        adjustments: [],
        payments: []
      });
    } finally {
      setLoadingFinancials(false);
    }
  }, [booking, room, lodge]);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialTarget) {
        setPaymentTarget(initialTarget);
        setPaymentMode('FULL');
      }
      setDepositSuccessMsg('');
      setAdjustmentSuccessMsg('');
      setRefundSuccessMsg('');
      fetchBookingFinancials();
      // Pre-fill suggested rent period
      const now = new Date();
      setAdjustPeriodInput(now.toLocaleString('default', { month: 'long', year: 'numeric' }));
    }
  }, [isOpen, initialTab, initialTarget, fetchBookingFinancials]);

  // Load Admin Settings
  useEffect(() => {
    if (!isOpen) return;
    api.get('/lodge-payments/settings')
      .then(res => {
        if (res.data && res.data.upiId) {
          setPaymentSettings(prev => ({ ...prev, ...res.data }));
          setEditSettingsForm(prev => ({ ...prev, ...res.data }));
          useLodgeStore.getState().updateAppSettings({ upiId: res.data.upiId });
        }
      })
      .catch(err => console.warn('Payment settings fetch notice:', err.message));
  }, [isOpen]);

  // Financial calculations
  const rentData = financials?.lineItems?.rent || { due: 0, paid: 0, adjusted: 0, remaining: 0, status: 'Payment Due' };
  const depositData = financials?.lineItems?.securityDeposit || { original: 0, due: 0, paid: 0, usedForRent: 0, available: 0, remaining: 0, status: 'Payment Due' };
  const extraChargesList = financials?.lineItems?.extraCharges || [];
  const extraChargesSummary = financials?.lineItems?.extraChargesSummary || { due: 0, paid: 0, remaining: 0 };
  const overall = financials?.overall || { totalDue: 0, totalPaid: 0, totalAdjusted: 0, totalRemaining: 0, status: 'Payment Due' };

  // Calculate maximum payable for current selection
  let targetMaxDue = overall.totalRemaining;
  let targetTitle = 'Overall Outstanding Total';
  if (paymentTarget === 'RENT') {
    targetMaxDue = rentData.remaining;
    targetTitle = 'Unpaid Room Rent';
  } else if (paymentTarget === 'DEPOSIT') {
    targetMaxDue = depositData.remaining;
    targetTitle = 'Unpaid Security Deposit';
  } else if (paymentTarget === 'EXTRA') {
    targetMaxDue = extraChargesSummary.remaining;
    targetTitle = 'Unpaid Additional Charges';
  }

  // Active payment amount
  const activePayAmount = paymentMode === 'FULL'
    ? targetMaxDue
    : (parseFloat(customPayInput) || 0);

  const newRemainingAfterPayment = Math.max(0, targetMaxDue - activePayAmount);
  const isAmountExceeded = paymentMode === 'CUSTOM' && activePayAmount > targetMaxDue;

  // Live Overall Status Calculation
  const resultOverallRemaining = Math.max(0, overall.totalRemaining - activePayAmount);
  let resultOverallStatus = 'Payment Due';
  if (resultOverallRemaining === 0) {
    resultOverallStatus = 'Fully Paid';
  } else if (overall.totalPaid + activePayAmount > 0 || overall.totalAdjusted > 0) {
    resultOverallStatus = 'Partially Paid';
  }

  // Dynamic UPI URL
  const txnNote = `Room ${room.roomNumber || 'Suite'} ${paymentTarget === 'ALL' ? 'Total Dues' : paymentTarget} ${booking._id ? booking._id.slice(-6).toUpperCase() : ''}`;
  const upiUrl = `upi://pay?pa=${encodeURIComponent(paymentSettings.upiId)}&pn=${encodeURIComponent(paymentSettings.merchantDisplayName)}&am=${activePayAmount}&tn=${encodeURIComponent(txnNote)}&tr=${referenceId || 'TXN' + Date.now()}`;

  // Copy helper
  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
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

  const handleCameraCapture = () => {
    const fileInput = document.getElementById('modal-camera-input');
    if (fileInput) fileInput.click();
  };

  // Launch Cashfree PG Modal Checkout
  const handleCashfreeModalPay = async () => {
    if (isAmountExceeded) {
      return alert(`Entered payment amount exceeds the remaining balance of ₹${targetMaxDue.toLocaleString()}.`);
    }
    if (activePayAmount <= 0) {
      return alert('Payment amount must be greater than zero.');
    }
    setSubmitting(true);
    try {
      const paymentType = paymentTarget === 'ALL' ? 'Rent' : (paymentTarget === 'DEPOSIT' ? 'Security Deposit' : (paymentTarget === 'EXTRA' ? 'Additional Charge' : 'Rent'));
      const chargeCategory = paymentTarget === 'ALL' ? 'Combined Settlement' : (paymentTarget === 'DEPOSIT' ? 'Security Deposit' : (paymentTarget === 'EXTRA' ? 'Additional Charges' : 'Rent'));

      const orderRes = await api.post('/payments/cashfree/create-order', {
        amount: activePayAmount,
        bookingId: booking._id,
        roomId: room._id || booking.roomId,
        name: booking.tenantName || user?.name || 'Valued Tenant',
        email: booking.tenantEmail || user?.email || 'tenant@krishnaengg.com',
        phone: booking.tenantPhone || user?.phone || user?.phoneNumber || '9447940835',
        paymentType,
        chargeCategory,
        orderNote: `Lodge Settlement: Room ${room.roomNumber || 'Suite'} - ${targetTitle}`
      });

      const { paymentSessionId, orderId, environment } = orderRes.data;
      if (!paymentSessionId) throw new Error('Could not acquire payment session from Cashfree.');

      const cashfree = await initializeCashfree(environment || 'production');

      cashfree.checkout({
        paymentSessionId,
        redirectTarget: '_modal'
      }).then(async (result) => {
        if (result.error) {
          console.warn('Cashfree checkout modal closed / error:', result.error);
          alert(result.error.message || 'Payment was not completed. You can retry anytime.');
        } else if (result.paymentDetails) {
          const verifyRes = await api.post('/payments/cashfree/verify', { orderId });
          if (verifyRes.data.success) {
            setLastPaymentReceipt({
              ...verifyRes.data.payment,
              targetTitle,
              lineItemsSnapshot: financials?.lineItems,
              overallSnapshot: financials?.overall,
              newRemaining: resultOverallRemaining,
              resultStatus: resultOverallStatus
            });
            setSubmittedSuccess(true);
            await fetchBookingFinancials();
            if (onSuccess) onSuccess(verifyRes.data.payment);
          } else {
            alert(`Cashfree status: ${verifyRes.data.orderStatus}`);
          }
        }
      });
    } catch (err) {
      console.error('Cashfree Checkout Error:', err);
      alert(err.response?.data?.message || err.message || 'Failed to initialize Cashfree Gateway.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Payment (Tenant Submission OR Admin Direct Entry)
  const handleSubmitPayment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isAmountExceeded) {
      return alert(`Entered payment amount exceeds the remaining balance of ₹${targetMaxDue.toLocaleString()}.`);
    }
    if (activePayAmount <= 0) {
      return alert('Payment amount must be greater than zero.');
    }

    if (paymentMethod === 'Cashfree') {
      return handleCashfreeModalPay();
    }

    setSubmitting(true);
    try {
      const paymentType = paymentTarget === 'ALL' ? 'Rent' : (paymentTarget === 'DEPOSIT' ? 'Security Deposit' : (paymentTarget === 'EXTRA' ? 'Additional Charge' : 'Rent'));
      const chargeCategory = paymentTarget === 'ALL' ? 'Combined Settlement' : (paymentTarget === 'DEPOSIT' ? 'Security Deposit' : (paymentTarget === 'EXTRA' ? 'Additional Charges' : 'Rent'));

      let res;
      if (isAdmin && isAdminDirectPay) {
        // Direct Verified Entry by Admin
        res = await api.post('/lodge-payments/record-admin-payment', {
          bookingId: booking._id,
          amount: activePayAmount,
          paymentType,
          chargeCategory,
          method: paymentMethod,
          referenceId: referenceId || `RCP-${Date.now().toString(36).toUpperCase()}`,
          paymentDate: adminPaymentDate ? new Date(adminPaymentDate) : new Date(),
          notes: remarks || `Direct payment recorded by Administrator for ${targetTitle}`
        });
      } else {
        if (!skipProof && !referenceId && paymentMethod !== 'Cash') {
          if (!confirm('You have not entered a Transaction Reference ID/UTR. Do you wish to proceed?')) {
            setSubmitting(false);
            return;
          }
        }

        const payload = {
          bookingId: booking._id,
          roomId: room._id || booking.roomId,
          amount: activePayAmount,
          paymentMethod,
          referenceId: referenceId || `REF-${Date.now().toString(36).toUpperCase()}`,
          paymentType,
          chargeCategory,
          billingPeriodStart: booking.checkIn,
          billingPeriodEnd: booking.checkOut,
          grandTotal: activePayAmount,
          notes: remarks || `Payment allocated for ${targetTitle}`,
          uploadedProof: proofPreview || undefined
        };
        res = await api.post('/lodge-payments/submit', payload);
      }

      setLastPaymentReceipt({
        ...res.data.payment,
        targetTitle,
        lineItemsSnapshot: financials?.lineItems,
        overallSnapshot: financials?.overall,
        newRemaining: resultOverallRemaining,
        resultStatus: resultOverallStatus
      });

      setSubmittedSuccess(true);
      await fetchBookingFinancials();

      if (onSuccess) onSuccess(res.data.payment);
    } catch (err) {
      alert(err.response?.data?.message || 'Payment submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Issue / Record Refund (Admin)
  const handleRecordRefund = async (e) => {
    e.preventDefault();
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0) return alert('Enter a valid refund amount greater than zero.');
    if (!refundReason.trim()) return alert('A reason for the refund is mandatory.');

    setSubmittingRefund(true);
    setRefundSuccessMsg('');
    try {
      await api.post('/lodge-payments/record-refund', {
        bookingId: booking._id,
        amount: amt,
        refundType,
        method: refundMethod,
        referenceId: refundReference.trim() || undefined,
        reason: refundReason.trim(),
        notes: refundNotes.trim() || undefined
      });

      setRefundSuccessMsg(`✓ Successfully recorded refund of ₹${amt.toLocaleString()} (${refundType}).`);
      setRefundAmount('');
      setRefundReference('');
      setRefundReason('');
      setRefundNotes('');
      await fetchBookingFinancials();
      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record refund.');
    } finally {
      setSubmittingRefund(false);
    }
  };

  // Open Payment Correction Dialog
  const openCorrection = (p) => {
    setCorrectingPayment(p);
    setCorrectionForm({
      amount: String(p.amount || ''),
      paymentType: p.paymentType || 'Rent',
      chargeCategory: p.chargeCategory || p.paymentType || 'Rent',
      method: p.method || 'Cash',
      referenceId: p.referenceId || '',
      paymentDate: p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : ''),
      reason: '',
      notes: p.notes || ''
    });
  };

  // Submit Payment Correction with Mandatory Reason
  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!correctingPayment) return;
    if (!correctionForm.reason.trim()) {
      return alert('Correction reason is strictly mandatory and will be logged in the permanent audit history.');
    }
    const amt = parseFloat(correctionForm.amount);
    if (isNaN(amt) || amt <= 0) {
      return alert('Enter a valid correction amount greater than zero.');
    }

    setSubmittingCorrection(true);
    try {
      await api.put(`/lodge-payments/payments/${correctingPayment._id}/correct`, {
        amount: amt,
        paymentType: correctionForm.paymentType,
        chargeCategory: correctionForm.chargeCategory,
        method: correctionForm.method,
        referenceId: correctionForm.referenceId.trim(),
        paymentDate: correctionForm.paymentDate ? new Date(correctionForm.paymentDate) : undefined,
        reason: correctionForm.reason.trim(),
        notes: correctionForm.notes.trim()
      });

      alert('Payment record corrected and audit trail updated successfully.');
      setCorrectingPayment(null);
      await fetchBookingFinancials();
      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to correct payment record.');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  // Add / Set Security Deposit (Owner / Admin)
  const handleManageSecurityDeposit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(depositAmountInput);
    if (!amt || amt <= 0) {
      return alert('Enter a valid security deposit amount greater than zero.');
    }

    setSubmittingDeposit(true);
    setDepositSuccessMsg('');
    try {
      const res = await api.post('/lodge-payments/manage-deposit', {
        bookingId: booking._id,
        amount: amt,
        mode: depositManageMode.toLowerCase(), // 'add' or 'set'
        notes: depositNotesInput.trim()
      });

      const updatedVal = res.data?.booking?.securityDeposit || amt;
      setDepositSuccessMsg(
        depositManageMode === 'ADD'
          ? `✓ Successfully added ₹${amt.toLocaleString()} to security deposit (New Total: ₹${updatedVal.toLocaleString()}).`
          : `✓ Successfully set security deposit requirement to ₹${updatedVal.toLocaleString()}.`
      );
      setDepositAmountInput('');
      setDepositNotesInput('');
      await fetchBookingFinancials();

      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update security deposit.');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  // Apply Deposit Adjustment (Owner / Admin)
  const handleApplyDepositAdjustment = async (e) => {
    e.preventDefault();
    const adjAmt = parseFloat(adjustAmountInput);
    if (!adjAmt || adjAmt <= 0) {
      return alert('Enter a valid adjustment amount greater than zero.');
    }
    if (adjAmt > depositData.available) {
      return alert(`Cannot adjust more than available security deposit of ₹${depositData.available.toLocaleString()}.`);
    }
    if (adjAmt > rentData.remaining) {
      return alert(`Cannot adjust more than unpaid rent balance of ₹${rentData.remaining.toLocaleString()}.`);
    }
    if (!adjustReasonInput.trim()) {
      return alert('Please enter a reason for the adjustment.');
    }
    if (!adjustPeriodInput.trim()) {
      return alert('Please enter the rent period covered.');
    }

    setSubmittingAdjustment(true);
    setAdjustmentSuccessMsg('');
    try {
      const res = await api.post('/lodge-payments/adjust-deposit', {
        bookingId: booking._id,
        amount: adjAmt,
        reason: adjustReasonInput.trim(),
        rentPeriod: adjustPeriodInput.trim()
      });

      setAdjustmentSuccessMsg(`✓ ₹${adjAmt.toLocaleString()} successfully adjusted from security deposit for ${adjustPeriodInput}.`);
      setAdjustAmountInput('');
      setAdjustReasonInput('');
      await fetchBookingFinancials();

      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || 'Deposit adjustment failed.');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  // Add Extra Charge (Owner / Admin)
  const handleAddExtraCharge = async (e) => {
    e.preventDefault();
    const finalCategoryName = newChargeCategory === 'Custom' 
      ? newChargeCustomName.trim() 
      : newChargeCategory;

    const amt = parseFloat(newChargeAmount);
    if (!finalCategoryName) return alert('Enter charge category name.');
    if (!amt || amt <= 0) return alert('Enter a valid charge amount.');

    setAddingCharge(true);
    try {
      await api.post('/lodge-payments/add-extra-charge', {
        bookingId: booking._id,
        name: finalCategoryName,
        amount: amt,
        notes: newChargeNotes.trim()
      });

      setNewChargeAmount('');
      setNewChargeCustomName('');
      setNewChargeNotes('');
      await fetchBookingFinancials();

      alert(`✅ Charge '${finalCategoryName}' (₹${amt.toLocaleString()}) added successfully.`);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add additional charge.');
    } finally {
      setAddingCharge(false);
    }
  };

  // Save Payment Settings
  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.post('/lodge-payments/settings', editSettingsForm);
      const updated = res.data?.settings || editSettingsForm;
      setPaymentSettings(updated);
      useLodgeStore.getState().updateAppSettings({ upiId: updated.upiId });
      alert(`✅ Payment Settings (UPI ID: ${updated.upiId}) saved successfully!`);
      setShowEditSettingsModal(false);
    } catch (err) {
      setPaymentSettings(editSettingsForm);
      alert(`✅ Updated settings locally (UPI ID: ${editSettingsForm.upiId})`);
      setShowEditSettingsModal(false);
    } finally {
      setSavingSettings(false);
    }
  };

  // Print Receipt Helper
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto overscroll-contain">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300 max-h-[96dvh] sm:max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 p-4 sm:p-6 text-white flex justify-between items-start sm:items-center relative overflow-hidden shrink-0 gap-3">
          <div className="absolute right-0 top-0 w-44 h-44 bg-white/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>
          <div className="relative z-10 flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <Receipt className="w-3 h-3" /> Rent Payment & Settlement Hub
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                overall.status === 'Fully Paid' ? 'bg-emerald-400 text-slate-950' :
                overall.status === 'Partially Paid' ? 'bg-amber-400 text-slate-950' :
                'bg-red-400 text-white'
              }`}>
                {overall.status}
              </span>
            </div>
            <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight truncate">
              Settle Room Rent, Security Deposit & Charges
            </h2>
            <p className="text-indigo-100 text-[11px] sm:text-xs mt-0.5 font-medium truncate">
              Room #{room.roomNumber || 'Suite'} • {lodge.name || 'Krishna Lodge'} • Agr: {booking.agreementNumber || '-'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 relative z-10 shrink-0">
            {isAdmin && (
              <button 
                type="button"
                onClick={() => setShowEditSettingsModal(true)}
                className="px-2.5 sm:px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md touch-manipulation min-h-[40px]"
                title="Edit UPI ID & Bank Account Config"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Rent Config</span>
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl sm:rounded-2xl transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-3 sm:px-6 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar text-xs font-bold shrink-0 scroll-smooth">
          <button
            type="button"
            onClick={() => setActiveTab('PAY')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'PAY'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Pay Online / Cash
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('MANAGE_DEPOSIT')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'MANAGE_DEPOSIT'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Manage Security Deposit
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('ADJUST_DEPOSIT')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'ADJUST_DEPOSIT'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <ShieldAlert className="w-4 h-4" /> Adjust from Deposit
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('ADD_CHARGE')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'ADD_CHARGE'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <Plus className="w-4 h-4" /> Add Extra Charges
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('RECORD_REFUND')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'RECORD_REFUND'
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <RefreshCcw className="w-4 h-4" /> Issue / Record Refund
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'HISTORY'
                ? 'bg-indigo-600 text-white shadow-xs font-black'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
            }`}
          >
            <History className="w-4 h-4" /> Payment & Adjustment History ({financials?.payments?.length || 0})
          </button>

          {lastPaymentReceipt && (
            <button
              type="button"
              onClick={() => setActiveTab('RECEIPT')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'RECEIPT'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
              }`}
            >
              <Receipt className="w-4 h-4" /> View Receipt
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 -webkit-overflow-scrolling-touch">

          {/* ═══════════ TAB 1: PAY DUES ═══════════ */}
          {activeTab === 'PAY' && (
            <>
              {/* Itemized Line Items Breakdown Card */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    Itemized Billing Breakdown (Due, Paid & Remaining Balance)
                  </h3>
                  <button 
                    type="button" 
                    onClick={fetchBookingFinancials} 
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Refresh Live Balances"
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${loadingFinancials ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Stacked Mobile Records for Small Screens (< 640px) */}
                <div className="block sm:hidden space-y-3">
                  {/* Rent Card */}
                  <div className={`p-3.5 rounded-xl border transition-all ${paymentTarget === 'RENT' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white text-sm">Room Rent</p>
                        <p className="text-[10px] text-slate-400">Monthly residency charges</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        rentData.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' :
                        rentData.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {rentData.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Due</span>
                        <span className="font-bold">₹{rentData.due.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Paid</span>
                        <span className="font-bold text-emerald-600">₹{rentData.paid.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Remaining</span>
                        <span className="font-black text-rose-600">₹{rentData.remaining.toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPaymentTarget('RENT'); setPaymentMode('FULL'); }}
                      className={`w-full mt-2.5 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 touch-manipulation min-h-[38px] ${
                        paymentTarget === 'RENT' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {paymentTarget === 'RENT' ? '✓ Selected for Payment' : 'Select Room Rent to Pay'}
                    </button>
                  </div>

                  {/* Security Deposit Card */}
                  <div className={`p-3.5 rounded-xl border transition-all ${paymentTarget === 'DEPOSIT' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white text-sm">Security Deposit</p>
                        <p className="text-[10px] text-slate-400">Available: <strong className="text-indigo-600">₹{depositData.available.toLocaleString()}</strong></p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        depositData.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' :
                        depositData.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {depositData.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Total Required</span>
                        <span className="font-bold">₹{depositData.original.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Paid</span>
                        <span className="font-bold text-emerald-600">₹{depositData.paid.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Remaining</span>
                        <span className="font-black text-rose-600">₹{depositData.remaining.toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPaymentTarget('DEPOSIT'); setPaymentMode('FULL'); }}
                      className={`w-full mt-2.5 py-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 touch-manipulation min-h-[38px] ${
                        paymentTarget === 'DEPOSIT' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {paymentTarget === 'DEPOSIT' ? '✓ Selected for Payment' : 'Select Security Deposit to Pay'}
                    </button>
                  </div>

                  {/* Extra Charges Cards if present */}
                  {extraChargesList.map(charge => (
                    <div key={charge.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-black text-slate-900 dark:text-white text-sm">⚡ {charge.name}</p>
                          {charge.notes && <p className="text-[10px] text-slate-400">{charge.notes}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          charge.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                          charge.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {charge.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Due</span>
                          <span className="font-bold">₹{charge.due.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Paid</span>
                          <span className="font-bold text-emerald-600">₹{charge.paid.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Remaining</span>
                          <span className="font-black text-rose-600">₹{charge.remaining.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Select All Full Due Card */}
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white">Total Outstanding Balance</p>
                      <p className="text-[10px] text-slate-500">Rent + Deposit + Extras</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPaymentTarget('ALL'); setPaymentMode('FULL'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                        paymentTarget === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-indigo-600 border'
                      }`}
                    >
                      {paymentTarget === 'ALL' ? '✓ All Selected' : 'Select All Dues'}
                    </button>
                  </div>
                </div>

                {/* Desktop / Tablet Table View (sm:block) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-black uppercase text-[10px]">
                        <th className="text-left py-2">Item Description</th>
                        <th className="text-right py-2">Amount Due</th>
                        <th className="text-right py-2">Amount Paid</th>
                        <th className="text-right py-2">Adjustments</th>
                        <th className="text-right py-2">Remaining Balance</th>
                        <th className="text-center py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      
                      {/* Row 1: Rent */}
                      <tr className={`hover:bg-white dark:hover:bg-slate-900 transition-colors ${paymentTarget === 'RENT' ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''}`}>
                        <td className="py-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setPaymentTarget('RENT'); setPaymentMode('FULL'); }}
                            className={`p-1 rounded text-[10px] font-black uppercase ${
                              paymentTarget === 'RENT' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            Select
                          </button>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">Room Rent</p>
                            <p className="text-[10px] text-slate-400">Monthly residency charges</p>
                          </div>
                        </td>
                        <td className="text-right py-2.5 font-bold">₹{rentData.due.toLocaleString()}</td>
                        <td className="text-right py-2.5 font-bold text-emerald-600">₹{rentData.paid.toLocaleString()}</td>
                        <td className="text-right py-2.5 font-bold text-amber-600">
                          {rentData.adjusted > 0 ? `₹${rentData.adjusted.toLocaleString()} (Deposit)` : '—'}
                        </td>
                        <td className="text-right py-2.5 font-black text-rose-600 font-poppins">
                          ₹{rentData.remaining.toLocaleString()}
                        </td>
                        <td className="text-center py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            rentData.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' :
                            rentData.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {rentData.status}
                          </span>
                        </td>
                      </tr>

                      {/* Row 2: Security Deposit */}
                      <tr className={`hover:bg-white dark:hover:bg-slate-900 transition-colors ${paymentTarget === 'DEPOSIT' ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''}`}>
                        <td className="py-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setPaymentTarget('DEPOSIT'); setPaymentMode('FULL'); }}
                            className={`p-1 rounded text-[10px] font-black uppercase ${
                              paymentTarget === 'DEPOSIT' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            Select
                          </button>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">Security Deposit</p>
                            <p className="text-[10px] text-slate-400">
                              Available: <strong className="text-indigo-600">₹{depositData.available.toLocaleString()}</strong> (Used: ₹{depositData.usedForRent.toLocaleString()})
                            </p>
                          </div>
                        </td>
                        <td className="text-right py-2.5 font-bold">₹{depositData.original.toLocaleString()}</td>
                        <td className="text-right py-2.5 font-bold text-emerald-600">₹{depositData.paid.toLocaleString()}</td>
                        <td className="text-right py-2.5 font-bold text-slate-400">
                          {depositData.usedForRent > 0 ? `-₹${depositData.usedForRent.toLocaleString()}` : '—'}
                        </td>
                        <td className="text-right py-2.5 font-black text-rose-600 font-poppins">
                          ₹{depositData.remaining.toLocaleString()}
                        </td>
                        <td className="text-center py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            depositData.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' :
                            depositData.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {depositData.status}
                          </span>
                        </td>
                      </tr>

                      {/* Row 3+: Extra Charges (Itemized) */}
                      {extraChargesList.map(charge => (
                        <tr key={charge.id} className="hover:bg-white dark:hover:bg-slate-900 transition-colors">
                          <td className="py-2.5 pl-6">
                            <p className="font-bold text-slate-900 dark:text-white">⚡ {charge.name}</p>
                            {charge.notes && <p className="text-[10px] text-slate-400">{charge.notes}</p>}
                          </td>
                          <td className="text-right py-2.5 font-bold">₹{charge.due.toLocaleString()}</td>
                          <td className="text-right py-2.5 font-bold text-emerald-600">₹{charge.paid.toLocaleString()}</td>
                          <td className="text-right py-2.5 text-slate-400">—</td>
                          <td className="text-right py-2.5 font-black text-rose-600 font-poppins">₹{charge.remaining.toLocaleString()}</td>
                          <td className="text-center py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              charge.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                              charge.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {charge.status}
                            </span>
                          </td>
                        </tr>
                      ))}

                    </tbody>

                    {/* Overall Summary Footer Row */}
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 font-black text-xs text-slate-900 dark:text-white">
                        <td className="py-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { setPaymentTarget('ALL'); setPaymentMode('FULL'); }}
                            className={`p-1.5 rounded text-[10px] font-black uppercase ${
                              paymentTarget === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white'
                            }`}
                          >
                            Pay All Dues
                          </button>
                          <span>OVERALL TOTAL</span>
                        </td>
                        <td className="text-right py-3">₹{overall.totalDue.toLocaleString()}</td>
                        <td className="text-right py-3 text-emerald-600">₹{overall.totalPaid.toLocaleString()}</td>
                        <td className="text-right py-3 text-amber-600">₹{overall.totalAdjusted.toLocaleString()}</td>
                        <td className="text-right py-3 text-rose-600 font-poppins text-sm">
                          ₹{overall.totalRemaining.toLocaleString()}
                        </td>
                        <td className="text-center py-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            overall.status === 'Fully Paid' ? 'bg-emerald-600 text-white' :
                            overall.status === 'Partially Paid' ? 'bg-amber-500 text-slate-950' : 'bg-rose-600 text-white'
                          }`}>
                            {overall.status}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Payment Allocation & Amount Mode Card */}
              {overall.totalRemaining > 0 ? (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-indigo-100 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">
                        Pay Toward: <span className="text-indigo-600">{targetTitle}</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Remaining dues for selection: <strong className="text-rose-600 font-poppins">₹{targetMaxDue.toLocaleString()}</strong>
                      </p>
                    </div>

                  {paymentTarget === 'DEPOSIT' && (
                    <div className="w-full bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold text-emerald-900 dark:text-emerald-200">Security Deposit Settlement</p>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                            Total Required: ₹{depositData.original.toLocaleString()} • Paid: ₹{depositData.paid.toLocaleString()} • Available Balance: ₹{depositData.available.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-rose-600 font-poppins bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-emerald-200">
                        Pending Due: ₹{depositData.remaining.toLocaleString()}
                      </span>
                    </div>
                  )}

                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => { setPaymentMode('FULL'); setCustomPayInput(''); }}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          paymentMode === 'FULL' ? 'bg-indigo-600 text-white font-black shadow-xs' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        ① Pay Full Amount (₹{targetMaxDue.toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode('CUSTOM')}
                        className={`px-3 py-1.5 rounded-lg transition ${
                          paymentMode === 'CUSTOM' ? 'bg-indigo-600 text-white font-black shadow-xs' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        ② Partial / Custom Amount
                      </button>
                    </div>
                  </div>

                  {paymentMode === 'CUSTOM' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                        Enter Partial Payment Amount (₹)
                      </label>
                      <input
                        type="number"
                        placeholder={`Up to ₹${targetMaxDue.toLocaleString()}`}
                        value={customPayInput}
                        onChange={(e) => setCustomPayInput(e.target.value)}
                        className={`w-full bg-slate-50 dark:bg-slate-800 border-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none ${
                          isAmountExceeded ? 'border-red-500 focus:border-red-600' : 'border-indigo-200 dark:border-slate-700 focus:border-indigo-600'
                        }`}
                      />
                      {isAmountExceeded && (
                        <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Amount cannot exceed ₹{targetMaxDue.toLocaleString()}.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Immediate Live Calculation Summary */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-xs">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Paying Now</p>
                      <p className="text-base font-black text-indigo-600 font-poppins">₹{activePayAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Remaining Balance</p>
                      <p className="text-base font-black text-rose-600 font-poppins">₹{newRemainingAfterPayment.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400">Result Status</p>
                      <p className={`text-xs font-black uppercase mt-1 ${
                        newRemainingAfterPayment === 0 ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {newRemainingAfterPayment === 0 ? '✓ FULLY PAID' : 'PARTIALLY PAID'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>All residency dues are fully settled! No outstanding balance remains.</span>
                </div>
              )}

              {/* Payment Method Selector */}
              {activePayAmount > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Select Payment Method</h3>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      Target: <strong>{targetTitle}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { id: 'Cashfree', name: 'Cashfree Gateway', icon: Sparkles, featured: true, sub: 'Cards/UPI/EMI' },
                      { id: 'UPI QR', name: 'UPI Dynamic QR', icon: QrCode, sub: 'GPay/PhonePe' },
                      { id: 'UPI ID', name: 'Direct UPI ID', icon: CreditCard, sub: 'VPA Transfer' },
                      { id: 'Bank Transfer', name: 'Bank Transfer', icon: Building2, sub: 'NEFT / RTGS' },
                      { id: 'Cash', name: 'Cash Counter', icon: ShieldCheck, sub: 'Physical Desk' },
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-3 rounded-2xl border-2 font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === m.id
                            ? m.featured 
                              ? 'border-indigo-600 bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900 text-indigo-600 shadow-md ring-2 ring-indigo-500/30'
                              : 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-600 shadow-sm'
                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className="relative">
                          <m.icon className="w-5 h-5" />
                          {m.featured && (
                            <span className="absolute -top-2 -right-3 px-1 py-0.2 bg-amber-400 text-slate-950 rounded-full text-[7px] font-black uppercase">
                              Live
                            </span>
                          )}
                        </div>
                        <span className="text-center font-black leading-tight text-[11px]">{m.name}</span>
                        <span className="text-[9px] text-slate-400 font-semibold">{m.sub}</span>
                      </button>
                    ))}
                  </div>

                  {/* Cashfree View */}
                  {paymentMethod === 'Cashfree' && (
                    <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                      <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                      <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/15">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Official Cashfree Payments Gateway</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            Instant Verified Clearance
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xl font-black text-white">
                            Pay ₹{activePayAmount.toLocaleString()} Online
                          </h4>
                          <p className="text-xs text-indigo-200 mt-1">
                            Secure instant clearance for {targetTitle}. All modes supported:
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-200 text-[11px]">
                          <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 text-center">
                            <p className="font-black text-white">UPI Apps</p>
                            <p className="text-[9px] text-indigo-300">GPay, PhonePe, Paytm</p>
                          </div>
                          <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 text-center">
                            <p className="font-black text-white">Cards</p>
                            <p className="text-[9px] text-indigo-300">Visa, Mastercard, RuPay</p>
                          </div>
                          <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 text-center">
                            <p className="font-black text-white">Net Banking</p>
                            <p className="text-[9px] text-indigo-300">30+ Indian Banks</p>
                          </div>
                          <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 text-center">
                            <p className="font-black text-white">Card EMI</p>
                            <p className="text-[9px] text-indigo-300">Instant Approval</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleCashfreeModalPay}
                          disabled={submitting || activePayAmount <= 0}
                          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-slate-950" />
                          <span>Pay ₹{activePayAmount.toLocaleString()} via Cashfree Checkout</span>
                          <ArrowRight className="w-4 h-4 text-slate-950" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QR Code view */}
                  {paymentMethod === 'UPI QR' && (
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl flex flex-col sm:flex-row items-center gap-6 shadow-xl">
                      <div className="bg-white p-4 rounded-2xl shadow-2xl shrink-0">
                        <QRCodeSVG value={upiUrl} size={150} level="H" includeMargin={false} />
                        <p className="text-[9px] font-black text-center text-slate-500 mt-2 uppercase tracking-widest">
                          Scan with GPay / PhonePe / Paytm
                        </p>
                      </div>
                      <div className="space-y-3 text-xs flex-1">
                        <div className="inline-block px-3 py-1 bg-indigo-500/30 text-indigo-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                          ⚡ Dynamic QR - Amount Encoded
                        </div>
                        <h4 className="text-lg font-black text-white">Scan & Pay ₹{activePayAmount.toLocaleString()}</h4>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          Scan this QR with any UPI app to transfer exactly <strong className="text-white font-poppins">₹{activePayAmount.toLocaleString()}</strong> directly to Krishna Lodge.
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

                  {/* UPI ID view */}
                  {paymentMethod === 'UPI ID' && (
                    <div className="bg-indigo-50 dark:bg-slate-800 p-5 rounded-2xl border border-indigo-100 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Official Merchant UPI ID</p>
                        <p className="text-lg font-black text-indigo-950 dark:text-white font-mono mt-0.5">{paymentSettings.upiId}</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Merchant: {paymentSettings.merchantDisplayName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentSettings.upiId, 'upiId')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                      >
                        {copiedField === 'upiId' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        {copiedField === 'upiId' ? 'Copied!' : 'Copy UPI ID'}
                      </button>
                    </div>
                  )}

                  {/* Bank Transfer view */}
                  {paymentMethod === 'Bank Transfer' && (
                    <div className="bg-slate-900 text-white p-5 rounded-3xl space-y-3">
                      <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center">
                        <Building2 className="w-4 h-4 mr-2" /> Direct Bank Transfer Details
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                          <p className="text-slate-400 text-[10px] uppercase font-bold">Bank & Holder</p>
                          <p className="font-bold text-white mt-0.5">{paymentSettings.bankName}</p>
                          <p className="text-[11px] text-slate-300">{paymentSettings.accountHolder}</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex justify-between items-center">
                          <div>
                            <p className="text-slate-400 text-[10px] uppercase font-bold">Account Number & IFSC</p>
                            <p className="font-bold font-mono text-white mt-0.5">{paymentSettings.accountNumber}</p>
                            <p className="font-mono text-xs text-indigo-300">{paymentSettings.ifsc}</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => copyToClipboard(paymentSettings.accountNumber, 'acc')} 
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                          >
                            {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cash Counter view */}
                  {paymentMethod === 'Cash' && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                      <p className="font-black text-sm mb-1 flex items-center">
                        <ShieldCheck className="w-4 h-4 mr-1.5 text-amber-600" /> Reception Desk Cash Settlement
                      </p>
                      <p>
                        Hand over <strong className="font-poppins">₹{activePayAmount.toLocaleString()}</strong> at the lodge manager's desk. The admin will verify and issue your digital receipt immediately.
                      </p>
                    </div>
                  )}

                  {/* Reference & Proof Inputs (Only shown for non-gateway manual transfers) */}
                  {paymentMethod !== 'Cashfree' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Transaction Ref / UTR Number
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 420912384910 or GPay Ref"
                            value={referenceId}
                            onChange={(e) => setReferenceId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Payment Remarks (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Settle rent + water charge"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                          />
                        </div>
                      </div>

                      {/* Proof upload */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Payment Screenshot / Receipt</p>
                          <p className="text-[10px] text-slate-400">Attach verification screenshot or tap Camera</p>
                        </div>
                        <div className="flex gap-2">
                          <label className="bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1.5 shadow-2xs">
                            <Upload className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{proofFile ? 'Change' : 'Browse'}</span>
                            <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                          </label>
                          <input type="file" id="modal-camera-input" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                          <button
                            type="button"
                            onClick={handleCameraCapture}
                            className="bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs"
                          >
                            <Camera className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Camera</span>
                          </button>
                        </div>
                      </div>

                      {proofPreview && (
                        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2">
                            <img src={proofPreview} alt="Proof" className="w-8 h-8 object-cover rounded-md" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-xs">{proofFile?.name || 'Payment_Proof.jpg'}</span>
                          </div>
                          <button type="button" onClick={() => { setProofFile(null); setProofPreview(''); }} className="text-red-500 p-1 hover:bg-red-50 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleSubmitPayment}
                    disabled={submitting || activePayAmount <= 0}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      paymentMethod === 'Cashfree'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/30'
                        : 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-indigo-600/30'
                    }`}
                  >
                    {submitting ? (
                      <span>Processing Payment...</span>
                    ) : paymentMethod === 'Cashfree' ? (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Pay ₹{activePayAmount.toLocaleString()} via Cashfree Gateway</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Submit Payment of ₹{activePayAmount.toLocaleString()}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ═══════════ TAB: MANAGE SECURITY DEPOSIT (ADMIN) ═══════════ */}
          {activeTab === 'MANAGE_DEPOSIT' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-base">Client Security Deposit Control & Balances</h3>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  Manage the required security deposit for this booking. You can increment (add) or set the required security deposit amount. The client can pay this deposit online, and available balances can be monitored or adjusted against rent.
                </p>
              </div>

              {/* 5-Card Deposit Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Required</p>
                  <p className="text-base font-black text-slate-900 dark:text-white font-poppins mt-0.5">₹{depositData.original.toLocaleString()}</p>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                    depositData.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-700' :
                    depositData.status === 'Partially Paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {depositData.status}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
                  <p className="text-[10px] font-black uppercase text-slate-400">Paid by Client</p>
                  <p className="text-base font-black text-emerald-600 font-poppins mt-0.5">₹{depositData.paid.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 mt-1 font-semibold">Verified Receipts</p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
                  <p className="text-[10px] font-black uppercase text-slate-400">Used for Rent</p>
                  <p className="text-base font-black text-amber-600 font-poppins mt-0.5">₹{depositData.usedForRent.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 mt-1 font-semibold">{financials?.adjustments?.length || 0} Adjustments</p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-2xs border-2 border-emerald-300 dark:border-emerald-700">
                  <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Available Balance</p>
                  <p className="text-base font-black text-emerald-600 font-poppins mt-0.5">₹{depositData.available.toLocaleString()}</p>
                  <p className="text-[9px] text-emerald-600 font-bold mt-1">Ready for Refund/Rent</p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-2xs border-2 border-rose-200 dark:border-rose-800">
                  <p className="text-[10px] font-black uppercase text-rose-600">Pending Due</p>
                  <p className="text-base font-black text-rose-600 font-poppins mt-0.5">₹{depositData.remaining.toLocaleString()}</p>
                  <p className="text-[9px] text-rose-500 font-bold mt-1">Awaiting Payment</p>
                </div>
              </div>

              {depositSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{depositSuccessMsg}</span>
                </div>
              )}

              {/* Add / Set Deposit Requirement Form */}
              <form onSubmit={handleManageSecurityDeposit} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Update Deposit Requirement
                    </h4>
                    <p className="text-xs text-slate-400">Choose whether to add an additional amount or set an absolute total.</p>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setDepositManageMode('ADD')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        depositManageMode === 'ADD' ? 'bg-emerald-600 text-white font-black shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      ➕ Add to Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositManageMode('SET')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        depositManageMode === 'SET' ? 'bg-emerald-600 text-white font-black shadow-xs' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      ✏️ Set Total Required
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {depositManageMode === 'ADD' ? 'Additional Deposit Amount to Add (₹) *' : 'New Total Security Deposit Required (₹) *'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400 font-poppins">₹</span>
                      <input
                        type="number"
                        required
                        placeholder={depositManageMode === 'ADD' ? 'e.g. 5000' : 'e.g. 15000'}
                        value={depositAmountInput}
                        onChange={(e) => setDepositAmountInput(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Quick Preset Chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[1000, 2000, 5000, 10000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setDepositAmountInput(String(val))}
                          className="text-[10px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-1 rounded-lg font-bold transition"
                        >
                          +{val.toLocaleString()}
                        </button>
                      ))}
                      {rentData.due > 0 && (
                        <button
                          type="button"
                          onClick={() => setDepositAmountInput(String(rentData.due))}
                          className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg font-bold transition"
                        >
                          1 Mo Rent (₹{rentData.due.toLocaleString()})
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Reason / Notes (Optional)
                    </label>
                    <textarea
                      rows="2"
                      placeholder="e.g. Additional security deposit for AC & furniture installation"
                      value={depositNotesInput}
                      onChange={(e) => setDepositNotesInput(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submittingDeposit || !depositAmountInput}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {submittingDeposit ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>{depositManageMode === 'ADD' ? 'Add to Security Deposit' : 'Update Total Security Deposit'}</span>
                  </button>

                  {depositData.remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab('PAY'); setPaymentTarget('DEPOSIT'); setPaymentMode('FULL'); }}
                      className="w-full sm:w-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-6 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Collect / Pay This Deposit (₹{depositData.remaining.toLocaleString()})</span>
                    </button>
                  )}
                </div>
              </form>

              {/* Deposit Adjustments & Payments Trail */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Deposit Balances & Settlement Summary
                  </h4>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                    Net Available: ₹{depositData.available.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="font-bold text-slate-800 dark:text-white mb-1">Deposit Payment Status</p>
                    <p className="text-slate-500 text-[11px]">
                      Required: <strong className="text-slate-800 dark:text-white">₹{depositData.original.toLocaleString()}</strong> • 
                      Collected: <strong className="text-emerald-600">₹{depositData.paid.toLocaleString()}</strong> • 
                      Unpaid: <strong className="text-rose-600">₹{depositData.remaining.toLocaleString()}</strong>
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="font-bold text-slate-800 dark:text-white mb-1">Rent Adjustment Status</p>
                    <p className="text-slate-500 text-[11px]">
                      Used towards Rent: <strong className="text-amber-600">₹{depositData.usedForRent.toLocaleString()}</strong> • 
                      Remaining Available: <strong className="text-emerald-600">₹{depositData.available.toLocaleString()}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 2: ADJUST RENT FROM DEPOSIT (OWNER) ═══════════ */}
          {activeTab === 'ADJUST_DEPOSIT' && (
            <div className="space-y-5">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-5 rounded-2xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <h3 className="font-black text-base">Adjust Rent from Security Deposit (Owner Control)</h3>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  Deduct an approved amount from the tenant’s available security deposit and credit it toward unpaid room rent. The adjustment cannot exceed the available deposit or unpaid rent.
                </p>
              </div>

              {/* Deposit & Rent Balances Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                  <p className="text-[10px] font-black uppercase text-slate-400">Original Deposit</p>
                  <p className="text-base font-black text-slate-800 dark:text-white font-poppins">₹{depositData.original.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                  <p className="text-[10px] font-black uppercase text-slate-400">Used for Rent</p>
                  <p className="text-base font-black text-amber-600 font-poppins">₹{depositData.usedForRent.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border-2 border-indigo-200 dark:border-indigo-800">
                  <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Available Deposit</p>
                  <p className="text-base font-black text-indigo-600 font-poppins">₹{depositData.available.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border-2 border-rose-200 dark:border-rose-800">
                  <p className="text-[10px] font-black uppercase text-rose-600">Unpaid Rent Balance</p>
                  <p className="text-base font-black text-rose-600 font-poppins">₹{rentData.remaining.toLocaleString()}</p>
                </div>
              </div>

              {adjustmentSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{adjustmentSuccessMsg}</span>
                </div>
              )}

              {/* Adjustment Form */}
              <form onSubmit={handleApplyDepositAdjustment} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Adjustment Amount to Deduct (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder={`Max ₹${Math.min(depositData.available, rentData.remaining).toLocaleString()}`}
                      value={adjustAmountInput}
                      onChange={(e) => setAdjustAmountInput(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none"
                    />
                    <div className="flex gap-2 mt-2">
                      {depositData.available > 0 && rentData.remaining > 0 && (
                        <button
                          type="button"
                          onClick={() => setAdjustAmountInput(String(Math.min(depositData.available, rentData.remaining)))}
                          className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-bold transition"
                        >
                          Fill Max (₹{Math.min(depositData.available, rentData.remaining).toLocaleString()})
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Rent Period Covered *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. October 2026 or 22 Oct - 22 Nov 2026"
                      value={adjustPeriodInput}
                      onChange={(e) => setAdjustPeriodInput(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Authorization for Adjustment *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deducted toward unpaid rent upon tenant notice / lease closure"
                    value={adjustReasonInput}
                    onChange={(e) => setAdjustReasonInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAdjustment || depositData.available <= 0 || rentData.remaining <= 0}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 py-3 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {submittingAdjustment ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>Confirm & Apply Rent Adjustment from Deposit</span>
                </button>
              </form>

              {/* Adjustment History Table */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">Deposit Adjustments Audit Trail</h4>
                {financials?.adjustments?.length > 0 ? (
                  <div className="space-y-2">
                    {financials.adjustments.map((adj, i) => (
                      <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">₹{adj.amount.toLocaleString()} — {adj.rentPeriod}</p>
                          <p className="text-[10px] text-slate-400">{adj.reason} • By {adj.performedBy || 'Owner'} on {new Date(adj.date).toLocaleDateString()}</p>
                        </div>
                        <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-200 font-bold">
                          {adj.adjustmentId || 'ADJ'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No deposit adjustments recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ TAB 3: ADD EXTRA CHARGES (OWNER) ═══════════ */}
          {activeTab === 'ADD_CHARGE' && (
            <div className="space-y-5">
              <div className="bg-blue-50 dark:bg-slate-800 p-5 rounded-2xl border border-blue-200 dark:border-slate-700 text-slate-800 dark:text-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h3 className="font-black text-base">Add Additional Utility & Service Charges</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Post new utility bills (electricity, water, Wi-Fi, maintenance, cleaning, etc.) to this booking. These will appear as separate line items and update the total payable balance immediately.
                </p>
              </div>

              <form onSubmit={handleAddExtraCharge} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Charge Category
                    </label>
                    <select
                      value={newChargeCategory}
                      onChange={(e) => setNewChargeCategory(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                    >
                      {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="Custom">+ Other Custom Category</option>
                    </select>
                  </div>

                  {newChargeCategory === 'Custom' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Custom Charge Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AC Filter Replacement"
                        value={newChargeCustomName}
                        onChange={(e) => setNewChargeCustomName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Charge Amount (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 750"
                        value={newChargeAmount}
                        onChange={(e) => setNewChargeAmount(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>
                  )}
                </div>

                {newChargeCategory === 'Custom' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Charge Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 750"
                      value={newChargeAmount}
                      onChange={(e) => setNewChargeAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Meter Reading (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Units: 450 - 580 (Rate: ₹8/unit)"
                    value={newChargeNotes}
                    onChange={(e) => setNewChargeNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingCharge}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {addingCharge ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Add Charge to Residency Bill</span>
                </button>
              </form>
            </div>
          )}

          {/* ═══════════ TAB 4: ISSUE / RECORD REFUND (ADMIN) ═══════════ */}
          {activeTab === 'RECORD_REFUND' && isAdmin && (
            <div className="space-y-5">
              <div className="bg-rose-50 dark:bg-slate-800 p-5 rounded-2xl border border-rose-200 dark:border-slate-700 text-slate-800 dark:text-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <RefreshCcw className="w-5 h-5 text-rose-600" />
                  <h3 className="font-black text-base">Issue / Record Resident Refund</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Record refunds for security deposits, advance rent, or excess utility payments. Every refund is logged directly to this specific booking with a mandatory audit reason.
                </p>
                {depositData.available > 0 && (
                  <div className="mt-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                      Available Security Deposit Held: <strong className="text-rose-600 font-poppins">₹{depositData.available.toLocaleString()}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRefundAmount(String(depositData.available));
                        setRefundType('Security Deposit Refund');
                        setRefundReason('Full security deposit refunded upon tenancy checkout & room inspection');
                      }}
                      className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-[10px] font-black transition"
                    >
                      Fill Available Deposit (₹{depositData.available.toLocaleString()})
                    </button>
                  </div>
                )}
              </div>

              {refundSuccessMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{refundSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleRecordRefund} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Refund Category / Type *
                    </label>
                    <select
                      value={refundType}
                      onChange={(e) => setRefundType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="Security Deposit Refund">Security Deposit Refund</option>
                      <option value="Rent Refund">Rent Refund / Overpayment</option>
                      <option value="Utility / Service Charge Refund">Utility / Service Charge Refund</option>
                      <option value="Advance Refund">Advance Booking Refund</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Refund Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 10000"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Disbursement Method *
                    </label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="UPI">UPI Transfer</option>
                      <option value="Cash">Cash Handover</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Transaction / UTR Reference ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR-98402830491 or Cheque #"
                      value={refundReference}
                      onChange={(e) => setRefundReference(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mandatory Reason for Refund *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Security deposit refund upon checkout clearance, zero room damages recorded"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">This reason is permanently preserved in the transaction audit trail.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Internal Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sent to tenant HDFC account ending 4019"
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingRefund}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white py-3 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {submittingRefund ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  <span>Record & Commit Refund</span>
                </button>
              </form>
            </div>
          )}

          {/* ═══════════ TAB 5: TRANSACTION & ADJUSTMENT HISTORY ═══════════ */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                    Payment Transactions, Adjustments & Refunds
                  </h3>
                  <p className="text-[10px] text-slate-400">Strictly isolated to Booking #{booking.agreementNumber || String(booking._id).slice(-6).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('RECORD_REFUND')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-black text-[11px] transition flex items-center gap-1"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" /> Issue Refund
                    </button>
                  )}
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    Total Records: {financials?.payments?.length || 0}
                  </span>
                </div>
              </div>

              {financials?.payments?.length > 0 ? (
                <div className="space-y-3">
                  {financials.payments.map((p, idx) => {
                    const isRefund = (p.paymentType || '').toLowerCase().includes('refund');
                    const hasAudit = Array.isArray(p.auditLog) && p.auditLog.length > 0;
                    const isAuditExpanded = expandedAuditId === (p._id || idx);

                    return (
                      <div 
                        key={p._id || idx} 
                        className={`p-4 rounded-2xl border transition-all ${
                          isRefund 
                            ? 'bg-rose-50/40 dark:bg-slate-800 border-rose-200 dark:border-rose-900/40' 
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                isRefund ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                                p.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                                p.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isRefund ? 'REFUND' : p.status}
                              </span>
                              <span className="text-xs font-black text-slate-800 dark:text-white">
                                {p.paymentType || 'Rent'} {p.chargeCategory ? `· ${p.chargeCategory}` : ''}
                              </span>
                              {p.verifiedByName && (
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  (By {p.verifiedByName})
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Ref: <strong className="font-mono text-slate-700 dark:text-slate-300">{p.referenceId || p.transactionReference || 'N/A'}</strong> • Method: {p.method}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Date: {new Date(p.paymentDate || p.createdAt).toLocaleString()} {p.notes ? `• ${p.notes}` : ''}
                            </p>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                            <p className={`text-base font-black font-poppins ${isRefund ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                              {isRefund ? '-' : ''}₹{p.amount.toLocaleString()}
                            </p>
                            {p.receiptNumber && (
                              <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 dark:bg-slate-700 px-2 py-0.5 rounded font-bold">
                                {p.receiptNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Audit Log Dropdown & Admin Correction Toolbar */}
                        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            {hasAudit && (
                              <button
                                type="button"
                                onClick={() => setExpandedAuditId(isAuditExpanded ? null : (p._id || idx))}
                                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                              >
                                <History className="w-3 h-3" />
                                <span>Audit Trail ({p.auditLog.length})</span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${isAuditExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openCorrection(p)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] font-black transition flex items-center gap-1"
                              title="Correct payment amount, type, reference or date with mandatory audit reason"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Correct Record</span>
                            </button>
                          )}
                        </div>

                        {/* Expanded Audit Log Items */}
                        {isAuditExpanded && hasAudit && (
                          <div className="mt-2.5 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs animate-in fade-in duration-200">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Change & Correction History</p>
                            {p.auditLog.map((log, lIdx) => (
                              <div key={lIdx} className="text-[11px] pb-1.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                                <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                                  <span>{log.action} • {log.performedBy || 'Admin'}</span>
                                  <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-[10.5px] text-slate-500 mt-0.5">{log.notes}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No payment transactions recorded for this booking yet.
                </div>
              )}
            </div>
          )}

          {/* ═══════════ TAB 5: RECEIPT VIEW ═══════════ */}
          {activeTab === 'RECEIPT' && lastPaymentReceipt && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-xl mx-auto shadow-sm">
                <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Official Payment Voucher
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">Krishna Lodge & Residency</h3>
                  <p className="text-xs text-slate-500">Thiruvazhiyode, Kerala • +91 9447940835</p>
                </div>

                <div className="py-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Receipt Ref:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{lastPaymentReceipt.referenceId || lastPaymentReceipt._id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date & Time:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{new Date().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tenant:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{booking.tenantName || 'Valued Tenant'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Room / Suite:</span>
                    <span className="font-bold text-slate-900 dark:text-white">#{room.roomNumber || '101'} ({room.type || 'Standard'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Category:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{lastPaymentReceipt.paymentType || 'Rent'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Method:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{lastPaymentReceipt.method || paymentMethod}</span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-black">
                    <span>Amount Transferred:</span>
                    <span className="text-indigo-600 font-poppins text-lg">₹{lastPaymentReceipt.amount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-slate-500">Remaining Residency Balance:</span>
                    <span className="font-black text-rose-600 font-poppins">₹{(lastPaymentReceipt.newRemaining || 0).toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Residency Result Status:</span>
                    <span className="font-black text-emerald-600 uppercase">{lastPaymentReceipt.resultStatus || 'Recorded'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" /> Print Voucher
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('PAY')}
                    className="px-4 py-2.5 bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
                  >
                    Back to Payments
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 hidden sm:inline">Overall Status:</span>
            <span className={`px-3 py-1 rounded-full font-black uppercase text-[10px] ${
              overall.status === 'Fully Paid' ? 'bg-emerald-100 text-emerald-800' :
              overall.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
            }`}>
              {overall.status}
            </span>
          </div>
        </div>

      </div>

      {/* Admin Settings Modal */}
      {showEditSettingsModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Admin Configuration
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">Lodge Payment Accounts</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowEditSettingsModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentSettings} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Primary UPI ID *</label>
                <input
                  type="text"
                  required
                  value={editSettingsForm.upiId}
                  onChange={e => setEditSettingsForm({...editSettingsForm, upiId: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border p-2.5 rounded-xl font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Merchant Display Name</label>
                <input
                  type="text"
                  value={editSettingsForm.merchantDisplayName}
                  onChange={e => setEditSettingsForm({...editSettingsForm, merchantDisplayName: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border p-2.5 rounded-xl text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editSettingsForm.bankName}
                    onChange={e => setEditSettingsForm({...editSettingsForm, bankName: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border p-2 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Account Holder</label>
                  <input
                    type="text"
                    value={editSettingsForm.accountHolder}
                    onChange={e => setEditSettingsForm({...editSettingsForm, accountHolder: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border p-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Account Number</label>
                  <input
                    type="text"
                    value={editSettingsForm.accountNumber}
                    onChange={e => setEditSettingsForm({...editSettingsForm, accountNumber: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border p-2 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={editSettingsForm.ifsc}
                    onChange={e => setEditSettingsForm({...editSettingsForm, ifsc: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border p-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-black text-xs shadow-md transition"
              >
                {savingSettings ? 'Saving...' : 'Save Payment Configuration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Correction Modal (Admin with Mandatory Audit Reason) */}
      {correctingPayment && (
        <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-amber-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Audited Payment Correction
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  Correct Payment Record
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Ref: {correctingPayment.referenceId || correctingPayment.transactionReference || correctingPayment._id}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setCorrectingPayment(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={correctionForm.amount}
                    onChange={e => setCorrectionForm({...correctionForm, amount: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-bold font-poppins text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Payment Type</label>
                  <select
                    value={correctionForm.paymentType}
                    onChange={e => setCorrectionForm({...correctionForm, paymentType: e.target.value, chargeCategory: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Rent">Rent</option>
                    <option value="Security Deposit">Security Deposit</option>
                    <option value="Additional Charge">Additional Charge</option>
                    <option value="Deposit Adjustment">Deposit Adjustment</option>
                    <option value="Refund">Refund</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Method</label>
                  <select
                    value={correctionForm.method}
                    onChange={e => setCorrectionForm({...correctionForm, method: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Security Deposit">Security Deposit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Payment Date</label>
                  <input
                    type="date"
                    value={correctionForm.paymentDate}
                    onChange={e => setCorrectionForm({...correctionForm, paymentDate: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">Reference / UTR ID</label>
                <input
                  type="text"
                  value={correctionForm.referenceId}
                  onChange={e => setCorrectionForm({...correctionForm, referenceId: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-xl font-mono text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <label className="block font-black text-amber-900 dark:text-amber-200 mb-1">
                  Correction Reason (Mandatory Audit Log) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Corrected typo in amount from ₹5000 to ₹4500 as per bank statement reconciliation"
                  value={correctionForm.reason}
                  onChange={e => setCorrectionForm({...correctionForm, reason: e.target.value})}
                  className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 p-2 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                  Administrator name, timestamp, previous values, and this reason will be permanently saved.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectingPayment(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 py-3 rounded-xl font-black text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {submittingCorrection ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Save & Record Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
