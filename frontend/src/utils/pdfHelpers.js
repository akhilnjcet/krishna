/**
 * Universal PDF & Currency Utilities
 * Strictly enforces Indian numbering format without unicode spacing corruption,
 * right-alignment, charSpace=0, and auto font scaling.
 */

/**
 * 1. Pure Indian Currency Formatter
 * Formats any numeric value to standard Indian numbering (₹15,00,000.00)
 * Uses clean ASCII digits, commas, and dots with ZERO non-breaking space characters.
 * 
 * Examples:
 * 999 -> ₹999.00
 * 15000 -> ₹15,000.00
 * 150000 -> ₹1,50,000.00
 * 1500000 -> ₹15,00,000.00
 * 15000000 -> ₹1,50,00,000.00
 * 99999999.99 -> ₹9,99,99,999.99
 */
export const formatCurrencyINR = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
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

    return `${isNegative ? '-' : ''}₹${integerPart}.${decimalPart}`;
};

/**
 * Clean string of any hidden non-breaking spaces or unicode space artifacts
 */
export const cleanTextString = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, '')
        .trim();
};

/**
 * 2. Helper to draw right-aligned currency amounts cleanly in jsPDF
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
 * 3. Helper to render responsive Total Box with auto font-scaling and zero clipping
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

    // Draw Background & Border Box
    doc.setFillColor(...bg);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
    doc.setDrawColor(...border);
    doc.roundedRect(x, y, width, height, 2, 2, 'S');

    // Calculate Y vertical center
    const centerY = y + (height / 2) + 1.5;

    // Render Label (Left Aligned)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...labelColor);
    const cleanLabel = cleanTextString(labelText).toUpperCase();
    doc.text(cleanLabel, x + 6, centerY, { charSpace: 0 });

    // Calculate Available Width for Amount
    const labelWidth = doc.getTextWidth(cleanLabel);
    let maxAmountWidth = width - 12;
    if (labelWidth + 24 < width) {
        maxAmountWidth = width - labelWidth - 12;
    }

    // Auto Font Scaling down from 14pt -> 7.5pt so large numbers NEVER overflow
    let fontSize = 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    let amountWidth = doc.getTextWidth(cleanAmountStr);

    while (amountWidth > maxAmountWidth && fontSize > 7.5) {
        fontSize -= 0.5;
        doc.setFontSize(fontSize);
        amountWidth = doc.getTextWidth(cleanAmountStr);
    }

    // Render Amount (Right Aligned)
    doc.setTextColor(...amountColor);
    doc.text(cleanAmountStr, x + width - 6, centerY, { align: 'right', charSpace: 0 });
};
