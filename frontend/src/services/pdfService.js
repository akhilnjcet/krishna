import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

const COMPANY_DETAILS = {
    name: 'KRISHNA ENGINEERING WORKS',
    tagline: 'PRECISION ENGINEERING & INDUSTRIAL SOLUTIONS',
    address: 'Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala 679514',
    contact: 'Phone: +91 94479 40835 | Email: contact@krishnaengg.com',
    gstin: 'GSTIN: 32AAAAA0000A1Z5'
};

const THEME = {
    primary: [15, 23, 42],     // Slate 900
    accent: [37, 99, 235],      // Blue 600
    textLight: [255, 255, 255],
    textDark: [15, 23, 42],
    textMuted: [100, 116, 139], // Slate 500
    bgLight: [248, 250, 252]    // Slate 50
};

/**
 * Standard Indian Currency Formatter (₹1,50,000.00)
 */
export const formatIndianCurrency = (amount) => {
    const val = parseFloat(amount || 0);
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const savePDF = async (doc, filename, historyMetadata = null) => {
    try {
        const safeFilename = String(filename || 'Document.pdf')
            .trim()
            .replace(/[/\\?%*:|"<>]/g, '_')
            .replace(/\s+/g, '_');

        const pdfOutput = doc.output('datauristring');
        const base64Data = pdfOutput.split(',')[1];

        // Intercept for Native Android WebView Download Helper
        if (window.Android && typeof window.Android.downloadBase64File === 'function') {
            try {
                window.Android.downloadBase64File(base64Data, safeFilename, 'application/pdf');
                return;
            } catch (err) {
                console.error("Native Android download listener failed:", err);
            }
        }

        if (historyMetadata) {
            try {
                const apiBase = getApiBase();
                const tokenObj = localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
                const cleanToken = tokenObj.replace(/^"|"$/g, '');

                fetch(`${apiBase}/document-history/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': cleanToken ? `Bearer ${cleanToken}` : ''
                    },
                    body: JSON.stringify({
                        ...historyMetadata,
                        pdfData: base64Data
                    })
                }).catch(err => console.warn('Document History save fetch error:', err));
            } catch (saveErr) {
                console.warn('Document History save exception:', saveErr);
            }
        }

        if (Capacitor.isNativePlatform()) {
            try {
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
        
        try {
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

let cachedBranding = null;
let brandingFetchPromise = null;

const getApiBase = () => {
    try {
        const envUrl = import.meta.env.VITE_API_URL;
        if (envUrl) return envUrl.replace(/\/$/, '');
    } catch (_) {}
    return window.location.origin + '/api';
};

const getBrandingSettings = async () => {
    if (cachedBranding) return cachedBranding;
    if (!brandingFetchPromise) {
        const base = getApiBase();
        brandingFetchPromise = fetch(`${base}/settings/public`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                const map = {};
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        map[item.key] = item.value;
                    });
                }
                cachedBranding = map;
                return map;
            })
            .catch(err => {
                console.warn("Could not fetch branding settings for PDF:", err);
                brandingFetchPromise = null;
                return {};
            });
    }
    return brandingFetchPromise;
};

const getImageFormat = (url) => {
    if (!url || typeof url !== 'string') return 'PNG';
    if (url.includes('data:image/jpeg') || url.includes('data:image/jpg')) return 'JPEG';
    if (url.includes('data:image/webp')) return 'WEBP';
    if (url.includes('data:image/png')) return 'PNG';
    if (url.includes('data:image/svg')) return 'SVG';
    return 'PNG';
};

/**
 * Standardized Header Component
 * Font Hierarchy: Company Name 18pt, Document Title 14pt, Details 9pt
 */
const addHeader = (doc, title, companyInfoOverride = {}) => {
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    const rightMargin = pageWidth - margin;
    const maxLeftWidth = (pageWidth / 2) - 10;
    const maxRightWidth = (pageWidth / 2) - 10;

    const companyName = companyInfoOverride.company_name || companyInfoOverride.name || cachedBranding?.company_name || COMPANY_DETAILS.name;
    const tagline = companyInfoOverride.tagline || cachedBranding?.company_tagline || COMPANY_DETAILS.tagline;
    const address = companyInfoOverride.company_address || companyInfoOverride.address || cachedBranding?.company_address || cachedBranding?.footer_address || COMPANY_DETAILS.address;
    
    const emailVal = companyInfoOverride.company_email || companyInfoOverride.email || cachedBranding?.company_email || cachedBranding?.footer_email || 'contact@krishnaengg.com';
    const phoneVal = companyInfoOverride.company_phone || companyInfoOverride.phone || cachedBranding?.company_phone || cachedBranding?.footer_phone || '+91 9447940835';
    const contact = companyInfoOverride.contact || `Phone: ${phoneVal} | Email: ${emailVal}`;
    const gstin = companyInfoOverride.company_gstin || companyInfoOverride.gstin || cachedBranding?.company_gstin || COMPANY_DETAILS.gstin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const companyLines = doc.splitTextToSize(companyName, maxLeftWidth);
    const companyNameHeight = companyLines.length * 7;
    const leftHeight = 12 + companyNameHeight + 6 + 6;

    doc.setFontSize(14);
    const titleLines = doc.splitTextToSize(title.toUpperCase(), maxRightWidth);
    const titleHeight = titleLines.length * 6;

    doc.setFontSize(9);
    const addressLines = doc.splitTextToSize(address, maxRightWidth);
    const contactLines = doc.splitTextToSize(contact, maxRightWidth);
    const gstinLines = doc.splitTextToSize(gstin, maxRightWidth);

    const rightHeight = 12 + titleHeight + 4 + (addressLines.length * 4) + (contactLines.length * 4) + (gstinLines.length * 4);
    const headerHeight = Math.max(52, leftHeight, rightHeight) + 8;

    doc.setFillColor(...THEME.primary);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    doc.setFillColor(...THEME.accent);
    doc.rect(0, 0, 5, headerHeight, 'F');

    let leftY = 16;
    const logoUrl = companyInfoOverride.logo || companyInfoOverride.company_logo || (cachedBranding?.company_logo) || COMPANY_DETAILS.logo;
    const showLogoVal = companyInfoOverride.show_logo ?? companyInfoOverride.showLogo ?? cachedBranding?.show_logo;
    const showLogo = showLogoVal !== false && showLogoVal !== 'false';

    let logoRendered = false;
    if (logoUrl && showLogo) {
        try {
            const fmt = getImageFormat(logoUrl);
            doc.addImage(logoUrl, fmt, margin, leftY - 4, 14, 14);
            logoRendered = true;
        } catch (imgErr) {
            console.warn("Logo image render fallback:", imgErr.message);
        }
    }

    if (!logoRendered) {
        doc.setFillColor(...THEME.accent);
        doc.roundedRect(margin, leftY - 4, 10, 10, 2, 2, 'F');
        doc.setTextColor(...THEME.textLight);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('K', margin + 3.5, leftY + 3);
    }

    const textStartX = margin + 18;
    doc.setFontSize(18);
    doc.setTextColor(...THEME.textLight);
    doc.setFont('helvetica', 'bold');
    companyLines.forEach((line) => {
        doc.text(line, textStartX, leftY + 3);
        leftY += 7;
    });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.accent);
    doc.text(tagline, textStartX, leftY + 2);

    let rightY = 14;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.textLight);
    titleLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right' });
        rightY += 6;
    });

    rightY += 2;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 225);

    addressLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right' });
        rightY += 4;
    });

    contactLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right' });
        rightY += 4;
    });

    gstinLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right' });
        rightY += 4;
    });

    return headerHeight;
};

/**
 * Standard Signature & Seal Component
 */
const addSignatureAndSeal = (doc, finalY, companyInfoOverride = {}) => {
    const pageW = doc.internal.pageSize.width;
    const signatureUrl = companyInfoOverride.signature || companyInfoOverride.company_signature || (cachedBranding?.company_signature) || COMPANY_DETAILS.signature;
    const showSigVal = companyInfoOverride.show_signature ?? companyInfoOverride.showSignature ?? cachedBranding?.show_signature;
    const showSignature = showSigVal !== false && showSigVal !== 'false';

    if (signatureUrl && showSignature) {
        try {
            const fmt = getImageFormat(signatureUrl);
            doc.addImage(signatureUrl, fmt, pageW - 75, finalY + 18, 40, 18);
        } catch (e) {
            console.warn("Digital signature image fallback:", e.message);
        }
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(pageW - 80, finalY + 38, pageW - 15, finalY + 38);
    doc.setFontSize(9);
    doc.setTextColor(...THEME.textDark);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTHORIZED SIGNATURE', pageW - 47.5, finalY + 43, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.textMuted);
    doc.text('KRISHNA ENGINEERING WORKS [SEAL]', pageW - 47.5, finalY + 47, { align: 'center' });
};

/**
 * Standardized Footer Engine
 * Font size: 8pt
 */
const addFooter = (doc, generatedBy = 'Official System') => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...THEME.accent);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...THEME.textMuted);
        doc.text(`Generated: ${new Date().toLocaleString()} | By: ${generatedBy} | www.krishnaengg.com`, margin, pageHeight - 9);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
    }
};

/**
 * Helper to render responsive amount box with auto font scaling
 */
const renderAmountBox = (doc, x, y, width, height, label, amountText) => {
    doc.setFillColor(...THEME.bgLight);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, width, height, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...THEME.textMuted);
    doc.text(label.toUpperCase(), x + 6, y + 12);

    let fontSize = 14;
    doc.setFontSize(fontSize);
    let textWidth = doc.getTextWidth(amountText);
    const maxAllowedWidth = width - 12;

    while (textWidth > maxAllowedWidth && fontSize > 9) {
        fontSize -= 1;
        doc.setFontSize(fontSize);
        textWidth = doc.getTextWidth(amountText);
    }

    doc.setTextColor(...THEME.accent);
    doc.text(amountText, x + width - 6, y + 12, { align: 'right' });
};

/**
 * 1. FORMAL QUOTE / ESTIMATION PDF
 */
export const generateQuotePDF = async (quote) => {
    if (!quote) return;
    await getBrandingSettings();
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, 'Formal Quote / Estimation');

    const quoteId = quote._id ? quote._id.slice(-8).toUpperCase() : 'N/A';
    const createdAt = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

    let startY = headerHeight + 12;

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9);
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
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: { 
            0: { fontStyle: 'bold', fillColor: [249, 250, 251], width: 55, halign: 'left' },
            1: { halign: 'left' }
        }
    });

    const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : startY + 60) + 12;
    const formattedCost = formatIndianCurrency(quote.estimatedCost || 0);

    renderAmountBox(doc, 15, finalY, 180, 22, 'Total Estimated Project Cost (INR):', formattedCost);

    addSignatureAndSeal(doc, finalY + 25);
    addFooter(doc);

    const historyMetadata = {
        documentType: 'Quotation',
        documentNumber: `Q-${quoteId}`,
        customerId: quote.userId?._id || quote.userId || null,
        projectId: quote.projectId?._id || quote.projectId || null,
        totalAmount: quote.estimatedCost || 0,
        status: quote.status || 'new',
        data: quote
    };
    savePDF(doc, `Quote_${quoteId}.pdf`, historyMetadata);
};

/**
 * 2. MONTHLY SALARY SLIP PDF
 */
export const generateSalaryPDF = async (salary, user) => {
    if (!salary) { alert('No salary data available for this slip.'); return; }
    try {
        await getBrandingSettings();
        const doc = new jsPDF();
        const headerHeight = addHeader(doc, 'Pay Slip / Monthly Salary Statement');

        const emp = salary.staffId || user || {};
        const empId = emp.staff_id || emp.id || emp._id || 'N/A';
        const empName = emp.name || user?.name || 'Employee';
        const dept = emp.department || user?.department || 'Operations';
        const desig = emp.designation || user?.designation || 'Staff';
        const joining = emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A';
        const phoneNum = emp.phone || emp.phoneNumber || user?.phone || 'N/A';

        const bankName = emp.bank_name || user?.bank_name || 'State Bank of India';
        const accNum = emp.account_number || user?.account_number || 'N/A';
        const ifsc = emp.ifsc_code || user?.ifsc_code || 'N/A';
        const txnRef = salary.payments?.[0]?._id ? `TXN-${String(salary.payments[0]._id).slice(-8).toUpperCase()}` : (salary._id ? `TXN-${String(salary._id).slice(-8).toUpperCase()}` : 'TXN-GEN-2026');
        const payMethod = salary.payments?.[0]?.paymentMethod || 'Bank Transfer';
        const payDate = salary.paidAt ? new Date(salary.paidAt).toLocaleDateString() : (salary.payments?.[0]?.createdAt ? new Date(salary.payments[0].createdAt).toLocaleDateString() : 'N/A');

        const startY = headerHeight + 10;

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
            headStyles: { fillColor: THEME.primary, textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
            columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } }
        });

        const attendanceY = doc.lastAutoTable.finalY + 6;

        autoTable(doc, {
            startY: attendanceY,
            margin: { left: 15, right: 15, bottom: 20 },
            head: [['ATTENDANCE SUMMARY', 'OVERTIME SUMMARY']],
            body: [
                [`Working Days: ${salary.totalWorkingDays || 26}\nPresent Days: ${salary.presentDays || 0}\nHalf Days: ${salary.halfDays || 0}\nLeave Days: ${salary.leaveDays || 0}\nHolidays: ${salary.holidays || 0}`,
                 `Overtime Hours: ${salary.overtimeHours || 0} hrs\nOT Rate/Hr: ${formatIndianCurrency(salary.overtimeRate || emp.overtimeRate || user?.overtimeRate || 0)}\nOvertime Earnings: ${formatIndianCurrency(salary.overtimeEarnings || 0)}`]
            ],
            theme: 'grid',
            showHead: 'everyPage',
            headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
            columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } }
        });

        const ledgerY = doc.lastAutoTable.finalY + 6;

        const baseVal  = salary.baseSalary || salary.base_salary || 0;
        const calcBase = salary.totalEarnedSalary !== undefined ? salary.totalEarnedSalary : (salary.calculatedBase !== undefined ? salary.calculatedBase : (salary.salaryType === 'Daily Wage' ? (baseVal * ((salary.presentDays || 0) + ((salary.halfDays || 0) * 0.5))) : baseVal));
        const otEarn   = salary.overtimeEarnings || 0;
        const bonusVal = salary.bonus !== undefined ? salary.bonus : (salary.bonusAmount || 0);
        const incentivesVal = salary.incentives || 0;
        const allowancesVal = salary.allowances || 0;
        const dedVal   = salary.deductions !== undefined ? salary.deductions : (salary.deductionAmount || 0);
        const advVal   = salary.advanceRecovery !== undefined ? salary.advanceRecovery : (salary.advanceAmount || 0);
        const netVal   = salary.netSalary || salary.salaryAmount || 0;

        autoTable(doc, {
            startY: ledgerY,
            margin: { left: 15, right: 15, bottom: 20 },
            head: [['EARNINGS & ALLOWANCES', 'AMOUNT (INR)', 'DEDUCTIONS & RECOVERIES', 'AMOUNT (INR)']],
            body: [
                ['Base Pay', formatIndianCurrency(baseVal), 'Advance Recovery', formatIndianCurrency(advVal)],
                ['Earned Salary (Wages/Sal)', formatIndianCurrency(calcBase), 'Other Deductions', formatIndianCurrency(dedVal)],
                ['Overtime Pay', formatIndianCurrency(otEarn), '', ''],
                ['Bonus & Incentives', formatIndianCurrency(bonusVal + incentivesVal), '', ''],
                ['Allowances', formatIndianCurrency(allowancesVal), '', ''],
                ['Gross Earnings', formatIndianCurrency(calcBase + otEarn + bonusVal + incentivesVal + allowancesVal), 'Total Deductions', formatIndianCurrency(advVal + dedVal)],
            ],
            theme: 'striped',
            showHead: 'everyPage',
            headStyles: { fillColor: THEME.primary, textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
            columnStyles: {
                0: { fontStyle: 'bold', halign: 'left' },
                1: { halign: 'right' },
                2: { fontStyle: 'bold', halign: 'left' },
                3: { halign: 'right' }
            }
        });

        const finalY = doc.lastAutoTable.finalY + 8;
        const formattedNet = formatIndianCurrency(netVal);

        renderAmountBox(doc, 15, finalY, 180, 20, 'Net Disbursed Salary:', formattedNet);

        doc.setFontSize(9);
        const statusText = (salary.paymentStatus || 'Pending').toUpperCase();
        const isPaid = ['PAID', 'COMPLETED'].includes(statusText);
        doc.setTextColor(isPaid ? 0 : 180, isPaid ? 140 : 90, isPaid ? 0 : 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`PAYMENT STATUS: ${statusText}`, 15, finalY + 28);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...THEME.textMuted);
        doc.text('This is a Computer / System Generated Monthly Salary Slip.', 15, finalY + 34);

        addSignatureAndSeal(doc, finalY + 20);
        addFooter(doc);

        const historyMetadata = {
            documentType: 'Salary Slip',
            documentNumber: salary._id ? `SLIP-${String(salary._id).slice(-8).toUpperCase()}` : `SLIP-${salary.month}`,
            customerId: emp._id || emp.id || null,
            totalAmount: salary.netSalary || salary.amount || 0,
            status: salary.paymentStatus || 'Pending',
            data: salary
        };
        await savePDF(doc, `SalarySlip_${salary.month}_${empName.replace(/\s+/g, '_')}.pdf`, historyMetadata);
    } catch (err) {
        console.error('Salary PDF generation error:', err);
        alert(`Failed to generate salary slip PDF: ${err.message}\n\nPlease try again or contact support.`);
    }
};

/**
 * 3. TAX INVOICE PDF
 */
export const generateInvoicePDF = async (invoice) => {
    if (!invoice) return;
    await getBrandingSettings();
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, 'Tax Invoice');

    const startY = headerHeight + 10;
    const invNumber = invoice._id ? `INV-${invoice._id.slice(-6).toUpperCase()}` : 'INV-GEN-2026';

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice ID: ${invNumber}`, 15, startY);
    doc.text(`Invoice Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}`, 15, startY + 6);
    
    doc.text(`Billed To:`, 130, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${invoice.customerId?.name || 'Valued Customer'}`, 130, startY + 6);
    doc.text(`Project: ${invoice.projectId?.title || 'General Structural Work'}`, 130, startY + 11);

    const amountVal = parseFloat(invoice.amount || 0);

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
                formatIndianCurrency(amountVal)
            ]
        ],
        theme: 'grid',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { halign: 'center', width: 12 },
            1: { halign: 'left' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'right' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    renderAmountBox(doc, 110, finalY, 85, 20, 'Total Amount Payable:', formatIndianCurrency(amountVal));

    addSignatureAndSeal(doc, finalY + 25);
    addFooter(doc);

    const historyMetadata = {
        documentType: 'Invoice',
        documentNumber: invNumber,
        customerId: invoice.customerId?._id || invoice.customerId || null,
        projectId: invoice.projectId?._id || invoice.projectId || null,
        totalAmount: invoice.amount || 0,
        status: invoice.paymentStatus || 'unpaid',
        data: invoice
    };
    savePDF(doc, `Invoice_${invNumber}.pdf`, historyMetadata);
};

/**
 * 4. ATTENDANCE REPORT PDF
 */
export const generateAttendanceReportPDF = async (logs, user, type = 'Staff') => {
    await getBrandingSettings();
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, `${type} Attendance Report`);

    const startY = headerHeight + 10;

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9);
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
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'right' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    addSignatureAndSeal(doc, finalY);
    addFooter(doc);

    const historyMetadata = {
        documentType: 'Attendance Report',
        documentNumber: `ATT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: user?._id || user?.id || null,
        totalAmount: 0,
        status: 'Generated',
        data: { logs, type }
    };
    savePDF(doc, `${type}_Attendance_Report.pdf`, historyMetadata);
};

/**
 * 5. GENERAL REPORT & LEDGER PDF
 */
export const generateGeneralReportPDF = async (data, title, columns) => {
    await getBrandingSettings();
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, title);

    autoTable(doc, {
        startY: headerHeight + 10,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [columns],
        body: Array.isArray(data) ? data : [],
        theme: 'striped',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'left' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    addSignatureAndSeal(doc, finalY);
    addFooter(doc);

    const historyMetadata = {
        documentType: 'General Report',
        documentNumber: `REP-${title.trim().replace(/\s+/g, '_').toUpperCase()}`,
        totalAmount: 0,
        status: 'Generated',
        data: { data, title, columns }
    };
    savePDF(doc, `${title.replace(/\s+/g, '_')}.pdf`, historyMetadata);
};

/**
 * 6. PAYMENT RECEIPT PDF
 */
export const generatePaymentReceiptPDF = async (payment, user) => {
    if (!payment) return;
    await getBrandingSettings();
    const doc = new jsPDF();
    const headerHeight = addHeader(doc, 'Payment Receipt / Acknowledgment');

    const startY = headerHeight + 10;
    const rcptId = payment._id?.slice(-8).toUpperCase() || 'N/A';

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9);
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
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { fontStyle: 'bold', halign: 'left', width: 60 },
            1: { halign: 'left' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 12;
    const formattedAmount = formatIndianCurrency(payment.amount || 0);

    renderAmountBox(doc, 110, finalY, 85, 20, 'Total Amount Paid:', formattedAmount);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.textMuted);
    const disclaimer = "This is an official system-generated receipt. Subject to final bank clearance.";
    doc.text(disclaimer, 15, finalY + 38);

    addSignatureAndSeal(doc, finalY + 25);
    addFooter(doc);

    const historyMetadata = {
        documentType: 'Payment Receipt',
        documentNumber: `RCPT-${rcptId}`,
        customerId: payment.customerId?._id || payment.customerId || null,
        projectId: payment.projectId?._id || payment.projectId || null,
        totalAmount: payment.amount || 0,
        status: payment.status || 'Verified',
        data: payment
    };
    savePDF(doc, `Receipt_${rcptId}.pdf`, historyMetadata);
};
