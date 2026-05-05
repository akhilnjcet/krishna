import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, MapPin, Users, Navigation } from 'lucide-react';

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
        <div className="absolute top-6 right-6 z-20 flex gap-4">
            <button onClick={() => navigate('/lodge/dashboard')} className="text-white hover:text-blue-200 font-bold px-4 py-2 text-sm transition-colors border border-white/40 rounded-xl bg-white/10 backdrop-blur-md">My Dashboard</button>
            <button onClick={() => navigate('/login')} className="bg-white/10 text-white font-bold px-4 py-2 border border-white/20 rounded-xl hover:bg-white/20 backdrop-blur-md text-sm shadow-lg transition-all">Portal Entrance</button>
        </div>

        <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center mt-20">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 text-center tracking-tight leading-tight">
            Krishna Building
          </h1>
          <p className="text-xl text-blue-100 mb-10 text-center max-w-2xl">
            Manage your stay and easily browse available rooms strictly monitored via our dynamic availability matrix.
          </p>
          
          {/* Search Bar */}
          <form 
            onSubmit={handleSearch}
            className="w-full bg-white p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2"
          >
            <div className="flex-1 flex items-center bg-gray-100/50 rounded-xl px-4 py-3 border border-transparent">
               <MapPin className="text-gray-400 mr-3 w-5 h-5 flex-shrink-0" />
               <p className="w-full text-gray-800 font-bold whitespace-nowrap">Krishna Building, Main Street</p>
            </div>
            <div className="flex-1 flex items-center bg-gray-100/50 rounded-xl px-4 py-3 border border-transparent hidden sm:flex opacity-60 cursor-not-allowed">
               <Calendar className="text-gray-400 mr-3 w-5 h-5 flex-shrink-0" />
               <span className="text-gray-500 flex-1 truncate">Check in — Check out</span>
            </div>
            
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center -ml-1 sm:ml-0"
            >
              <Search className="w-5 h-5 mr-2" />
              Search
            </button>
          </form>
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
