import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import { addDays, format, isWithinInterval, differenceInDays } from 'date-fns';
import { AlertCircle, Calendar as CalIcon, ShieldCheck } from 'lucide-react';
import 'react-day-picker/dist/style.css';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

export default function LodgeBookingCheckout() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuthStore();
  
  const [room, setRoom] = useState(null);
  const [lodge, setLodge] = useState(null);
  const [unavailableRanges, setUnavailableRanges] = useState([]);
  
  const [dateRange, setDateRange] = useState();
  const [loading, setLoading] = useState(true);
  const [loadingBook, setLoadingBook] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (roomId) fetchData();
  }, [roomId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const roomRes = await api.get(`/rooms/${roomId}`);
      const r = roomRes.data;
      setRoom(r);
      const lodgeRes = await api.get(`/lodge/${r.lodgeId}`);
      setLodge(lodgeRes.data);
      
      const availRes = await api.get(`/availability/${r._id}`);
      const ranges = availRes.data.map(range => ({
         from: new Date(range.start),
         to: new Date(range.end)
      }));
      setUnavailableRanges(ranges);
    } catch (err) {
      setError('Cannot pull room details.');
    } finally {
      setLoading(false);
    }
  };

  const isDateDisabled = (date) => {
     if (date < new Date(new Date().setHours(0,0,0,0))) return true;
     return unavailableRanges.some(range => isWithinInterval(date, { start: range.from, end: range.to }));
  };

  const handleBook = async () => {
    if (!isAuthenticated || !token) {
        navigate('/login');
        return;
    }
    if (!dateRange || !dateRange.from || !dateRange.to) {
        setError('Please select check-in and check-out dates.');
        return;
    }
    
    // Dynamic Validation Check
    const overlaps = unavailableRanges.some(range => {
       return dateRange.from < range.to && dateRange.to > range.from;
    });

    if (overlaps) {
        setError('Overlapping dates detected. Please modify selection.');
        return;
    }

    try {
        setLoadingBook(true);
        setError('');
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const nights = differenceInDays(dateRange.to, dateRange.from);
        
        await api.post('/bookings', {
            lodgeId: lodge._id,
            roomId: room._id,
            checkIn: dateRange.from,
            checkOut: dateRange.to,
            totalAmount: nights * room.price
        });
        
        // Push user to their Customer Module dashboard where bookings render
        navigate('/customer?booked=true');
    } catch (err) {
        setError(err.response?.data?.message || 'Failed booking sequence.');
    } finally {
        setLoadingBook(false);
    }
  };

  if (loading) return <div className="p-20 text-center mt-20">Loading link framework...</div>;
  if (!room || !lodge) return <div className="p-20 text-center text-red-500 mt-20">Resource lost.</div>;

  const nights = dateRange?.from && dateRange?.to ? differenceInDays(dateRange.to, dateRange.from) : 0;
  const total = nights * room.price;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Secure Checkout</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
           <div className="bg-white border text-center border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col items-center">
              <h3 className="font-bold text-lg mb-4 flex items-center"><CalIcon className="w-5 h-5 mr-2 text-blue-600" /> Choose Range</h3>
              <DayPicker
                 mode="range"
                 selected={dateRange}
                 onSelect={setDateRange}
                 disabled={isDateDisabled}
                 className="p-3 font-sans rounded-xl bg-gray-50 border border-gray-100"
                 modifiersClassNames={{ selected: 'bg-blue-600 text-white rounded-md', disabled: 'opacity-30 line-through' }}
              />
              <p className="text-sm text-gray-500 mt-4">Unavailable dates are blocked out.</p>
           </div>
        </div>

        <div>
           <div className="bg-white border rounded-2xl shadow-sm sticky top-24">
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                 <h2 className="text-xl font-bold">{lodge.name}</h2>
                 <p className="text-gray-500">{room.type} Suite</p>
              </div>
              <div className="p-6 space-y-4">
                 <div className="flex justify-between text-gray-600"><span>Price per night</span><span className="font-medium text-gray-900">${room.price}</span></div>
                 {dateRange?.from && dateRange?.to && (
                     <>
                        <div className="flex justify-between text-gray-600"><span>{format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}</span><span className="font-medium text-gray-900">{nights} N</span></div>
                        <div className="border-t pt-4 mt-4 flex justify-between font-bold text-lg"><span>Total</span><span className="text-blue-600">${total}</span></div>
                     </>
                 )}

                 {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg flex"><AlertCircle className="w-5 h-5 mr-2 inline" />{error}</div>}

                 <div className="pt-4">
                    <button 
                       onClick={handleBook}
                       disabled={!dateRange?.from || !dateRange?.to || nights <= 0 || loadingBook}
                       className="w-full bg-blue-600 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                    >
                       {loadingBook ? 'Locking Dates...' : 'Confirm'}
                    </button>
                    {!isAuthenticated && <p className="text-red-500 text-xs text-center mt-2">Login Required to Book</p>}
                    <p className="text-xs text-gray-500 text-center mt-3"><ShieldCheck className="w-4 h-4 mr-1 inline text-green-500"/> Verified Booking Matrix</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
