import React, { useState } from 'react';
import { 
    MapPin, ExternalLink, Copy, CheckCircle2, ShieldCheck, 
    Navigation, Compass, AlertCircle, Edit3, X, Check
} from 'lucide-react';
import WorksiteLocationPicker from './WorksiteLocationPicker';
import api from '../services/api';

const WorksiteLocationCard = ({ 
    quote, 
    onLocationUpdated, 
    canEdit = false 
}) => {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editLocation, setEditLocation] = useState(quote?.worksiteLocation || {
        address: quote?.location || '',
        latitude: quote?.worksiteLocation?.latitude ?? null,
        longitude: quote?.worksiteLocation?.longitude ?? null,
        source: quote?.worksiteLocation?.source || 'none'
    });
    const [saveError, setSaveError] = useState('');

    const worksite = quote?.worksiteLocation;
    const hasCoordinates = worksite?.latitude !== null && worksite?.latitude !== undefined && 
                           worksite?.longitude !== null && worksite?.longitude !== undefined;
    
    const lat = hasCoordinates ? Number(worksite.latitude) : null;
    const lng = hasCoordinates ? Number(worksite.longitude) : null;
    const address = worksite?.address || quote?.location || 'No exact address specified';
    const source = worksite?.source || (hasCoordinates ? 'manual' : 'none');
    const accuracy = worksite?.accuracy;

    const handleCopy = () => {
        if (!hasCoordinates) {
            navigator.clipboard.writeText(address);
        } else {
            navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenMap = () => {
        if (hasCoordinates) {
            window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank', 'noopener,noreferrer');
        } else if (address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
        }
    };

    const handleSaveLocation = async () => {
        setSaving(true);
        setSaveError('');
        try {
            const res = await api.put(`/quotes/${quote._id}`, {
                worksiteLocation: editLocation,
                location: editLocation.address || quote.location
            });
            setIsEditing(false);
            if (onLocationUpdated) {
                onLocationUpdated(res.data);
            }
        } catch (err) {
            setSaveError(err.response?.data?.message || 'Failed to update worksite location.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 relative shadow-sm hover:shadow-md transition-all">
            {/* Header Badge & Title */}
            <div className="flex items-center justify-between mb-3.5 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-800 dark:text-slate-200">
                        Worksite Location
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {source === 'gps' && (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            GPS Verified {accuracy ? `(±${accuracy}m)` : ''}
                        </span>
                    )}
                    {source === 'manual' && hasCoordinates && (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                            <MapPin className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            Map Pinned
                        </span>
                    )}
                    {source === 'search' && hasCoordinates && (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800/60">
                            <Compass className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            Search Verified
                        </span>
                    )}
                    {canEdit && !isEditing && (
                        <button
                            onClick={() => {
                                setEditLocation(quote?.worksiteLocation || {
                                    address: quote?.location || '',
                                    latitude: quote?.worksiteLocation?.latitude ?? null,
                                    longitude: quote?.worksiteLocation?.longitude ?? null,
                                    source: quote?.worksiteLocation?.source || 'none'
                                });
                                setIsEditing(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition"
                            title="Edit or Tag Location"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Editing Mode */}
            {isEditing ? (
                <div className="space-y-4 pt-1">
                    <WorksiteLocationPicker
                        value={editLocation}
                        onChange={setEditLocation}
                    />

                    {saveError && (
                        <p className="text-xs text-rose-600 font-bold">{saveError}</p>
                    )}

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            disabled={saving}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveLocation}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center gap-1.5"
                        >
                            {saving ? 'Saving...' : 'Save Location'}
                        </button>
                    </div>
                </div>
            ) : (
                /* View Mode */
                <div className="space-y-3">
                    {/* Address readout */}
                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">
                                Worksite Address
                            </p>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug break-words">
                                {address}
                            </p>
                        </div>
                    </div>

                    {/* Coordinates readout */}
                    <div className="bg-slate-50/80 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                GPS Coordinates (Lat, Long)
                            </span>
                            {hasCoordinates ? (
                                <span className="font-mono text-xs font-bold text-slate-900 dark:text-emerald-400 tracking-wide">
                                    {lat?.toFixed(6)}° N, {lng?.toFixed(6)}° E
                                </span>
                            ) : (
                                <span className="text-xs font-medium text-slate-400 italic">
                                    No GPS coordinates attached to this quote yet
                                </span>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap pt-1 sm:pt-0">
                            {hasCoordinates && (
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-400 text-slate-700 dark:text-slate-200 font-bold text-[10px] uppercase tracking-wider rounded-lg transition flex items-center gap-1.5 shadow-sm active:scale-95"
                                >
                                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copied ? 'Copied' : 'Copy Coordinates'}</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleOpenMap}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-bold text-[10px] uppercase tracking-wider rounded-lg transition flex items-center gap-1.5 shadow-sm active:scale-95"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>View on Map</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksiteLocationCard;
