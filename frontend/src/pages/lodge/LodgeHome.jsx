import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Building2, ClipboardList, ExternalLink,
  Phone, Shield, ChevronRight, Zap, Heart, MapPin
} from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';

const ADMIN_PHONE = '9876543210';
const ADMIN_WHATSAPP = `https://wa.me/91${ADMIN_PHONE}`;
const KRISHNA_WEBSITE = 'https://krishna-akhilnjcets-projects.vercel.app/';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const LodgeHome = () => {
  const navigate = useNavigate();
  const { rooms, authenticatedTenantRoom } = useLodgeStore();

  const userRoom = rooms.find(r => r.number === authenticatedTenantRoom);
  const hasAlert = userRoom && (
    (userRoom.dueDate && new Date(userRoom.dueDate) <= new Date()) ||
    (userRoom.electricityBill > 0 && userRoom.electricityStatus === 'pending') ||
    (userRoom.waterBill > 0 && userRoom.waterStatus === 'pending')
  );

  const handleSOS = () => {
    if (confirm('🚨 Emergency! Call Administrator now?')) {
      window.open(`tel:${ADMIN_PHONE}`, '_self');
    }
  };

  const menuItems = [
    {
      id: 'building',
      icon: Building2,
      title: 'Krishna Building',
      subtitle: 'Identify room & login to manage',
      color: 'from-blue-600 to-indigo-700',
      iconBg: 'bg-blue-50 text-blue-600',
      action: () => navigate('/lodge/tenant-login'),
    },
    {
      id: 'report',
      icon: ClipboardList,
      title: 'Report Issue',
      subtitle: 'Submit a complaint quickly',
      color: 'from-amber-500 to-orange-600',
      iconBg: 'bg-amber-50 text-amber-600',
      action: () => navigate('/lodge/complaint'),
    },
    {
      id: 'website',
      icon: ExternalLink,
      title: 'Krishna Engineering Works',
      subtitle: 'Visit our official website',
      color: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-50 text-emerald-600',
      action: () => window.open(KRISHNA_WEBSITE, '_blank'),
    },
    {
      id: 'contact',
      icon: Phone,
      title: 'Contact Administrator',
      subtitle: 'Call or WhatsApp the admin',
      color: 'from-violet-500 to-purple-600',
      iconBg: 'bg-violet-50 text-violet-600',
      action: () => {
        const choice = confirm('Press OK to Call, Cancel to WhatsApp');
        if (choice) window.open(`tel:${ADMIN_PHONE}`, '_self');
        else window.open(ADMIN_WHATSAPP, '_blank');
      },
    },
    {
      id: 'location',
      icon: MapPin,
      title: 'Location & Map',
      subtitle: 'Get directions to Krishna Building',
      color: 'from-rose-500 to-red-600',
      iconBg: 'bg-rose-50 text-rose-600',
      action: () => window.open('https://maps.google.com/?q=Krishna+engineering+works+thiruzhiyode', '_blank'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a3a7a] via-[#2D5BE3] to-[#4f7af7] pt-14 pb-20 px-6">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-1.5 mb-4 border border-white/20">
            <Shield className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">Building Manager</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1 font-poppins">KRISHNA ERP</h1>
          <p className="text-blue-200 text-sm font-medium">Lodge & Building Manager</p>
        </motion.div>
      </div>

      <div className="px-5 -mt-12 pb-8 max-w-lg mx-auto">
        {/* SOS Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSOS}
          className="w-full mb-6 relative group"
        >
          <div className="absolute inset-0 bg-red-500 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
          <div className="relative flex items-center justify-between bg-gradient-to-r from-[#E53935] to-[#C62828] rounded-2xl p-5 shadow-xl shadow-red-200/50 border border-red-400/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <AlertTriangle className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-lg">Emergency SOS</p>
                <p className="text-red-200 text-xs font-medium">Tap to call admin instantly</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
          </div>
        </motion.button>

        {/* Menu Cards */}
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3.5">
          {menuItems.map((menuItem) => (
            <motion.button
              key={menuItem.id}
              variants={item}
              whileTap={{ scale: 0.97 }}
              onClick={menuItem.action}
              className="w-full group"
            >
              <div className="bg-white rounded-2xl p-5 shadow-lg shadow-slate-200/60 border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${menuItem.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform relative`}>
                    <menuItem.icon className="w-6 h-6" />
                    {menuItem.id === 'building' && hasAlert && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-[#111827] font-bold text-[15px]">{menuItem.title}</p>
                    <p className="text-slate-400 text-xs font-medium mt-0.5">{menuItem.subtitle}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Admin Access - Hidden */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <button
            onClick={() => navigate('/lodge/admin-login')}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors text-xs font-medium py-3 px-6 rounded-xl hover:bg-blue-50/50"
          >
            <Shield className="w-3.5 h-3.5" />
            Admin Panel
          </button>
        </motion.div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-slate-300 font-medium">
          <span>Built with</span>
          <Heart className="w-3 h-3 text-red-400 fill-red-400" />
          <span>by Krishna Engineering</span>
        </div>
      </div>
    </div>
  );
};

export default LodgeHome;
