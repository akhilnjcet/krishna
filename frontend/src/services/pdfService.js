import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const COMPANY_DETAILS = {
    name: 'KRISHNA ENGINEERING WORKS',
    tagline: 'PRECISION ENGINEERING & INDUSTRIAL SOLUTIONS',
    address: 'Thiruvazhiyode, Sreekrishnapuram, Kerala 679514',
    contact: 'Phone: +91 94479 40835 | Email: krishnaengineeringworks0715@gmail.com',
    gstin: 'GSTIN: 32ABCDE1234F1Z5' // Updated sample to Kerala state code (32)
};

const THEME = {
    primary: [15, 23, 42], // Slate 900
    accent: [37, 99, 235],  // Blue 600
    textLight: [255, 255, 255],
    textDark: [15, 23, 42],
    textMuted: [100, 116, 139], // Slate 500
    bgLight: [248, 250, 252]   // Slate 50
};

const savePDF = async (doc, filename) => {
    if (Capacitor.isNativePlatform()) {
        try {
            const pdfOutput = doc.output('datauristring');
            // Remove the data URI header
            const base64Data = pdfOutput.split(',')[1];
            
            await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Documents,
                recursive: true
            });
            alert(`Report Saved: ${filename} is now in your Documents folder.`);
        } catch (err) {
            console.error('Mobile PDF Save Error:', err);
            alert('Failed to save PDF to device storage. Please check permissions.');
        }
    } else {
        doc.save(filename);
    }
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

    autoTable(doc, {
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
    savePDF(doc, `Quote_${quoteId}.pdf`);
};

export const generateSalaryPDF = (salary, user) => {
    const doc = new jsPDF();
    addHeader(doc, 'Monthly Salary Statement');

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Employee Name: ${user.name.toUpperCase()}`, 15, 65);
    doc.text(`Pay Period: ${salary.month} ${salary.year || new Date().getFullYear()}`, 15, 72);

    autoTable(doc, {
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
    savePDF(doc, `SalarySlip_${salary.month}_${user.name.replace(/\s+/g, '_')}.pdf`);
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

    autoTable(doc, {
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
    savePDF(doc, `Invoice_${invoice._id.slice(-6).toUpperCase()}.pdf`);
};

export const generateAttendanceReportPDF = (logs, user, type = 'Staff') => {
    const doc = new jsPDF();
    addHeader(doc, `${type} Attendance Report`);

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Entity Name: ${user.name.toUpperCase()}`, 15, 65);
    doc.text(`Report Period: Current Tactical Cycle`, 15, 72);

    autoTable(doc, {
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
    savePDF(doc, `${type}_Attendance_Report.pdf`);
};

export const generateGeneralReportPDF = (data, title, columns) => {
    const doc = new jsPDF();
    addHeader(doc, title);

    autoTable(doc, {
        startY: 65,
        head: [columns],
        body: data,
        theme: 'striped',
        headStyles: { fillColor: THEME.accent },
        styles: { fontSize: 8, cellPadding: 4 }
    });

    addFooter(doc);
    savePDF(doc, `${title.replace(/\s+/g, '_')}.pdf`);
};

export const generatePaymentReceiptPDF = (payment, user) => {
    const doc = new jsPDF();
    addHeader(doc, 'Payment Receipt / Acknowledgment');

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt ID: RCPT-${payment._id?.slice(-8).toUpperCase() || 'N/A'}`, 15, 65);
    doc.text(`Transaction Date: ${new Date(payment.createdAt).toLocaleDateString()}`, 15, 72);
    
    doc.text(`Payor Details:`, 140, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(`${user?.name?.toUpperCase() || 'N/A'}`, 140, 72);
    doc.text(`${user?.email || 'N/A'}`, 140, 77);

    autoTable(doc, {
        startY: 90,
        head: [['Transaction Parameter', 'Details / Values']],
        body: [
            ['Reference UTR / ID', payment.referenceId || 'N/A'],
            ['Payment Channel', (payment.method || 'Manual').toUpperCase()],
            ['Project / Service', payment.projectId?.title || payment.quoteId?.serviceType || 'Krishna Engineering Services'],
            ['Payment Status', (payment.status || 'Verified').toUpperCase()],
            ['Currency Indicator', 'Indian Rupee (INR)'],
        ],
        theme: 'grid',
        headStyles: { fillColor: THEME.accent },
        styles: { fontSize: 9, cellPadding: 5 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFillColor(...THEME.bgLight);
    doc.rect(120, finalY, 75, 20, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT PAID:', 125, finalY + 12);
    doc.setFontSize(14);
    doc.text(`₹ ${payment.amount?.toLocaleString() || '0'}`, pageWidth - 15, finalY + 12, { align: 'right' });

    doc.setFontSize(8);
    doc.setTextColor(...THEME.textMuted);
    const disclaimer = "This is a system-generated receipt and does not require a physical signature. Subject to bank clearance.";
    doc.text(disclaimer, 15, finalY + 40);

    addFooter(doc);
    savePDF(doc, `Receipt_${payment._id?.slice(-8).toUpperCase() || 'N/A'}.pdf`);
};
