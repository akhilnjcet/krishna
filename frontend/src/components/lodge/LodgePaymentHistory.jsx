import React, { useState } from 'react';
import { 
  Search, Filter, Download, Eye, FileText, CheckCircle2, Clock, 
  XCircle, AlertTriangle, ShieldCheck, ExternalLink, Calendar, Building2, User 
} from 'lucide-react';
import { generateLodgeReceiptPDF } from '../../services/lodgeReceiptService';

export default function LodgePaymentHistory({ payments = [], isAdmin = false, onRefresh }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedProof, setSelectedProof] = useState(null);

  // Filter payments
  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      (p.referenceId || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.invoiceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.tenantName || p.customerId?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.roomId?.roomNumber || '').toString().includes(search);

    const matchesStatus = statusFilter === 'ALL' ? true :
      statusFilter === 'VERIFIED' ? (p.status === 'VERIFIED' || p.status === 'Completed' || p.status === 'APPROVED') :
      statusFilter === 'WAITING' ? (p.status === 'WAITING_FOR_VERIFICATION' || p.status === 'pending') :
      statusFilter === 'REJECTED' ? (p.status === 'REJECTED' || p.status === 'Failed') : true;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    if (status === 'VERIFIED' || status === 'Completed' || status === 'APPROVED') {
      return (
        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verified / Paid
        </span>
      );
    }
    if (status === 'REJECTED' || status === 'Failed') {
      return (
        <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
          <XCircle className="w-3 h-3 text-rose-500" /> Rejected
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
        <Clock className="w-3 h-3 text-amber-500 animate-spin" /> Pending Verification
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search Ref ID, Invoice, Room, Tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {['ALL', 'VERIFIED', 'WAITING', 'REJECTED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Transactions' : st === 'VERIFIED' ? 'Verified' : st === 'WAITING' ? 'Pending' : 'Rejected'}
            </button>
          ))}
        </div>

      </div>

      {/* History List / Table */}
      <div className="grid gap-4">
        {filteredPayments.map(p => {
          const isVerified = p.status === 'VERIFIED' || p.status === 'Completed' || p.status === 'APPROVED';
          const isRejected = p.status === 'REJECTED' || p.status === 'Failed';

          return (
            <div 
              key={p._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 dark:text-white text-base font-poppins">
                        ₹{p.amount.toLocaleString()}
                      </h4>
                      <span className="text-slate-400 text-xs font-bold">• {p.method || 'UPI QR'}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Ref: <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{p.referenceId || 'N/A'}</span> • {new Date(p.createdAt || p.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(p.status)}
                  {isVerified && (
                    <button
                      onClick={() => generateLodgeReceiptPDF(p)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3.5 py-2 rounded-xl text-xs font-bold border border-indigo-100 flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Breakdown Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-xs border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-slate-400 font-medium">Tenant</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{p.tenantName || p.customerId?.name || 'Tenant'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Room / Suite</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">#{p.roomId?.roomNumber || '101'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Category</p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{p.chargeCategory || p.paymentType || 'Rent'}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Receipt No</p>
                  <p className="font-bold text-indigo-600 font-mono">{p.receiptNumber || 'Pending'}</p>
                </div>
              </div>

              {/* Additional Charges Badges if any */}
              {Array.isArray(p.additionalCharges) && p.additionalCharges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="text-slate-400 font-bold mr-1">Includes:</span>
                  {p.additionalCharges.map((chg, i) => (
                    <span key={i} className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-md font-semibold">
                      {chg.name}: ₹{chg.amount}
                    </span>
                  ))}
                </div>
              )}

              {/* Rejection Alert Banner */}
              {isRejected && p.rejectionReason && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-rose-900 uppercase text-[10px] tracking-wider">Verification Rejection Reason</p>
                    <p className="font-medium mt-0.5">{p.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Screenshot Proof Button */}
              {p.uploadedProof && (
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedProof(p.uploadedProof)}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Uploaded Proof Screenshot
                  </button>
                </div>
              )}

            </div>
          );
        })}

        {filteredPayments.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-lg font-black text-slate-800 dark:text-slate-200">No Payment History Found</h4>
            <p className="text-slate-400 text-xs mt-1">There are no records matching your current filter.</p>
          </div>
        )}
      </div>

      {/* Proof Preview Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-sm">Payment Proof Screenshot</h3>
              <button onClick={() => setSelectedProof(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto flex justify-center">
              <img src={selectedProof} alt="Payment Proof" className="max-w-full rounded-2xl shadow-md" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
