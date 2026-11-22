import React, { useState } from 'react';
import { 
    Globe, FileText, RotateCcw, Save, Check, Loader2, Sparkles, 
    Receipt, Tag, Sliders, ShieldCheck, ExternalLink, HelpCircle 
} from 'lucide-react';

export const DEFAULT_DOCUMENT_LABELS = {
    doc_label_invoice: 'Tax Invoice',
    doc_label_quotation: 'Quotation',
    doc_label_estimate: 'Estimate',
    doc_label_receipt: 'Payment Receipt',
    doc_label_sales_bill: 'Sales Bill',
    doc_label_purchase_bill: 'Purchase Bill',
    doc_label_credit_note: 'Credit Note',
    doc_label_debit_note: 'Debit Note',
    doc_label_proforma_invoice: 'Proforma Invoice',
    doc_label_labour_bill: 'Labour Charges Bill',
    doc_label_transport_bill: 'Goods Transport Bill / LR',
    doc_label_rental_bill: 'Rental Agreement / Docket',
    doc_label_delivery_challan: 'Delivery Challan'
};

const BillingSettingsHub = ({ settings, updateField, handleSave, saving, success }) => {
    const [resetNotice, setResetNotice] = useState(false);

    const handleResetToDefaults = () => {
        if (!window.confirm('Are you sure you want to revert all billing document labels to standard system defaults?')) {
            return;
        }
        Object.entries(DEFAULT_DOCUMENT_LABELS).forEach(([key, value]) => {
            updateField(key, value);
        });
        setResetNotice(true);
        setTimeout(() => setResetNotice(false), 3000);
    };

    const currentUrl = settings.website_url || 'https://krishnaengineering.vercel.app';
    const isUrlEnabled = settings.show_website_url !== false && settings.show_website_url !== 'false';

    return (
        <div className="space-y-8 animate-fade-in font-sans">
            {/* Top Overview & Save Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-xl">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
                        <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Billing & Document Customization Hub
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Configure company website address, custom document titles, and module defaults across all billing systems.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : success ? 'Settings Saved' : 'Save Billing Settings'}
                    </button>
                </div>
            </div>

            {/* SECTION 1: Website Address Configuration (Requirement 2) */}
            <section className="p-6 md:p-8 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4 mb-6 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                Company Website URL on Billing Documents
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Display your verified domain on all invoices, quotations, bills, receipts, and exported PDFs.
                            </p>
                        </div>
                    </div>
                    <label className="flex items-center gap-2.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={isUrlEnabled}
                            onChange={(e) => updateField('show_website_url', e.target.checked)}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {isUrlEnabled ? 'URL Visible on Documents' : 'URL Hidden on Documents'}
                        </span>
                    </label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7 space-y-4">
                        <div>
                            <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5">
                                Public Website Address (URL)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={settings.website_url || ''}
                                    onChange={(e) => updateField('website_url', e.target.value)}
                                    placeholder="https://krishnaengineering.vercel.app"
                                    className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs md:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                                />
                                {currentUrl && (
                                    <a
                                        href={currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1"
                                        title="Open Website"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5">
                                When enabled, this URL automatically appears in the letterhead, header metadata, and footer remarks across all billing document formats.
                            </p>
                        </div>
                    </div>

                    {/* Live Document Preview Card */}
                    <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-950 dark:to-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2 flex items-center justify-between">
                            <span>Live Document Header Preview</span>
                            <span className="text-[9px] font-semibold text-slate-400">Preview & PDF</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                            <p className="text-xs font-black uppercase text-slate-900 dark:text-white">
                                {settings.company_name || 'KRISHNA ENGINEERING WORKS'}
                            </p>
                            <p className="text-[10px] text-slate-500">
                                {settings.company_address || 'Industrial Area, Thiruvazhiyode, Palakkad'}
                            </p>
                            {isUrlEnabled && (
                                <p className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> {currentUrl}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 2: Document Label Settings (Requirement 3) */}
            <section className="p-6 md:p-8 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4 mb-6 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
                            <Tag className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                Custom Document Labels & Headings
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Rename document titles throughout the application, PDF downloads, and printed vouchers (e.g. Invoice → Tax Invoice, Quotation → Estimate).
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleResetToDefaults}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
                    </button>
                </div>

                {resetNotice && (
                    <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 animate-fade-in">
                        ✓ All document labels reverted to standard defaults. Remember to click "Save Billing Settings" to publish.
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Invoice */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Invoices Module</span>
                            <span className="text-[10px] text-slate-400">Default: Tax Invoice</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_invoice || ''}
                            onChange={(e) => updateField('doc_label_invoice', e.target.value)}
                            placeholder="Tax Invoice"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Quotation */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Quotations Module</span>
                            <span className="text-[10px] text-slate-400">Default: Quotation</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_quotation || ''}
                            onChange={(e) => updateField('doc_label_quotation', e.target.value)}
                            placeholder="Quotation"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Estimate */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Estimates</span>
                            <span className="text-[10px] text-slate-400">Default: Estimate</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_estimate || ''}
                            onChange={(e) => updateField('doc_label_estimate', e.target.value)}
                            placeholder="Estimate"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Receipt */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Payment Receipts</span>
                            <span className="text-[10px] text-slate-400">Default: Payment Receipt</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_receipt || ''}
                            onChange={(e) => updateField('doc_label_receipt', e.target.value)}
                            placeholder="Payment Receipt"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Sales Bill */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Sales Bills</span>
                            <span className="text-[10px] text-slate-400">Default: Sales Bill</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_sales_bill || ''}
                            onChange={(e) => updateField('doc_label_sales_bill', e.target.value)}
                            placeholder="Sales Bill"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Purchase Bill */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Purchase Bills</span>
                            <span className="text-[10px] text-slate-400">Default: Purchase Bill</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_purchase_bill || ''}
                            onChange={(e) => updateField('doc_label_purchase_bill', e.target.value)}
                            placeholder="Purchase Bill"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Credit Note */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Credit Notes</span>
                            <span className="text-[10px] text-slate-400">Default: Credit Note</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_credit_note || ''}
                            onChange={(e) => updateField('doc_label_credit_note', e.target.value)}
                            placeholder="Credit Note"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Debit Note */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Debit Notes</span>
                            <span className="text-[10px] text-slate-400">Default: Debit Note</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_debit_note || ''}
                            onChange={(e) => updateField('doc_label_debit_note', e.target.value)}
                            placeholder="Debit Note"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Proforma Invoice */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Proforma Invoices</span>
                            <span className="text-[10px] text-slate-400">Default: Proforma Invoice</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_proforma_invoice || ''}
                            onChange={(e) => updateField('doc_label_proforma_invoice', e.target.value)}
                            placeholder="Proforma Invoice"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Labour Bill */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Labour Bills</span>
                            <span className="text-[10px] text-slate-400">Default: Labour Charges Bill</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_labour_bill || ''}
                            onChange={(e) => updateField('doc_label_labour_bill', e.target.value)}
                            placeholder="Labour Charges Bill"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Transport Bill */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Goods Transport Bills / LR</span>
                            <span className="text-[10px] text-slate-400">Default: Goods Transport Bill / LR</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_transport_bill || ''}
                            onChange={(e) => updateField('doc_label_transport_bill', e.target.value)}
                            placeholder="Goods Transport Bill / LR"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    {/* Rental Bill */}
                    <div className="p-4 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-2xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                            <span>Equipment Rental Dockets</span>
                            <span className="text-[10px] text-slate-400">Default: Rental Agreement / Docket</span>
                        </div>
                        <input
                            type="text"
                            value={settings.doc_label_rental_bill || ''}
                            onChange={(e) => updateField('doc_label_rental_bill', e.target.value)}
                            placeholder="Rental Agreement / Docket"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>
                </div>
            </section>

            {/* SECTION 3: Module Defaults & Customization (Requirement 7) */}
            <section className="p-6 md:p-8 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl shadow-sm backdrop-blur-2xl">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-4 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
                        <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                            Default Document Customization & Terms
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Standard terms, default tax rates, theme style, and notes populated automatically when creating new billing documents.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5">
                            Default Standard Terms & Conditions
                        </label>
                        <textarea
                            rows={4}
                            value={settings.billing_default_terms || ''}
                            onChange={(e) => updateField('billing_default_terms', e.target.value)}
                            placeholder="1. Payment is due within 15 days of invoice date..."
                            className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5">
                            Default Remarks & Technical Specifications
                        </label>
                        <textarea
                            rows={4}
                            value={settings.billing_default_notes || ''}
                            onChange={(e) => updateField('billing_default_notes', e.target.value)}
                            placeholder="Supplied as per standard certified structural fabrication specifications."
                            className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5">
                            Default GST / Tax Rate (%)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={settings.billing_default_gst_rate ?? 18}
                            onChange={(e) => updateField('billing_default_gst_rate', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5">
                            Default Document Theme Accent Color
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={settings.billing_theme_color || '#4f46e5'}
                                onChange={(e) => updateField('billing_theme_color', e.target.value)}
                                className="w-10 h-10 rounded-xl border-0 cursor-pointer p-0 bg-transparent"
                            />
                            <input
                                type="text"
                                value={settings.billing_theme_color || '#4f46e5'}
                                onChange={(e) => updateField('billing_theme_color', e.target.value)}
                                className="w-32 bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default BillingSettingsHub;
