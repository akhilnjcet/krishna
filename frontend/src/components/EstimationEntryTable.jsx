import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Split, Link as LinkIcon, Zap, LayoutGrid, Table as TableIcon, Package, Hash } from 'lucide-react';
import { computeItemSectionMeta } from '../utils/combinedBillHelper';

/**
 * Reusable Estimation & Billing Entry Table with adaptive layouts:
 * - One-Line View (High-density touch-optimized compact rows with zero horizontal scrolling)
 * - Mobile Cards (Touch-friendly structured cards with clear field grouping)
 * - Spreadsheet Table (Full 7-column classic grid with horizontal scroll for desktop/large screens)
 */
export const EstimationEntryTable = ({
  items = [],
  combinedTotals = {},
  products = [],
  dataListId = 'product-list-quote',
  enableUnitPrice = true,
  onToggleEnableUnitPrice,
  enableQuantity = true,
  onToggleEnableQuantity,
  onUpdateItem,
  onAddItem,
  onAddNewCombinedSection,
  onRemoveItem,
  onToggleCombine,
  onSplitSection,
  onMergeSection,
  onCombinedTotalChange
}) => {
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('krishna_entry_view_mode');
      if (saved && ['one-line', 'cards', 'table'].includes(saved)) {
        return saved;
      }
      return window.innerWidth < 768 ? 'one-line' : 'table';
    }
    return 'table';
  });

  const handleViewChange = (mode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('krishna_entry_view_mode', mode);
      } catch (e) {
        /* ignore localStorage quota/disabled */
      }
    }
  };

  const sectionMeta = computeItemSectionMeta(items, combinedTotals, enableQuantity, enableUnitPrice);

  return (
    <div className="flex flex-col gap-3">
      {/* Top Controls Toolbar: View Switcher & Document-Level Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-slate-850/80 rounded-2xl border border-slate-200 dark:border-slate-800">
        {/* View Mode Switcher */}
        <div className="inline-flex items-center p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => handleViewChange('one-line')}
            title="One-Line view: High density compact rows, no horizontal scrolling"
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              viewMode === 'one-line'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap size={13} className="text-amber-500" />
            <span>One-Line</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('cards')}
            title="Cards view: Touch cards with spacious layout for mobile"
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              viewMode === 'cards'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid size={13} className="text-indigo-500" />
            <span>Cards</span>
          </button>

          <button
            type="button"
            onClick={() => handleViewChange('table')}
            title="Full spreadsheet table view"
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TableIcon size={13} className="text-emerald-500" />
            <span>Table</span>
          </button>
        </div>

        {/* Global Column Toggles */}
        <div className="flex items-center gap-3 text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
          {onToggleEnableQuantity && (
            <label
              title={enableQuantity ? "Quantity enabled for invoice" : "Quantity disabled for invoice"}
              className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-bold select-none text-[11px]"
            >
              <input
                type="checkbox"
                checked={Boolean(enableQuantity)}
                onChange={(e) => onToggleEnableQuantity(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
              />
              <span>Qty</span>
            </label>
          )}

          {onToggleEnableUnitPrice && (
            <label
              title={enableUnitPrice ? "Unit price enabled for invoice" : "Unit price disabled for invoice"}
              className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-bold select-none text-[11px]"
            >
              <input
                type="checkbox"
                checked={Boolean(enableUnitPrice)}
                onChange={(e) => onToggleEnableUnitPrice(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
              />
              <span>Rate (₹)</span>
            </label>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VIEW 1: ONE-LINE COMPACT VIEW (Zero horizontal scroll, quick mobile) */}
      {/* ==================================================================== */}
      {viewMode === 'one-line' && (
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-850/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-semibold">
              No items added yet. Tap <strong>"+ Add Item"</strong> below to begin.
            </div>
          ) : (
            sectionMeta.map((meta, index) => {
              const prevItem = index > 0 ? items[index - 1] : null;
              const prevIsCombined = prevItem && Boolean(prevItem.isCombinedMode ?? prevItem.isCombined);
              const currentName = meta.description || meta.productName || meta.name || meta.workDescription || meta.itemName || '';
              const qty = (enableQuantity !== false && meta.hasQuantity !== false) ? (parseFloat(meta.quantity || 1) || 1) : 1;
              const rate = (enableUnitPrice !== false && meta.hasUnitPrice !== false) ? (parseFloat(meta.price ?? meta.rate ?? 0) || 0) : 0;
              const rowCalculated = qty * rate;

              return (
                <div
                  key={meta.id || index}
                  className={`p-2.5 rounded-2xl border transition-all ${
                    meta.isCombined
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {/* Line 1: Sl No + Item Name Input + Delete Button */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>

                    <input
                      type="text"
                      className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition"
                      required
                      value={currentName}
                      onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                      list={dataListId}
                      placeholder="Item or service name..."
                    />

                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg shrink-0 transition"
                      title="Remove row"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Optional subDescription note */}
                  {meta.subDescription !== undefined && (
                    <div className="mt-1 pl-7">
                      <input
                        type="text"
                        className="w-full bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-lg px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                        value={meta.subDescription || ''}
                        onChange={(e) => onUpdateItem(index, 'subDescription', e.target.value)}
                        placeholder="Optional detail/note..."
                      />
                    </div>
                  )}

                  {/* Line 2: Compact Numbers Strip (Qty, Unit, Rate, Combine, Amount) */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800/70 text-xs">
                    {/* Left: Quantity & Unit */}
                    {enableQuantity ? (
                      <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <label
                          className="flex items-center cursor-pointer m-0"
                          title={meta.hasQuantity !== false ? "Disable qty for item" : "Enable qty for item"}
                        >
                          <input
                            type="checkbox"
                            checked={meta.hasQuantity !== false}
                            onChange={(e) => onUpdateItem(index, 'hasQuantity', e.target.checked)}
                            className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                          />
                        </label>

                        {meta.hasQuantity !== false ? (
                          <>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={meta.quantity ?? ''}
                              onChange={(e) => onUpdateItem(index, 'quantity', e.target.value)}
                              placeholder="1"
                              className="w-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-0.5 text-xs font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                              title="Quantity"
                            />
                            <select
                              value={meta.unit || 'Units'}
                              onChange={(e) => onUpdateItem(index, 'unit', e.target.value)}
                              className="bg-transparent text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
                              title="Unit"
                            >
                              <option value="Units">Units</option>
                              <option value="Nos">Nos</option>
                              <option value="Kg">Kg</option>
                              <option value="Pcs">Pcs</option>
                              <option value="Mtr">Mtr</option>
                              <option value="SqFt">SqFt</option>
                              <option value="Sets">Sets</option>
                              <option value="Days">Days</option>
                              <option value="Hours">Hours</option>
                              <option value="Lot">Lot</option>
                            </select>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-bold px-1" title="No quantity">
                            No Qty
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-bold italic">Qty off</span>
                    )}

                    {/* Rate (₹) */}
                    {enableUnitPrice ? (
                      <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                        <label
                          className="flex items-center cursor-pointer m-0"
                          title={meta.hasUnitPrice !== false ? "Disable unit price for item" : "Enable unit price for item"}
                        >
                          <input
                            type="checkbox"
                            checked={meta.hasUnitPrice !== false}
                            onChange={(e) => onUpdateItem(index, 'hasUnitPrice', e.target.checked)}
                            className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                          />
                        </label>

                        {meta.hasUnitPrice !== false ? (
                          meta.isCombined ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold px-1" title="Unit rate in package">
                              In Pkg
                            </span>
                          ) : (
                            <div className="flex items-center">
                              <span className="text-slate-400 text-[11px] font-black mr-0.5">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={meta.price ?? meta.rate ?? meta.dailyRate ?? ''}
                                onChange={(e) => onUpdateItem(index, 'price', e.target.value)}
                                placeholder="0.00"
                                className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 text-xs font-bold text-right text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                                title="Unit Rate"
                              />
                            </div>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 font-bold px-1" title="No rate">
                            No Rate
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-bold italic">Rate off</span>
                    )}

                    {/* Combine Toggle + Split/Merge */}
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                      <label
                        className="flex items-center gap-1 cursor-pointer m-0 select-none"
                        title="Combine consecutive items into a package"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(meta.isCombined)}
                          onChange={(e) => onToggleCombine(index, e.target.checked)}
                          className="w-3.5 h-3.5 rounded accent-amber-600 cursor-pointer"
                        />
                        <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">Combine</span>
                      </label>

                      {meta.isCombined && prevIsCombined && (
                        meta.isNewSectionStart ? (
                          <button
                            type="button"
                            onClick={() => onMergeSection(index)}
                            className="text-[9px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-black rounded hover:bg-emerald-200"
                            title="Merge with package above"
                          >
                            Merge
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSplitSection(index)}
                            className="text-[9px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-black rounded hover:bg-blue-200"
                            title="Split into new package"
                          >
                            Split
                          </button>
                        )
                      )}
                    </div>

                    {/* Amount / Package Total */}
                    {meta.isCombined ? (
                      meta.isSectionStart ? (
                        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700">
                          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                            Pkg ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={combinedTotals[meta.sectionId] ?? ''}
                            onChange={(e) => onCombinedTotalChange(meta.sectionId, e.target.value)}
                            placeholder="0.00"
                            required
                            className="w-16 bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg px-1.5 py-0.5 text-xs font-black text-right text-emerald-600 dark:text-emerald-400 focus:outline-none"
                            title={`Package Total for ${meta.sectionRowCount} combined items`}
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic px-1">
                          ↳ In Pkg
                        </span>
                      )
                    ) : (
                      (!enableUnitPrice || meta.hasUnitPrice === false) ? (
                        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-xl border border-emerald-300 dark:border-emerald-700">
                          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={meta.total ?? meta.price ?? ''}
                            onChange={(e) => {
                              onUpdateItem(index, 'total', e.target.value);
                              onUpdateItem(index, 'price', e.target.value);
                            }}
                            placeholder="0.00"
                            className="w-16 bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg px-1.5 py-0.5 text-xs font-black text-right text-emerald-600 dark:text-emerald-400 focus:outline-none"
                            title="Direct Item Total"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                          = ₹{rowCalculated.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 2: MOBILE CARDS VIEW (Spacious touch layout with clear blocks) */}
      {/* ==================================================================== */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-850/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-semibold">
              No items added yet. Tap <strong>"+ Add Item"</strong> below to begin.
            </div>
          ) : (
            sectionMeta.map((meta, index) => {
              const prevItem = index > 0 ? items[index - 1] : null;
              const prevIsCombined = prevItem && Boolean(prevItem.isCombinedMode ?? prevItem.isCombined);
              const currentName = meta.description || meta.productName || meta.name || meta.workDescription || meta.itemName || '';
              const qty = (enableQuantity !== false && meta.hasQuantity !== false) ? (parseFloat(meta.quantity || 1) || 1) : 1;
              const rate = (enableUnitPrice !== false && meta.hasUnitPrice !== false) ? (parseFloat(meta.price ?? meta.rate ?? 0) || 0) : 0;
              const rowCalculated = qty * rate;

              return (
                <div
                  key={meta.id || index}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    meta.isCombined
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  {/* Card Header: Item Badge, Combined Tag, Delete */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xs border border-indigo-100 dark:border-indigo-900/40">
                        Item #{index + 1}
                      </span>
                      {meta.isCombined && (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] flex items-center gap-1">
                          <Package size={11} /> {meta.isSectionStart ? `Package Start (${meta.sectionRowCount} items)` : 'In Package'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Item Description */}
                  <div className="space-y-1.5 mb-3">
                    <input
                      type="text"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition"
                      required
                      value={currentName}
                      onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                      list={dataListId}
                      placeholder="Item or service name..."
                    />

                    {meta.subDescription !== undefined && (
                      <input
                        type="text"
                        className="w-full bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                        value={meta.subDescription || ''}
                        onChange={(e) => onUpdateItem(index, 'subDescription', e.target.value)}
                        placeholder="Optional specification / dimension / note..."
                      />
                    )}
                  </div>

                  {/* 2-Column Quantity & Rate Fields */}
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    {/* Qty Box */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/70 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Quantity
                        </span>
                        {enableQuantity && (
                          <label className="flex items-center cursor-pointer m-0">
                            <input
                              type="checkbox"
                              checked={meta.hasQuantity !== false}
                              onChange={(e) => onUpdateItem(index, 'hasQuantity', e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                              title="Toggle quantity for this item"
                            />
                          </label>
                        )}
                      </div>

                      {enableQuantity && meta.hasQuantity !== false ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={meta.quantity ?? ''}
                            onChange={(e) => onUpdateItem(index, 'quantity', e.target.value)}
                            placeholder="1"
                            className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                          <select
                            value={meta.unit || 'Units'}
                            onChange={(e) => onUpdateItem(index, 'unit', e.target.value)}
                            className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                          >
                            <option value="Units">Units</option>
                            <option value="Nos">Nos</option>
                            <option value="Kg">Kg</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Mtr">Mtr</option>
                            <option value="SqFt">SqFt</option>
                            <option value="Sets">Sets</option>
                            <option value="Days">Days</option>
                            <option value="Hours">Hours</option>
                            <option value="Lot">Lot</option>
                          </select>
                        </div>
                      ) : (
                        <div className="text-center py-1 text-slate-400 text-xs font-bold">
                          — No Qty —
                        </div>
                      )}
                    </div>

                    {/* Rate Box */}
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200/70 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Rate (₹)
                        </span>
                        {enableUnitPrice && (
                          <label className="flex items-center cursor-pointer m-0">
                            <input
                              type="checkbox"
                              checked={meta.hasUnitPrice !== false}
                              onChange={(e) => onUpdateItem(index, 'hasUnitPrice', e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                              title="Toggle rate for this item"
                            />
                          </label>
                        )}
                      </div>

                      {enableUnitPrice && meta.hasUnitPrice !== false ? (
                        meta.isCombined ? (
                          <div className="text-center py-1 text-amber-600 dark:text-amber-400 text-xs font-bold">
                            In Package
                          </div>
                        ) : (
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={meta.price ?? meta.rate ?? meta.dailyRate ?? ''}
                              onChange={(e) => onUpdateItem(index, 'price', e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-right text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        )
                      ) : (
                        <div className="text-center py-1 text-slate-400 text-xs font-bold">
                          — No Rate —
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Combine Control & Total */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    {/* Combine Toggle */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer m-0 select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(meta.isCombined)}
                          onChange={(e) => onToggleCombine(index, e.target.checked)}
                          className="w-4 h-4 rounded accent-amber-600 cursor-pointer"
                        />
                        <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                          Combine in Package
                        </span>
                      </label>

                      {meta.isCombined && prevIsCombined && (
                        meta.isNewSectionStart ? (
                          <button
                            type="button"
                            onClick={() => onMergeSection(index)}
                            className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-black rounded-md hover:bg-emerald-200 transition"
                          >
                            <LinkIcon size={10} className="inline mr-1" /> Merge
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSplitSection(index)}
                            className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-black rounded-md hover:bg-blue-200 transition"
                          >
                            <Split size={10} className="inline mr-1" /> Split
                          </button>
                        )
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      {meta.isCombined ? (
                        meta.isSectionStart ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              Package Total:
                            </span>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xs">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={combinedTotals[meta.sectionId] ?? ''}
                                onChange={(e) => onCombinedTotalChange(meta.sectionId, e.target.value)}
                                placeholder="0.00"
                                required
                                className="w-24 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-lg pl-6 pr-2 py-1 text-xs font-black text-right text-emerald-600 dark:text-emerald-400 focus:outline-none shadow-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 italic">
                            Included in Package Total above
                          </span>
                        )
                      ) : (
                        (!enableUnitPrice || meta.hasUnitPrice === false) ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Item Total:</span>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={meta.total ?? meta.price ?? ''}
                                onChange={(e) => {
                                  onUpdateItem(index, 'total', e.target.value);
                                  onUpdateItem(index, 'price', e.target.value);
                                }}
                                placeholder="0.00"
                                className="w-24 bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg pl-6 pr-2 py-1 text-xs font-black text-right text-emerald-600 dark:text-emerald-400 focus:outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Line Total</span>
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              ₹{rowCalculated.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 3: FULL SPREADSHEET TABLE (Horizontal scrollable for desktop)   */}
      {/* ==================================================================== */}
      {viewMode === 'table' && (
        <div 
          className="table-responsive" 
          style={{ 
            overflowX: 'auto', 
            borderRadius: '16px', 
            border: '1px solid var(--glass-border, rgba(226, 232, 240, 0.8))',
            background: 'var(--card-bg, rgba(255, 255, 255, 0.03))'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--table-header, #1e293b)', color: '#ffffff' }}>
                <th style={{ padding: '0.65rem 0.35rem', textAlign: 'center', width: '38px', fontSize: '0.75rem', fontWeight: '800' }}>
                  #
                </th>
                <th style={{ padding: '0.65rem 0.5rem', fontSize: '0.75rem', fontWeight: '800', minWidth: '130px' }}>
                  Item Description
                </th>
                <th style={{ padding: '0.65rem 0.25rem', textAlign: 'center', width: '115px', fontSize: '0.75rem', fontWeight: '800' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                    <span style={{ color: enableQuantity ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>Qty</span>
                    {onToggleEnableQuantity && (
                      <label 
                        title={enableQuantity ? "Quantity enabled (Click to disable)" : "Quantity disabled (Click to enable)"}
                        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(enableQuantity)}
                          onChange={(e) => onToggleEnableQuantity(e.target.checked)}
                          style={{ width: '13px', height: '13px', cursor: 'pointer', accentColor: '#3B82F6' }}
                        />
                      </label>
                    )}
                  </div>
                </th>
                <th style={{ padding: '0.65rem 0.35rem', textAlign: 'right', width: '100px', fontSize: '0.75rem', fontWeight: '800' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem' }}>
                    <span style={{ color: enableUnitPrice ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>Rate (₹)</span>
                    {onToggleEnableUnitPrice && (
                      <label 
                        title={enableUnitPrice ? "Unit Price enabled (Click to disable)" : "Unit Price disabled (Click to enable)"}
                        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(enableUnitPrice)}
                          onChange={(e) => onToggleEnableUnitPrice(e.target.checked)}
                          style={{ width: '13px', height: '13px', cursor: 'pointer', accentColor: '#3B82F6' }}
                        />
                      </label>
                    )}
                  </div>
                </th>
                <th 
                  title="Combine consecutive items into a package with curly brace"
                  style={{ padding: '0.65rem 0.3rem', textAlign: 'center', width: '70px', fontSize: '0.72rem', fontWeight: '800', background: 'rgba(217, 119, 6, 0.2)', color: '#FBBF24' }}
                >
                  Combine
                </th>
                <th style={{ padding: '0.65rem 0.3rem', textAlign: 'center', width: '100px', fontSize: '0.72rem', fontWeight: '800', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399' }}>
                  {enableUnitPrice ? 'Package (₹)' : 'Total (₹)'}
                </th>
                <th style={{ padding: '0.65rem 0.2rem', textAlign: 'center', width: '36px', fontSize: '0.75rem', fontWeight: '800' }}>
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B', fontSize: '0.85rem' }}>
                    No items added yet. Click "+ Add Item" below to start.
                  </td>
                </tr>
              ) : (
                sectionMeta.map((meta, index) => {
                  const prevItem = index > 0 ? items[index - 1] : null;
                  const prevIsCombined = prevItem && Boolean(prevItem.isCombinedMode ?? prevItem.isCombined);
                  const currentName = meta.description || meta.productName || meta.name || meta.workDescription || meta.itemName || '';

                  return (
                    <tr 
                      key={meta.id || index}
                      style={{ 
                        borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
                        background: meta.isCombined ? 'rgba(217, 119, 6, 0.03)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Sl. No. */}
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', fontWeight: '700', fontSize: '0.8rem', color: '#64748B' }}>
                        {index + 1}
                      </td>

                      {/* Item Description */}
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input
                          type="text"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                          required
                          value={currentName}
                          onChange={(e) => onUpdateItem(index, 'description', e.target.value)}
                          list={dataListId}
                          placeholder="Item or service name..."
                        />
                        {meta.subDescription !== undefined && (
                          <input
                            type="text"
                            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-600 dark:text-slate-400 mt-1 focus:outline-none"
                            value={meta.subDescription || ''}
                            onChange={(e) => onUpdateItem(index, 'subDescription', e.target.value)}
                            placeholder="Optional detail/note..."
                          />
                        )}
                      </td>

                      {/* Qty */}
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center' }}>
                        {!enableQuantity ? (
                          <div 
                            style={{ 
                              padding: '0.45rem 0.4rem', 
                              background: 'rgba(0, 0, 0, 0.03)', 
                              borderRadius: '6px', 
                              color: '#94A3B8', 
                              textAlign: 'center',
                              fontSize: '0.8rem',
                              border: '1px dashed rgba(148, 163, 184, 0.4)',
                              width: '75px',
                              margin: '0 auto'
                            }}
                            title="Quantity is currently disabled in document settings"
                          >
                            —
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                            <label 
                              title={meta.hasQuantity !== false ? "Quantity enabled for this item" : "Quantity disabled for this item"}
                              style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}
                            >
                              <input
                                type="checkbox"
                                checked={meta.hasQuantity !== false}
                                onChange={(e) => onUpdateItem(index, 'hasQuantity', e.target.checked)}
                                style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#3B82F6' }}
                              />
                            </label>

                            {meta.hasQuantity !== false ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <input
                                  type="number"
                                  min="1"
                                  step="any"
                                  className="w-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-1 text-xs font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                                  value={meta.quantity ?? ''}
                                  onChange={(e) => onUpdateItem(index, 'quantity', e.target.value)}
                                  placeholder="1"
                                  title="Quantity"
                                />
                                <select
                                  value={meta.unit || 'Units'}
                                  onChange={(e) => onUpdateItem(index, 'unit', e.target.value)}
                                  className="w-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-0.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none"
                                  title="Unit of measurement"
                                >
                                  <option value="Units">Units</option>
                                  <option value="Nos">Nos</option>
                                  <option value="Kg">Kg</option>
                                  <option value="Pcs">Pcs</option>
                                  <option value="Mtr">Mtr</option>
                                  <option value="SqFt">SqFt</option>
                                  <option value="Sets">Sets</option>
                                  <option value="Days">Days</option>
                                  <option value="Hours">Hours</option>
                                  <option value="Lot">Lot</option>
                                </select>
                              </div>
                            ) : (
                              <span 
                                style={{ 
                                  display: 'inline-block',
                                  padding: '0.2rem 0.4rem',
                                  color: '#94A3B8', 
                                  fontSize: '0.8rem', 
                                  fontWeight: 'bold',
                                  border: '1px dashed rgba(148, 163, 184, 0.4)',
                                  borderRadius: '4px',
                                  minWidth: '35px'
                                }}
                                title="No quantity for this item"
                              >
                                —
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Unit Price (₹) */}
                      <td style={{ padding: '0.45rem 0.4rem', textAlign: 'right' }}>
                        {!enableUnitPrice ? (
                          <div 
                            style={{ 
                              padding: '0.45rem 0.5rem', 
                              background: 'rgba(0, 0, 0, 0.03)', 
                              borderRadius: '6px', 
                              color: '#94A3B8', 
                              textAlign: 'center',
                              fontSize: '0.8rem',
                              border: '1px dashed rgba(148, 163, 184, 0.4)'
                            }}
                            title="Unit price is currently disabled in document settings"
                          >
                            —
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', width: '100%' }}>
                            <label 
                              title={meta.hasUnitPrice !== false ? "Unit price enabled for this item" : "Unit price disabled for this item"}
                              style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}
                            >
                              <input
                                type="checkbox"
                                checked={meta.hasUnitPrice !== false}
                                onChange={(e) => onUpdateItem(index, 'hasUnitPrice', e.target.checked)}
                                style={{ width: '13px', height: '13px', cursor: 'pointer', accentColor: '#3B82F6' }}
                              />
                            </label>

                            {meta.hasUnitPrice !== false ? (
                              meta.isCombined ? (
                                <div 
                                  style={{ 
                                    padding: '0.3rem 0.4rem', 
                                    background: 'rgba(0, 0, 0, 0.02)', 
                                    borderRadius: '6px', 
                                    color: '#94A3B8', 
                                    textAlign: 'center',
                                    fontSize: '0.8rem',
                                    border: '1px dashed rgba(148, 163, 184, 0.4)',
                                    width: '70px'
                                  }}
                                  title="Unit price not required for combined item"
                                >
                                  —
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-xs font-bold text-right text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                                  value={meta.price ?? meta.rate ?? meta.dailyRate ?? ''}
                                  onChange={(e) => onUpdateItem(index, 'price', e.target.value)}
                                  placeholder="0.00"
                                />
                              )
                            ) : (
                              <span 
                                style={{ 
                                  display: 'inline-block',
                                  padding: '0.2rem 0.4rem',
                                  color: '#94A3B8', 
                                  fontSize: '0.8rem', 
                                  fontWeight: 'bold',
                                  border: '1px dashed rgba(148, 163, 184, 0.4)',
                                  borderRadius: '4px',
                                  minWidth: '35px',
                                  textAlign: 'center'
                                }}
                                title="No unit price for this item"
                              >
                                —
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Combine with other items Checkbox */}
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', verticalAlign: 'middle', background: 'rgba(217, 119, 6, 0.03)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          <label 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              cursor: 'pointer',
                              margin: 0,
                              userSelect: 'none'
                            }}
                            title="Check to combine this item with consecutive items into one total"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(meta.isCombined)}
                              onChange={(e) => onToggleCombine(index, e.target.checked)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#D97706' }}
                            />
                          </label>

                          {/* Split or Merge option if this row is combined and directly preceded by another combined row */}
                          {meta.isCombined && prevIsCombined && (
                            meta.isNewSectionStart ? (
                              <button
                                type="button"
                                onClick={() => onMergeSection(index)}
                                title="Merge with previous combined section"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10B981',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: '700'
                                }}
                              >
                                <LinkIcon size={10} /> Merge Above
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSplitSection(index)}
                                title="Separate this item into a new combined section"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  background: 'rgba(59, 130, 246, 0.12)',
                                  color: '#3B82F6',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: '700'
                                }}
                              >
                                <Split size={10} /> Split Section
                              </button>
                            )
                          )}
                        </div>
                      </td>

                      {/* Combined Amount (₹) with rowSpan across combined section */}
                      {meta.isCombined ? (
                        meta.isSectionStart ? (
                          <td
                            rowSpan={meta.sectionRowCount}
                            style={{
                              padding: '0.45rem 0.35rem',
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              background: 'rgba(16, 185, 129, 0.05)',
                              borderLeft: '1px solid rgba(16, 185, 129, 0.2)',
                              borderRight: '1px solid rgba(16, 185, 129, 0.2)',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                className="w-20 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-lg px-1.5 py-1 text-center font-black text-xs text-emerald-600 dark:text-emerald-400 focus:outline-none shadow-sm"
                                placeholder="0.00"
                                required
                                value={combinedTotals[meta.sectionId] ?? ''}
                                onChange={(e) => onCombinedTotalChange(meta.sectionId, e.target.value)}
                              />
                              {meta.sectionRowCount > 1 && (
                                <span style={{ fontSize: '9px', color: '#64748B', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                  Spans {meta.sectionRowCount}
                                </span>
                              )}
                            </div>
                          </td>
                        ) : null
                      ) : (
                        <td style={{ padding: '0.45rem 0.35rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                          {!enableUnitPrice || meta.hasUnitPrice === false ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="w-20 bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg px-1.5 py-1 text-center font-bold text-xs text-emerald-600 dark:text-emerald-400 focus:outline-none mx-auto block"
                              placeholder="0.00"
                              value={meta.total ?? meta.price ?? ''}
                              onChange={(e) => {
                                onUpdateItem(index, 'total', e.target.value);
                                onUpdateItem(index, 'price', e.target.value);
                              }}
                              title="Direct item amount (Unit price disabled)"
                            />
                          ) : (
                            '—'
                          )}
                        </td>
                      )}

                      {/* Action: Delete */}
                      <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(index)}
                          className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded-lg transition"
                          title="Remove row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Row Control Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-1">
        <div className="flex flex-wrap gap-2">
          <button 
            type="button" 
            className="flex-1 sm:flex-initial bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm border border-indigo-100 dark:border-indigo-900/50"
            onClick={onAddItem} 
          >
            <Plus size={15} /> Add Item
          </button>
          
          <button 
            type="button" 
            className="flex-1 sm:flex-initial bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm border border-amber-100 dark:border-amber-900/50"
            onClick={onAddNewCombinedSection} 
          >
            <Plus size={15} /> Add Combined Section
          </button>
        </div>

        <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold text-center sm:text-right">
          {items.length} {items.length === 1 ? 'line item' : 'line items'} in estimation
        </span>
      </div>
    </div>
  );
};

export default EstimationEntryTable;
