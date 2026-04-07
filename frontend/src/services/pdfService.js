import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const COMPANY_DETAILS = {
    name: 'KRISHNA ENGINEERING WORKS',
    tagline: 'PRECISION ENGINEERING & INDUSTRIAL SOLUTIONS',
    address: 'Phase-1, Industrial Area, Bangalore - 560058',
    contact: 'Phone: +91 99887 76655 | Email: contact@krishnaengg.com',
    gstin: 'GSTIN: 29ABCDE1234F1Z5'
};

const THEME = {
    primary: [15, 23, 42], // Slate 900
    accent: [37, 99, 235],  // Blue 600
    textLight: [255, 255, 255],
    textDark: [15, 23, 42],
    textMuted: [100, 116, 139], // Slate 500
    bgLight: [248, 250, 252]   // Slate 50
};

const addHeader = (doc, title) => {
    const pageWidth = doc.internal.pageSize.width;
    
    // Background Header Block
    doc.setFillColor(...THEME.primary);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Left Accent Strip
    doc.setFillColor(...THEME.accent);
    doc.rect(0, 0, 5, 50, 'F');

    // Company Name
    doc.setTextColor(...THEME.textLight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(COMPANY_DETAILS.name, 15, 22);

    // Tagline
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.accent);
    doc.text(COMPANY_DETAILS.tagline, 15, 30);

    // Document Title (Right Aligned)
    doc.setTextColor(...THEME.textLight);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), pageWidth - 15, 22, { align: 'right' });

    // Company Contact Info (Right Aligned)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(COMPANY_DETAILS.address, pageWidth - 15, 30, { align: 'right' });
    doc.text(COMPANY_DETAILS.contact, pageWidth - 15, 35, { align: 'right' });
    doc.text(COMPANY_DETAILS.gstin, pageWidth - 15, 40, { align: 'right' });
};

const addFooter = (doc) => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...THEME.textMuted);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
        
        // Bottom Accent line
        doc.setDrawColor(...THEME.accent);
        doc.setLineWidth(0.5);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    }
};

export const generateQuotePDF = (quote) => {
    if (!quote) return;
    const doc = new jsPDF();
    addHeader(doc, 'Formal Quote / Estimation');

    // Summary Info
    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const quoteId = quote._id ? quote._id.slice(-8).toUpperCase() : 'N/A';
    const createdAt = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : 'N/A';
    
    doc.text(`Reference ID: #${quoteId}`, 15, 65);
    doc.text(`Quote Date: ${createdAt}`, 15, 72);

    doc.autoTable({
        startY: 80,
        head: [['Project Parameter', 'Specification Details']],
        body: [
            ['CLIENT NAME', (quote.name || 'Valued Client').toUpperCase()],
            ['CONTACT PHONE', quote.phone || 'N/A'],
            ['SITE LOCATION', (quote.location || 'N/A').toUpperCase()],
            ['OPERATION TYPE', (quote.serviceType || 'General').toUpperCase()],
            ['WORK DESCRIPTION', quote.description || 'No description provided.'],
        ],
        theme: 'grid',
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: 'bold', fillColor: [249, 250, 251] } }
    });

    const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 150) + 20;
    
    doc.setFillColor(...THEME.bgLight);
    doc.rect(15, finalY - 10, 180, 25, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(...THEME.textMuted);
    doc.text('TOTAL ESTIMATED PROJECT COST (INR)', 25, finalY + 5);
    
    doc.setFontSize(18);
    doc.setTextColor(...THEME.accent);
    doc.setFont('helvetica', 'bold');
    const cost = quote.estimatedCost ? quote.estimatedCost.toLocaleString() : '0';
    doc.text(`₹ ${cost}`, 185, finalY + 5, { align: 'right' });

    addFooter(doc);
    doc.save(`Quote_${quoteId}.pdf`);
};

export const generateSalaryPDF = (salary, user) => {
    const doc = new jsPDF();
    addHeader(doc, 'Monthly Salary Statement');

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Employee Name: ${user.name.toUpperCase()}`, 15, 65);
    doc.text(`Pay Period: ${salary.month} ${salary.year || new Date().getFullYear()}`, 15, 72);

    doc.autoTable({
        startY: 80,
        head: [['Earnings Category', 'Description', 'Amount (INR)']],
        body: [
            ['Base Remuneration', 'Standard Monthly Payout', `₹ ${salary.salaryAmount?.toLocaleString()}`],
            ['Attendance Bonus', 'Performance Index Multiplier', '₹ 0'],
            ['Gross Payable', 'Before Statutory Deductions', `₹ ${salary.salaryAmount?.toLocaleString()}`],
            ['Deductions', 'TDS / PF / Advances', '₹ 0'],
        ],
        theme: 'striped',
        headStyles: { fillColor: THEME.accent },
        styles: { fontSize: 9, cellPadding: 5 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text(`NET DISBURSED AMOUNT:  ₹ ${salary.salaryAmount?.toLocaleString()}`, 15, finalY + 10);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 150, 0);
    doc.text(`TRANSACTION STATUS: ${salary.paymentStatus.toUpperCase()}`, 15, finalY + 20);

    addFooter(doc);
    doc.save(`SalarySlip_${salary.month}_${user.name.replace(/\s+/g, '_')}.pdf`);
};

export const generateInvoicePDF = (invoice) => {
    const doc = new jsPDF();
    addHeader(doc, 'Tax Invoice');

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice ID: INV-${invoice._id.slice(-6).toUpperCase()}`, 15, 65);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 15, 72);
    
    doc.text(`Billed To:`, 140, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(`${invoice.customerId?.name || 'Valued Client'}`, 140, 72);
    doc.text(`${invoice.projectId?.title || 'General Engineering'}`, 140, 77);

    doc.autoTable({
        startY: 90,
        head: [['Sl No.', 'Description of Service', 'Project ID', 'Status', 'Total (INR)']],
        body: [
            [
                '1', 
                invoice.projectId?.description?.substring(0, 50) || 'Industrial Engineering Services',
                invoice.projectId?._id?.slice(-8).toUpperCase() || 'N/A',
                invoice.paymentStatus.toUpperCase(),
                `₹ ${invoice.amount?.toLocaleString()}`
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: THEME.accent },
        styles: { fontSize: 9, cellPadding: 5 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(12);
    doc.text('TOTAL PAYABLE:', 130, finalY + 10);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`₹ ${invoice.amount?.toLocaleString()}`, pageWidth - 15, finalY + 10, { align: 'right' });

    addFooter(doc);
    doc.save(`Invoice_${invoice._id.slice(-6).toUpperCase()}.pdf`);
};

export const generateAttendanceReportPDF = (logs, user, type = 'Staff') => {
    const doc = new jsPDF();
    addHeader(doc, `${type} Attendance Report`);

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Entity Name: ${user.name.toUpperCase()}`, 15, 65);
    doc.text(`Report Period: Current Tactical Cycle`, 15, 72);

    doc.autoTable({
        startY: 80,
        head: [['Date', 'Clock In', 'Clock Out', 'Status', 'Duration']],
        body: logs.map(log => [
            new Date(log.date).toLocaleDateString(),
            log.sessions?.[0]?.checkInTime || '--',
            log.sessions?.[0]?.checkOutTime || '--',
            log.status === 'present' ? 'PRESENT' : 'ABSENT',
            log.sessions?.[0]?.duration || '--'
        ]),
        theme: 'striped',
        headStyles: { fillColor: THEME.accent },
        styles: { fontSize: 8, cellPadding: 4 }
    });

    addFooter(doc);
    doc.save(`${type}_Attendance_Report.pdf`);
};

export const generateGeneralReportPDF = (data, title, columns) => {
    const doc = new jsPDF();
    addHeader(doc, title);

    doc.autoTable({
        startY: 65,
        head: [columns],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: THEME.accent },
        styles: { fontSize: 8, cellPadding: 4 }
    });

    addFooter(doc);
    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};
