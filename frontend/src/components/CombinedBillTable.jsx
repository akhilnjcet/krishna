import React from 'react';
import { computeItemSectionMeta } from '../utils/combinedBillHelper';

/**
 * Vertical Curly Brace (}) Component spanning full height of the spanned rows.
 * Uses an SVG bezier path with preserveAspectRatio="none" so it scales
 * seamlessly to any table row height while keeping sharp crisp lines.
 */
export const CurlyBraceTotal = ({ amount, rowCount = 1, textColor = 'currentColor', fontSize = '0.95rem' }) => {
  const count = Math.max(1, rowCount);
  const minHeight = Math.max(42, count * 36);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        minHeight: `${minHeight}px`,
        boxSizing: 'border-box',
        padding: '2px 4px'
      }}
    >
      {/* Vertical right-pointing curly brace } */}
      <svg
        viewBox="0 0 24 100"
        preserveAspectRatio="none"
        style={{
          width: '16px',
          height: '100%',
          minHeight: `${minHeight - 8}px`,
          maxHeight: '100%',
          display: 'block',
          flexShrink: 0
        }}
      >
        <path
          d="M 4 2 Q 13 2 13 16 L 13 42 Q 13 50 22 50 Q 13 50 13 58 L 13 84 Q 13 98 4 98"
          fill="none"
          stroke={textColor}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Centered Combined Amount beside the brace */}
      <div
        style={{
          marginLeft: '8px',
          fontWeight: '800',
          fontSize: fontSize,
          whiteSpace: 'nowrap',
          color: textColor
        }}
      >
        ₹{Number(amount || 0).toLocaleString()}
      </div>
    </div>
  );
};

/**
 * Reusable Bill Table renderer for all document themes (Classic, Modern, Minimalist, Executive).
 * Correctly renders:
 * - Empty Total cells for combined items via rowSpan
 * - Vertical curly brace (}) spanning the full height of selected consecutive rows
 * - Centered combined amount beside the brace
 * - Standard Quantity * Price totals for uncombined items
 * - Dynamically includes/excludes Qty and Unit Price columns based on enableQuantity and enableUnitPrice flags
 */
export const CombinedBillTableBody = ({
  items = [],
  combinedTotals = {},
  theme = 'classic',
  tableBorderColor = '#e2e8f0',
  textColor = '#0f172a',
  zebraBg = true,
  enableUnitPrice = true,
  enableQuantity = true
}) => {
  const sectionMeta = computeItemSectionMeta(items, combinedTotals);

  return (
    <tbody>
      {sectionMeta.map((meta, idx) => {
        const rowBg = zebraBg 
          ? (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC')
          : '#FFFFFF';

        const unitLabel = meta.unit === 'Kg' ? 'Kg' : (meta.unit || 'Units');
        const itemName = meta.description || meta.productName || meta.name || meta.workDescription || meta.itemName || 'Billed Item';

        return (
          <tr 
            key={idx} 
            style={{ 
              borderBottom: `1px solid ${tableBorderColor}`,
              background: rowBg
            }}
          >
            {/* Sl. No. / Index */}
            <td 
              style={{ 
                padding: '0.65rem 0.6rem', 
                fontSize: '0.8rem', 
                color: '#64748B',
                textAlign: 'left',
                verticalAlign: 'middle',
                width: '40px'
              }}
            >
              {String(idx + 1).padStart(2, '0')}
            </td>

            {/* Item Description */}
            <td 
              style={{ 
                padding: '0.65rem 0.6rem', 
                fontSize: '0.85rem',
                verticalAlign: 'middle',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: '700', color: textColor }}>
                {itemName}
              </div>
              {meta.description && meta.description !== itemName && (
                <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '1px' }}>
                  {meta.description}
                </div>
              )}
            </td>

            {/* Qty - ONLY if enableQuantity !== false */}
            {enableQuantity !== false && (
              <td 
                style={{ 
                  padding: '0.65rem 0.6rem', 
                  textAlign: 'center', 
                  fontSize: '0.85rem',
                  color: textColor,
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap'
                }}
              >
                {meta.hasQuantity !== false && meta.quantity ? `${meta.quantity} ${unitLabel}` : '—'}
              </td>
            )}

            {/* Rate / Unit Price (₹) - ONLY if enableUnitPrice !== false */}
            {enableUnitPrice !== false && (
              <td 
                style={{ 
                  padding: '0.65rem 0.6rem', 
                  textAlign: 'right', 
                  fontSize: '0.85rem',
                  color: textColor,
                  verticalAlign: 'middle',
                  whiteSpace: 'nowrap'
                }}
              >
                {meta.isCombined || meta.hasUnitPrice === false
                  ? '—' 
                  : (meta.displayPrice !== null && meta.displayPrice !== undefined && Number(meta.displayPrice) > 0
                      ? `₹${Number(meta.displayPrice).toLocaleString()}`
                      : '—')
                }
              </td>
            )}

            {/* Total (₹) */}
            {meta.isCombined ? (
              meta.isSectionStart ? (
                <td
                  rowSpan={meta.sectionRowCount}
                  style={{
                    padding: '0.35rem 0.6rem',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    background: '#FFFFFF',
                    borderLeft: `1px solid ${tableBorderColor}`,
                    borderBottom: `1px solid ${tableBorderColor}`
                  }}
                >
                  <CurlyBraceTotal
                    amount={meta.combinedAmount}
                    rowCount={meta.sectionRowCount}
                    textColor={textColor}
                    fontSize="0.95rem"
                  />
                </td>
              ) : null /* follower rows leave Total cell spanned and empty */
            ) : (
              <td 
                style={{ 
                  padding: '0.65rem 0.6rem', 
                  textAlign: 'right', 
                  fontWeight: '700', 
                  fontSize: '0.85rem',
                  color: textColor,
                  verticalAlign: 'middle',
                  borderLeft: `1px solid ${tableBorderColor}`,
                  whiteSpace: 'nowrap'
                }}
              >
                {`₹${Number(meta.displayTotal || 0).toLocaleString()}`}
              </td>
            )}
          </tr>
        );
      })}
    </tbody>
  );
};

export default CombinedBillTableBody;
