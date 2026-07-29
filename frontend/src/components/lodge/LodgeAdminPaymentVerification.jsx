import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, Clock, Eye, Download, ShieldCheck, 
  IndianRupee, AlertTriangle, Send, Settings, Search, RefreshCw, 
  Building2, CreditCard, Plus, Check, Trash2, FileText 
} from 'lucide-react';
import api from '../../services/api';
import { generateLodgeReceiptPDF } from '../../services/lodgeReceiptService';

export default function LodgeAdminPaymentVerification() {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'all' | 'request' | 'settings'
  const [stats, setStats] = useState({
    todaysCollections: 0,
    pendingCount: 0,
    pendingAmount: 0,
    monthlyRevenue: 0,
    rejectedCount: 0,
    outstandingRent: 0,
    advanceCollections: 0
  });

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rejection Modal
  const [rejectModal, setRejectModal] = useState({ show: false, payment: null, reason: '' });
  const [proofModal, setProofModal] = useState(null);

  // Create Request State
  const [rooms, setRooms] = useState([]);
  const [requestForm, setRequestForm] = useState({
    roomId: '',
    customerId: '',
    amount: '',
    dueDate: '',
    reason: '',
    lateFee: '0',
    customMessage: ''
  });

  // Payment Settings State
  const [settingsForm, setSettingsForm] = useState({
    upiId: 'krishnaengineering@upi',
    merchantName: 'Krishna Engineering Works',
    merchantDisplayName: 'Krishna Lodge & Complex',
    bankName: 'State Bank of India',
    accountHolder: 'Krishna Engineering Works',
    accountNumber: '39485720194',
    ifsc: 'SBIN0001234',
    branch: 'Kuttanassery, Palakkad',
    paymentInstructions: 'Please mention your Room Number and Booking ID in your payment notes.',
    allowedAdditionalCharges: [
      'Electricity', 'Water', 'Wi-Fi', 'Internet', 'Maintenance', 'Parking',
      'Laundry', 'Housekeeping', 'Cleaning', 'Food', 'Gas', 'Cable TV',
      'Security Deposit', 'Advance Payment', 'Damage Charges', 'Miscellaneous'
    ]
  });
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, payRes, setRes, roomRes] = await Promise.all([
        api.get('/lodge-payments/stats').catch(() => ({ data: {} })),
        api.get('/lodge-payments/all').catch(() => ({ data: [] })),
        api.get('/lodge-payments/settings').catch(() => ({ data: {} })),
        api.get('/rooms').catch(() => ({ data: [] }))
      ]);

      setStats(prev => ({ ...prev, ...statsRes.data }));
      setPayments(payRes.data || []);
      if (setRes.data) setSettingsForm(prev => ({ ...prev, ...setRes.data }));
      setRooms(roomRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Approve Payment
  const handleApprove = async (payment) => {
    if (!confirm(`Approve payment of ₹${payment.amount} for Room #${payment.roomId?.roomNumber || 'Residence'}?`)) return;
    try {
      await api.put(`/lodge-payments/verify/${payment._id}`, { status: 'VERIFIED' });
      alert('Payment VERIFIED successfully. Digital receipt generated and tenant notified.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed.');
    }
  };

  // Submit Rejection
  const submitRejection = async (e) => {
    e.preventDefault();
    if (!rejectModal.reason) return alert('Please enter a reason for rejection.');
    try {
      await api.put(`/lodge-payments/verify/${rejectModal.payment._id}`, {
        status: 'REJECTED',
        rejectionReason: rejectModal.reason
      });
      alert('Payment REJECTED. Tenant notified with the specified reason.');
      setRejectModal({ show: false, payment: null, reason: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed.');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.post('/lodge-payments/settings', settingsForm);
      alert('Payment Settings updated successfully!');
      fetchData();
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Submit Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.roomId || !requestForm.amount || !requestForm.dueDate || !requestForm.reason) {
      return alert('Fill in all required fields.');
    }
    const selectedRoomObj = rooms.find(r => r._id === requestForm.roomId);
    const tenantId = selectedRoomObj?.currentTenant?._id || selectedRoomObj?.userId || requestForm.customerId;
    if (!tenantId) return alert('No active tenant found for selected room.');

    try {
      await api.post('/lodge-payments/request', {
        ...requestForm,
        customerId: tenantId
      });
      alert('Payment Request generated and sent to tenant!');
      setRequestForm({ roomId: '', customerId: '', amount: '', dueDate: '', reason: '', lateFee: '0', customMessage: '' });
      fetchData();
    } catch (err) {
      alert('Failed to create payment request.');
    }
  };

  const pendingPayments = payments.filter(p => p.status === 'WAITING_FOR_VERIFICATION' || p.status === 'pending');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "Today's Collections", val: `₹${stats.todaysCollections?.toLocaleString() || 0}`, bg: 'bg-emerald-500 text-white' },
          { title: 'Pending Verification', val: `${stats.pendingCount || 0} (₹${stats.pendingAmount || 0})`, bg: 'bg-amber-500 text-white' },
          { title: 'Monthly Revenue', val: `₹${stats.monthlyRevenue?.toLocaleString() || 0}`, bg: 'bg-indigo-600 text-white' },
          { title: 'Outstanding Rent', val: `₹${stats.outstandingRent?.toLocaleString() || 0}`, bg: 'bg-rose-600 text-white' },
          { title: 'Advance Collections', val: `₹${stats.advanceCollections?.toLocaleString() || 0}`, bg: 'bg-blue-600 text-white' },
          { title: 'Rejected Submissions', val: `${stats.rejectedCount || 0}`, bg: 'bg-slate-800 text-white' },
        ].map((m, i) => (
          <div key={i} className={`${m.bg} p-5 rounded-2xl shadow-lg flex flex-col justify-between`}>
            <p className="text-[10px] font-black uppercase tracking-wider opacity-80">{m.title}</p>
            <p className="text-xl font-black font-poppins mt-2">{m.val}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto no-scrollbar">
        {[
          { id: 'queue', label: `Pending Verification (${pendingPayments.length})`, icon: Clock },
          { id: 'all', label: `All Payment Audit Logs (${payments.length})`, icon: FileText },
          { id: 'request', label: 'Issue Payment Request', icon: Send },
          { id: 'settings', label: 'Payment Settings', icon: Settings },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-4 px-2 font-black text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. Verification Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-900">Tenant Payments Awaiting Verification</h3>
            <button onClick={fetchData} className="p-2 text-slate-500 hover:text-indigo-600 bg-white rounded-xl border border-slate-200 shadow-sm">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="grid gap-4">
            {pendingPayments.map(p => (
              <div key={p._id} className="bg-white border-2 border-amber-100 rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black text-xl font-poppins flex-shrink-0">
                      ₹{p.amount}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">
                        {p.tenantName || p.customerId?.name || 'Tenant'} • Room #{p.roomId?.roomNumber || '101'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Method: <strong className="text-slate-800">{p.method}</strong> • Ref ID: <span className="font-mono text-indigo-600 font-bold">{p.referenceId || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(p)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => setRejectModal({ show: true, payment: p, reason: '' })}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl text-xs font-bold border border-rose-100 flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>

                {/* Proof & Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase">Payment Category</p>
                    <p className="font-bold text-slate-800 mt-0.5">{p.chargeCategory || p.paymentType || 'Rent'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase">Submission Time</p>
                    <p className="font-bold text-slate-800 mt-0.5">{new Date(p.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold text-[10px] uppercase">Tenant Remarks</p>
                    <p className="font-bold text-slate-800 mt-0.5">{p.notes || 'None'}</p>
                  </div>
                </div>

                {p.uploadedProof && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setProofModal(p.uploadedProof)}
                      className="text-indigo-600 font-bold text-xs flex items-center gap-1 hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Uploaded Screenshot Proof
                    </button>
                  </div>
                )}
              </div>
            ))}

            {pendingPayments.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-lg font-black text-slate-800">No Pending Verifications</h4>
                <p className="text-slate-400 text-xs mt-1">All tenant payment submissions have been verified.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. All Payments */}
      {activeTab === 'all' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-900">Complete Lodge Payment Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-3">Tenant & Room</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Method & Ref</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {payments.map(p => (
                  <tr key={p._id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900">
                      {p.tenantName || p.customerId?.name || 'Tenant'} (Room #{p.roomId?.roomNumber || '101'})
                    </td>
                    <td className="p-3 font-black text-indigo-600 font-poppins">₹{p.amount}</td>
                    <td className="p-3">
                      <div>{p.method}</div>
                      <div className="text-[10px] font-mono text-slate-400">{p.referenceId}</div>
                    </td>
                    <td className="p-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        p.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700' :
                        p.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {(p.status === 'VERIFIED' || p.status === 'Completed') && (
                        <button onClick={() => generateLodgeReceiptPDF(p)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Issue Payment Request */}
      {activeTab === 'request' && (
        <form onSubmit={handleCreateRequest} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900">Generate Tenant Payment Request</h3>
            <p className="text-xs text-slate-500 mt-1">Send a custom bill or payment request directly to a tenant dashboard.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Select Room / Active Residency</label>
              <select
                value={requestForm.roomId}
                onChange={(e) => setRequestForm({ ...requestForm, roomId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
                required
              >
                <option value="">Select Room...</option>
                {rooms.map(r => (
                  <option key={r._id} value={r._id}>Room #{r.roomNumber} ({r.type}) - {r.currentTenant?.name || 'Occupied'}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payable Amount (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 3500"
                  value={requestForm.amount}
                  onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={requestForm.dueDate}
                  onChange={(e) => setRequestForm({ ...requestForm, dueDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Reason / Description</label>
              <input
                type="text"
                placeholder="e.g. July Electricity & Water Meter Bill"
                value={requestForm.reason}
                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Custom Message to Tenant</label>
              <textarea
                rows={3}
                placeholder="Optional custom message..."
                value={requestForm.customMessage}
                onChange={(e) => setRequestForm({ ...requestForm, customMessage: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
              />
            </div>
          </div>

          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl shadow-indigo-600/30 flex items-center gap-2">
            <Send className="w-4 h-4" /> Issue Payment Request
          </button>
        </form>
      )}

      {/* 4. Payment Settings */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-3xl space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900">Admin Payment & Bank Configuration</h3>
            <p className="text-xs text-slate-500 mt-1">Configure UPI ID, Bank Accounts, and allowed additional charge categories.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Merchant UPI ID</label>
              <input
                type="text"
                value={settingsForm.upiId}
                onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Merchant Display Name</label>
              <input
                type="text"
                value={settingsForm.merchantDisplayName}
                onChange={(e) => setSettingsForm({ ...settingsForm, merchantDisplayName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={settingsForm.bankName}
                onChange={(e) => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Holder</label>
              <input
                type="text"
                value={settingsForm.accountHolder}
                onChange={(e) => setSettingsForm({ ...settingsForm, accountHolder: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                value={settingsForm.accountNumber}
                onChange={(e) => setSettingsForm({ ...settingsForm, accountNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={settingsForm.ifsc}
                onChange={(e) => setSettingsForm({ ...settingsForm, ifsc: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Payment Instructions for Tenants</label>
            <textarea
              rows={2}
              value={settingsForm.paymentInstructions}
              onChange={(e) => setSettingsForm({ ...settingsForm, paymentInstructions: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl shadow-indigo-600/30 flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Save Payment Settings
          </button>
        </form>
      )}

      {/* Rejection Modal */}
      {rejectModal.show && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submitRejection} className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-black text-slate-900 text-base">Reject Payment Submission</h3>
            <p className="text-xs text-slate-500">Please provide a mandatory reason for rejecting this payment submission so the tenant can correct it.</p>
            <textarea
              rows={3}
              placeholder="e.g. Invalid UTR number provided. Screenshot does not match amount."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800"
              required
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectModal({ show: false, payment: null, reason: '' })} className="px-4 py-2 text-xs font-bold text-slate-500">
                Cancel
              </button>
              <button type="submit" className="bg-rose-600 text-white px-5 py-2 rounded-xl text-xs font-bold">
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Proof Modal */}
      {proofModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-sm text-slate-900">Uploaded Screenshot Proof</h3>
              <button onClick={() => setProofModal(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <img src={proofModal} alt="Proof" className="max-w-full rounded-2xl mx-auto" />
          </div>
        </div>
      )}

    </div>
  );
}
