import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Users, CheckCircle, Navigation } from 'lucide-react';
import api from '../../services/api';

export default function LodgeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lodge, setLodge] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [lodgeRes, roomsRes] = await Promise.all([
        api.get(`/lodge/${id}`),
        api.get(`/rooms/lodge/${id}`)
      ]);
      setLodge(lodgeRes.data);
      setRooms(roomsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center text-gray-500 mt-20">Loading lodge data...</div>;
  if (!lodge) return <div className="p-20 text-center text-red-500 mt-20">Lodge missing.</div>;

  const mapsApiKey = import.meta.env.VITE_MAPS_API_KEY || '';
  const mapUrl = `https://www.google.com/maps/embed/v1/place?q=${lodge.location.lat},${lodge.location.lng}&key=${mapsApiKey}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
      <div className="mb-6">
         <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2">{lodge.name}</h1>
         <div className="flex items-center text-gray-600">
            <MapPin className="w-5 h-5 mr-1 text-blue-600" />
            {lodge.location.address}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 h-[400px] rounded-2xl overflow-hidden shadow-lg border border-gray-100">
         <div className="md:col-span-3 bg-gray-200 h-full">
            {lodge.images?.[0] ? <img src={lodge.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-50 grid place-items-center text-blue-300 font-bold">No Image</div>}
         </div>
         <div className="hidden md:flex flex-col gap-4 h-full">
             {[1,2].map(i => (
                <div key={i} className="flex-1 bg-gray-200">
                   {lodge.images?.[i] ? <img src={lodge.images[i]} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-blue-100/50" />}
                </div>
             ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 space-y-10">
            <section>
               <h2 className="text-2xl font-bold text-gray-900 mb-4">About this property</h2>
               <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">{lodge.description}</p>
            </section>

            <section>
               <h2 className="text-2xl font-bold text-gray-900 mb-4">Top Amenities</h2>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2">
                  {lodge.amenities?.map(am => (
                     <div key={am} className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 mr-2 text-green-500" />{am}</div>
                  ))}
               </div>
            </section>

            <section>
               <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose your room</h2>
               {rooms.length === 0 ? <p className="text-gray-500">No rooms listed.</p> : (
                  <div className="space-y-4">
                     {rooms.map(room => (
                        <div key={room._id} className="border hover:border-blue-300 rounded-xl p-6 flex flex-col md:flex-row justify-between bg-white shadow-sm transition-colors">
                           <div className="flex-1">
                              <h3 className="text-xl font-bold mb-2">{room.type}</h3>
                              <div className="flex items-center text-gray-600 mb-3 text-sm"><Users className="w-4 h-4 mr-1" /> Max {room.maxGuests}</div>
                              <p className="text-gray-600 text-sm">{room.description}</p>
                           </div>
                           <div className="mt-4 md:mt-0 md:text-right">
                              <div className="mb-3"><span className="text-2xl font-extrabold text-blue-600">${room.price}</span><span className="text-gray-500"> / night</span></div>
                              <button onClick={() => navigate(`/lodge/book/${room._id}`)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg">Reserve Dates</button>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </section>
         </div>

         <div className="lg:col-span-1">
            <div className="sticky top-24">
               <div className="bg-white border rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center"><Navigation className="w-5 h-5 mr-2 text-blue-600" /> Location</h3>
                  {mapsApiKey ? (
                     <div className="w-full h-64 rounded-xl overflow-hidden mb-4"><iframe width="100%" height="100%" frameBorder="0" src={mapUrl}></iframe></div>
                  ) : (
                     <div className="w-full h-64 rounded-xl overflow-hidden bg-blue-50 grid place-items-center mb-4 border border-dashed border-blue-200">
                         <div className="text-center"><MapPin className="text-blue-300 w-10 h-10 mx-auto" /><span className="text-blue-500 text-sm">Map rendering disabled</span></div>
                     </div>
                  )}
                  <p className="text-gray-600 text-sm">{lodge.location.address}</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
