import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, MapPin, Users, Navigation, ArrowLeft } from 'lucide-react';

export default function LodgeHome() {
  const [location, setLocation] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (location) {
      navigate(`/lodge/search?location=${encodeURIComponent(location)}`);
    } else {
      navigate('/lodge/search');
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen">
      {/* Hero Section */}
      <div className="relative w-full h-[600px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 z-0 overflow-hidden">
             <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent hidden sm:block"></div>
        </div>
        <div className="absolute top-4 right-4 left-4 z-20 flex justify-between items-center md:right-6 md:top-6 md:left-6 md:justify-between">
            <span className="text-white font-black text-sm tracking-tight italic">KRISHNA</span>
            <div className="flex gap-2 sm:gap-4">
                <button onClick={() => navigate('/')} className="text-white hover:text-blue-200 font-bold px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm transition-colors border border-white/40 rounded-xl bg-white/10 backdrop-blur-md flex items-center gap-1.5 shadow">
                    <ArrowLeft className="w-4 h-4" /> Main Home
                </button>
                <button onClick={() => navigate('/lodge/dashboard')} className="text-white hover:text-blue-200 font-bold px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm transition-colors border border-white/40 rounded-xl bg-white/10 backdrop-blur-md">My Dashboard</button>
                <button onClick={() => navigate('/login')} className="bg-white/10 text-white font-bold px-3 py-1.5 sm:px-4 sm:py-2 border border-white/20 rounded-xl hover:bg-white/20 backdrop-blur-md text-xs sm:text-sm shadow-lg transition-all">Portal Entrance</button>
            </div>
        </div>

        <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center mt-20">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 text-center tracking-tight leading-tight">
            Krishna Building
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-10 text-center max-w-2xl">
            Manage your stay and easily browse available rooms strictly monitored via our dynamic availability matrix.
          </p>
          
          {/* Booking Action CTA */}
          <button 
            onClick={() => navigate('/lodge/search')}
            className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-[2rem] transition-all duration-300 shadow-2xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-3 text-base sm:text-lg uppercase tracking-widest"
          >
            Start Your Booking
            <Navigation className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* Featured Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full text-center">
         <h2 className="text-3xl font-bold text-gray-900 mb-4">Premium Tenancy</h2>
         <p className="text-gray-600 max-w-xl mx-auto">Experience seamless living with dedicated room management, automated billing, and instant maintenance ticketing all monitored under Krishna ERP.</p>
      </div>
    </div>
  );
}
