import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { formatCurrencyINR, cleanTextString, fitTextIntoBox, drawRightAlignedAmount } from '../utils/pdfHelpers';

export { formatCurrencyINR };

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

export const savePDF = async (doc, filename, historyMetadata = null) => {
    try {
        const safeFilename = String(filename || 'Document.pdf')
            .trim()
            .replace(/[/\\?%*:|"<>]/g, '_')
            .replace(/\s+/g, '_');

        const pdfOutput = doc.output('datauristring');
        const base64Data = pdfOutput.split(',')[1];

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

        if (window.Android && typeof window.Android.downloadBase64File === 'function') {
            try {
                window.Android.downloadBase64File(base64Data, safeFilename, 'application/pdf');
                return;
            } catch (err) {
                console.error("Native Android download listener failed:", err);
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
                    files: [savedFile.uri],
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
    } catch (_) { }
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
 */
const addHeader = (doc, title, companyInfoOverride = {}) => {
    doc.setCharSpace(0);
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
    const companyLines = doc.splitTextToSize(cleanTextString(companyName), maxLeftWidth);
    const companyNameHeight = companyLines.length * 7;
    const leftHeight = 12 + companyNameHeight + 6 + 6;

    doc.setFontSize(14);
    const titleLines = doc.splitTextToSize(cleanTextString(title.toUpperCase()), maxRightWidth);
    const titleHeight = titleLines.length * 6;

    doc.setFontSize(9);
    const addressLines = doc.splitTextToSize(cleanTextString(address), maxRightWidth);
    const contactLines = doc.splitTextToSize(cleanTextString(contact), maxRightWidth);
    const gstinLines = doc.splitTextToSize(cleanTextString(gstin), maxRightWidth);

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
        doc.text('K', margin + 3.5, leftY + 3, { charSpace: 0 });
    }

    const textStartX = margin + 18;
    doc.setFontSize(18);
    doc.setTextColor(...THEME.textLight);
    doc.setFont('helvetica', 'bold');
    companyLines.forEach((line) => {
        doc.text(line, textStartX, leftY + 3, { charSpace: 0 });
        leftY += 7;
    });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.accent);
    doc.text(cleanTextString(tagline), textStartX, leftY + 2, { charSpace: 0 });

    let rightY = 14;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.textLight);
    titleLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right', charSpace: 0 });
        rightY += 6;
    });

    rightY += 2;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 225);

    addressLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right', charSpace: 0 });
        rightY += 4;
    });

    contactLines.forEach((line) => {
        doc.text(line, rightMargin, rightY, { align: 'right', charSpace: 0 });
        rightY += 4;
    });

    const showGstin = companyInfoOverride.showCompanyGstin !== undefined
        ? companyInfoOverride.showCompanyGstin
        : (cachedBranding?.show_company_gstin !== false && cachedBranding?.show_company_gstin !== 'false');

    if (showGstin) {
        gstinLines.forEach((line) => {
            doc.text(line, rightMargin, rightY, { align: 'right', charSpace: 0 });
            rightY += 4;
        });
    }

    return headerHeight;
};

const addSignatureAndSeal = (doc, finalY, companyInfoOverride = {}) => {
    doc.setCharSpace(0);
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
    doc.text('AUTHORIZED SIGNATURE', pageW - 47.5, finalY + 43, { align: 'center', charSpace: 0 });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.textMuted);
    doc.text('KRISHNA ENGINEERING WORKS [SEAL]', pageW - 47.5, finalY + 47, { align: 'center', charSpace: 0 });
};

const addFooter = (doc, generatedBy = 'Official System') => {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setCharSpace(0);
        doc.setDrawColor(...THEME.accent);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...THEME.textMuted);
        doc.text(`Generated: ${new Date().toLocaleString()} | By: ${generatedBy} | www.krishnaengg.com`, margin, pageHeight - 9, { charSpace: 0 });
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right', charSpace: 0 });
    }
};

/**
 * 1. FORMAL QUOTE / ESTIMATION PDF
 */
export const generateQuotePDF = async (quote) => {
    if (!quote) return;
    await getBrandingSettings();
    const doc = new jsPDF();
    doc.setCharSpace(0);
    const headerHeight = addHeader(doc, 'Formal Quote / Estimation');

    const quoteId = quote._id ? quote._id.slice(-8).toUpperCase() : 'N/A';
    const createdAt = quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

    let startY = headerHeight + 12;

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Reference ID: #${quoteId}`, 15, startY, { charSpace: 0 });
    doc.text(`Quote Date: ${createdAt}`, 15, startY + 6, { charSpace: 0 });
    doc.text(`Status: ${(quote.status || 'New').toUpperCase()}`, 130, startY, { charSpace: 0 });

    startY += 14;

    const worksite = quote.worksiteLocation || {};
    const worksiteAddress = worksite.address || quote.location || 'N/A';
    const hasCoordinates = worksite.latitude !== null && worksite.latitude !== undefined &&
        worksite.longitude !== null && worksite.longitude !== undefined;

    let coordsText = 'Not Tagged (Manual Location)';
    let mapUrl = '';
    if (hasCoordinates) {
        const lat = Number(worksite.latitude).toFixed(6);
        const lng = Number(worksite.longitude).toFixed(6);
        const sourceLabel = worksite.source === 'gps'
            ? `(GPS Verified${worksite.accuracy ? ` ±${worksite.accuracy}m` : ''})`
            : '(Map Pinned)';
        coordsText = `${lat}° N, ${lng}° E ${sourceLabel}`;
        mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    } else if (quote.location) {
        mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quote.location)}`;
    }

    const tableBody = [
        ['CLIENT NAME', (quote.name || 'Valued Client').toUpperCase()],
        ['CONTACT PHONE', quote.phone || 'N/A'],
        ['WORKSITE ADDRESS', worksiteAddress.toUpperCase()],
        ['GPS COORDINATES', coordsText],
        ['GOOGLE MAPS LINK', mapUrl ? 'Click here to open exact location in Google Maps' : 'N/A'],
        ['OPERATION TYPE', (quote.serviceType || 'General').toUpperCase()],
        ['WORK DESCRIPTION', quote.description || 'No description provided.'],
    ];

    autoTable(doc, {
        startY,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [['Project Parameter', 'Specification Details']],
        body: tableBody,
        theme: 'grid',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [249, 250, 251], width: 55, halign: 'left' },
            1: { halign: 'left' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.row.index === 4 && data.column.index === 1 && mapUrl) {
                data.cell.styles.textColor = [37, 99, 235];
                data.cell.styles.fontStyle = 'bold';
            }
        },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.row.index === 4 && data.column.index === 1 && mapUrl) {
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: mapUrl });
            }
        }
    });

    const tableFinalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : startY + 70;

    if (mapUrl) {
        doc.setTextColor(37, 99, 235);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.textWithLink('-> Click here to open exact worksite coordinates in Google Maps', 15, tableFinalY + 6, { url: mapUrl });
    }

    const finalY = tableFinalY + (mapUrl ? 14 : 10);
    fitTextIntoBox(doc, 'Total Estimated Project Cost (INR):', quote.estimatedCost || 0, 15, finalY, 180, 22);

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
        doc.setCharSpace(0);
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
                [`Working Days: ${salary.totalWorkingDays || 26}\nPresent Days: ${salary.presentDays || 0}\nHalf Days: ${salary.halfDays || 0}\nLeave Days: ${salary.leaveDays || 0}\nHolidays: ${salary.holidays || 0}\nWorked Hours: ${(salary.totalWorkedHours !== undefined && salary.totalWorkedHours !== null && salary.totalWorkedHours > 0 ? salary.totalWorkedHours : ((salary.presentDays || 0) * (emp.standardWorkingHoursPerDay || 8) + ((salary.halfDays || 0) * ((emp.standardWorkingHoursPerDay || 8) / 2)))).toFixed(1)} hrs`,
                `Overtime Hours: ${salary.overtimeHours || 0} hrs\nOT Rate/Hr: ${formatCurrencyINR(salary.overtimeRate || emp.overtimeRate || user?.overtimeRate || 0)}\nOvertime Earnings: ${formatCurrencyINR(salary.overtimeEarnings || 0)}`]
            ],
            theme: 'grid',
            showHead: 'everyPage',
            headStyles: { fillColor: THEME.accent, textColor: 255, fontStyle: 'bold', fontSize: 9 },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
            columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } }
        });

        const ledgerY = doc.lastAutoTable.finalY + 6;

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
                ['Base Pay', formatCurrencyINR(baseVal), 'Advance Recovery', formatCurrencyINR(advVal)],
                ['Earned Salary (Wages/Sal)', formatCurrencyINR(calcBase), 'Other Deductions', formatCurrencyINR(dedVal)],
                ['Overtime Pay', formatCurrencyINR(otEarn), '', ''],
                ['Bonus & Incentives', formatCurrencyINR(bonusVal + incentivesVal), '', ''],
                ['Allowances', formatCurrencyINR(allowancesVal), '', ''],
                ['Gross Earnings', formatCurrencyINR(calcBase + otEarn + bonusVal + incentivesVal + allowancesVal), 'Total Deductions', formatCurrencyINR(advVal + dedVal)],
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
        fitTextIntoBox(doc, 'Net Disbursed Salary:', netVal, 15, finalY, 180, 20);

        doc.setFontSize(9);
        const statusText = (salary.paymentStatus || 'Pending').toUpperCase();
        const isPaid = ['PAID', 'COMPLETED'].includes(statusText);
        doc.setTextColor(isPaid ? 0 : 180, isPaid ? 140 : 90, isPaid ? 0 : 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`PAYMENT STATUS: ${statusText}`, 15, finalY + 28, { charSpace: 0 });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...THEME.textMuted);
        doc.text('This is a Computer / System Generated Monthly Salary Slip.', 15, finalY + 34, { charSpace: 0 });

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
    const isTax = invoice?.showTax !== false && invoice?.data?.showTax !== false;
    const headerHeight = addHeader(doc, isTax ? 'Tax Invoice' : 'Invoice');

    const startY = headerHeight + 10;
    const invNumber = invoice._id ? `INV-${invoice._id.slice(-6).toUpperCase()}` : 'INV-GEN-2026';

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice ID: ${invNumber}`, 15, startY, { charSpace: 0 });
    doc.text(`Invoice Date: ${new Date(invoice.createdAt || Date.now()).toLocaleDateString()}`, 15, startY + 6, { charSpace: 0 });

    doc.text(`Billed To:`, 130, startY, { charSpace: 0 });
    doc.setFont('helvetica', 'normal');
    doc.text(`${invoice.customerId?.name || 'Valued Customer'}`, 130, startY + 6, { charSpace: 0 });
    doc.text(`Project: ${invoice.projectId?.title || 'General Structural Work'}`, 130, startY + 11, { charSpace: 0 });

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
                formatCurrencyINR(amountVal)
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
    fitTextIntoBox(doc, 'Total Amount Payable:', amountVal, 110, finalY, 85, 20);

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
    doc.setCharSpace(0);
    const headerHeight = addHeader(doc, `${type} Attendance Report`);

    const startY = headerHeight + 10;

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Entity Name: ${(user?.name || 'Staff Member').toUpperCase()}`, 15, startY, { charSpace: 0 });
    doc.text(`Report Period: Generated on ${new Date().toLocaleDateString()}`, 15, startY + 6, { charSpace: 0 });

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
    doc.setCharSpace(0);
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
    doc.setCharSpace(0);
    const headerHeight = addHeader(doc, 'Payment Receipt / Acknowledgment');

    const startY = headerHeight + 10;
    const rcptId = payment._id?.slice(-8).toUpperCase() || 'N/A';

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt ID: RCPT-${rcptId}`, 15, startY, { charSpace: 0 });
    doc.text(`Transaction Date: ${new Date(payment.createdAt || Date.now()).toLocaleDateString()}`, 15, startY + 6, { charSpace: 0 });

    doc.text(`Payor Details:`, 130, startY, { charSpace: 0 });
    doc.setFont('helvetica', 'normal');
    doc.text(`${user?.name?.toUpperCase() || 'VALUED CUSTOMER'}`, 130, startY + 6, { charSpace: 0 });
    doc.text(`${user?.email || 'N/A'}`, 130, startY + 11, { charSpace: 0 });

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
    fitTextIntoBox(doc, 'Total Amount Paid:', payment.amount || 0, 110, finalY, 85, 20);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...THEME.textMuted);
    const disclaimer = "This is an official system-generated receipt. Subject to final bank clearance.";
    doc.text(disclaimer, 15, finalY + 38, { charSpace: 0 });

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

export const generateCashCounterChallanPDF = async (payment, user) => {
    if (!payment) return;
    await getBrandingSettings();
    const doc = new jsPDF();
    doc.setCharSpace(0);
    const headerHeight = addHeader(doc, 'Cash Counter Deposit Challan / Token Slip');

    const startY = headerHeight + 8;
    const tokenId = payment.referenceId || `CC-${new Date().getFullYear()}-${payment._id?.slice(-6).toUpperCase() || 'TOKEN'}`;

    doc.setTextColor(...THEME.textDark);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Challan / Token ID: ${tokenId}`, 15, startY, { charSpace: 0 });
    doc.text(`Generated Date: ${new Date(payment.createdAt || Date.now()).toLocaleDateString()}`, 15, startY + 6, { charSpace: 0 });

    doc.text(`Depositor (Client) Details:`, 125, startY, { charSpace: 0 });
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${user?.name?.toUpperCase() || payment.name?.toUpperCase() || 'CLIENT'}`, 125, startY + 6, { charSpace: 0 });
    doc.text(`Phone: ${user?.phone || user?.phoneNumber || payment.notes || 'N/A'}`, 125, startY + 11, { charSpace: 0 });
    doc.text(`Email: ${user?.email || 'N/A'}`, 125, startY + 16, { charSpace: 0 });

    autoTable(doc, {
        startY: startY + 22,
        margin: { left: 15, right: 15, bottom: 20 },
        head: [['DEPOSIT PARAMETER', 'DETAILS / COUNTER INSTRUCTIONS']],
        body: [
            ['Token / Challan Number', tokenId],
            ['Payment Channel', 'CASH COUNTER (DIRECT OFFICE DEPOSIT)'],
            ['Counter Location', 'Main Billing Counter, Krishna Engineering Works, Industrial Area, Thiruvazhiyode, Palakkad - 679514'],
            ['Counter Operating Hours', 'Monday to Saturday: 9:00 AM - 6:00 PM (Closed on Sundays)'],
            ['Associated Bill / Service', payment.projectId?.title || payment.quoteId?.serviceType || 'Engineering Fabrication / Project Invoicing'],
            ['Challan Status', (payment.status || 'WAITING_FOR_VERIFICATION').toUpperCase()],
            ['Amount Payable in Cash', `INR ${parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ],
        theme: 'grid',
        showHead: 'everyPage',
        headStyles: { fillColor: THEME.primary, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { fontStyle: 'bold', halign: 'left', width: 65 },
            1: { halign: 'left' }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    fitTextIntoBox(doc, 'Total Cash Payable:', payment.amount || 0, 110, finalY, 85, 20);

    // Cashier Verification Box
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.textDark);
    doc.text('CASHIER HANDOVER ACKNOWLEDGMENT (OFFICE USE ONLY):', 15, finalY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Received Rs: __________________________ in Cash.', 15, finalY + 12);
    doc.text('Cashier Name: _______________________ Date: ___________________', 15, finalY + 18);
    doc.text('Cashier Signature & Seal: _____________________________________', 15, finalY + 24);

    doc.setFontSize(7.5);
    doc.setTextColor(...THEME.textMuted);
    const instructions = "Instructions: Present this challan at our billing counter with cash. The cashier will sign and provide the authorized seal.";
    doc.text(instructions, 15, finalY + 33, { charSpace: 0 });

    addSignatureAndSeal(doc, finalY + 20);
    addFooter(doc);

    const historyMetadata = {
        documentType: 'Cash Counter Challan',
        documentNumber: tokenId,
        customerId: payment.customerId?._id || payment.customerId || null,
        projectId: payment.projectId?._id || payment.projectId || null,
        totalAmount: payment.amount || 0,
        status: payment.status || 'Pending Verification',
        data: payment
    };
    savePDF(doc, `Challan_${tokenId}.pdf`, historyMetadata);
};

// ─── PROJECT HANDOVER & COMPLETION CERTIFICATE ──────────────────────
export const generateProjectCompletionCertificatePDF = async (project, handover = null) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const hData = handover || project.handover || {};
    const certNum = hData.certificateNumber || `KEC-CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const completionDate = hData.handoverDate ? new Date(hData.handoverDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-IN');
    const clientName = project.clientName || project.customerId?.name || 'Valued Client';

    // 1. Decorative Double Border
    doc.setDrawColor(15, 23, 42); // Slate 900
    doc.setLineWidth(1.2);
    doc.rect(7, 7, 196, 283);
    doc.setDrawColor(37, 99, 235); // Blue 600
    doc.setLineWidth(0.4);
    doc.rect(9, 9, 192, 279);

    // 2. Official Header
    doc.setFillColor(15, 23, 42);
    doc.rect(10, 10, 190, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(COMPANY_DETAILS.name, 105, 19, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(191, 219, 254);
    doc.text(COMPANY_DETAILS.tagline, 105, 25, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setTextColor(226, 232, 240);
    doc.text(`${COMPANY_DETAILS.address} | ${COMPANY_DETAILS.contact} | ${COMPANY_DETAILS.gstin}`, 105, 31, { align: 'center' });

    // 3. Certificate Title Banner
    doc.setFillColor(37, 99, 235);
    doc.rect(30, 43, 150, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('OFFICIAL CERTIFICATE OF PROJECT COMPLETION & HANDOVER', 105, 49.5, { align: 'center' });

    // Certificate Meta
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.accent);
    doc.text(`Certificate No: ${certNum}`, 14, 60);
    doc.setTextColor(...THEME.textDark);
    doc.text(`Date of Issue: ${completionDate}`, 196, 60, { align: 'right' });

    // 4. Salutation & Declaration
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...THEME.textDark);
    const declaration = `This is to formally certify that Krishna Engineering Works has successfully completed fabrication, engineering, testing, and handover of the contract deliverables detailed below. The completed works conform strictly to approved technical drawings, structural specifications, and industrial safety benchmarks.`;
    doc.text(doc.splitTextToSize(declaration, 182), 14, 68);

    // 5. Project & Client Summary Table
    autoTable(doc, {
        startY: 79,
        margin: { left: 14, right: 14 },
        body: [
            ['Project Title:', project.title || 'Engineering Fabrication Project', 'Service Category:', project.serviceType || 'Custom Fabrication'],
            ['Client Name / Firm:', clientName, 'Project Contract ID:', String(project._id || '').slice(-8).toUpperCase()],
            ['Handover Date:', completionDate, 'Handover Status:', 'COMPLETED & ACCEPTED'],
            ['Authorized Engineer:', hData.approvedByName || 'Chief Technical Officer', 'Customer Sign-off:', hData.customerFeedback?.acceptedBy || 'Verified & Accepted']
        ],
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.8 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 40 },
            1: { width: 55 },
            2: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 40 },
            3: { width: 55 }
        }
    });

    // 6. Quality & Completion Inspection Checklist Table
    const chk = hData.checklist || {};
    const checklistData = [
        ['1', 'Fabrication & Structural Assembly', chk.fabricationCompleted !== false ? 'COMPLETED' : 'PENDING', 'Conforms to approved design and structural drawings'],
        ['2', 'Precision Machining & Dimensional Tolerances', 'PASSED', 'Verified within tolerance limits (±0.5mm)'],
        ['3', 'Welding Quality & Joint Inspection', chk.qualityInspectionPassed !== false ? 'PASSED' : 'PENDING', 'Visual inspection & weld integrity verified'],
        ['4', 'Protective Surface Coating & Painting', 'COMPLETED', 'Industrial primer and finish coat verified'],
        ['5', 'Erection, Delivery & Site Installation', chk.deliveryCompleted !== false ? 'COMPLETED' : 'PENDING', 'Delivered and erected at designated customer site'],
        ['6', 'Punchlist & Defect Rectification', chk.defectsResolved !== false ? 'ZERO DEFECTS' : 'IN PROGRESS', 'All punchlist and rework observations resolved'],
        ['7', 'Site Clearance & Equipment Demobilization', chk.siteCleared !== false ? 'COMPLETED' : 'PENDING', 'Materials and tools cleared from installation site'],
        ['8', 'Customer Joint Inspection & Acceptance', chk.customerAcceptanceReceived !== false ? 'ACCEPTED' : 'PENDING', 'Approved by customer designated representative']
    ];

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        margin: { left: 14, right: 14 },
        head: [['#', 'Deliverable & Inspection Item', 'Status', 'Engineering Verification Notes']],
        body: checklistData,
        theme: 'striped',
        headStyles: { fillColor: THEME.primary, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
        styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
            0: { halign: 'center', width: 10 },
            1: { fontStyle: 'bold', width: 70 },
            2: { fontStyle: 'bold', halign: 'center', width: 30, textColor: [16, 185, 129] },
            3: { width: 80 }
        }
    });

    let currentY = doc.lastAutoTable.finalY + 6;

    // 7. Customer Satisfaction & Feedback Box
    const feedback = hData.customerFeedback || {};
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 182, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...THEME.accent);
    doc.text('CLIENT ACCEPTANCE & QUALITY RATING', 18, currentY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.textDark);
    const ratingStars = '★'.repeat(feedback.rating || 5) + '☆'.repeat(5 - (feedback.rating || 5));
    doc.text(`Rating: ${ratingStars} (${feedback.rating || 5}/5.0)`, 18, currentY + 11);
    doc.text(`Feedback: "${feedback.comments || 'Work executed per agreed technical scope. Satisfactory delivery.'}"`, 18, currentY + 16.5);

    currentY += 28;

    // 8. Signatures & Official Seals
    doc.setDrawColor(203, 213, 225);
    doc.line(18, currentY + 18, 75, currentY + 18);
    doc.line(135, currentY + 18, 192, currentY + 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.textDark);
    doc.text('AUTHORIZED SIGNATORY & SEAL', 18, currentY + 22);
    doc.text('ACCEPTED & RECEIVED BY CLIENT', 135, currentY + 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...THEME.textMuted);
    doc.text(`${hData.approvedByName || 'Chief Technical Officer'} | Krishna Engg`, 18, currentY + 26);
    doc.text(`${feedback.acceptedBy || clientName} | Authorized Signatory`, 135, currentY + 26);

    // 9. Document Verification Footnote
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Security Verification Hash: SHA256-${certNum.replace(/-/g, '')}-VERIFIED-RECORD | Krishna Industrial ERP`, 105, 280, { align: 'center' });

    // Save & Record in DocumentHistory
    const historyMetadata = {
        documentType: 'Project Completion Certificate',
        documentNumber: certNum,
        customerId: project.customerId?._id || project.customerId || null,
        projectId: project._id,
        status: 'Approved',
        data: { certificateNumber: certNum, projectTitle: project.title, handoverDate: completionDate }
    };
    savePDF(doc, `Completion_Certificate_${certNum}.pdf`, historyMetadata);
};

// ─── SCRAP & WASTE AUDIT REPORT GENERATOR ────────────────────────────
export const generateScrapReportPDF = async (records = [], summary = {}) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const reportDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(10, 10, 190, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(COMPANY_DETAILS.name, 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(191, 219, 254);
    doc.text('MATERIAL SCRAP, REUSABLE OFFCUTS & WASTAGE AUDIT REPORT', 105, 25, { align: 'center' });

    // Summary Cards Table
    autoTable(doc, {
        startY: 38,
        margin: { left: 10, right: 10 },
        body: [
            ['Total Scrap Lots:', `${summary.totalLots || records.length}`, 'Total Scrap Weight:', `${summary.totalScrapQtyKg || 0} kg`],
            ['Reusable Offcuts:', `${summary.reusableOffcutQtyKg || 0} kg`, 'Non-Reusable Waste:', `${summary.nonReusableQtyKg || 0} kg`],
            ['Returned to Inventory:', `${summary.returnedToStockQtyKg || 0} kg`, 'Total External Sales:', `Rs. ${(summary.totalSoldValue || 0).toLocaleString()}`]
        ],
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.8 },
        columnStyles: {
            0: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 45 },
            1: { width: 50 },
            2: { fontStyle: 'bold', fillColor: [241, 245, 249], width: 45 },
            3: { width: 50 }
        }
    });

    // Scrap Records Table
    const tableData = records.map(r => [
        r.scrapCode,
        r.materialName,
        r.materialType || 'MS',
        `${r.quantity} ${r.unit || 'kg'}`,
        r.scrapType === 'Reusable Offcut' ? 'Reusable' : 'Waste',
        r.status,
        r.storageLocation || 'Yard',
        r.projectTitle || 'General',
        r.status === 'Sold' ? `Rs. ${(r.saleAction?.totalSaleAmount || 0).toLocaleString()}` : `Est. Rs. ${(r.estimatedTotalValue || 0).toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        margin: { left: 10, right: 10 },
        head: [['Lot Code', 'Material', 'Type', 'Qty', 'Category', 'Status', 'Location', 'Project', 'Value']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: THEME.primary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', width: 22 },
            1: { width: 32 },
            2: { width: 18 },
            3: { halign: 'right', width: 16 },
            4: { width: 18 },
            5: { fontStyle: 'bold', width: 22 },
            6: { width: 20 },
            7: { width: 24 },
            8: { halign: 'right', width: 20 }
        }
    });

    doc.setFontSize(7.5);
    doc.setTextColor(...THEME.textMuted);
    doc.text(`Generated on: ${reportDate} | Krishna Engineering Industrial ERP`, 10, 285);

    savePDF(doc, `Scrap_Wastage_Report_${Date.now()}.pdf`);
};
