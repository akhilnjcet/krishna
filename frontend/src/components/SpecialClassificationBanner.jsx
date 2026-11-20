import React from 'react';
import { Bookmark } from 'lucide-react';

export const PRESET_SPECIAL_CLASSIFICATIONS = [
    { id: 'additional_work', label: 'Additional Work', icon: '🔧', color: 'text-blue-700 dark:text-blue-400' },
    { id: 'urgent_work', label: 'Urgent Work', icon: '⚠️', color: 'text-red-600 dark:text-red-400' },
    { id: 'rework', label: 'Rework / Modification', icon: '🛠️', color: 'text-amber-700 dark:text-amber-400' },
    { id: 'variation_order', label: 'Variation Order', icon: '📋', color: 'text-emerald-700 dark:text-emerald-400' },
    { id: 'emergency_work', label: 'Emergency Work', icon: '⚡', color: 'text-rose-700 dark:text-rose-400' },
    { id: 'extra_work', label: 'Extra Work', icon: '🏗️', color: 'text-indigo-700 dark:text-indigo-400' },
];

export const computeSpecialClassifications = (selected = [], manual = '') => {
    const items = [];
    const seen = new Set();

    (selected || []).forEach(label => {
        if (!label || typeof label !== 'string') return;
        const key = label.toLowerCase().trim();
        if (!key || seen.has(key)) return;
        seen.add(key);
        const preset = PRESET_SPECIAL_CLASSIFICATIONS.find(p => p.label.toLowerCase() === key);
        if (preset) {
            items.push(preset);
        } else {
            items.push({ id: label, label, icon: '📌', color: 'text-slate-800 dark:text-slate-200' });
        }
    });

    if (manual && typeof manual === 'string' && manual.trim()) {
        const parts = manual.split(/[,|]/).map(p => p.trim()).filter(Boolean);
        parts.forEach(part => {
            const key = part.toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            const presetMatch = PRESET_SPECIAL_CLASSIFICATIONS.find(p => p.label.toLowerCase() === key);
            if (presetMatch) {
                items.push(presetMatch);
            } else {
                items.push({ id: part, label: part, icon: '📌', color: 'text-slate-800 dark:text-slate-200' });
            }
        });
    }

    return items;
};

/**
 * Visual Banner displayed on the bill/quotation above the items table
 * Exactly matching the reference image format: [ 🔧 Additional Work | ⚠️ Urgent Work ]
 */
export const SpecialClassificationBanner = ({ items = [] }) => {
    if (!items || items.length === 0) return null;

    return (
        <div className="mb-6 rounded-2xl border-2 border-red-400 bg-amber-50/80 dark:bg-amber-950/40 p-3 sm:p-4 text-center shadow-xs flex flex-wrap items-center justify-center gap-3 sm:gap-6 print:mb-2.5 print:py-2 print:px-3 print:rounded-xl print:border-2 print:border-red-400 print:bg-amber-50">
            {items.map((item, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 && (
                        <span className="text-slate-300 dark:text-slate-600 font-light select-none text-base print:text-slate-400">|</span>
                    )}
                    <span className={`text-sm sm:text-base font-black tracking-wide flex items-center gap-1.5 ${item.color || 'text-slate-900 dark:text-slate-100'} print:text-xs print:font-bold`}>
                        {item.icon && <span className="text-base print:text-xs">{item.icon}</span>}
                        <span>{item.label}</span>
                    </span>
                </React.Fragment>
            ))}
        </div>
    );
};

/**
 * Editor Controls with Checkboxes and Manual Entry Field
 */
export const SpecialClassificationControls = ({
    selectedClassifications = [],
    setSelectedClassifications,
    manualClassification = '',
    setManualClassification
}) => {
    const activeItems = computeSpecialClassifications(selectedClassifications, manualClassification);

    const handleToggle = (label) => {
        setSelectedClassifications(prev => {
            const list = Array.isArray(prev) ? prev : [];
            return list.includes(label) 
                ? list.filter(l => l !== label) 
                : [...list, label];
        });
    };

    return (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Bookmark className="w-3.5 h-3.5 text-indigo-500" /> Bill Heading / Special Classification (Optional)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Select optional checkboxes or manually type details for heading (e.g. Additional Work, Urgent Work). Displays as a prominent heading banner on the bill.
                    </p>
                </div>
                {activeItems.length > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedClassifications([]);
                            setManualClassification('');
                        }}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition cursor-pointer px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40"
                    >
                        Clear All ({activeItems.length})
                    </button>
                )}
            </div>

            {/* Checkbox Options */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {PRESET_SPECIAL_CLASSIFICATIONS.map(item => {
                    const isChecked = (selectedClassifications || []).includes(item.label);
                    return (
                        <label 
                            key={item.id}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition select-none ${
                                isChecked 
                                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-slate-900 dark:text-slate-100 shadow-xs' 
                                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggle(item.label)}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                            />
                            <span className="truncate">{item.icon} {item.label}</span>
                        </label>
                    );
                })}
            </div>

            {/* Manual Entry */}
            <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Enter Details for Heading Manually (Type custom text or comma-separated tags):
                </label>
                <input
                    type="text"
                    value={manualClassification}
                    onChange={(e) => setManualClassification(e.target.value)}
                    placeholder="e.g. Additional Work, Urgent Work, Phase 2 Variation, Site Rectification..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                />
            </div>
        </div>
    );
};
