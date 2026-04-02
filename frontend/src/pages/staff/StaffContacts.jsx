import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Phone, MessageCircle, Mail, Search, ExternalLink, User } from 'lucide-react';

const StaffContacts = () => {
    const [customers, setCustomers] = useState([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/auth/users?role=customer`);
                setCustomers(data);
            } catch (err) {
                console.error('Failed to fetch customers');
            } finally {
                setLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    const filtered = customers.filter(c => 
        c.name?.toLowerCase().includes(filter.toLowerCase()) || 
        c.email?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Customer Network</h1>
                    <p className="text-sm text-slate-500">Contact and communication directory for active clients.</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 w-full md:w-80 shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by name or email..." 
                        className="bg-transparent text-sm w-full outline-none text-slate-600"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map(customer => (
                        <div key={customer._id} className="bg-white rounded-3xl border border-slate-100 p-6 hover:shadow-xl hover:shadow-slate-100 transition-all group overflow-hidden relative">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm group-hover:scale-110 transition-transform">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{customer.name}</h3>
                                    <p className="text-xs text-slate-400 uppercase tracking-widest font-black">ID: {customer._id.substring(18)}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-3 text-slate-500 text-sm">
                                    <Mail className="w-4 h-4 text-slate-300" />
                                    <span className="truncate">{customer.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-500 text-sm">
                                    <Phone className="w-4 h-4 text-slate-300" />
                                    <span>{customer.phone || customer.phoneNumber || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <a 
                                    href={`tel:${customer.phone || customer.phoneNumber}`}
                                    className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 py-3 rounded-xl text-xs font-bold transition-colors"
                                >
                                    <Phone className="w-3.5 h-3.5" /> Call Now
                                </a>
                                <a 
                                    href={`https://wa.me/${customer.phone || customer.phoneNumber}`}
                                    className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl text-xs font-bold transition-colors"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                </a>
                            </div>

                            <button className="w-full mt-3 flex items-center justify-center gap-2 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-indigo-600 transition-all py-2 rounded-lg hover:bg-indigo-50 bg-transparent border border-transparent hover:border-indigo-100">
                                <ExternalLink className="w-3 h-3" /> View Project File
                            </button>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                             <div className="text-slate-300 mb-4 text-5xl">⚠</div>
                             <p className="text-slate-500 font-bold tracking-tight">No customers found matching that query.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StaffContacts;
