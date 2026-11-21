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

/**
 * 6. High-Fidelity Universal PDF Exporter for Billing & Quotations
 * Fixes all html2canvas rendering artifacts:
 * - Completely removes .no-print elements (edit buttons, inputs, hide links)
 * - Restores all print:block / hidden elements into clean visible text
 * - Prevents glyph collision / character overlapping by neutralizing font-weight 900 and letter-spacing
 * - Cleans up container dimensions so PDFs don't suffer from excessive blank space or squashed layouts
 * - Automatically splits long multi-item invoices across A4 pages cleanly
 */
export const exportCleanDocumentPDF = async (containerId, fileName = 'document.pdf') => {
    const container = document.getElementById(containerId);
    if (!container) {
        window.print();
        return;
    }

    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(container, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
            const clonedContainer = clonedDoc.getElementById(containerId);
            if (!clonedContainer) return;

            // 1. Completely eliminate all interactive/screen-only elements (.no-print)
            clonedDoc.querySelectorAll('.no-print').forEach(el => el.remove());

            // 2. Make all clean printable text elements visible
            clonedDoc.querySelectorAll('.hidden.print\\:block, [class*="print:block"]').forEach(el => {
                el.style.setProperty('display', 'block', 'important');
            });
            clonedDoc.querySelectorAll('.hidden.print\\:inline, [class*="print:inline"]').forEach(el => {
                el.style.setProperty('display', 'inline', 'important');
            });
            clonedDoc.querySelectorAll('.hidden.print\\:flex, [class*="print:flex"]').forEach(el => {
                el.style.setProperty('display', 'flex', 'important');
            });

            // 3. Replace any lingering form inputs with pure text spans
            clonedDoc.querySelectorAll('input, textarea').forEach(input => {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    if (!input.checked) input.remove();
                    return;
                }
                const span = clonedDoc.createElement('span');
                span.textContent = input.value || '';
                span.className = input.className;
                span.style.border = 'none';
                span.style.background = 'transparent';
                span.style.outline = 'none';
                span.style.boxShadow = 'none';
                span.style.display = 'inline-block';
                input.parentNode?.replaceChild(span, input);
            });

            // 4. Eliminate html2canvas font collision & letter overlapping (InvoicTotal, VALUED CLIENT):
            // Font-weight 900 (font-black) causes width miscalculation in canvas 2D text renderer
            clonedDoc.querySelectorAll('*').forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.fontWeight === '900' || el.classList.contains('font-black')) {
                    el.style.fontWeight = '700';
                }
                el.style.letterSpacing = 'normal';
                el.style.wordSpacing = 'normal';
                if (el.classList.contains('truncate')) {
                    el.classList.remove('truncate');
                    el.style.overflow = 'visible';
                    el.style.textOverflow = 'clip';
                    el.style.whiteSpace = 'normal';
                }
            });

            // 5. Container sizing: remove fixed min-height so short invoices aren't forced into giant blank box
            clonedContainer.style.minHeight = 'auto';
            clonedContainer.style.height = 'auto';
            clonedContainer.style.boxShadow = 'none';
            clonedContainer.style.border = 'none';
            clonedContainer.style.borderRadius = '0';
            clonedContainer.style.backgroundColor = '#ffffff';
        }
    });

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 8;
    const marginY = 8;
    const maxContentWidth = pageWidth - (marginX * 2); // 194 mm
    const maxContentHeight = pageHeight - (marginY * 2); // 281 mm

    const canvasAspect = canvas.height / canvas.width;
    let renderWidth = maxContentWidth;
    let renderHeight = renderWidth * canvasAspect;

    const imgData = canvas.toDataURL('image/png');

    if (renderHeight <= maxContentHeight) {
        const posX = marginX + ((maxContentWidth - renderWidth) / 2);
        const posY = marginY;
        pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
    } else {
        let heightLeft = renderHeight;
        let position = marginY;
        let page = 1;

        pdf.addImage(imgData, 'PNG', marginX, position, renderWidth, renderHeight, undefined, 'FAST');
        heightLeft -= maxContentHeight;

        while (heightLeft > 0) {
            position = marginY - (page * maxContentHeight);
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', marginX, position, renderWidth, renderHeight, undefined, 'FAST');
            heightLeft -= maxContentHeight;
            page++;
        }
    }

    pdf.save(fileName);
};
