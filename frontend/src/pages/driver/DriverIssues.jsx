import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    AlertOctagon, Plus, Camera, MapPin, CheckCircle2, 
    Clock, AlertTriangle, ShieldAlert, RefreshCw, X
} from 'lucide-react';

const CATEGORIES = [
    'Vehicle breakdown',
    'Accident',
    'Tyre problem',
    'Engine problem',
    'Fuel issue',
    'Route problem',
    'Delivery delay',
    'Document issue',
    'Other'
];

const DriverIssues = () => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form
    const [category, setCategory] = useState('Vehicle breakdown');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [photoUrl, setPhotoUrl] = useState('');
    const [locationText, setLocationText] = useState('');
    const [gpsCoords, setGpsCoords] = useState(null);

    useEffect(() => {
        fetchIssues();
        detectLocation();
    }, []);

    const fetchIssues = async () => {
        try {
            setLoading(true);
            const res = await api.get('/drivers/issues');
            if (res.data.success) {
                setIssues(res.data.issues);
            }
        } catch (err) {
            console.error('Fetch issues error:', err);
        } finally {
            setLoading(false);
        }
    };

    const detectLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setLocationText(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                },
                () => {}
            );
        }
    };

    const handleSubmitIssue = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                category,
                description,
                priority,
                photos: photoUrl ? [photoUrl] : [],
                location: {
                    lat: gpsCoords?.lat || null,
                    lng: gpsCoords?.lng || null,
                    address: locationText || 'Current vehicle location'
                }
            };

            const res = await api.post('/drivers/issues/report', payload);
            if (res.data.success) {
                setShowModal(false);
                setDescription('');
                setPhotoUrl('');
                fetchIssues();
                alert('Issue report submitted. Dispatch team has been notified.');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit issue report.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Submitted':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200';
            case 'Acknowledged':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200';
            case 'Under Review':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200';
            case 'In Progress':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 animate-pulse';
            case 'Resolved':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200';
            case 'Closed':
                return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
            default:
                return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
        }
    };

    return (
        <div className="space-y-5">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight">
                        Driver Issue & Incident Reports
                    </h2>
                    <p className="text-xs text-slate-500">Report breakdowns, route delays, or vehicle emergencies</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-rose-600/30 active:scale-95 transition self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" /> Report New Issue
                </button>
            </div>

            {/* Issues List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-black uppercase tracking-tight text-slate-400">
                        My Incident History ({issues.length})
                    </h3>
                    <button onClick={fetchIssues} className="text-slate-400 hover:text-blue-600 p-1">
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-bold">Loading incident records...</div>
                ) : issues.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 font-bold">
                        No issues reported. Drive safely!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {issues.map(iss => (
                            <div 
                                key={iss._id}
                                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5 text-xs"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-black text-slate-900 dark:text-white">{iss.issueNumber}</span>
                                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(iss.status)}`}>
                                            {iss.status}
                                        </span>
                                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md">
                                            {iss.category}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(iss.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </span>
                                </div>

                                <p className="text-slate-700 dark:text-slate-300 font-medium">
                                    {iss.description}
                                </p>

                                {iss.location?.address && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                                        <span className="truncate">{iss.location.address}</span>
                                    </div>
                                )}

                                {iss.resolutionNotes && (
                                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                                        <span className="font-bold uppercase text-[9px] block">Dispatcher Response:</span>
                                        <p className="mt-0.5">{iss.resolutionNotes}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: Report Issue */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto text-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white">
                                    Report Vehicle or Route Issue
                                </h3>
                                <p className="text-xs text-slate-500">Immediate log dispatched to fleet desk</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitIssue} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Issue Category *
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-200"
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                        Urgency Level *
                                    </label>
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="Low">Low (Informational)</option>
                                        <option value="Medium">Medium (Attention Needed)</option>
                                        <option value="High">High (Immediate Assistance)</option>
                                        <option value="Critical">Critical (Vehicle Grounded / Accident)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    Detailed Description *
                                </label>
                                <textarea
                                    rows="3"
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the breakdown, tyre damage, delay or incident details..."
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    Current Location / Landmark
                                </label>
                                <input
                                    type="text"
                                    value={locationText}
                                    onChange={(e) => setLocationText(e.target.value)}
                                    placeholder="e.g. Near Toll Gate, Highway 44"
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    Incident Photo URL (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={photoUrl}
                                    onChange={(e) => setPhotoUrl(e.target.value)}
                                    placeholder="https://... photo link"
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black uppercase tracking-wider shadow-md disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Send Issue Report'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverIssues;
