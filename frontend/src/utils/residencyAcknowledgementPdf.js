import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { savePDF } from '../services/pdfService';

// ─── jsPDF-safe Indian Currency Formatter (Rs. prefix — ₹ not in Helvetica) ──
export const formatINR = (amount) => {
    if (amount == null || isNaN(amount)) return 'Rs.0.00';
    return 'Rs.' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatINRDisplay = (amount) => {
    if (amount == null || isNaN(amount)) return '₹0.00';
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

// ─── Status badge colors ──────────────────────────────────────────────────────
const STATUS_COLORS = {
    ACTIVE:        { bg: [16, 185, 129], text: [255, 255, 255], hex: '#10b981' },
    CANCELLED:     { bg: [239, 68, 68],  text: [255, 255, 255], hex: '#ef4444' },
    'CHECKED OUT': { bg: [99, 102, 241], text: [255, 255, 255], hex: '#6366f1' },
    EXPIRED:       { bg: [245, 158, 11], text: [255, 255, 255], hex: '#f59e0b' },
    PENDING:       { bg: [148, 163, 184],text: [255, 255, 255], hex: '#94a3b8' },
};

// ─── 18 Statutory Terms & Conditions in Pure Malayalam (Zero Tamil characters) ──
export const RESIDENCY_TERMS_ML = [
    {
        id: 1,
        title: "പ്രതിമാസ വാടക",
        text: (d) => `പ്രതിമാസ വാടക ${formatINRDisplay(d?.room?.monthlyRent || d?.booking?.totalAmount)} ആയിരിക്കും. ഓരോ മാസവും ${d?.booking?.dueDay || 5}-ാം തീയതിക്കകം വാടക അടയ്ക്കണം.`
    },
    {
        id: 2,
        title: "വാടക രസീത് & ബാങ്ക് ഇടപാട് രേഖ",
        text: () => "വാടക അടച്ചാൽ വീടുടമയിൽനിന്ന് രസീത് വാങ്ങണം. ബാങ്ക് വഴി പണമടച്ചാൽ ഇടപാടിന്റെ രേഖ സൂക്ഷിക്കണം. കേരള കെട്ടിടങ്ങൾ (പാട്ടവും വാടക നിയന്ത്രണവും) നിയമം, 1965-ലെ 9-ാം വകുപ്പ് വാടക രസീതിനെക്കുറിച്ചുള്ള വ്യവസ്ഥ ഉൾക്കൊള്ളുന്നു."
    },
    {
        id: 3,
        title: "യൂട്ടിലിറ്റി ചെലവുകൾ",
        text: () => "വൈദ്യുതി, വെള്ളം, പാചകവാതകം, ഇന്റർനെറ്റ് എന്നിവയ്ക്കുള്ള ചെലവുകൾ വാടകക്കാരൻ കൃത്യമായി അടയ്ക്കണം."
    },
    {
        id: 4,
        title: "താമസാവശ്യം മാത്രം (ഉപവാടക നിരോധനം)",
        text: () => "വീട് താമസത്തിനായി മാത്രം ഉപയോഗിക്കണം. വീടുടമയുടെ എഴുത്തുപരമായ അനുമതിയില്ലാതെ വീട് മറ്റൊരാൾക്ക് വാടകയ്ക്ക് നൽകുകയോ വ്യാപാരാവശ്യത്തിന് ഉപയോഗിക്കുകയോ ചെയ്യരുത്."
    },
    {
        id: 5,
        title: "സുരക്ഷ & അയൽവാസികളുടെ സമാധാനം",
        text: () => "വീട്ടിലെത്തുന്നവർ കെട്ടിടത്തിന്റെ സുരക്ഷാനിയമങ്ങളും അയൽവാസികളുടെ സമാധാനവും പാലിക്കണം."
    },
    {
        id: 6,
        title: "നാശനഷ്ടങ്ങൾക്കുള്ള ബാധ്യത",
        text: () => "വാടകക്കാരന്റെയോ കൂടെ താമസിക്കുന്നവരുടെയോ അശ്രദ്ധമൂലം വീടിനോ വീട്ടുപകരണങ്ങൾക്കോ നാശനഷ്ടമുണ്ടായാൽ, അതിന്റെ ചെലവ് വാടകക്കാരൻ വഹിക്കണം. സാധാരണ ഉപയോഗംമൂലമുള്ള തേയ്മാനം ഇതിൽപ്പെടില്ല."
    },
    {
        id: 7,
        title: "തകരാറുകൾ അറിയിക്കൽ & അറ്റകുറ്റപ്പണികൾ",
        text: () => "വീടിനോ അതിലെ സൗകര്യങ്ങൾക്കോ തകരാർ സംഭവിച്ചാൽ വാടകക്കാരൻ ഉടൻ വീടുടമയെ അറിയിക്കണം. അറ്റകുറ്റപ്പണികളുടെ ഉത്തരവാദിത്വം വാടകക്കരാറിൽ വ്യക്തമാക്കണം."
    },
    {
        id: 8,
        title: "സുരക്ഷാനിക്ഷേപം (Security Deposit)",
        text: (d) => `${formatINRDisplay(d?.room?.securityDeposit || 0)} സുരക്ഷാനിക്ഷേപമായി സ്വീകരിച്ചിരിക്കുന്നു. വീട് ഒഴിയുമ്പോൾ കുടിശ്ശികയും വാടകക്കാരന്റെ ഉത്തരവാദിത്വത്തിലുള്ള നാശനഷ്ടങ്ങളും കണക്കാക്കിയശേഷം ബാക്കിയുള്ള തുക തിരികെ നൽകണം.`
    },
    {
        id: 9,
        title: "മുൻകൂർ അറിയിപ്പ് (Notice Period)",
        text: () => "വീട് ഒഴിയുന്നതിന് 15 ദിവസത്തെ മുൻകൂർ എഴുത്തുപരമായ അറിയിപ്പ് നൽകണം. വാടകക്കരാറിലെയും ബാധകമായ നിയമത്തിലെയും വ്യവസ്ഥകൾ പാലിക്കണം."
    },
    {
        id: 10,
        title: "താക്കോൽ കൈമാറൽ & കുടിശ്ശിക തീർക്കൽ",
        text: () => "വീട് ഒഴിയുമ്പോൾ എല്ലാ താക്കോലുകളും വീടുടമയ്ക്ക് തിരികെ നൽകണം. കുടിശ്ശിക വാടകയും മറ്റു ചെലവുകളും അടച്ചുതീർക്കണം. വൈദ്യുതി, വെള്ളം എന്നിവയുടെ മീറ്റർ അളവുകളും വീടിന്റെ അവസ്ഥയും കൈമാറ്റദിവസം രേഖപ്പെടുത്തണം."
    },
    {
        id: 11,
        title: "ഒഴിപ്പിക്കൽ നടപടിക്രമങ്ങൾ (നിയമം 11-ാം വകുപ്പ്)",
        text: () => "വാടകക്കാരനെ വീട്ടിൽനിന്ന് ഒഴിപ്പിക്കുന്നത് ബാധകമായ നിയമവും നടപടിക്രമവും അനുസരിച്ചായിരിക്കണം. കേരള കെട്ടിടങ്ങൾ (പാട്ടവും വാടക നിയന്ത്രണവും) നിയമം, 1965-ലെ 11-ാം വകുപ്പ് ഒഴിപ്പിക്കലുമായി ബന്ധപ്പെട്ട വ്യവസ്ഥകൾ ഉൾക്കൊള്ളുന്നു."
    },
    {
        id: 12,
        title: "കരാർ രജിസ്ട്രേഷൻ (സ്വത്ത് കൈമാറ്റ നിയമം)",
        text: () => "വാടകക്കാലാവധി ഒരു വർഷത്തിൽ കൂടുതലാണെങ്കിൽ വാടകക്കരാർ രജിസ്റ്റർ ചെയ്യേണ്ടതുണ്ടോ എന്ന് ഉറപ്പാക്കണം. സ്വത്ത് കൈമാറ്റ നിയമം, 1882-ലെ 106, 107 വകുപ്പുകൾ വാടകക്കാലാവധിയും കരാർ രജിസ്റ്റർ ചെയ്യലും സംബന്ധിച്ച വ്യവസ്ഥകൾ ഉൾക്കൊള്ളുന്നു."
    },
    {
        id: 13,
        title: "സുരക്ഷാപ്രശ്നങ്ങൾ ഉടൻ അറിയിക്കൽ",
        text: () => "വീട്ടിൽ തകരാറോ സുരക്ഷാപ്രശ്നമോ ഉണ്ടായാൽ വാടകക്കാരൻ ഉടൻ വീടുടമയെ അറിയിക്കണം."
    },
    {
        id: 14,
        title: "അനധികൃത സ്ഥിരതാമസം നിരോധനം",
        text: () => "വീടുടമയുടെ മുൻകൂർ എഴുത്തുപരമായ അനുമതിയില്ലാതെ മറ്റൊരാളെ വീട്ടിൽ സ്ഥിരമായി താമസിപ്പിക്കരുത്."
    },
    {
        id: 15,
        title: "പൂട്ടുകളും താക്കോലുകളും",
        text: () => "വീടുടമയുടെ അനുമതിയില്ലാതെ വീടിന്റെ പൂട്ടുകൾ മാറ്റുകയോ താക്കോലുകൾ മറ്റൊരാൾക്ക് കൈമാറുകയോ ചെയ്യരുത്."
    },
    {
        id: 16,
        title: "പൊതുവിടങ്ങൾ വൃത്തിയായി സൂക്ഷിക്കൽ",
        text: () => "പടിക്കെട്ട്, ഇടനാഴി, വാഹനങ്ങൾ നിർത്താനുള്ള സ്ഥലം തുടങ്ങിയ പൊതുവിടങ്ങളിൽ സ്വകാര്യസാധനങ്ങൾ വെക്കരുത്. അവ വൃത്തിയായും തടസ്സമില്ലാതെയും സൂക്ഷിക്കണം."
    },
    {
        id: 17,
        title: "അപകടകരമായ വസ്തുക്കളുടെ നിരോധനം & മാലിന്യനിക്ഷേപം",
        text: () => "തീപിടിക്കാവുന്നതോ അപകടമുണ്ടാക്കുന്നതോ ആയ വസ്തുക്കൾ വീട്ടിൽ സുരക്ഷിതമല്ലാത്ത രീതിയിൽ സൂക്ഷിക്കരുത്. മാലിന്യം നിശ്ചയിച്ച സ്ഥലത്ത് നിക്ഷേപിക്കണം."
    },
    {
        id: 18,
        title: "നിയമപരമായ ഉടമ്പടിയും പാലനവും",
        text: () => "ഈ വ്യവസ്ഥകൾ വാടകക്കരാറിനും ബാധകമായ നിയമങ്ങൾക്കും വിധേയമായിരിക്കും. വാടക, രസീത്, സുരക്ഷാനിക്ഷേപം, അറ്റകുറ്റപ്പണി, വീട് ഒഴിയൽ, കരാർ രജിസ്റ്റർ ചെയ്യൽ എന്നിവ സംബന്ധിച്ച വ്യവസ്ഥകൾ ഇരുകക്ഷികളും പാലിക്കണം."
    }
];

// ─── 18 Statutory Terms & Conditions in English ───────────────────────────────
export const RESIDENCY_TERMS_EN = [
    {
        id: 1,
        title: "Monthly Rent & Remittance",
        text: (d) => `Monthly rent shall be ${formatINR(d?.room?.monthlyRent || d?.booking?.totalAmount)}. Rent must be paid strictly on or before the ${d?.booking?.dueDay || 5}th of every calendar month.`
    },
    {
        id: 2,
        title: "Rent Receipt & Payment Records",
        text: () => "A formal rent receipt must be obtained from the owner upon remittance. For digital/bank transfers, payment records must be preserved. (Section 9 of the Kerala Buildings (Lease and Rent Control) Act, 1965 governs statutory rent receipt obligations)."
    },
    {
        id: 3,
        title: "Utility Charges",
        text: () => "Charges for electricity, water supply, cooking gas, and internet connectivity must be cleared promptly by the tenant as incurred."
    },
    {
        id: 4,
        title: "Permitted Residential Use Only",
        text: () => "The premises shall be used exclusively for private residential dwelling. Sub-letting or commercial operation without prior written consent from the owner is strictly prohibited."
    },
    {
        id: 5,
        title: "Safety & Neighborly Peace",
        text: () => "All occupants and invited visitors must adhere to building security protocols and ensure peaceful neighborhood relations are maintained."
    },
    {
        id: 6,
        title: "Damage & Loss Liability",
        text: () => "Any breakage or loss caused to the premises, furniture, or fittings due to negligence of the tenant or occupants must be borne by the tenant. Fair wear and tear from ordinary use is excluded."
    },
    {
        id: 7,
        title: "Defect Notification & Repairs",
        text: () => "Any structural, electrical, or plumbing defect must be notified immediately to the owner. Maintenance liabilities shall be executed as defined in the rental agreement."
    },
    {
        id: 8,
        title: "Security Deposit",
        text: (d) => `A refundable security deposit of ${formatINR(d?.room?.securityDeposit || 0)} has been collected. Upon vacating, the balance deposit will be refunded after adjusting pending dues and tenant-caused damage.`
    },
    {
        id: 9,
        title: "Notice Period for Vacating",
        text: () => "A minimum of 15 days prior written notice is mandatory before vacating the premises, in full compliance with lease terms and tenancy statutes."
    },
    {
        id: 10,
        title: "Key Handover & Final Settlement",
        text: () => "Upon vacating, all room keys must be surrendered to the owner. All arrears must be settled, and utility meter readings and room inspection condition recorded on the handover date."
    },
    {
        id: 11,
        title: "Statutory Eviction Procedures",
        text: () => "Any eviction of the tenant shall proceed strictly in accordance with applicable laws and due process under Section 11 of the Kerala Buildings (Lease and Rent Control) Act, 1965."
    },
    {
        id: 12,
        title: "Lease Term & Registration",
        text: () => "Where the rental tenure exceeds one year, compulsory registration of the lease deed must be ensured as required under Sections 106 and 107 of the Transfer of Property Act, 1882."
    },
    {
        id: 13,
        title: "Emergency & Hazard Alerts",
        text: () => "Any safety hazard, defect, or emergency arising on the premises must be communicated without delay to the property management."
    },
    {
        id: 14,
        title: "No Unauthorized Permanent Occupancy",
        text: () => "No additional individuals may take up permanent residence without prior written sanction from the owner."
    },
    {
        id: 15,
        title: "Locks & Key Security",
        text: () => "Door lock cylinders must not be altered, replaced, or duplicate keys handed over to third parties without prior owner authorization."
    },
    {
        id: 16,
        title: "Common Area Regulations",
        text: () => "Staircases, corridors, lobbies, and parking spaces must be kept clear of private goods, fully clean, and unobstructed at all times."
    },
    {
        id: 17,
        title: "Hazardous Materials & Waste Disposal",
        text: () => "Inflammable, explosive, or hazardous materials must never be stored on the premises. Domestic waste must be deposited solely in designated bins."
    },
    {
        id: 18,
        title: "Governing Law & Mutual Covenant",
        text: () => "These terms form an integral part of the residency covenant and remain subject to applicable tenancy laws. Both lessor and lessee agree to honor all stipulations unconditionally."
    }
];

// ─── Generate QR Code as PNG dataURL via qrcode.react canvas helper ──────────
const generateQRDataUrl = async (bookingId) => {
    const verifyUrl = `${window.location.origin}${window.location.pathname}#/lodge/verify-booking/${bookingId}`;
    try {
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

// ─── Helper formatters to prevent squashed / run-together contact text ────────
export const cleanLodgeName = (name) => {
    if (!name) return 'Krishna Building & Residency';
    let s = String(name).trim();
    if (s.toLowerCase() === 'krishnabuilding') return 'Krishna Building';
    if (s.toLowerCase() === 'krishnacomplex') return 'Krishna Complex';
    return s.replace(/([a-z])([A-Z])/g, '$1 $2');
};

export const cleanContactAddress = (addr) => {
    if (!addr) return 'Krishna Complex, Site A, Kuttanassery, Palakkad, Kerala 679514';
    let s = String(addr).trim();
    s = s
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/krishnabuilding/gi, 'Krishna Building, ')
        .replace(/krishnacomplex/gi, 'Krishna Complex, ')
        .replace(/krishna\s*building/gi, 'Krishna Building, ')
        .replace(/krishna\s*complex/gi, 'Krishna Complex, ')
        .replace(/kuttanassery/gi, 'Kuttanassery, ')
        .replace(/palakkad/gi, 'Palakkad, ')
        .replace(/(kerala|kerela)/gi, 'Kerala')
        .replace(/\s*,\s*/g, ', ')
        .replace(/(,\s*)+/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
    return s || 'Krishna Complex, Site A, Kuttanassery, Palakkad, Kerala 679514';
};

export const cleanContactEmail = (email) => {
    if (!email) return 'support@krishnaengg.com';
    let s = String(email).trim();
    if (!s.includes('.') && s.toLowerCase().includes('com')) {
        s = s.replace(/com$/i, '.com');
    }
    return s;
};

export const cleanContactWebsite = (web) => {
    if (!web) return 'www.krishnaengg.com';
    let s = String(web).trim();
    if (!s.startsWith('http://') && !s.startsWith('https://')) {
        if (!s.startsWith('www.')) {
            s = s.replace(/^www/i, 'www.');
        }
    }
    if (!s.includes('.com') && s.toLowerCase().includes('com')) {
        s = s.replace(/com$/i, '.com');
    }
    return s;
};

// ─── Preload & verify Unicode Malayalam and Inter fonts ───────────────────────
export const ensureFontsLoaded = async () => {
    if (typeof document === 'undefined') return;
    try {
        const fontLinkId = 'krishna-malayalam-font-link';
        if (!document.getElementById(fontLinkId)) {
            const link = document.createElement('link');
            link.id = fontLinkId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Malayalam:wght@400;500;600;700;800;900&display=swap';
            document.head.appendChild(link);
        }
        if (document.fonts) {
            await Promise.race([
                Promise.all([
                    document.fonts.load('400 12px "Noto Sans Malayalam"'),
                    document.fonts.load('700 12px "Noto Sans Malayalam"'),
                    document.fonts.load('800 12px "Noto Sans Malayalam"'),
                    document.fonts.load('600 12px "Inter"'),
                    document.fonts.ready
                ]),
                new Promise(res => setTimeout(res, 2000))
            ]);
        }
    } catch (err) {
        console.warn('[PDF] ensureFontsLoaded warning:', err);
    }
};

// ─── HTML Generator for Native Printing & Retina Malayalam Rendering ─────────
export const generateResidencyAcknowledgementHTML = (data, language = 'ml', qrDataUrl = '') => {
    const { booking, tenant, room, lodge } = data;
    const isMl = language === 'ml';
    const terms = isMl ? RESIDENCY_TERMS_ML : RESIDENCY_TERMS_EN;
    const docStatus = booking?.docStatus || 'ACTIVE';
    const statusHex = STATUS_COLORS[docStatus]?.hex || '#10b981';

    const facilities = [];
    const f = room?.facilities || {};
    const facilityMap = { wifi: 'Wi-Fi', parking: 'Parking', laundry: 'Laundry', electricity: '24h Electricity', water: 'Water Supply', housekeeping: 'Housekeeping', food: 'Food Service', ac: 'Air Conditioning', tv: 'Television', security: 'Security' };
    Object.entries(facilityMap).forEach(([k, v]) => { if (f[k]) facilities.push(v); });
    if (room?.amenities?.length) facilities.push(...room.amenities);

    const address = cleanContactAddress(lodge?.address);
    const phone = lodge?.phone || '+91 98765 43210';
    const email = cleanContactEmail(lodge?.email);
    const website = cleanContactWebsite(lodge?.website);

    return `<!DOCTYPE html>
<html lang="${isMl ? 'ml' : 'en'}">
<head>
    <meta charset="utf-8">
    <title>Residency Acknowledgement - ${booking?.agreementNumber || 'Agreement'}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Malayalam:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            letter-spacing: normal !important;
            word-spacing: normal !important;
        }
        body {
            font-family: 'Inter', 'Noto Sans Malayalam', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            color: #1e293b;
            background: #ffffff;
            font-size: 10px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
            letter-spacing: normal !important;
            word-spacing: normal !important;
            font-variant-ligatures: normal;
        }
        .pdf-document {
            width: 794px;
            background: #ffffff;
            margin: 0 auto;
        }
        .pdf-page {
            width: 794px;
            min-height: 1123px;
            max-height: 1123px;
            padding: 24px 34px;
            background: #ffffff;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            position: relative;
        }
        .page-content {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        @media print {
            @page {
                size: A4 portrait;
                margin: 0;
            }
            body {
                margin: 0;
                padding: 0;
                background: #ffffff;
            }
            .pdf-document {
                width: 100%;
                max-width: none;
            }
            .pdf-page {
                width: 210mm;
                min-height: 297mm;
                max-height: 297mm;
                padding: 12mm 15mm;
                page-break-after: always;
                break-after: page;
                box-sizing: border-box;
            }
            .pdf-page:last-child {
                page-break-after: avoid;
                break-after: avoid;
            }
        }

        /* ── Header ── */
        .header {
            background: #0f172a;
            color: #ffffff;
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
        }
        .header-left {
            flex: 1;
            min-width: 0;
        }
        .status-badge {
            display: inline-block;
            background: ${statusHex};
            color: #ffffff;
            font-weight: 800;
            font-size: 8.5px;
            padding: 3px 10px;
            border-radius: 5px;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        .header-title {
            font-size: 19px;
            font-weight: 900;
            color: #ffffff;
            line-height: 1.2;
            margin-bottom: 3px;
        }
        .header-sub {
            font-size: 9.5px;
            color: #94a3b8;
            font-weight: 700;
            line-height: 1.3;
        }
        .header-right {
            flex-shrink: 0;
        }
        .meta-table {
            border-collapse: collapse;
            font-size: 9px;
            line-height: 1.5;
        }
        .meta-table td {
            padding: 1px 4px;
        }
        .meta-lbl {
            color: #94a3b8;
            font-weight: 600;
            text-align: right;
        }
        .meta-val {
            color: #ffffff;
            font-weight: 800;
            text-align: left;
            padding-left: 6px;
        }

        /* ── Lodge Info Bar ── */
        .lodge-bar {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 9px;
            color: #475569;
            margin-bottom: 10px;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 6px 12px;
            font-weight: 600;
        }
        .lodge-item {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .lodge-sep {
            color: #94a3b8;
            font-size: 9px;
            font-weight: 900;
        }

        /* ── 2-Column Section Tables ── */
        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 10px;
        }
        .section-box {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            background: #ffffff;
        }
        .section-header {
            background: #1e293b;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 800;
            padding: 6px 10px;
            text-transform: uppercase;
        }
        table.info-table {
            width: 100%;
            table-layout: fixed;
            border-collapse: collapse;
            font-size: 9.5px;
        }
        table.info-table tr {
            border-bottom: 1px solid #f1f5f9;
        }
        table.info-table tr:last-child {
            border-bottom: none;
        }
        table.info-table td {
            padding: 5.5px 8px;
            vertical-align: middle;
            line-height: 1.4;
        }
        table.info-table td.label {
            width: 44%;
            background: #f8fafc;
            color: #475569;
            font-weight: 700;
            font-size: 9px;
            white-space: normal;
            word-break: keep-all;
        }
        table.info-table td.value {
            width: 56%;
            color: #0f172a;
            font-weight: 600;
            word-break: break-word;
        }
        .muted-text {
            color: #64748b;
            font-weight: 500;
        }
        .pill-id {
            color: #334155;
            font-weight: 700;
        }

        /* ── Financial Grid ── */
        .financial-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            background: #f8fafc;
            padding: 10px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
            margin-bottom: 10px;
        }
        .fin-item {
            text-align: center;
            background: #ffffff;
            padding: 7px 4px;
            border-radius: 8px;
            border: 1px solid #f1f5f9;
        }
        .fin-item .lbl {
            font-size: 8px;
            color: #64748b;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 3px;
        }
        .fin-item .val {
            font-size: 12px;
            color: #0f172a;
            font-weight: 900;
        }
        .status-pill {
            display: inline-block;
            padding: 2px 7px;
            border-radius: 5px;
            font-size: 8.5px;
            font-weight: 800;
        }
        .status-paid { background: #dcfce7; color: #15803d; }
        .status-due { background: #fee2e2; color: #b91c1c; }

        /* ── Facilities ── */
        .facilities-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            padding: 6px 8px;
            background: #f8fafc;
        }
        .fac-badge {
            background: #e0e7ff;
            color: #3730a3;
            font-weight: 700;
            font-size: 8.5px;
            padding: 2px 7px;
            border-radius: 5px;
        }

        /* ── Tenancy Covenant Box ── */
        .covenant-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #2563eb;
            border-radius: 8px;
            padding: 8px 12px;
            margin-top: 4px;
            font-size: 8.5px;
            line-height: 1.45;
        }
        .covenant-title {
            font-weight: 800;
            color: #1e3a8a;
            margin-bottom: 2px;
        }
        .covenant-text {
            color: #475569;
            font-weight: 500;
        }

        /* ── Page 2 Repeated Header ── */
        .repeated-header {
            background: #0f172a;
            color: #ffffff;
            padding: 10px 16px;
            border-radius: 10px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .repeated-title {
            font-size: 11.5px;
            font-weight: 800;
        }
        .repeated-sub {
            font-size: 8.5px;
            color: #94a3b8;
            font-weight: 600;
            margin-top: 1px;
        }
        .repeated-meta {
            font-size: 8.5px;
            color: #cbd5e1;
            text-align: right;
            line-height: 1.4;
        }
        .repeated-meta strong {
            color: #ffffff;
        }

        /* ── 18 Terms Grid ── */
        .terms-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 10px;
            margin-bottom: 10px;
        }
        .term-card {
            border-left: 3px solid #2563eb;
            padding: 4px 8px;
            background: #f8fafc;
            border-radius: 0 6px 6px 0;
            font-size: 8px;
            line-height: 1.35;
            border-top: 1px solid #f1f5f9;
            border-right: 1px solid #f1f5f9;
            border-bottom: 1px solid #f1f5f9;
        }
        .term-title {
            font-weight: 800;
            color: #1e293b;
            font-size: 8.5px;
            margin-bottom: 2px;
        }
        .term-desc {
            color: #334155;
            font-weight: 500;
        }

        /* ── Signatures Area ── */
        .sign-area {
            display: grid;
            grid-template-columns: 110px 1fr 1fr;
            gap: 10px;
            margin-bottom: 8px;
        }
        .qr-box {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 6px;
            text-align: center;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .qr-box img {
            width: 72px;
            height: 72px;
            display: block;
            margin-bottom: 3px;
        }
        .qr-box span {
            font-size: 7.5px;
            color: #64748b;
            font-weight: 700;
            display: block;
        }
        .sign-box {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 10px;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #f8fafc;
            min-height: 94px;
        }
        .sign-box.seal {
            background: #eff6ff;
            border-color: #bfdbfe;
        }
        .sign-box.auth {
            background: #f0fdf4;
            border-color: #bbf7d0;
        }
        .sign-title {
            font-weight: 800;
            font-size: 9px;
            color: #1e3a8a;
        }
        .sign-subtitle {
            font-size: 8px;
            color: #64748b;
            font-weight: 600;
        }
        .sign-line {
            border-top: 1px dashed #94a3b8;
            margin: 10px 12px 3px 12px;
        }

        /* ── Tenant Acknowledgement ── */
        .tenant-ack-strip {
            background: #fffbeb;
            border: 1px solid #fef3c7;
            border-radius: 8px;
            padding: 6px 10px;
            font-size: 8px;
            line-height: 1.4;
            margin-bottom: 8px;
        }
        .tenant-ack-title {
            font-weight: 800;
            color: #92400e;
            margin-bottom: 1px;
        }
        .tenant-ack-text {
            color: #78350f;
            font-weight: 500;
        }

        /* ── Page Footer ── */
        .page-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7.5px;
            color: #94a3b8;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="pdf-document">
        <!-- ════════════════ PAGE 1: CORE PARTICULARS ════════════════ -->
        <div class="pdf-page" id="page-1">
            <div class="page-content">
                <!-- Header -->
                <div class="header">
                    <div class="header-left">
                        <span class="status-badge">${docStatus}</span>
                        <div class="header-title">${cleanLodgeName(lodge?.name)}</div>
                        <div class="header-sub">${isMl ? 'ഔദ്യോഗിക&nbsp;വാടകക്കരാർ &amp;&nbsp;താമസ&nbsp;രസീത്' : 'OFFICIAL RESIDENCY ACKNOWLEDGEMENT / LEASE AGREEMENT'}</div>
                    </div>
                    <div class="header-right">
                        <table class="meta-table">
                            <tr><td class="meta-lbl">Agreement:</td><td class="meta-val">${booking?.agreementNumber || '-'}</td></tr>
                            <tr><td class="meta-lbl">Ref:</td><td class="meta-val">#${String(booking?._id || '').slice(-8).toUpperCase()}</td></tr>
                            <tr><td class="meta-lbl">Version:</td><td class="meta-val">v${booking?.acknowledgementVersion || 1}.0</td></tr>
                            <tr><td class="meta-lbl">Date:</td><td class="meta-val">${fmtDate(new Date()).replace(/\s+/g, '\u00A0')}</td></tr>
                        </table>
                    </div>
                </div>

                <!-- Lodge Info Bar -->
                <div class="lodge-bar">
                    <span class="lodge-item">${address}</span>
                    <span class="lodge-sep">•</span>
                    <span class="lodge-item">${phone}</span>
                    <span class="lodge-sep">•</span>
                    <span class="lodge-item">${email}</span>
                    <span class="lodge-sep">•</span>
                    <span class="lodge-item">${website}</span>
                </div>

                <!-- Tenant & Room Details -->
                <div class="grid-2">
                    <div class="section-box">
                        <div class="section-header">${isMl ? 'വാടകക്കാരന്റെ&nbsp;വിവരങ്ങൾ&nbsp;(TENANT&nbsp;DETAILS)' : 'TENANT / OCCUPANT DETAILS'}</div>
                        <table class="info-table">
                            <tr>
                                <td class="label">${isMl ? 'പേര്' : 'Tenant Name'}</td>
                                <td class="value"><strong>${tenant?.name || '-'}</strong></td>
                            </tr>
                            <tr>
                                <td class="label">${isMl ? 'രക്ഷിതാവ്' : 'Father / Guardian'}</td>
                                <td class="value">${tenant?.fatherName || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">${isMl ? 'ഫോൺ നമ്പർ' : 'Mobile'}</td>
                                <td class="value">${tenant?.phone || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">${isMl ? 'തിരിച്ചറിയൽ രേഖ' : 'Govt ID'}</td>
                                <td class="value"><span class="pill-id">${tenant?.govtIdType || 'Aadhaar Card'}:</span> &nbsp;<strong>${tenant?.govtIdNumber || 'N/A'}</strong></td>
                            </tr>
                            <tr>
                                <td class="label">${isMl ? 'മേൽവിലാസം' : 'Address'}</td>
                                <td class="value">${tenant?.address || '-'}</td>
                            </tr>
                            <tr>
                                <td class="label">${isMl ? 'അടിയന്തര ഫോൺ' : 'Emergency Contact'}</td>
                                <td class="value">${tenant?.emergencyPhone || tenant?.emergencyContact || '-'}</td>
                            </tr>
                        </table>
                    </div>

                    <div class="section-box">
                        <div class="section-header">${isMl ? 'മുറിയുടെ&nbsp;വിവരങ്ങൾ&nbsp;(ROOM&nbsp;DETAILS)' : 'ROOM & STAY DETAILS'}</div>
                        <table class="info-table">
                            <tr>
                                <td class="label">${isMl ? 'മുറി നമ്പർ' : 'Room Number'}</td>
                                <td class="value"><strong>Room&nbsp;${room?.roomNumber || 'N/A'}</strong> &nbsp;<span class="muted-text">(${room?.type || 'Standard'})</span></td>
                            </tr>
                            <tr>
                                <td class="label">${isMl ? 'കെട്ടിടം / നില' : 'Building / Floor'}</td>
                                <td class="value">${room?.building || 'Main Block'}, ${room?.floor || '1st Floor'}</td>
                            </tr>
                            <tr>
                                <td class="label">${isMl ? 'പ്രവേശന തീയതി' : 'Check-In Date'}</td>
                                <td class="value">${fmtDate(booking?.checkIn).replace(/\s+/g, '\u00A0')}</td>
                            </tr>
                            <tr>
                                <td class="label">${isMl ? 'കാലാവധി തീയതി' : 'Check-Out Date'}</td>
                                <td class="value">${fmtDate(booking?.checkOut).replace(/\s+/g, '\u00A0')} &nbsp;<span class="muted-text">(${booking?.daysTotal || '-'} Days)</span></td>
                            </tr>
                            ${booking?.actualCheckOut ? `
                            <tr>
                                <td class="label">${isMl ? 'യഥാർത്ഥ ഒഴിയൽ തീയതി' : 'Actual Check-Out'}</td>
                                <td class="value"><strong>${fmtDate(booking?.actualCheckOut)}</strong> &nbsp;<span class="muted-text">(${booking?.checkoutNotes || 'Cleared'})</span></td>
                            </tr>` : ''}
                            <tr>
                                <td class="label">${isMl ? 'വാടക ചക്രം' : 'Billing Cycle'}</td>
                                <td class="value">${booking?.paymentCycle || 'Monthly'}</td>
                            </tr>
                            <tr>
                                <td class="label">${isMl ? 'അടുത്ത അടവ് തീയതി' : 'Next Due Date'}</td>
                                <td class="value">${fmtDate(booking?.nextDueDate).replace(/\s+/g, '\u00A0')}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <!-- Financial Summary -->
                <div class="financial-grid">
                    <div class="fin-item">
                        <div class="lbl">${isMl ? 'പ്രതിമാസ വാടക' : 'Monthly Rent'}</div>
                        <div class="val">${formatINRDisplay(room?.monthlyRent || booking?.totalAmount)}</div>
                    </div>
                    <div class="fin-item">
                        <div class="lbl">${isMl ? 'സുരക്ഷാനിക്ഷേപം' : 'Security Deposit'}</div>
                        <div class="val">${formatINRDisplay(booking?.securityDeposit || room?.securityDeposit)}</div>
                    </div>
                    <div class="fin-item">
                        <div class="lbl">${isMl ? 'അടച്ച തുക' : 'Total Paid'}</div>
                        <div class="val" style="color: #15803d;">${formatINRDisplay(booking?.totalPaid)}</div>
                    </div>
                    <div class="fin-item">
                        <div class="lbl">${booking?.totalRefunded > 0 ? (isMl ? 'തിരികെ നൽകിയ തുക' : 'Refunded / Returned') : (isMl ? 'കുടിശ്ശിക / സ്റ്റാറ്റസ്' : 'Balance / Status')}</div>
                        <div class="val">
                            ${booking?.totalRefunded > 0 
                                ? `<span style="color:#b91c1c; font-weight:700;">- ${formatINRDisplay(booking?.totalRefunded)}</span>` 
                                : `<span class="status-pill ${(booking?.outstanding || 0) <= 0 ? 'status-paid' : 'status-due'}">
                                    ${(booking?.outstanding || 0) <= 0 ? (isMl ? '✓ പൂർണ്ണമായി അടച്ചു' : '✓ FULLY PAID') : `${isMl ? 'കുടിശ്ശിക:' : 'DUE:'} ${formatINRDisplay(booking?.outstanding)}`}
                                   </span>`
                            }
                        </div>
                    </div>
                </div>

                <!-- Facilities if present -->
                ${facilities.length > 0 ? `
                <div class="section-box" style="margin-bottom: 8px;">
                    <div class="section-header">${isMl ? 'ലഭ്യമായ സൗകര്യങ്ങൾ (FACILITIES & AMENITIES)' : 'ASSIGNED FACILITIES & AMENITIES'}</div>
                    <div class="facilities-list">
                        ${facilities.map(fac => `<span class="fac-badge">✓ ${fac}</span>`).join('')}
                    </div>
                </div>` : ''}

                <!-- Tenancy Covenant Summary Box -->
                <div class="covenant-box">
                    <div class="covenant-title">${isMl ? 'വാടക ഉടമ്പടി പ്രഖ്യാപനം (Tenancy Declaration):' : 'Official Tenancy Declaration:'}</div>
                    <div class="covenant-text">
                        ${isMl
                            ? 'ഈ രേഖ കൃഷ്ണ ബിൽഡിംഗും വാടകക്കാരനും തമ്മിലുള്ള ഔദ്യോഗിക വാടകക്കരാറിന്റെ ഒന്നാം ഭാഗമാണ്. കേരള കെട്ടിടങ്ങൾ (പാട്ടവും വാടക നിയന്ത്രണവും) നിയമം 1965, സ്വത്ത് കൈമാറ്റ നിയമം 1882 എന്നിവയിലെ വ്യവസ്ഥകൾക്ക് വിധേയമായി തയ്യാറാക്കിയ 18 നിയമപരമായ നിബന്ധനകളും വ്യവസ്ഥകളും പേജ് 2-ൽ ചേർത്തിരിക്കുന്നു.'
                            : 'This document represents Part 1 of the official Tenancy Agreement executed between Krishna Building and the Tenant. The 18 statutory tenancy clauses under the Kerala Buildings (Lease & Rent Control) Act 1965 and Transfer of Property Act 1882 are detailed on Page 2.'}
                    </div>
                </div>
            </div>

            <!-- Page 1 Footer -->
            <div class="page-footer">
                <span>Agr: <strong>${booking?.agreementNumber || '-'}</strong></span>
                <span>•</span>
                <span>Version: v${booking?.acknowledgementVersion || 1}.0</span>
                <span>•</span>
                <span>Page 1 of 2</span>
                <span>•</span>
                <span>${lodge?.name || 'Krishna Building'} • Official Residency Record</span>
            </div>
        </div>

        <!-- ════════════════ PAGE 2: 18 TERMS & EXECUTIONS ════════════════ -->
        <div class="pdf-page page-break" id="page-2">
            <div class="page-content">
                <!-- Repeated Header Banner -->
                <div class="repeated-header">
                    <div>
                        <div class="repeated-title">${isMl ? 'വാടകക്കരാർ&nbsp;നിബന്ധനകളും&nbsp;വ്യവസ്ഥകളും&nbsp;(18&nbsp;നിബന്ധനകൾ)' : 'TERMS & CONDITIONS OF RESIDENCY (18 STATUTORY CLAUSES)'}</div>
                        <div class="repeated-sub">${isMl ? 'കേരള കെട്ടിട വാടക നിയന്ത്രണ നിയമങ്ങൾക്കനുസൃതമായ വ്യവസ്ഥകൾ' : 'Statutory & Legally Binding Tenancy Regulations'}</div>
                    </div>
                    <div class="repeated-meta">
                        <div>Agr: <strong>${booking?.agreementNumber || '-'}</strong></div>
                        <div>Tenant: <strong>${tenant?.name || 'Occupant'}</strong></div>
                    </div>
                </div>

                <!-- 18 Terms in 2 Columns -->
                <div class="terms-grid">
                    ${terms.map(t => `
                        <div class="term-card">
                            <div class="term-title">${t.id}. ${t.title}</div>
                            <div class="term-desc">${typeof t.text === 'function' ? t.text(data) : t.text}</div>
                        </div>
                    `).join('')}
                </div>

                <!-- Signatures and QR Code Area -->
                <div class="sign-area">
                    ${qrDataUrl ? `
                    <div class="qr-box">
                        <img src="${qrDataUrl}" alt="QR Verification" />
                        <span>${isMl ? 'സ്കാൻ ചെയ്ത് പരിശോധിക്കുക' : 'Scan to Verify Online'}</span>
                    </div>` : '<div class="qr-box"><span>Verification Active</span></div>'}

                    <div class="sign-box seal">
                        <div class="sign-title">${lodge?.name || 'KRISHNA BUILDING'}</div>
                        <div class="sign-subtitle">${isMl ? 'ഔദ്യോഗിക മുദ്ര (Seal)' : 'Official Company Stamp'}</div>
                        <div class="sign-line"></div>
                        <div class="sign-subtitle">${isMl ? 'അംഗീകൃത പ്രതിനിധി' : 'Authorized Signatory'}</div>
                    </div>

                    <div class="sign-box auth">
                        <div class="sign-title" style="color: #0f172a;">${tenant?.name || 'Tenant'}</div>
                        <div class="sign-subtitle">${isMl ? 'വാടകക്കാരന്റെ ഒപ്പ്' : 'Tenant Signature'}</div>
                        <div class="sign-line"></div>
                        <div class="sign-subtitle">${isMl ? 'തീയതി & സ്ഥലം' : 'Signature & Date'}</div>
                    </div>
                </div>

                <!-- Tenant Acknowledgement Strip -->
                <div class="tenant-ack-strip">
                    <div class="tenant-ack-title">${isMl ? 'വാടകക്കാരന്റെ സമ്മതപത്രം (Tenant Binding Acknowledgement):' : 'Tenant Binding Acknowledgement:'}</div>
                    <div class="tenant-ack-text">
                        ${isMl 
                            ? 'മുകളിൽ രേഖപ്പെടുത്തിയിട്ടുള്ള 18 വാടകക്കരാർ നിബന്ധനകളും വ്യവസ്ഥകളും പൂർണ്ണമായി വായിച്ചു മനസ്സിലാക്കി ഞാൻ ഇതിനാൽ പൂർണ്ണ സമ്മതം രേഖപ്പെടുത്തുന്നു.' 
                            : 'I hereby acknowledge that I have read, understood, and unconditionally agreed to all 18 terms and conditions stipulated in this Residency Agreement.'}
                    </div>
                </div>
            </div>

            <!-- Page 2 Footer -->
            <div class="page-footer">
                <span>Agr: <strong>${booking?.agreementNumber || '-'}</strong></span>
                <span>•</span>
                <span>Version: v${booking?.acknowledgementVersion || 1}.0</span>
                <span>•</span>
                <span>Page 2 of 2</span>
                <span>•</span>
                <span>Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • Krishna Building</span>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// ─── MAIN jsPDF Generator for English vector PDF ──────────────────────────────
export const generateResidencyAcknowledgementPDF = async (data, language = 'en') => {
    const { booking, tenant, room, lodge } = data;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210, PL = 14, PR = 196;
    doc.setFont('helvetica');

    const docStatus = booking?.docStatus || 'ACTIVE';
    const statusColor = STATUS_COLORS[docStatus] || STATUS_COLORS.PENDING;

    // ── Header dark band ──────────────────────────────────────────────────
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, W, 40, 'F');

    // Status badge
    doc.setFillColor(...statusColor.bg);
    doc.roundedRect(PL, 5, 45, 8, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statusColor.text);
    doc.text(`\u25CF ${docStatus}`, PL + 3, 10.5);

    // Lodge name
    doc.setFontSize(15); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text(lodge?.name || 'KRISHNA BUILDING & RESIDENCY', PL, 23);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(148, 163, 184);
    doc.text('OFFICIAL RESIDENCY ACKNOWLEDGEMENT / LEASE AGREEMENT', PL, 29);

    // Agreement details top-right
    doc.setFontSize(7.5); doc.setTextColor(200, 210, 230);
    doc.text(`Agreement No: ${booking?.agreementNumber || '-'}`, PR, 16, { align: 'right' });
    doc.text(`Booking Ref:  #${String(booking?._id || '').slice(-8).toUpperCase()}`, PR, 22, { align: 'right' });
    doc.text(`Version:  v${booking?.acknowledgementVersion || 1}.0`, PR, 28, { align: 'right' });
    doc.text(`Generated: ${fmtDate(new Date())}`, PR, 34, { align: 'right' });

    // Lodge info bar
    doc.setFillColor(241, 245, 249); doc.rect(0, 40, W, 9, 'F');
    doc.setFontSize(7); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
    const lodgeInfoParts = [cleanContactAddress(lodge?.address), lodge?.phone || '+91 98765 43210', cleanContactEmail(lodge?.email), cleanContactWebsite(lodge?.website)].filter(Boolean);
    doc.text(lodgeInfoParts.join('  |  '), 105, 46, { align: 'center' });

    let y = 54;

    const sectionHeader = (label, yPos) => {
        doc.setFillColor(30, 41, 59); doc.rect(PL, yPos, 182, 6.5, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
        doc.text(label.toUpperCase(), PL + 3, yPos + 4.5);
        return yPos + 9;
    };

    const twoColStyle = {
        styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica', textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] }, 1: { cellWidth: 140 } },
        margin: { left: PL, right: 14 },
    };

    // Tenant Details
    y = sectionHeader('Tenant / Occupant Details', y);
    autoTable(doc, { startY: y, head: [], body: [
        ['Tenant Name', tenant?.name || '-'],
        ['Father / Guardian', tenant?.fatherName || '-'],
        ['Mobile', tenant?.phone || '-'],
        ['Email', tenant?.email || '-'],
        ['Address', tenant?.address || '-'],
        ['Govt ID Type', tenant?.govtIdType || 'Aadhaar Card'],
        ['Govt ID Number', tenant?.govtIdNumber || '-'],
        ['Emergency Contact', tenant?.emergencyContact || '-'],
        ['Emergency Phone', tenant?.emergencyPhone || '-'],
    ], ...twoColStyle });
    y = doc.lastAutoTable.finalY + 5;

    // Room Details
    y = sectionHeader('Room & Stay Details', y);
    autoTable(doc, {
        startY: y, head: [], body: [
            ['Room Number', `Room ${room?.roomNumber || 'N/A'} (${room?.type || 'Standard'})`, 'Check-In Date', fmtDate(booking?.checkIn)],
            ['Building / Floor', `${room?.building || 'Main Block'}, ${room?.floor || '1st Floor'}`, 'Check-Out Date', fmtDate(booking?.checkOut)],
            ['Max Occupants', String(room?.maxGuests || 1), 'Total Stay Duration', `${booking?.daysTotal || '-'} Days`],
            ['Payment Cycle', booking?.paymentCycle || 'Monthly', 'Next Due Date', fmtDate(booking?.nextDueDate)],
        ],
        columnStyles: {
            0: { cellWidth: 38, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] }, 1: { cellWidth: 52 },
            2: { cellWidth: 38, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] }, 3: { cellWidth: 54 },
        },
        styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica', textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
        margin: { left: PL, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 5;

    // Financial Summary
    y = sectionHeader('Financial Summary', y);
    autoTable(doc, {
        startY: y,
        head: [['Description', 'Amount']],
        body: [
            ['Monthly Rent', formatINR(room?.monthlyRent || booking?.totalAmount)],
            ['Security Deposit', formatINR(booking?.securityDeposit || room?.securityDeposit)],
            ['Total Booking Amount', formatINR(booking?.totalAmount)],
            ['Total Paid by Tenant', formatINR(booking?.totalPaid)],
            ...(booking?.totalRefunded > 0 ? [['Refunds / Deposit Returned', `- ${formatINR(booking?.totalRefunded)}`]] : []),
            ...(booking?.totalRefunded > 0 ? [['Net Paid', formatINR(booking?.netPaid)]] : []),
            ['Outstanding Balance', formatINR(booking?.outstanding)],
            ['Payment Status', (booking?.outstanding || 0) <= 0 ? 'FULLY PAID / CLEARED' : `BALANCE DUE: ${formatINR(booking?.outstanding)}`],
        ],
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold', textColor: [71, 85, 105] }, 1: { cellWidth: 82, halign: 'right' } },
        styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica', textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
        didParseCell: (d) => {
            const lastRowIndex = d.table.body.length - 1;
            if (d.row.index === lastRowIndex) {
                d.cell.styles.fontStyle = 'bold';
                d.cell.styles.fillColor = (booking?.outstanding || 0) <= 0 ? [209, 250, 229] : [254, 226, 226];
                d.cell.styles.textColor  = (booking?.outstanding || 0) <= 0 ? [4, 120, 87]   : [185, 28, 28];
            }
        },
        margin: { left: PL, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;

    // 18 Terms & Conditions
    if (y > 210) { doc.addPage(); y = 14; }
    y = sectionHeader('Lodge Rules & Agreement Terms (18 Statutory Clauses)', y);
    
    const termsBody = RESIDENCY_TERMS_EN.map(t => [
        `${t.id}. ${t.title}`,
        typeof t.text === 'function' ? t.text(data) : t.text
    ]);

    autoTable(doc, {
        startY: y,
        head: [],
        body: termsBody,
        columnStyles: { 
            0: { cellWidth: 42, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] }, 
            1: { cellWidth: 140, textColor: [51, 65, 85] } 
        },
        styles: { fontSize: 6.8, cellPadding: 1.8, font: 'helvetica', lineColor: [226, 232, 240], lineWidth: 0.2 },
        margin: { left: PL, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;

    if (y > 240) { doc.addPage(); y = 14; }

    // QR Code
    const qrDataUrl = await generateQRDataUrl(booking?._id);
    doc.setFillColor(248, 250, 252); doc.roundedRect(PL, y, 40, 40, 3, 3, 'F');
    doc.addImage(qrDataUrl, 'PNG', PL + 4, y + 4, 32, 32);
    doc.setFontSize(6); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
    doc.text('Scan to verify booking', PL + 20, y + 38, { align: 'center' });

    // Signatures
    const sigY = y;
    const col1 = 60, col2 = 125;

    doc.setFillColor(238, 242, 255); doc.roundedRect(col1, sigY, 58, 38, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(67, 56, 202);
    doc.text(lodge?.name || 'KRISHNA BUILDING & RESIDENCY', col1 + 29, sigY + 10, { align: 'center' });
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('(Authorized Signatory / Seal)', col1 + 29, sigY + 16, { align: 'center' });
    doc.setDrawColor(99, 102, 241); doc.line(col1 + 8, sigY + 28, col1 + 50, sigY + 28);
    doc.setFontSize(6); doc.text('Signature & Seal', col1 + 29, sigY + 34, { align: 'center' });

    doc.setFillColor(240, 253, 244); doc.roundedRect(col2, sigY, 60, 38, 2, 2, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text(tenant?.name || 'Tenant Signature', col2 + 30, sigY + 10, { align: 'center' });
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('(Occupant Acknowledgement)', col2 + 30, sigY + 16, { align: 'center' });
    doc.setDrawColor(34, 197, 94); doc.line(col2 + 8, sigY + 28, col2 + 52, sigY + 28);
    doc.setFontSize(6); doc.text('Signature & Date', col2 + 30, sigY + 34, { align: 'center' });

    y = sigY + 44;

    // Tenant acknowledgement strip
    doc.setFillColor(255, 251, 235); doc.roundedRect(PL, y, 182, 14, 2, 2, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
    doc.text('Tenant Acknowledgement:', PL + 4, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(71, 85, 105);
    doc.text('I hereby acknowledge and unconditionally agree to all 18 terms and conditions of this Residency Agreement.', PL + 4, y + 10);

    // Footer watermark
    doc.setFontSize(5.5); doc.setTextColor(190, 190, 190); doc.setFont('helvetica', 'normal');
    doc.text(
        `Agr: ${booking?.agreementNumber || '-'} | v${booking?.acknowledgementVersion || 1}.0 | ${new Date().toLocaleString('en-IN')} | Krishna Building & Residency`,
        105, 289, { align: 'center' }
    );

    return doc;
};

// ─── Download Handler (High-Fidelity 2-Page Rendering for Malayalam & English) ─
export const downloadResidencyAcknowledgement = async (data, language = 'ml') => {
    // If English, generate crisp vector PDF directly via jsPDF
    if (language === 'en') {
        const doc = await generateResidencyAcknowledgementPDF(data, 'en');
        const name = data.booking?.agreementNumber || 'Acknowledgement';
        await savePDF(doc, `${name}_Agreement_EN.pdf`);
        return;
    }

    // For Malayalam, use an isolated iframe to guarantee valid head, CSS, and Google Web Fonts
    await ensureFontsLoaded();
    const qrDataUrl = await generateQRDataUrl(data.booking?._id);
    const htmlString = generateResidencyAcknowledgementHTML(data, language, qrDataUrl);

    const iframe = document.createElement('iframe');
    iframe.id = 'residency-pdf-sandbox-frame';
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:820px;height:2400px;border:none;opacity:0.01;pointer-events:none;z-index:-99999;';
    document.body.appendChild(iframe);

    try {
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(htmlString);
        iframeDoc.close();

        // Ensure web fonts in iframe are fully shaped
        if (iframeDoc.fonts) {
            await Promise.race([
                iframeDoc.fonts.ready,
                new Promise(res => setTimeout(res, 2000))
            ]);
        }
        await new Promise(res => setTimeout(res, 350));

        const pages = iframeDoc.querySelectorAll('.pdf-page');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const pageHeight = 297;

        for (let i = 0; i < pages.length; i++) {
            const pageEl = pages[i];
            const canvas = await html2canvas(pageEl, {
                scale: 2.2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                window: iframe.contentWindow,
                onclone: (clonedDoc) => {
                    // Sync active fonts into cloned render context
                    if (iframeDoc.fonts && clonedDoc.fonts) {
                        iframeDoc.fonts.forEach(f => {
                            try { clonedDoc.fonts.add(f); } catch (e) {}
                        });
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, pageHeight, undefined, 'FAST');
        }

        const name = data.booking?.agreementNumber || 'Acknowledgement';
        await savePDF(pdf, `${name}_Agreement_${language.toUpperCase()}.pdf`);
    } finally {
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    }
};

// ─── Native High-Fidelity Printing (Crisp Vector Fonts for ML & EN) ────────────
export const printResidencyAcknowledgement = async (data, language = 'ml') => {
    await ensureFontsLoaded();
    const qrDataUrl = await generateQRDataUrl(data.booking?._id);
    const htmlString = generateResidencyAcknowledgementHTML(data, language, qrDataUrl);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlString);
    iframeDoc.close();

    iframe.onload = () => {
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (err) {
                console.warn('Iframe print fallback to window popup:', err);
                const printWin = window.open('', '_blank');
                if (printWin) {
                    printWin.document.write(htmlString);
                    printWin.document.close();
                    printWin.focus();
                    printWin.print();
                }
            }
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 3000);
        }, 400);
    };
};
