/**
 * Universal PDF & Currency Utilities
 * Strictly enforces Indian numbering format without unicode spacing corruption,
 * right-alignment, charSpace=0, and auto font scaling.
 *
 * ROOT CAUSE FIX (2026-07-29):
 * jsPDF built-in Helvetica does NOT include U+20B9 Rupee Sign.
 * When passed to doc.text() it renders as apostrophe or garbled glyph.
 * All jsPDF formatters use "Rs." as ASCII prefix.
 * For HTML/UI use formatINRDisplay() which returns the currency symbol.
 */

/**
 * 1. jsPDF-safe Indian Currency Formatter  ->  Rs.15,00,000.00
 *    Used ONLY in jsPDF doc.text() / autoTable body cells.
 */
export const formatCurrencyINR = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'Rs.0.00';
    const val = parseFloat(amount);
    const isNegative = val < 0;
    const absVal = Math.abs(val);

    const parts = absVal.toFixed(2).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];

    if (integerPart.length > 3) {
        const lastThree = integerPart.substring(integerPart.length - 3);
        const otherDigits = integerPart.substring(0, integerPart.length - 3);
        const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        integerPart = formattedOther + ',' + lastThree;
    }

    return `${isNegative ? '-' : ''}Rs.${integerPart}.${decimalPart}`;
};

/**
 * 2. UI / HTML Indian Currency Formatter  ->  Rs.15,00,000.00 with symbol
 *    Use in React JSX renders. NOT for jsPDF doc.text() calls.
 */
export const formatINRDisplay = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'Rs.0.00';
    const val = parseFloat(amount);
    const isNegative = val < 0;
    const absVal = Math.abs(val);

    const parts = absVal.toFixed(2).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];

    if (integerPart.length > 3) {
        const lastThree = integerPart.substring(integerPart.length - 3);
        const otherDigits = integerPart.substring(0, integerPart.length - 3);
        const formattedOther = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        integerPart = formattedOther + ',' + lastThree;
    }

    return `${isNegative ? '-' : ''}Rs.${integerPart}.${decimalPart}`;
};

/**
 * 3. Clean string of hidden non-breaking spaces or unicode artifacts
 */
export const cleanTextString = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, '')
        .trim();
};

/**
 * 4. Right-aligned currency helper for jsPDF
 */
export const drawRightAlignedAmount = (doc, amount, x, y, options = {}) => {
    if (!doc) return;
    const fontSize = options.fontSize || 9;
    const fontStyle = options.fontStyle || 'bold';
    const textColor = options.textColor || [15, 23, 42];

    const formatted = formatCurrencyINR(amount);
    const cleanStr = cleanTextString(formatted);

    doc.setCharSpace(0);
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(...textColor);
    doc.text(cleanStr, x, y, { align: 'right', charSpace: 0 });
};

/**
 * 5. Total Box with auto font-scaling to prevent overflow
 */
export const fitTextIntoBox = (doc, labelText, amount, x, y, width = 85, height = 22, options = {}) => {
    if (!doc) return;

    const bg = options.bg || [248, 250, 252];
    const border = options.border || [226, 232, 240];
    const labelColor = options.labelColor || [100, 116, 139];
    const amountColor = options.amountColor || [37, 99, 235];

    const formattedAmount = formatCurrencyINR(amount);
    const cleanAmountStr = cleanTextString(formattedAmount);

    doc.setCharSpace(0);

    doc.setFillColor(...bg);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
    doc.setDrawColor(...border);
    doc.roundedRect(x, y, width, height, 2, 2, 'S');

    const centerY = y + (height / 2) + 1.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...labelColor);
    const cleanLabel = cleanTextString(labelText).toUpperCase();
    doc.text(cleanLabel, x + 6, centerY, { charSpace: 0 });

    const labelWidth = doc.getTextWidth(cleanLabel);
    let maxAmountWidth = width - 12;
    if (labelWidth + 24 < width) {
        maxAmountWidth = width - labelWidth - 12;
    }

    // Auto scale font 13pt -> 7.5pt until text fits inside box
    let fontSize = 13;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    let amountWidth = doc.getTextWidth(cleanAmountStr);

    while (amountWidth > maxAmountWidth && fontSize > 7.5) {
        fontSize -= 0.5;
        doc.setFontSize(fontSize);
        amountWidth = doc.getTextWidth(cleanAmountStr);
    }

    doc.setTextColor(...amountColor);
    doc.text(cleanAmountStr, x + width - 6, centerY, { align: 'right', charSpace: 0 });
};
