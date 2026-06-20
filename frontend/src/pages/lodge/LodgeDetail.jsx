import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Users, CheckCircle, Navigation, X, Play, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import { getDirectImageUrl, expandGoogleDriveFolders } from '../../utils/imageUtils';
import DriveImage from '../../components/DriveImage';

export default function LodgeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lodge, setLodge] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGalleryRoom, setActiveGalleryRoom] = useState(null);

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
      
      const lodgeData = lodgeRes.data;
      if (lodgeData && lodgeData.images) {
          lodgeData.images = await expandGoogleDriveFolders(lodgeData.images);
      }
      
      const roomsData = roomsRes.data;
      const expandedRooms = await Promise.all(roomsData.map(async room => {
          const expandedInterior = await expandGoogleDriveFolders(room.interiorPhotos || []);
          const expandedExterior = await expandGoogleDriveFolders(room.exteriorPhotos || []);
          return {
              ...room,
              interiorPhotos: expandedInterior,
              exteriorPhotos: expandedExterior
          };
      }));
      
      setLodge(lodgeData);
      setRooms(expandedRooms);
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
         <button 
             onClick={() => navigate('/lodge/search')}
             className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-slate-50 transition-colors font-bold text-sm text-slate-600 shadow-sm bg-white"
         >
             <ArrowLeft className="w-4.5 h-4.5" /> Back to Search
         </button>
      </div>
      <div className="mb-6">
         <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-2">{lodge.name}</h1>
         <div className="flex items-center text-gray-600">
            <MapPin className="w-5 h-5 mr-1 text-blue-600" />
            {lodge.location.address}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 h-[250px] sm:h-[350px] md:h-[400px] rounded-2xl overflow-hidden shadow-lg border border-gray-100">
         <div className="md:col-span-3 bg-gray-200 h-full">
            {lodge.images?.[0] ? <DriveImage src={typeof lodge.images[0] === 'string' ? lodge.images[0] : (lodge.images[0].url || '')} className="w-full h-full" /> : <div className="w-full h-full bg-blue-50 grid place-items-center text-blue-300 font-bold">No Image</div>}
         </div>
         <div className="hidden md:flex flex-col gap-4 h-full">
             {[1,2].map(i => (
                <div key={i} className="flex-1 bg-gray-200">
                   {lodge.images?.[i] ? <DriveImage src={typeof lodge.images[i] === 'string' ? lodge.images[i] : (lodge.images[i].url || '')} className="w-full h-full" /> : <div className="w-full h-full bg-blue-100/50" />}
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
                      {rooms.map(room => {
                         const allPhotos = [...(room.interiorPhotos || []), ...(room.exteriorPhotos || [])];
                         return (
                            <div key={room._id} className="border hover:border-blue-300 rounded-xl p-6 flex flex-col md:flex-row justify-between bg-white shadow-sm transition-colors gap-6">
                               <div className="flex-1 flex flex-col sm:flex-row gap-6">
                                  {allPhotos.length > 0 && (
                                     <div className="w-full sm:w-48 h-32 bg-slate-50 border rounded-xl overflow-hidden relative flex-shrink-0 group cursor-pointer" onClick={() => setActiveGalleryRoom(room)}>
                                         <DriveImage src={allPhotos[0].url} alt="Room preview" className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
                                        {allPhotos.length > 1 && (
                                           <span className="absolute bottom-2 right-2 bg-slate-900/70 text-white text-xs px-2 py-1 rounded font-bold">
                                              +{allPhotos.length - 1} photos
                                           </span>
                                        )}
                                        {room.videoUrl && (
                                           <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] uppercase tracking-widest px-2 py-0.5 rounded font-black flex items-center gap-1 shadow">
                                              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                                              Video tour
                                           </span>
                                        )}
                                     </div>
                                  )}
                                  <div>
                                     <h3 className="text-xl font-bold mb-2 flex items-center gap-3">
                                        {room.type}
                                        {allPhotos.length > 0 && (
                                           <button onClick={() => setActiveGalleryRoom(room)} className="text-xs text-blue-600 hover:text-blue-700 font-bold bg-blue-50 hover:bg-blue-100/85 px-2.5 py-1 rounded-lg transition-colors">
                                              View Gallery
                                           </button>
                                        )}
                                     </h3>
                                     <div className="flex items-center text-gray-600 mb-3 text-sm"><Users className="w-4 h-4 mr-1" /> Max {room.maxGuests}</div>
                                     <p className="text-gray-600 text-sm leading-relaxed">{room.description}</p>
                                  </div>
                               </div>
                               <div className="mt-4 md:mt-0 md:text-right flex flex-col justify-between items-end flex-shrink-0">
                                  <div className="mb-3"><span className="text-2xl font-extrabold text-blue-600">₹{room.price.toLocaleString()}</span><span className="text-gray-500"> / night</span></div>
                                  <button onClick={() => navigate(`/lodge/book/${room._id}`)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg">Reserve Dates</button>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                )}
            </section>
         </div>

         <div className="lg:col-span-1">
            <div className="sticky top-24">
                <div className="bg-white border rounded-2xl shadow-sm p-6">
                   <h3 className="font-bold text-lg mb-4 flex items-center"><Navigation className="w-5 h-5 mr-2 text-blue-600" /> Location</h3>
                   {lodge.location.mapUrl || mapsApiKey ? (
                      <div className="w-full h-64 rounded-xl overflow-hidden mb-4">
                         <iframe 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            src={getMapEmbedUrl(lodge.location.mapUrl || mapUrl)}
                            allowFullScreen
                         ></iframe>
                      </div>
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

      {activeGalleryRoom && (
         <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex flex-col justify-center items-center p-4">
             <div className="bg-white p-8 rounded-[2rem] w-full max-w-4xl relative shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
                 <h3 className="text-3xl font-black mb-2 tracking-tight uppercase">{activeGalleryRoom.type} Room Assets</h3>
                 <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest italic mb-6">Viewing all linked photo & video assets</p>
                 <button type="button" onClick={() => setActiveGalleryRoom(null)} className="absolute top-10 right-10 text-slate-400 bg-slate-50 p-3 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100"><X className="w-5 h-5"/></button>
                 
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto pr-2 flex-grow">
                     {/* Video Player Column */}
                     {activeGalleryRoom.videoUrl && (
                         <div className="lg:col-span-5 space-y-4">
                             <h4 className="font-black text-sm uppercase text-slate-400 tracking-wider">Video Tour</h4>
                             {renderVideoPlayer(activeGalleryRoom.videoUrl)}
                         </div>
                     )}
                     
                     {/* Photos Grid Column */}
                     <div className={`${activeGalleryRoom.videoUrl ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                         <h4 className="font-black text-sm uppercase text-slate-400 tracking-wider">Photos</h4>
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                             {[...(activeGalleryRoom.interiorPhotos || []), ...(activeGalleryRoom.exteriorPhotos || [])].map((img, idx) => (
                                 <div key={idx} className="relative aspect-square border rounded-2xl overflow-hidden bg-slate-50">
                                     <DriveImage src={img.url} alt="Gallery asset" className="w-full h-full" />
                                 </div>
                             ))}
                             {[...(activeGalleryRoom.interiorPhotos || []), ...(activeGalleryRoom.exteriorPhotos || [])].length === 0 && (
                                 <p className="text-slate-400 text-xs font-bold col-span-full py-10 text-center uppercase tracking-widest italic">No photos uploaded for this room.</p>
                             )}
                         </div>
                     </div>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
}

const renderVideoPlayer = (url) => {
    if (!url) return null;
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            videoId = match[2];
        }
        if (videoId) {
            return (
                <iframe 
                    className="w-full aspect-video rounded-2xl border shadow-sm"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            );
        }
    }
    
    // Google Drive
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let fileId = '';
        const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            fileId = fileIdMatch[1];
        } else {
            const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (idParamMatch && idParamMatch[1]) {
                fileId = idParamMatch[1];
            }
        }
        if (fileId) {
            return (
                <iframe 
                    className="w-full aspect-video rounded-2xl border shadow-sm"
                    src={`https://drive.google.com/file/d/${fileId}/preview`}
                    title="Google Drive video player"
                    frameBorder="0"
                    allow="autoplay"
                    allowFullScreen
                ></iframe>
            );
        }
    }

    // Default HTML5 video player
    return (
        <video 
            src={url} 
            controls 
            className="w-full rounded-2xl border shadow-sm animate-in fade-in"
        />
    );
};



const getMapEmbedUrl = (inputUrl) => {
    if (!inputUrl) return '';
    if (inputUrl.includes('<iframe')) {
        const srcMatch = inputUrl.match(/src="([^"]+)"/);
        if (srcMatch && srcMatch[1]) return srcMatch[1];
    }
    return inputUrl;
};
