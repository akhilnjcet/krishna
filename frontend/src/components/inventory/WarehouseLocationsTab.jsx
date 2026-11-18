import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Building2, MapPin, Plus, User, AlertTriangle, 
    Layers, Search, CheckCircle2, X, RefreshCw, Phone
} from 'lucide-react';

const WarehouseLocationsTab = ({ staffList = [] }) => {
    const [warehouses, setWarehouses] = useState([]);
    const [stockMatrix, setStockMatrix] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [filterLocId, setFilterLocId] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'Main Warehouse',
        address: '',
        managerId: '',
        managerName: '',
        managerPhone: '',
        capacityNotes: ''
    });

    useEffect(() => {
        fetchWarehouses();
        fetchStockMatrix();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/warehouses');
            if (res.data.success) {
                setWarehouses(res.data.warehouses);
            }
        } catch (err) {
            console.error('Error fetching warehouses:', err);
        }
    };

    const fetchStockMatrix = async () => {
        setLoading(true);
        try {
            const res = await api.get('/warehouses/stock-overview');
            if (res.data.success) {
                setStockMatrix(res.data.stockMatrix || []);
            }
        } catch (err) {
            console.error('Error fetching stock matrix:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setFormData({
            name: '',
            code: `LOC-${Math.floor(100 + Math.random() * 900)}`,
            type: 'Workshop',
            address: '',
            managerId: staffList[0]?._id || '',
            managerName: staffList[0]?.name || '',
            managerPhone: staffList[0]?.phone || '',
            capacityNotes: ''
        });
        setSelectedLocation(null);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const selectedStaff = staffList.find(s => s._id === formData.managerId);
            const payload = {
                ...formData,
                managerName: selectedStaff ? selectedStaff.name : formData.managerName,
                managerPhone: selectedStaff ? selectedStaff.phone : formData.managerPhone
            };

            if (selectedLocation) {
                await api.put(`/warehouses/${selectedLocation._id}`, payload);
            } else {
                await api.post('/warehouses', payload);
            }
            setShowModal(false);
            fetchWarehouses();
            fetchStockMatrix();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving warehouse location');
        }
    };

    // Filter displayed matrix
    const displayedMatrix = stockMatrix.filter(m => {
        if (filterLocId !== 'ALL' && m.warehouse._id !== filterLocId) return false;
        return true;
    });

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Multi-Warehouse & Site Stock Locations
                        </h2>
                        <p className="text-xs text-slate-500">
                            Track real-time inventory balances across central stores, workshops, and project sites
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchStockMatrix}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                        title="Refresh Stock Matrix"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition"
                    >
                        <Plus className="w-4 h-4" /> Add Location
                    </button>
                </div>
            </div>

            {/* Location Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.map(w => {
                    const matrixInfo = stockMatrix.find(m => m.warehouse._id === w._id);
                    return (
                        <div 
                            key={w._id}
                            className={`p-5 rounded-2xl border transition cursor-pointer ${
                                filterLocId === w._id 
                                    ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-500 ring-2 ring-indigo-500/20' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                            }`}
                            onClick={() => setFilterLocId(filterLocId === w._id ? 'ALL' : w._id)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        {w.code} · {w.type}
                                    </span>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{w.name}</h3>
                                </div>
                                <span className={`w-2.5 h-2.5 rounded-full ${w.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            </div>

                            <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {w.address || 'In-Plant Premises'}
                            </p>

                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Stocked Lines</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{matrixInfo?.totalItems || 0} items</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Valuation</span>
                                    <span className="font-black text-indigo-600 dark:text-indigo-400">₹{(matrixInfo?.totalValuation || 0).toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {w.managerName && (
                                <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" /> Manager: <span className="font-medium text-slate-700 dark:text-slate-300">{w.managerName}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Location Stock Details View */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                            {filterLocId === 'ALL' ? 'Stock Across All Locations' : `Stock at Selected Location`}
                        </h3>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter stocked items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400">Loading location stock details...</div>
                ) : displayedMatrix.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-bold">No locations configured yet.</div>
                ) : (
                    <div className="space-y-6">
                        {displayedMatrix.map(m => {
                            const filteredItems = (m.items || []).filter(it => 
                                !searchQuery || 
                                it.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                it.code?.toLowerCase().includes(searchQuery.toLowerCase())
                            );

                            return (
                                <div key={m.warehouse._id} className="space-y-3">
                                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-4 py-2 rounded-xl">
                                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5 text-indigo-500" /> {m.warehouse.name} ({m.warehouse.code})
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-500">
                                            {filteredItems.length} items · Total Qty: {m.totalQuantity}
                                        </span>
                                    </div>

                                    {filteredItems.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic px-4 py-2">No stock items found at this location.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-100 dark:bg-slate-800/40 text-slate-500 uppercase text-[10px] font-black">
                                                    <tr>
                                                        <th className="p-3">Item / Description</th>
                                                        <th className="p-3">SKU / Code</th>
                                                        <th className="p-3">Category</th>
                                                        <th className="p-3 text-right">Available Qty</th>
                                                        <th className="p-3 text-right">Unit Price</th>
                                                        <th className="p-3 text-right">Total Value</th>
                                                        <th className="p-3 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {filteredItems.map(it => (
                                                        <tr key={it._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                            <td className="p-3 font-bold text-slate-900 dark:text-white">{it.name}</td>
                                                            <td className="p-3 font-mono text-[11px] text-slate-500">{it.code || '—'}</td>
                                                            <td className="p-3 text-slate-500">{it.category}</td>
                                                            <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                                                                {it.quantity} {it.unit}
                                                            </td>
                                                            <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                                                                ₹{it.unitPrice.toLocaleString('en-IN')}
                                                            </td>
                                                            <td className="p-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                                                                ₹{(it.quantity * it.unitPrice).toLocaleString('en-IN')}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {it.isLowStock ? (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                                                                        <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                                        <CheckCircle2 className="w-2.5 h-2.5" /> Healthy
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Create / Edit Location */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                            <h2 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                {selectedLocation ? 'Edit Warehouse Location' : 'Add New Warehouse / Site Location'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Location Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Unit 2 Fabrication Bay"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none text-slate-800 dark:text-slate-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Location Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. WH-U2"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold outline-none text-slate-800 dark:text-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Location Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                                    >
                                        <option value="Main Warehouse">Main Warehouse</option>
                                        <option value="Workshop">Workshop</option>
                                        <option value="Project Site">Project Site</option>
                                        <option value="Temporary Storage">Temporary Storage</option>
                                        <option value="Vehicle / Field Stock">Vehicle / Field Stock</option>
                                        <option value="Custom Location">Custom Location</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Assigned Manager</label>
                                    <select
                                        value={formData.managerId}
                                        onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                                    >
                                        <option value="">Select Staff Manager...</option>
                                        {staffList.map(s => (
                                            <option key={s._id} value={s._id}>{s.name} ({s.phone || 'No phone'})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Address / Plant Bay</label>
                                <input
                                    type="text"
                                    placeholder="Plant address or specific site GPS coordinates"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Capacity & Notes</label>
                                <textarea
                                    rows="2"
                                    placeholder="Storage limitations, crane accessibility, remarks..."
                                    value={formData.capacityNotes}
                                    onChange={(e) => setFormData({ ...formData, capacityNotes: e.target.value })}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-100"
                                />
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                                >
                                    Save Location
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarehouseLocationsTab;
