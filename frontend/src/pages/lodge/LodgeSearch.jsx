import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import api from '../../services/api';

export default function LodgeSearch() {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const initLoc = queryParams.get('location') || '';
  
  const [lodges, setLodges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initLoc);

  useEffect(() => {
    fetchLodges();
  }, [initLoc]); // Re-fetch or filter when URL search changes

  const fetchLodges = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lodge');
      
      if (initLoc) {
        setLodges(res.data.filter(l => 
          l.location.address.toLowerCase().includes(initLoc.toLowerCase()) || 
          l.name.toLowerCase().includes(initLoc.toLowerCase())
        ));
      } else {
        setLodges(res.data);
      }
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    if (query) {
        setLodges(lodges.filter(l => 
          l.location.address.toLowerCase().includes(query.toLowerCase()) || 
          l.name.toLowerCase().includes(query.toLowerCase())
        ));
    } else {
        fetchLodges(); // Reset
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-lg mb-4">Filter Lodges</h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input 
                 type="text" 
                 className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" 
                 value={query}
                 onChange={e => setQuery(e.target.value)}
              />
            </div>
            <button onClick={handleFilterApply} className="w-full bg-blue-50 text-blue-700 font-medium py-2 rounded-lg hover:bg-blue-100 transition-colors">
              Search Local
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
             {lodges.length} {lodges.length === 1 ? 'lodge found' : 'lodges available'}
          </h2>
          
          {loading ? (
             <div className="p-12 text-center">Loading properties...</div>
          ) : lodges.length === 0 ? (
             <div className="bg-white p-12 rounded-2xl text-center border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800">No parameters matched.</h3>
                <p className="text-gray-500">Broaden your search location.</p>
             </div>
          ) : (
            <div className="space-y-6">
              {lodges.map(lodge => (
                <div key={lodge._id} className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col sm:flex-row">
                  <div className="sm:w-72 h-48 sm:h-auto bg-gray-200 relative">
                    {lodge.images && lodge.images[0] ? (
                       <img src={lodge.images[0]} alt={lodge.name} className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center"><span className="text-gray-400">No Image</span></div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                          <h3 className="text-xl font-bold text-gray-900">
                             <Link to={`/lodge/detail/${lodge._id}`}>{lodge.name}</Link>
                          </h3>
                          <div className="flex items-center text-gray-500 text-sm mt-1">
                             <MapPin className="w-4 h-4 mr-1" />
                             {lodge.location.address}
                          </div>
                       </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-2 mb-4 line-clamp-2">{lodge.description}</p>
                    <div className="mt-auto flex justify-between items-end">
                       <Link to={`/lodge/detail/${lodge._id}`} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium">
                         Check Availability
                       </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
