import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

const COMPANY_DETAILS = {
    name: 'KRISHNA ENGINEERING WORKS',
    tagline: 'PRECISION ENGINEERING & INDUSTRIAL SOLUTIONS',
    address: 'Thiruvazhiyode, Sreekrishnapuram, Kerala 679514',
    contact: 'Phone: +91 94479 40835 | Email: krishnaengineeringworks0715@gmail.com',
    gstin: 'GSTIN: 32ABCDE1234F1Z5'
};

const THEME = {
    primary: [15, 23, 42],    // Slate 900
    accent: [37, 99, 235],     // Blue 600
    textLight: [255, 255, 255],
    textDark: [15, 23, 42],
    textMuted: [100, 116, 139], // Slate 500
    bgLight: [248, 250, 252]   // Slate 50
};

const savePDF = async (doc, filename) => {
    try {
        // Sanitize filename to ensure safe, cross-browser downloading without forbidden chars or spaces
        const safeFilename = String(filename || 'Document.pdf')
            .trim()
            .replace(/[/\\?%*:|"<>]/g, '_')
            .replace(/\s+/g, '_');

        if (Capacitor.isNativePlatform()) {
            try {
                const pdfOutput = doc.output('datauristring');
                const base64Data = pdfOutput.split(',')[1];
                
                const savedFile = await Filesystem.writeFile({
                    path: safeFilename,
                    data: base64Data,
                    directory: Directory.Cache,
                    recursive: true
                });
                
                await Share.share({
                    title: safeFilename,
                    text: 'Here is your generated PDF document.',
                    url: savedFile.uri,
                    dialogTitle: 'Save or Share PDF'
                });
                return;
            } catch (err) {
                console.warn('Native Capacitor Share fallback to browser download:', err);
            }
        }
        
        // Multi-stage cross-browser download engine
        try {
            // Stage 1: Explicit Blob + Dynamic Anchor Tag Download
            const blob = doc.output('blob');
            const blobUrl = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = safeFilename;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
                URL.revokeObjectURL(blobUrl);
            }, 1000);
        } catch (blobErr) {
            console.warn('Blob URL download failed, using doc.save fallback:', blobErr);
            doc.save(safeFilename);
        }
    } catch (err) {
        console.error('All PDF download mechanisms failed:', err);
        try {
            doc.save('document.pdf');
        } catch (e) {
            alert('Unable to trigger PDF download. Please check your browser popup/download permissions.');
        }
    }
};

/**
 * Dynamic Header Engine with safe text measurement, auto wrapping, and flexible Y calculation.
 * Prevents text overlapping between logo/company name/tagline and right-aligned title/address/GSTIN.
 */
const addHeader = (doc, title, companyInfoOverride = {}) => {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const rightMargin = pageWidth - margin;
    const maxLeftWidth = (pageWidth / 2) - 10;
    const maxRightWidth = (pageWidth / 2) - 10;

    const companyName = companyInfoOverride.name || COMPANY_DETAILS.name;
    const tagline = companyInfoOverride.tagline || COMPANY_DETAILS.tagline;
    const address = companyInfoOverride.address || COMPANY_DETAILS.address;
    const contact = companyInfoOverride.contact || COMPANY_DETAILS.contact;
    const gstin = companyInfoOverride.gstin || COMPANY_DETAILS.gstin;

    // Calculate left column height (Logo/Badge + Company Name + Tagline)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    const companyLines = doc.splitTextToSize(companyName, maxLeftWidth);
    const companyNameHeight = companyLines.length * 7;
    const leftHeight = 12 + companyNameHeight + 6 + 6; // Y padding + name + tagline

    // Calculate right column height (Title + Address + Contact + GSTIN)
    doc.setFontSize(13);
    const titleLines = doc.splitTextToSize(title.toUpperCase(), maxRightWidth);
    const titleHeight = titleLines.length * 6;

    doc.setFontSize(7.5);
    const addressLines = doc.splitTextToSize(address, maxRightWidth);
    const contactLines = doc.splitTextToSize(contact, maxRightWidth);
    const gstinLines = doc.splitTextToSize(gstin, maxRightWidth);

    const rightHeight = 12 + titleHeight + 4 + (addressLines.length * 3.5) + (contactLines.length * 3.5) + (gstinLines.length * 3.5);

    // Compute dynamic header height with safe padding
    const headerHeight = Math.max(48, leftHeight, rightHeight) + 8;

    // Draw header background block & accent bar
    doc.setFillColor(...THEME.primary);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    doc.setFillColor(...THEME.accent);
    doc.rect(0, 0, 5, headerHeight, 'F');

    // Render Left Column
    let leftY = 16;

    // Company Logo / Brand Badge Rendering
    const logoUrl = companyInfoOverride.logo || companyInfoOverride.company_logo || COMPANY_DETAILS.logo;
    const showLogo = companyInfoOverride.show_logo !== false && companyInfoOverride.showLogo !== false;

    let logoRendered = false;
    if (logoUrl && showLogo) {
        try {
            doc.addImage(logoUrl, 'PNG', margin, leftY - 4, 12, 12);
            logoRendered = true;
        } catch (imgErr) {
            console.warn("Logo image render fallback:", imgErr.message);
        }
    }

    if (!logoRendered) {
        // Fallback Badge
        doc.setFillColor(...THEME.accent);
        doc.roundedRect(margin, leftY - 4, 10, 10, 2, 2, 'F');
        doc.setTextColor(...THEME.textLight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('K', margin + 3.5, leftY + 3);
    }

    // Company Name
    const textStartX = margin + 14;
    doc.setFontSize(14);
    doc.setTextColor(...THEME.textLight);
    doc.setFont('helvetica', 'bold');
    // Tagline
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.accent);
    doc.text(tagline, textStartX, leftY + 2);

    // Render Right Column
    let rightY = 14;

    // Document Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.textLight);
    titleLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right' });
        rightY += 5;
    });

    rightY += 2;

    // Contact Details
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 225);

    addressLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right' });
        rightY += 3.5;
    });

    contactLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right' });
        rightY += 3.5;
    });

    gstinLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right' });
        rightY += 3.5;
    });

    return headerHeight;
};

const addSignatureAndSeal = (doc, finalY, companyInfoOverride = {}) => {
    const pageW = doc.internal.pageSize.width;
    const signatureUrl = companyInfoOverride.signature || companyInfoOverride.company_signature || COMPANY_DETAILS.signature;
    const showSignature = companyInfoOverride.show_signature !== false && companyInfoOverride.showSignature !== false;

    if (signatureUrl && showSignature) {
        try {
            // High resolution digital signature placement
            doc.addImage(signatureUrl, 'PNG', pageW - 75, finalY + 22, 40, 15);
        } catch (e) {
            console.warn("Digital signature image fallback:", e.message);
        }
    }

    // Signature Line & Corporate Seal
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(pageW - 80, finalY + 38, pageW - 15, finalY + 38);
    doc.setFontSize(8.5);
    doc.setTextColor(...THEME.textDark);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORIZED SIGNATURE', pageW - 47.5, finalY + 43, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.textMuted);
    doc.text('KRISHNA ENGINEERING WORKS [SEAL]', pageW - 47.5, finalY + 47, { align: 'center' });
};

/**
 * Universal Footer Engine with Page Numbers, Generation Timestamp, and Seal Notice
 */
const addFooter = (doc) => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Accent Separator Line
        doc.setDrawColor(...THEME.accent);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

        // Footer Text
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...THEME.textMuted);
        doc.text(`Generated on: ${new Date().toLocaleString()} | Official System Generated Document`, margin, pageHeight - 8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }
};

/**
 * 1. FORMAL QUOTE / ESTIMATION PDF
 */
export const generateQuotePDF = (quote) => {
    if (!quote) return;
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, 'Formal Quote / Estimation');

    const quoteId = quote._id ? quote._id.slice(-8).toUpperCase() : 'N/A';
    const createdAt = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

    let startY = headerHeight + 12;

    // Reference Block
    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Reference ID: #${quoteId}`, 15, startY);
    doc.text(`Quote Date: ${createdAt}`, 15, startY + 6);
    doc.text(`Status: ${(quote.status || 'New').toUpperCase()}`, 130, startY);

    startY += 14;

    autoTable(doc, {
        startY,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [['Project Parameter', 'Specification Details']],
        body: [
            ['CLIENT NAME', (quote.name || 'Valued Client').toUpperCase()],
            ['CONTACT PHONE', quote.phone || 'N/A'],
            ['SITE LOCATION', (quote.location || 'N/A').toUpperCase()],
            ['OPERATION TYPE', (quote.serviceType || 'General').toUpperCase()],
            ['WORK DESCRIPTION', quote.description || 'No description provided.'],
        ],
        theme: 'grid',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: { 
            0: { fontStyle: 'bold', fillColor: [249, 250, 251], width: 55, halign: 'left' },
            1: { halign: 'left' }
        }
    });

    const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : startY + 60) + 12;

    doc.setFillColor(...THEME.bgLight);
    doc.rect(15, finalY, 180, 22, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...THEME.textMuted);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL ESTIMATED PROJECT COST (INR):', 22, finalY + 13);

    doc.setFontSize(16);
    doc.setTextColor(...THEME.accent);
    const cost = quote.estimatedCost ? parseFloat(quote.estimatedCost).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';
    doc.text(`₹ ${cost}`, 185, finalY + 13, { align: 'right' });

    addFooter(doc);
    savePDF(doc, `Quote_${quoteId}.pdf`);
};

/**
 * 2. MONTHLY SALARY SLIP PDF
 */
export const generateSalaryPDF = (salary, user) => {
    if (!salary) return;
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, 'Pay Slip / Monthly Salary Statement');

    const emp = salary.staffId || user || {};
    const empId = emp.staff_id || emp.id || emp._id || 'N/A';
    const empName = emp.name || 'Employee';
    const dept = emp.department || 'Operations';
    const desig = emp.designation || 'Staff';
    const joining = emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A';
    const phoneNum = emp.phone || emp.phoneNumber || 'N/A';

    const bankName = emp.bank_name || 'State Bank of India';
    const accNum = emp.account_number || 'N/A';
    const ifsc = emp.ifsc_code || 'N/A';
    const txnRef = salary.payments?.[0]?._id ? `TXN-${String(salary.payments[0]._id).slice(-8).toUpperCase()}` : (salary._id ? `TXN-${String(salary._id).slice(-8).toUpperCase()}` : 'TXN-GEN-2026');
    const payMethod = salary.payments?.[0]?.paymentMethod || 'Bank Transfer';
    const payDate = salary.paidAt ? new Date(salary.paidAt).toLocaleDateString() : (salary.payments?.[0]?.createdAt ? new Date(salary.payments[0].createdAt).toLocaleDateString() : 'N/A');

    const startY = headerHeight + 10;

    // Renders employee & bank details side-by-side using table
    autoTable(doc, {
        startY,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [['EMPLOYEE INFORMATION', 'TRANSACTION & BANK DETAILS']],
        body: [
            [`Employee ID: ${empId}\nName: ${empName.toUpperCase()}\nDepartment: ${dept}\nDesignation: ${desig}\nJoining Date: ${joining}\nPhone: ${phoneNum}`,
             `Month / Cycle: ${salary.month}\nPayment Date: ${payDate}\nPayment Method: ${payMethod}\nTxn Ref No: ${txnRef}\nBank: ${bankName}\nAccount / IFSC: ${accNum} / ${ifsc}`]
        ],
        theme: 'grid',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.primary, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'left' }
        }
    });

    const attendanceY = doc.lastAutoTable.finalY + 6;

    // Attendance & Overtime summaries
    autoTable(doc, {
        startY: attendanceY,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [['ATTENDANCE SUMMARY', 'OVERTIME SUMMARY']],
        body: [
            [`Working Days: ${salary.totalWorkingDays || 26}\nPresent Days: ${salary.presentDays || 0}\nHalf Days: ${salary.halfDays || 0}\nLeave Days: ${salary.leaveDays || 0}\nHolidays: ${salary.holidays || 0}`,
             `Overtime Hours: ${salary.overtimeHours || 0} hrs\nOT Rate/Hr: ₹${salary.overtimeRate || emp.overtimeRate || 0}\nOvertime Earnings: ₹${(salary.overtimeEarnings || 0).toLocaleString('en-IN')}`]
        ],
        theme: 'grid',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 4 },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'left' }
        }
    });

    const ledgerY = doc.lastAutoTable.finalY + 6;

    // Financial breakdown ledger
    const baseVal = salary.baseSalary || salary.base_salary || 0;
    const calcBase = salary.totalEarnedSalary !== undefined ? salary.totalEarnedSalary : (salary.calculatedBase !== undefined ? salary.calculatedBase : (salary.salaryType === 'Daily Wage' ? (baseVal * ((salary.presentDays || 0) + ((salary.halfDays || 0) * 0.5))) : baseVal));
    const otEarn = salary.overtimeEarnings || 0;
    const bonusVal = salary.bonus !== undefined ? salary.bonus : (salary.bonusAmount || 0);
    const incentivesVal = salary.incentives || 0;
    const allowancesVal = salary.allowances || 0;
    const dedVal = salary.deductions !== undefined ? salary.deductions : (salary.deductionAmount || 0);
    const advVal = salary.advanceRecovery !== undefined ? salary.advanceRecovery : (salary.advanceAmount || 0);
    const netVal = salary.netSalary || salary.salaryAmount || 0;

    autoTable(doc, {
        startY: ledgerY,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [['EARNINGS & ALLOWANCES', 'AMOUNT (INR)', 'DEDUCTIONS & RECOVERIES', 'AMOUNT (INR)']],
        body: [
            ['Base Pay', `₹ ${baseVal.toLocaleString('en-IN')}`, 'Advance Recovery', `₹ ${advVal.toLocaleString('en-IN')}`],
            ['Earned Salary (Wages/Sal)', `₹ ${calcBase.toLocaleString('en-IN')}`, 'Other Deductions', `₹ ${dedVal.toLocaleString('en-IN')}`],
            ['Overtime Pay', `₹ ${otEarn.toLocaleString('en-IN')}`, '', ''],
            ['Bonus & Incentives', `₹ ${(bonusVal + incentivesVal).toLocaleString('en-IN')}`, '', ''],
            ['Allowances', `₹ ${allowancesVal.toLocaleString('en-IN')}`, '', ''],
            ['Gross Earnings', `₹ ${(calcBase + otEarn + bonusVal + incentivesVal + allowancesVal).toLocaleString('en-IN')}`, 'Total Deductions', `₹ ${(advVal + dedVal).toLocaleString('en-IN')}`],
        ],
        theme: 'striped',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.primary, textColor: 255 },
        styles: { fontSize: 8.5, cellPadding: 4 },
        columnStyles: { 
            0: { fontStyle: 'bold', halign: 'left' },
            1: { halign: 'right' },
            2: { fontStyle: 'bold', halign: 'left' },
            3: { halign: 'right' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 8;

    doc.setFillColor(...THEME.bgLight);
    doc.rect(15, finalY, 180, 18, 'F');
    doc.setFontSize(10);
    doc.setTextColor(...THEME.textDark);
    doc.setFont('helvetica', 'bold');
    doc.text('NET DISBURSED SALARY:', 20, finalY + 11);
    doc.setFontSize(14);
    doc.setTextColor(...THEME.accent);
    doc.text(`₹ ${netVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, finalY + 11, { align: 'right' });

    // Status Indicator & Signature block
    doc.setFontSize(8.5);
    const statusText = (salary.paymentStatus || 'Pending').toUpperCase();
    const isPaid = ['PAID', 'COMPLETED'].includes(statusText);
    doc.setTextColor(isPaid ? [0, 140, 0] : [180, 90, 0]);
    doc.text(`PAYMENT STATUS: ${statusText}`, 15, finalY + 26);

    const pageW = doc.internal.pageSize.width;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...THEME.textMuted);
    doc.text('This is a Computer / System Generated Monthly Salary Slip.', 15, finalY + 32);
    doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, 15, finalY + 37);

    // Signature Area
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(pageW - 80, finalY + 38, pageW - 15, finalY + 38);
    doc.setFontSize(8.5);
    doc.setTextColor(...THEME.textDark);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORIZED SIGNATURE', pageW - 47.5, finalY + 43, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.textMuted);
    doc.text('KRISHNA ENGINEERING WORKS [SEAL]', pageW - 47.5, finalY + 47, { align: 'center' });

    addFooter(doc);
    savePDF(doc, `SalarySlip_${salary.month}_${empName.replace(/\s+/g, '_')}.pdf`);
};

/**
 * 3. TAX INVOICE PDF
 */
export const generateInvoicePDF = (invoice) => {
    if (!invoice) return;
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, 'Tax Invoice');

    const startY = headerHeight + 10;

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    const invNumber = invoice._id ? `INV-${invoice._id.slice(-6).toUpperCase()}` : 'INV-GEN-2026';
    doc.text(`Invoice ID: ${invNumber}`, 15, startY);
    doc.text(`Invoice Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}`, 15, startY + 6);
    
    doc.text(`Billed To:`, 130, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${invoice.customerId?.name || 'Valued Customer'}`, 130, startY + 6);
    doc.text(`Project: ${invoice.projectId?.title || 'General Structural Work'}`, 130, startY + 11);

    autoTable(doc, {
        startY: startY + 18,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [['#', 'Description of Product / Service', 'Project ID', 'Status', 'Total (INR)']],
        body: [
            [
                '1', 
                invoice.projectId?.description?.substring(0, 70) || 'Heavy Industrial Fabrication & Services',
                invoice.projectId?._id?.slice(-8).toUpperCase() || 'N/A',
                (invoice.paymentStatus || 'unpaid').toUpperCase(),
                `₹ ${parseFloat(invoice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            ]
        ],
        theme: 'grid',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 4 },
        columnStyles: {
            0: { halign: 'center', width: 12 },
            1: { halign: 'left' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'right' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    const pageWidth = doc.internal.pageSize.width;

    doc.setFillColor(...THEME.bgLight);
    doc.rect(110, finalY, 85, 20, 'F');

    doc.setFontSize(10);
    doc.text('TOTAL AMOUNT PAYABLE:', 115, finalY + 12);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.accent);
    doc.text(`₹ ${parseFloat(invoice.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - 18, finalY + 12, { align: 'right' });

    addFooter(doc);
    savePDF(doc, `Invoice_${invNumber}.pdf`);
};

/**
 * 4. ATTENDANCE REPORT PDF
 */
export const generateAttendanceReportPDF = (logs, user, type = 'Staff') => {
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, `${type} Attendance Report`);

    const startY = headerHeight + 10;

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Entity Name: ${(user?.name || 'Staff Member').toUpperCase()}`, 15, startY);
    doc.text(`Report Period: Generated on ${new Date().toLocaleDateString()}`, 15, startY + 6);

    autoTable(doc, {
        startY: startY + 14,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [['Date', 'Clock In', 'Clock Out', 'Status', 'Duration']],
        body: Array.isArray(logs) ? logs.map(log => [
            new Date(log.date || Date.now()).toLocaleDateString(),
            log.sessions?.[0]?.checkInTime || '--',
            log.sessions?.[0]?.checkOutTime || '--',
            (log.status || 'present').toUpperCase(),
            log.sessions?.[0]?.duration || '--'
        ]) : [],
        theme: 'striped',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4 },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'right' }
        }
    });

    addFooter(doc);
    savePDF(doc, `${type}_Attendance_Report.pdf`);
};

/**
 * 5. GENERAL REPORT & LEDGER PDF
 */
export const generateGeneralReportPDF = (data, title, columns) => {
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, title);

    autoTable(doc, {
        startY: headerHeight + 10,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [columns],
        body: Array.isArray(data) ? data : [],
        theme: 'striped',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'left' }
        }
    });

    addFooter(doc);
    savePDF(doc, `${title.replace(/\s+/g, '_')}.pdf`);
};

/**
 * 6. PAYMENT RECEIPT PDF
 */
export const generatePaymentReceiptPDF = (payment, user) => {
    if (!payment) return;
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, 'Payment Receipt / Acknowledgment');

    const startY = headerHeight + 10;
    const rcptId = payment._id?.slice(-8).toUpperCase() || 'N/A';

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt ID: RCPT-${rcptId}`, 15, startY);
    doc.text(`Transaction Date: ${new Date(payment.createdAt || Date.now()).toLocaleDateString()}`, 15, startY + 6);
    
    doc.text(`Payor Details:`, 130, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${user?.name?.toUpperCase() || 'VALUED CUSTOMER'}`, 130, startY + 6);
    doc.text(`${user?.email || 'N/A'}`, 130, startY + 11);

    autoTable(doc, {
        startY: startY + 18,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [['Transaction Parameter', 'Details / Specification']],
        body: [
            ['Reference UTR / ID', payment.referenceId || 'N/A'],
            ['Payment Channel', (payment.method || 'Manual').toUpperCase()],
            ['Project / Service', payment.projectId?.title || payment.quoteId?.serviceType || 'Krishna Engineering Services'],
            ['Payment Status', (payment.status || 'Verified').toUpperCase()],
            ['Currency Indicator', 'Indian Rupee (INR)'],
        ],
        theme: 'grid',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 4 },
        columnStyles: {
            0: { fontStyle: 'bold', halign: 'left', width: 60 },
            1: { halign: 'left' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFillColor(...THEME.bgLight);
    doc.rect(110, finalY, 85, 20, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT PAID:', 115, finalY + 12);
    doc.setFontSize(14);
    doc.setTextColor(...THEME.accent);
    doc.text(`₹ ${parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - 18, finalY + 12, { align: 'right' });

    doc.setFontSize(7.5);
    doc.setTextColor(...THEME.textMuted);
    const disclaimer = "This is an official system-generated receipt. Subject to final bank clearance.";
    doc.text(disclaimer, 15, finalY + 38);

    addFooter(doc);
    savePDF(doc, `Receipt_${rcptId}.pdf`);
};
