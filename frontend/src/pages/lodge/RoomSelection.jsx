import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, DoorOpen, User, Calendar, IndianRupee,
  CheckCircle2, Clock, Wrench
} from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';

const statusConfig = {
  available: { label: 'Available', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  occupied: { label: 'Occupied', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  maintenance: { label: 'Maintenance', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
};

const RoomSelection = () => {
  const navigate = useNavigate();
  const rooms = useLodgeStore((s) => s.rooms);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a3a7a] via-[#2D5BE3] to-[#4f7af7] pt-14 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-40 h-40 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <button
            onClick={() => navigate('/lodge')}
            className="flex items-center gap-2 text-blue-200 hover:text-white mb-5 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-white font-poppins">Krishna Building</h1>
          <p className="text-blue-200 text-sm mt-1">Select a room to view details</p>
        </div>
      </div>

      <div className="px-5 -mt-8 pb-10 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {rooms.map((room, index) => {
            const sc = statusConfig[room.status] || statusConfig.available;
            const isOccupied = room.status === 'occupied';

            return (
              <motion.button
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/lodge/room/${room.number}`)}
                className="w-full group"
              >
                <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50 border border-slate-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300">
                  {/* Room Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#2D5BE3] to-[#1a3a7a] rounded-xl flex items-center justify-center shadow-lg shadow-blue-200/50">
                        <DoorOpen className="w-7 h-7 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-xl font-bold text-[#111827] font-poppins">Room {room.number}</h3>
                        {isOccupied && room.tenant && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="text-xs text-slate-500 font-medium">{room.tenant}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sc.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>
                  </div>

                  {/* Room Details */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <IndianRupee className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Rent</p>
                      <p className="text-sm font-bold text-[#111827]">₹{room.rent?.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <Calendar className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Due Date</p>
                      <p className="text-sm font-bold text-[#111827]">
                        {room.dueDate
                          ? new Date(room.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          : '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      {room.status === 'maintenance' ? (
                        <Wrench className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                      ) : isOccupied ? (
                        <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                      )}
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Status</p>
                      <p className="text-sm font-bold text-[#111827] capitalize">{room.status}</p>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default RoomSelection;
