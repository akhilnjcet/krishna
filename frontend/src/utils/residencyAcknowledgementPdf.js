import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── jsPDF-safe Indian Currency Formatter (Rs. prefix — ₹ not in Helvetica) ──
export const formatINR = (amount) => {
    if (amount == null || isNaN(amount)) return 'Rs.0.00';
    return 'Rs.' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

// ─── Status badge colors ──────────────────────────────────────────────────────
const STATUS_COLORS = {
    ACTIVE:        { bg: [16, 185, 129], text: [255, 255, 255] },
    CANCELLED:     { bg: [239, 68, 68],  text: [255, 255, 255] },
    'CHECKED OUT': { bg: [99, 102, 241], text: [255, 255, 255] },
    EXPIRED:       { bg: [245, 158, 11], text: [255, 255, 255] },
    PENDING:       { bg: [148, 163, 184],text: [255, 255, 255] },
};

// ─── Generate QR Code as PNG dataURL via qrcode.react canvas helper ──────────
const generateQRDataUrl = async (bookingId) => {
    const verifyUrl = `${window.location.origin}${window.location.pathname}#/lodge/verify-booking/${bookingId}`;
    try {
        // Mount a hidden QRCodeCanvas element, capture it, then remove it
        const { QRCodeCanvas } = await import('qrcode.react');
        const React = (await import('react')).default;
        const ReactDOM = (await import('react-dom/client')).default;

        return await new Promise((resolve) => {
            const container = document.createElement('div');
            container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;z-index:-1';
            document.body.appendChild(container);
            const root = ReactDOM.createRoot(container);
            root.render(React.createElement(QRCodeCanvas, { value: verifyUrl, size: 120 }));
            setTimeout(() => {
                const canvas = container.querySelector('canvas');
                const dataUrl = canvas ? canvas.toDataURL('image/png') : null;
                root.unmount();
                document.body.removeChild(container);
                if (dataUrl) { resolve(dataUrl); return; }
                throw new Error('canvas not found');
            }, 100);
        });
    } catch {
        // Fallback: plain grey placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 120; canvas.height = 120;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, 120, 120);
        ctx.fillStyle = '#6366f1'; ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center'; ctx.fillText('QR Code', 60, 58);
        ctx.font = '8px Arial'; ctx.fillStyle = '#64748b';
        ctx.fillText('Verify Booking', 60, 72);
        return canvas.toDataURL('image/png');
    }
};

// ─── MAIN PDF Generator ───────────────────────────────────────────────────────
export const generateResidencyAcknowledgementPDF = async (data) => {
    const { booking, tenant, room, lodge, policies } = data;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, PL = 14, PR = 196;
    doc.setFont('helvetica');

    const docStatus = booking.docStatus || 'ACTIVE';
    const statusColor = STATUS_COLORS[docStatus] || STATUS_COLORS.PENDING;

    // ── Header dark band ──────────────────────────────────────────────────
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, W, 44, 'F');

    // Status badge
    doc.setFillColor(...statusColor.bg);
    doc.roundedRect(PL, 6, 50, 9, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statusColor.text);
    doc.text(`\u25CF ${docStatus}`, PL + 3.5, 11.8);

    // Lodge name
    doc.setFontSize(16); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('KRISHNA LODGE & RESIDENCY', PL, 26);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
    doc.text('OFFICIAL RESIDENCY ACKNOWLEDGEMENT / BOOKING AGREEMENT', PL, 32);

    // Agreement details top-right
    doc.setFontSize(7.5); doc.setTextColor(200, 210, 230);
    doc.text(`Agreement No: ${booking.agreementNumber || '-'}`, PR, 20, { align: 'right' });
    doc.text(`Booking Ref:  #${String(booking._id || '').slice(-8).toUpperCase()}`, PR, 26, { align: 'right' });
    doc.text(`Version:  v${booking.acknowledgementVersion || 1}.0`, PR, 32, { align: 'right' });
    doc.text(`Generated: ${fmtDate(new Date())}`, PR, 38, { align: 'right' });

    // Lodge info bar
    doc.setFillColor(241, 245, 249); doc.rect(0, 44, W, 11, 'F');
    doc.setFontSize(7); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
    const lodgeInfoParts = [lodge.address, lodge.phone, lodge.email, lodge.website].filter(Boolean);
    doc.text(lodgeInfoParts.join('  |  '), 105, 50.5, { align: 'center' });

    let y = 60;

    const sectionHeader = (label, yPos) => {
        doc.setFillColor(30, 41, 59); doc.rect(PL, yPos, 182, 7, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
        doc.text(label.toUpperCase(), PL + 3, yPos + 5);
        return yPos + 10;
    };

    const twoColStyle = {
        styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] }, 1: { cellWidth: 140 } },
        margin: { left: PL, right: 14 },
    };

    // Tenant Details
    y = sectionHeader('Tenant / Occupant Details', y);
    autoTable(doc, { startY: y, head: [], body: [
        ['Tenant Name', tenant.name || '-'],
        ['Father / Guardian', tenant.fatherName || '-'],
        ['Mobile', tenant.phone || '-'],
        ['Email', tenant.email || '-'],
        ['Address', tenant.address || '-'],
        ['Govt ID Type', tenant.govtIdType || '-'],
        ['Govt ID Number', tenant.govtIdNumber || '-'],
        ['Emergency Contact', tenant.emergencyContact || '-'],
        ['Emergency Phone', tenant.emergencyPhone || '-'],
    ], ...twoColStyle });
    y = doc.lastAutoTable.finalY + 6;

    // Room Details
    y = sectionHeader('Room Details', y);
    autoTable(doc, { startY: y, head: [], body: [
        ['Room Number', room.roomNumber || '-'],
        ['Room Type', room.type || '-'],
        ['Building', room.building || '-'],
        ['Floor', room.floor || '-'],
        ['Max Occupants', String(room.maxGuests || 1)],
        ['Description', (room.description || '-').slice(0, 80)],
    ], ...twoColStyle });
    y = doc.lastAutoTable.finalY + 6;

    // Booking & Stay Details
    y = sectionHeader('Booking & Stay Details', y);
    autoTable(doc, {
        startY: y, head: [], body: [
            ['Booking ID', `#${String(booking._id || '').slice(-10).toUpperCase()}`, 'Booking Date', fmtDate(booking.bookingDate)],
            ['Check-In Date', fmtDate(booking.checkIn), 'Check-Out Date', fmtDate(booking.checkOut)],
            ['Total Stay', `${booking.daysTotal || '-'} Days`, 'Days Remaining', `${booking.daysRemaining ?? '-'} Days`],
            ['Booking Status', (booking.status || '-').toUpperCase(), 'Payment Cycle', booking.paymentCycle || 'Monthly'],
        ],
        columnStyles: {
            0: { cellWidth: 38, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] }, 1: { cellWidth: 52 },
            2: { cellWidth: 38, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] }, 3: { cellWidth: 54 },
        },
        styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica', textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
        margin: { left: PL, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;

    if (y > 240) { doc.addPage(); y = 16; }

    // Financial Summary
    y = sectionHeader('Financial Summary', y);
    autoTable(doc, {
        startY: y,
        head: [['Description', 'Amount']],
        body: [
            ['Monthly Rent', formatINR(room.monthlyRent)],
            ['Security Deposit', formatINR(room.securityDeposit)],
            ['Total Booking Amount', formatINR(booking.totalAmount)],
            ['Total Paid', formatINR(booking.totalPaid)],
            ['Outstanding Balance', formatINR(booking.outstanding)],
            ['Next Due Date', fmtDate(booking.nextDueDate)],
            ['Payment Status', booking.outstanding <= 0 ? 'FULLY PAID' : `BALANCE DUE: ${formatINR(booking.outstanding)}`],
        ],
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold', textColor: [71, 85, 105] }, 1: { cellWidth: 82, halign: 'right' } },
        styles: { fontSize: 8.5, cellPadding: 3, font: 'helvetica', textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
        didParseCell: (d) => {
            if (d.row.index === 6) {
                d.cell.styles.fontStyle = 'bold';
                d.cell.styles.fillColor = booking.outstanding <= 0 ? [209, 250, 229] : [254, 226, 226];
                d.cell.styles.textColor  = booking.outstanding <= 0 ? [4, 120, 87]   : [185, 28, 28];
            }
        },
        margin: { left: PL, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;

    // Facilities
    const facilityList = [];
    const f = room.facilities || {};
    const facilityMap = { wifi: 'Wi-Fi', parking: 'Parking', laundry: 'Laundry', electricity: '24h Electricity', water: 'Water Supply', housekeeping: 'Housekeeping', food: 'Food Service', ac: 'Air Conditioning', tv: 'Television', security: 'Security' };
    Object.entries(facilityMap).forEach(([k, v]) => { if (f[k]) facilityList.push(v); });
    if (room.amenities?.length) facilityList.push(...room.amenities);

    if (facilityList.length > 0) {
        if (y > 235) { doc.addPage(); y = 16; }
        y = sectionHeader('Assigned Facilities & Services', y);
        const cols = 4, colW = 45.5;
        facilityList.forEach((fac, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const xPos = PL + col * colW, yPos = y + row * 8 + 5;
            doc.setFillColor(238, 242, 255);
            doc.roundedRect(xPos, yPos - 3.5, colW - 2, 7, 1.5, 1.5, 'F');
            doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(67, 56, 202);
            doc.text(`\u2713 ${fac}`, xPos + 3, yPos + 0.5);
        });
        y += Math.ceil(facilityList.length / cols) * 8 + 8;
    }

    if (y > 210) { doc.addPage(); y = 16; }

    // Agreement Terms
    y = sectionHeader('Lodge Rules & Agreement Terms', y);
    autoTable(doc, {
        startY: y, head: [], body: [
            ['1. Rent Payment',    policies.rentPaymentPolicy    || '-'],
            ['2. Late Payment',    policies.latePaymentPolicy    || '-'],
            ['3. Visitor Policy',  policies.visitorPolicy        || '-'],
            ['4. Damage Policy',   policies.damagePolicy         || '-'],
            ['5. Cancellation',    policies.cancellationPolicy   || '-'],
            ['6. Security Deposit',policies.securityDepositPolicy|| '-'],
            ['7. Maintenance',     policies.maintenancePolicy    || '-'],
            ['8. Vacating',        policies.vacatingPolicy       || '-'],
        ],
        columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] }, 1: { cellWidth: 140, textColor: [51, 65, 85] } },
        styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica', lineColor: [226, 232, 240], lineWidth: 0.2 },
        margin: { left: PL, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
    if (y > 240) { doc.addPage(); y = 16; }

    // QR Code
    const qrDataUrl = await generateQRDataUrl(booking._id);
    doc.setFillColor(248, 250, 252); doc.roundedRect(PL, y, 50, 50, 3, 3, 'F');
    doc.addImage(qrDataUrl, 'PNG', PL + 5, y + 5, 40, 40);
    doc.setFontSize(6.5); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
    doc.text('Scan QR to verify booking online', PL + 25, y + 49, { align: 'center' });

    // Signatures
    const sigY = y + 2;
    const col1 = 75, col2 = 132;

    doc.setFillColor(238, 242, 255); doc.roundedRect(col1, sigY, 48, 42, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(67, 56, 202);
    doc.text('COMPANY SEAL', col1 + 24, sigY + 12, { align: 'center' });
    doc.text('KRISHNA LODGE', col1 + 24, sigY + 18, { align: 'center' });
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('(Authorized Stamp)', col1 + 24, sigY + 38, { align: 'center' });

    doc.setFillColor(240, 253, 244); doc.roundedRect(col2, sigY, 50, 42, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('Authorized Signature', col2 + 25, sigY + 10, { align: 'center' });
    doc.setDrawColor(34, 197, 94); doc.line(col2 + 5, sigY + 30, col2 + 45, sigY + 30);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('Signature & Date', col2 + 25, sigY + 37, { align: 'center' });

    y = sigY + 52;

    // Tenant acknowledgement strip
    doc.setFillColor(255, 251, 235); doc.roundedRect(PL, y, 182, 22, 2, 2, 'F');
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('Tenant Acknowledgement & Signature:', PL + 4, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(71, 85, 105);
    doc.text('I hereby acknowledge and agree to all the terms and conditions of this Residency Agreement.', PL + 4, y + 13);
    doc.setDrawColor(245, 158, 11);
    doc.line(PL + 4, y + 19, PL + 70, y + 19);
    doc.setFontSize(6.5); doc.text('Tenant Signature', PL + 4, y + 21.5);
    doc.line(PL + 90, y + 19, PL + 130, y + 19);
    doc.text('Date', PL + 90, y + 21.5);

    // Footer watermark
    doc.setFontSize(6); doc.setTextColor(190, 190, 190); doc.setFont('helvetica', 'normal');
    doc.text(
        `Agr: ${booking.agreementNumber || '-'} | v${booking.acknowledgementVersion || 1}.0 | ${new Date().toLocaleString('en-IN')} | Krishna Lodge & Residency`,
        105, 289, { align: 'center' }
    );

    return doc;
};

export const downloadResidencyAcknowledgement = async (data) => {
    const doc = await generateResidencyAcknowledgementPDF(data);
    const name = data.booking?.agreementNumber || 'Acknowledgement';
    doc.save(`${name}_Residency_Acknowledgement.pdf`);
};

export const printResidencyAcknowledgement = async (data) => {
    const doc = await generateResidencyAcknowledgementPDF(data);
    const blob = doc.output('bloburl');
    const win = window.open(blob, '_blank');
    if (win) win.print();
};
