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
        <div className="bg-white dark:bg-slate-900 border-2 border-brand-950 dark:border-slate-700 p-5 relative shadow-[3px_3px_0_0_#0f172a] dark:shadow-none">
            {/* Header Badge & Title */}
            <div className="flex items-center justify-between mb-3 border-b-2 border-dashed border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-brand-accent rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-950 dark:text-brand-accent">
                        WORKSITE LOCATION
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {source === 'gps' && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 border border-emerald-300 dark:border-emerald-700">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            GPS Verified {accuracy ? `(±${accuracy}m)` : ''}
                        </span>
                    )}
                    {source === 'manual' && hasCoordinates && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 border border-indigo-300 dark:border-indigo-700">
                            <MapPin className="w-3 h-3 text-indigo-600" />
                            Map Pinned
                        </span>
                    )}
                    {source === 'search' && hasCoordinates && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 px-2 py-0.5 border border-blue-300 dark:border-blue-700">
                            <Compass className="w-3 h-3 text-blue-600" />
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
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-brand-950 dark:hover:text-white transition"
                            title="Edit or Tag Location"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Editing Mode */}
            {isEditing ? (
                <div className="space-y-4 pt-2">
                    <WorksiteLocationPicker
                        value={editLocation}
                        onChange={setEditLocation}
                    />

                    {saveError && (
                        <p className="text-xs text-red-600 font-bold">{saveError}</p>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            disabled={saving}
                            className="px-4 py-2 border-2 border-slate-300 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveLocation}
                            disabled={saving}
                            className="px-5 py-2 bg-brand-950 dark:bg-brand-accent text-white dark:text-brand-950 text-xs font-black uppercase tracking-wider hover:bg-brand-800 transition flex items-center gap-1.5"
                        >
                            {saving ? 'Saving...' : 'Save Location'}
                        </button>
                    </div>
                </div>
            ) : (
                /* View Mode */
                <div className="space-y-3">
                    {/* Address readout */}
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-brand-50 dark:bg-slate-800 border border-brand-200 dark:border-slate-700 flex-shrink-0 mt-0.5">
                            <MapPin className="w-4 h-4 text-brand-950 dark:text-brand-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                                Worksite Address
                            </p>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug break-words">
                                {address}
                            </p>
                        </div>
                    </div>

                    {/* Coordinates readout */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                                GPS Coordinates (Lat, Long)
                            </span>
                            {hasCoordinates ? (
                                <span className="font-mono text-xs font-black text-brand-950 dark:text-emerald-400 tracking-wide">
                                    {lat?.toFixed(6)}° N, {lng?.toFixed(6)}° E
                                </span>
                            ) : (
                                <span className="text-xs font-semibold text-slate-400 italic">
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
                                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-brand-950 text-slate-800 dark:text-slate-200 font-bold text-[10px] uppercase tracking-wider transition flex items-center gap-1 shadow-sm active:scale-95"
                                >
                                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    <span>{copied ? 'Copied' : 'Copy Coordinates'}</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleOpenMap}
                                className="px-3 py-1.5 bg-brand-950 hover:bg-brand-800 text-white font-bold text-[10px] uppercase tracking-wider transition flex items-center gap-1 shadow-sm active:scale-95"
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
