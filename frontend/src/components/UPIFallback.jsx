import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Copy, Check, Info, ShieldCheck, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { buildUPILink } from '../utils/upiUtils';

const UPIFallback = ({ upiData }) => {
  const [copied, setCopied] = useState(false);
  const upiLink = buildUPILink(upiData);

  const handleCopyVPA = () => {
    navigator.clipboard.writeText(upiData.pa);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-8 rounded-[4rem] flex flex-col items-center gap-8 border-b-[12px] border-blue-600 shadow-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
      
      {/* Recipient Header */}
      <div className="w-full flex items-center justify-between pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Payee</p>
            <p className="text-sm font-black text-slate-950 uppercase tracking-tight">{upiData.pn || 'Krishna Engineering'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
          <p className="text-xl font-black text-blue-600 italic leading-none">₹ {parseFloat(upiData.am).toFixed(2)}</p>
        </div>
      </div>

      {/* QR Code Segment */}
      <div className="space-y-4 flex flex-col items-center">
        <div className="p-4 bg-white rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_#1e293b] group relative">
          <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-transparent transition-colors z-0" />
          <QRCodeSVG 
            value={upiLink} 
            size={200} 
            level="H"
            includeMargin={true}
            className="relative z-10"
          />
        </div>
        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
          <QrCode className="w-3 h-3" /> Scan with any UPI app
        </div>
      </div>

      {/* Copy Utility */}
      <div className="w-full space-y-4">
        <div className="flex items-center gap-4 bg-slate-900 p-2 pl-6 rounded-2xl border border-slate-800">
          <span className="text-[10px] font-black font-mono text-slate-400 lowercase italic truncate flex-1">{upiData.pa}</span>
          <button 
            onClick={handleCopyVPA}
            className={`px-6 py-4 rounded-xl flex items-center gap-2 transition-all active:scale-95 ${copied ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-white hover:text-blue-600'}`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="text-[9px] font-black uppercase tracking-widest">{copied ? 'ID Copied' : 'Copy ID'}</span>
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-left">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1 italic">Payment Instructions</p>
            <p className="text-[10px] font-bold text-blue-700 leading-tight uppercase">
              1. Copy the UPI ID or scan QR.<br/>2. complete transaction in your app.<br/>3. <span className="text-blue-900 font-black underline">Paste UTR/Ref ID below</span> to finalize.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UPIFallback;
