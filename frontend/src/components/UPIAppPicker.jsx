import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import { UPI_APPS, buildUPILink, buildAndroidIntent, isAndroid, detectWebView } from '../utils/upiUtils';

const UPIAppPicker = ({ isOpen, onClose, upiData, onFallbackTriggered }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState(null);
  const isWebview = detectWebView();

  useEffect(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [redirectUrl]);

  const handleLaunch = (app) => {
    setIsOpening(true);
    
    // Debug logging as requested
    console.log(`[UPI DEBUG] Launching ${app.name} (${app.id})`);
    console.log(`[UPI DEBUG] Amount: ${upiData.am}, UPI ID: ${upiData.pa}`);

    const androidIntent = buildAndroidIntent(upiData, app.package);
    const standardLink = buildUPILink(upiData);

    // Launch targeted intent on Android, fallback to standard link on others
    const finalLink = isAndroid() ? androidIntent : standardLink;
    
    console.log(`[UPI DEBUG] Final Intent URL: ${finalLink}`);
    
    setRedirectUrl(finalLink);

    // Start failure detection timer (3 seconds)
    setTimeout(() => {
        setIsOpening(false);
        // We trigger fallback automatically after some time to give user options
        onFallbackTriggered();
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 italic">Select Payment <span className="text-blue-600 font-bold">Node</span></h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Authorized App Dispatch</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="p-8 space-y-6">
            {isWebview && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1 italic">Link Access Warning</p>
                  <p className="text-[10px] font-bold text-amber-700 leading-tight uppercase">
                    You are in an in-app browser. Payments may be blocked. For 100% success, open in <span className="text-amber-900 font-black underline">Chrome</span>.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {UPI_APPS.map((app) => (
                <button
                  key={app.id}
                  onClick={() => handleLaunch(app)}
                  disabled={isOpening}
                  className="group relative bg-slate-50 border border-slate-100 p-6 rounded-[2rem] flex flex-col items-center gap-3 hover:bg-white hover:border-blue-500 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: app.color }}
                  >
                    <Send className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{app.name}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={onFallbackTriggered}
              className="w-full py-5 bg-blue-50 text-blue-600 rounded-2xl font-black uppercase tracking-[0.3em] text-[9px] hover:bg-blue-100 transition-all flex items-center justify-center gap-2 border border-blue-100"
            >
              <ExternalLink className="w-4 h-4" /> Try QR or Manual Entry
            </button>
          </div>

          {/* Loading Overlay */}
          <AnimatePresence>
            {isOpening && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center"
              >
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
                <h4 className="text-lg font-black uppercase tracking-tighter italic text-slate-900">Activating App</h4>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 max-w-[200px]">
                  Waiting for secure handshake... If app fails to open, try a different one.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UPIAppPicker;
