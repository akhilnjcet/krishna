import React from 'react';
import { Plus, Trash2, Split, Link as LinkIcon } from 'lucide-react';
import { computeItemSectionMeta } from '../utils/combinedBillHelper';

/**
 * Reusable Estimation & Billing Entry Table matching the exact UI specification:
 * [Sl. No. | Item Description | Qty | Unit Price (₹) | Combine with other items | Combined Amount (₹) | Actions]
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
  const sectionMeta = computeItemSectionMeta(items, combinedTotals);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Responsive Scrollable Container */}
      <div 
        className="table-responsive" 
        style={{ 
          overflowX: 'auto', 
          borderRadius: '12px', 
          border: '1px solid var(--glass-border, rgba(226, 232, 240, 0.8))',
          background: 'var(--card-bg, rgba(255, 255, 255, 0.03))'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px' }}>
          <thead>
            <tr style={{ background: 'var(--table-header, #1e293b)', color: '#ffffff' }}>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '50px', fontSize: '0.75rem', fontWeight: '800' }}>
                Sl. No.
              </th>
              <th style={{ padding: '0.65rem 0.75rem', fontSize: '0.75rem', fontWeight: '800' }}>
                Item Description
              </th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '110px', fontSize: '0.75rem', fontWeight: '800' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
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
                        style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#3B82F6' }}
                      />
                    </label>
                  )}
                </div>
              </th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', width: '150px', fontSize: '0.75rem', fontWeight: '800' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.45rem' }}>
                  <span style={{ color: enableUnitPrice ? '#ffffff' : 'rgba(255,255,255,0.4)' }}>Unit Price (₹)</span>
                  {onToggleEnableUnitPrice && (
                    <label 
                      title={enableUnitPrice ? "Unit Price enabled (Click to disable)" : "Unit Price disabled (Click to enable)"}
                      style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(enableUnitPrice)}
                        onChange={(e) => onToggleEnableUnitPrice(e.target.checked)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#3B82F6' }}
                      />
                    </label>
                  )}
                </div>
              </th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', width: '180px', fontSize: '0.75rem', fontWeight: '800', background: 'rgba(217, 119, 6, 0.2)', color: '#FBBF24' }}>
                Combine with other items
              </th>
              <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', width: '170px', fontSize: '0.75rem', fontWeight: '800', background: 'rgba(16, 185, 129, 0.2)', color: '#34D399' }}>
                {enableUnitPrice ? 'Combined Amount (₹)' : 'Total Amount (₹)'}
              </th>
              <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '50px', fontSize: '0.75rem', fontWeight: '800' }}>
                &nbsp;
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748B', fontSize: '0.85rem' }}>
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
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-600 dark:text-slate-400 mt-1 focus:outline-none"
                          value={meta.subDescription || ''}
                          onChange={(e) => onUpdateItem(index, 'subDescription', e.target.value)}
                          placeholder="Optional detail/note..."
                        />
                      )}
                    </td>

                    {/* Qty */}
                    <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
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
                          title="Quantity is currently disabled"
                        >
                          —
                        </div>
                      ) : (
                        <input
                          type="number"
                          min="1"
                          step="any"
                          className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 mx-auto block"
                          value={meta.quantity ?? ''}
                          onChange={(e) => onUpdateItem(index, 'quantity', e.target.value)}
                          placeholder="1"
                        />
                      )}
                    </td>

                    {/* Unit Price (₹) */}
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                      {!enableUnitPrice ? (
                        <div 
                          style={{ 
                            padding: '0.45rem 0.65rem', 
                            background: 'rgba(0, 0, 0, 0.03)', 
                            borderRadius: '6px', 
                            color: '#94A3B8', 
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            border: '1px dashed rgba(148, 163, 184, 0.4)'
                          }}
                          title="Unit price is currently disabled"
                        >
                          —
                        </div>
                      ) : meta.isCombined ? (
                        <div 
                          style={{ 
                            padding: '0.45rem 0.65rem', 
                            background: 'rgba(0, 0, 0, 0.02)', 
                            borderRadius: '6px', 
                            color: '#94A3B8', 
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            border: '1px dashed rgba(148, 163, 184, 0.4)'
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
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-right text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                          value={meta.price ?? meta.rate ?? meta.dailyRate ?? ''}
                          onChange={(e) => onUpdateItem(index, 'price', e.target.value)}
                          placeholder="0.00"
                        />
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
                            padding: '0.65rem 0.75rem',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            background: 'rgba(16, 185, 129, 0.05)',
                            borderLeft: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRight: '1px solid rgba(16, 185, 129, 0.2)',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="w-28 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-xl px-2.5 py-1.5 text-center font-black text-sm text-emerald-600 dark:text-emerald-400 focus:outline-none shadow-sm"
                              placeholder="0.00"
                              required
                              value={combinedTotals[meta.sectionId] ?? ''}
                              onChange={(e) => onCombinedTotalChange(meta.sectionId, e.target.value)}
                            />
                            {meta.sectionRowCount > 1 && (
                              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: '700' }}>
                                Spans {meta.sectionRowCount} items
                              </span>
                            )}
                          </div>
                        </td>
                      ) : null /* follower rows covered by rowSpan */
                    ) : (
                      <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                        {!enableUnitPrice ? (
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="w-24 bg-white dark:bg-slate-900 border border-emerald-400 rounded-lg px-2 py-1 text-center font-bold text-xs text-emerald-600 dark:text-emerald-400 focus:outline-none mx-auto block"
                            placeholder="0.00"
                            value={meta.total ?? ''}
                            onChange={(e) => onUpdateItem(index, 'total', e.target.value)}
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

      {/* Row Control Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            type="button" 
            className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
            onClick={onAddItem} 
          >
            <Plus size={14} /> Add Item
          </button>
          
          <button 
            type="button" 
            className="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
            onClick={onAddNewCombinedSection} 
          >
            <Plus size={14} /> Add Combined Section
          </button>
        </div>

        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600' }}>
          {items.length} {items.length === 1 ? 'line item' : 'line items'} in estimation
        </span>
      </div>
    </div>
  );
};

export default EstimationEntryTable;
