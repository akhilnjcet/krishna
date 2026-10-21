import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Printer, Save, Plus, Trash2, ShieldCheck, DollarSign, Clock, Calendar, 
    Hash, FileText, Palette, CheckCircle2, AlertCircle, Copy, RotateCcw, 
    History, Search, X, User, AlertTriangle, KeyRound, Wrench, ShieldAlert
} from 'lucide-react';
import api from '../../services/api';
import { numberToIndianRupees } from '../../utils/numberToIndianRupees';
import { formatCurrencyINR } from '../../utils/pdfHelpers';
import { PRECONFIGURED_CATALOG, computeItemSectionMeta, synchronizeItemSections } from '../../utils/combinedBillHelper';
import { CurlyBraceTotal } from '../../components/CombinedBillTable';

const generateRentalBillNumber = () => `RNT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

const RENTAL_EQUIPMENT_CATALOG = PRECONFIGURED_CATALOG.filter(c => c.category === 'Rental Assets');

const DEFAULT_RENTAL_TERMS_ML = `1. ഉപകരണം വാടകയ്ക്ക് നൽകുന്നതിന് മുമ്പ് ഉപകരണത്തിന്റെ നിലവാരം പരിശോധിച്ച് ഉപഭോക്താവിന് കൈമാറുന്നതാണ്.
2. ഉപകരണം കൈപ്പറ്റിയതിന് ശേഷം അതിന്റെ സുരക്ഷ, ശരിയായ ഉപയോഗം, പരിപാലനം എന്നിവയുടെ പൂർണ്ണ ഉത്തരവാദിത്വം ഉപഭോക്താവിനായിരിക്കും.
3. വാടക കാലയളവിൽ ഉപകരണത്തിന് ഉണ്ടാകുന്ന നഷ്ടം, പൊട്ടൽ, കേടുപാട്, തെറ്റായ ഉപയോഗം, ദുരുപയോഗം അല്ലെങ്കിൽ നഷ്ടപ്പെടൽ എന്നിവയ്ക്ക് ഉപഭോക്താവ് ഉത്തരവാദിയായിരിക്കും.
4. സാധാരണ ഉപയോഗത്തിലൂടെ ഉണ്ടാകുന്ന സ്വാഭാവിക തേയ്മാനം ഒഴികെയുള്ള കേടുപാടുകളുടെ അറ്റകുറ്റപ്പണി ചെലവ് ഉപഭോക്താവിൽ നിന്ന് ഈടാക്കുന്നതാണ്.
5. ഉപകരണം നിശ്ചയിച്ച തീയതിയിലും സമയത്തും തിരികെ നൽകേണ്ടതാണ്. വൈകിയാൽ അധിക വാടക ഈടാക്കുന്നതാണ്.
6. ഉപകരണം തിരികെ നൽകുമ്പോൾ, കൈമാറിയ സമയത്തെ അതേ അവസ്ഥയിൽ തന്നെ തിരികെ നൽകേണ്ടതാണ്.
7. വാടകയ്ക്ക് എടുത്ത ഉപകരണം വാടകദാതാവിന്റെ മുൻകൂർ അനുമതിയില്ലാതെ മറ്റൊരാൾക്ക് കൈമാറുകയോ ഉപയോഗിക്കാൻ നൽകുകയോ ചെയ്യാൻ പാടില്ല.
8. ഉപകരണം വാടകയ്ക്ക് എടുത്ത ആവശ്യത്തിനല്ലാതെ മറ്റേതെങ്കിലും ആവശ്യത്തിന് ഉപയോഗിക്കുന്നതിന് മുൻകൂർ അനുമതി വാങ്ങേണ്ടതാണ്.
9. ഉപകരണം നഷ്ടപ്പെട്ടാൽ, ഉപകരണത്തിന്റെ നിലവിലെ replacement cost / ബാധകമായ നഷ്ടപരിഹാര തുക ഉപഭോക്താവിൽ നിന്ന് ഈടാക്കുന്നതാണ്.
10. ആവശ്യമായ Security Deposit / Advance വാടകയ്ക്ക് മുമ്പ് നൽകേണ്ടതാണ്. ബാധകമായ കുടിശ്ശികകളോ നഷ്ടപരിഹാരമോ ഇല്ലെങ്കിൽ, ഉപകരണം സുരക്ഷിതമായി തിരികെ നൽകിയ ശേഷം Security Deposit തിരികെ നൽകുന്നതാണ്.
11. വാടക തുക ഉപകരണം കൈപ്പറ്റുന്ന സമയത്തോ കരാറിൽ നിശ്ചയിച്ചിരിക്കുന്ന സമയത്തോ അടയ്ക്കേണ്ടതാണ്.
12. ഉപകരണത്തിന്റെ തെറ്റായ ഉപയോഗം, ദുരുപയോഗം, അശ്രദ്ധ എന്നിവ മൂലം ഉണ്ടാകുന്ന അപകടങ്ങൾക്കും നാശനഷ്ടങ്ങൾക്കും വാടകദാതാവ് ഉത്തരവാദിയായിരിക്കില്ല.
13. ഉപകരണം തിരികെ സ്വീകരിച്ച ശേഷം പരിശോധന നടത്തുന്നതാണ്. പരിശോധനയിൽ അധിക കേടുപാടുകൾ കണ്ടെത്തിയാൽ, അതിനുള്ള യുക്തിസഹമായ അറ്റകുറ്റപ്പണി/നഷ്ടപരിഹാര ചെലവ് ഉപഭോക്താവിൽ നിന്ന് ഈടാക്കുന്നതാണ്.
14. ഉപകരണം സ്വീകരിക്കുന്നതിലൂടെ, ഉപഭോക്താവ് മുകളിൽ പറഞ്ഞ എല്ലാ വാടക നിബന്ധനകളും വ്യവസ്ഥകളും വായിച്ച് മനസ്സിലാക്കി അംഗീകരിച്ചതായി കണക്കാക്കുന്നതാണ്.
15. ഈ കരാറിലെ ഏതെങ്കിലും നിബന്ധനകൾ ലംഘിക്കുന്നതിലൂടെ വാടകദാതാവിന് ഉണ്ടാകുന്ന യഥാർത്ഥ നഷ്ടം, കേടുപാട്, അധിക ചെലവ് എന്നിവയ്ക്ക്, ബാധകമായ നിയമങ്ങൾക്ക് വിധേയമായി Indian Contract Act, 1872-ലെ Section 73 പ്രകാരം നഷ്ടപരിഹാരം ആവശ്യപ്പെടാൻ വാടകദാതാവിന് അവകാശമുണ്ടായിരിക്കും.
16. കരാർ ലംഘനം, ഉപകരണം തിരികെ നൽകാതിരിക്കൽ, ഉപകരണം നഷ്ടപ്പെടുത്തൽ തുടങ്ങിയ സാഹചര്യങ്ങളിൽ, ബാധകമായ നിയമപ്രകാരം ആവശ്യമായ നിയമനടപടികൾ സ്വീകരിക്കാൻ വാടകദാതാവിന് അവകാശമുണ്ടായിരിക്കും.`;

const DEFAULT_RENTAL_TERMS_EN = `1. Pre-delivery Inspection: Equipment is inspected and verified for quality & operational safety prior to handover.
2. Custody & Care: Post-handover custody, proper operation, safety, and routine maintenance are solely the hirer's responsibility.
3. Damage & Loss Liability: The hirer is strictly liable for any loss, breakage, damage, improper use, or misuse during the hire period.
4. Wear & Tear Exclusion: Costs for repairs beyond ordinary wear & tear will be recovered directly from the hirer.
5. Return Schedule: Equipment must be returned on the agreed date and time; delayed returns attract additional hire charges.
6. Handover Condition Matching: Rented machinery must be returned in the identical condition in which it was initially handed over.
7. Non-Assignment: Rented equipment cannot be sub-let, assigned, or transferred to third parties without prior written consent.
8. Authorized Purpose: Machinery must be deployed exclusively for the declared purpose unless prior written consent is obtained.
9. Total Loss / Replacement: If lost or damaged beyond repair, current replacement value plus damages will be billed to the hirer.
10. Security Deposit & Refund: Advance Security Deposit must be paid before hire and is refunded upon clean, audit-cleared return.
11. Payment Schedule: Rental charges must be remitted at the time of taking delivery or as stipulated in the rental contract.
12. Indemnity Against Accidents: Owner assumes no liability for accidents, injuries, or third-party claims arising from equipment use or negligence.
13. Post-Return Audit: Comprehensive inspection is conducted upon return; concealed damages discovered will be recovered from the hirer.
14. Acceptance of Terms: Acceptance and receipt of the equipment constitutes full acknowledgement and binding acceptance of all terms.
15. Statutory Breach & Compensation: Under Section 73 of the Indian Contract Act, 1872, the owner reserves statutory rights to claim full compensation for actual loss, damage, or costs caused by any contract breach.
16. Legal Enforcement: Owner reserves the right to initiate legal proceedings for breach of contract, default in return, or conversion.`;

const RentalBills = () => {
    // Workflow Mode: 'checkout' (Issue Equipment) | 'return' (Process Return & Settle)
    const [workflowMode, setWorkflowMode] = useState('checkout');

    // Bill Number & Dates
    const [billNumber, setBillNumber] = useState(generateRentalBillNumber());
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [expectedReturnDate, setExpectedReturnDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    const [actualReturnDate, setActualReturnDate] = useState(new Date().toISOString().split('T')[0]);

    // Customer & Hiring Party
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('Metro Infra Constructions');
    const [customerAddress, setCustomerAddress] = useState('Kochi Metro Yard, Aluva, Kerala');
    const [customerPhone, setCustomerPhone] = useState('+91 94470 54321');
    const [customerGstin, setCustomerGstin] = useState('32AAACM1234F1Z9');
    const [siteLocation, setSiteLocation] = useState('Pillar 412 Alignment Site');

    // Column Visibility Toggles
    const [showQuantity, setShowQuantity] = useState(true);
    const [showUnitPrice, setShowUnitPrice] = useState(true);

    // Rented Items / Assets
    const [rentedItems, setRentedItems] = useState([
        {
            id: 1,
            itemName: '400A Diesel Generator Welding Set',
            itemNo: 'GEN-400-08',
            rateType: 'Day', // Hour, Day, Week, Month, Fixed
            rate: 2200,
            quantity: 1,
            duration: 7,
            checkoutCondition: 'Excellent (Serviced & Tested)',
            returnCondition: 'Normal Wear (Clean)',
            remarks: 'Supplied with 30m heavy copper welding cables & earth clamp',
            isCombined: false
        },
        {
            id: 2,
            itemName: 'Magnetic Base Core Drill Machine (Up to 50mm)',
            itemNo: 'MGD-50-03',
            rateType: 'Day',
            rate: 1200,
            quantity: 1,
            duration: 7,
            checkoutCondition: 'Good - Calibrated',
            returnCondition: 'Normal Wear',
            remarks: 'Includes 18mm & 24mm annular cutters',
            isCombined: false
        }
    ]);
    const [combinedTotals, setCombinedTotals] = useState({});

    // Financial Protection Settings
    const [securityDeposit, setSecurityDeposit] = useState(15000);
    const [lateFeePerDay, setLateFeePerDay] = useState(500);
    const [damageCharge, setDamageCharge] = useState(0);
    const [damageRemarks, setDamageRemarks] = useState('');
    const [lossCharge, setLossCharge] = useState(0);

    // Handover & Signatures Staff
    const [issuedByStaff, setIssuedByStaff] = useState('M. Narayanan (Tool Crib Supervisor)');
    const [receivedByCustomer, setReceivedByCustomer] = useState('Suresh Babu (Site Representative)');
    const [returnedByCustomer, setReturnedByCustomer] = useState('Suresh Babu');
    const [inspectedByStaff, setInspectedByStaff] = useState('K. Pradeep (Quality Inspector)');

    // Multilingual Statutory Rental Terms (Indian Contract Act Sec 73)
    const [termsLanguage, setTermsLanguage] = useState('both'); // 'ml' | 'en' | 'both'
    const [legalTermsEn, setLegalTermsEn] = useState(DEFAULT_RENTAL_TERMS_EN);
    const [legalTermsMl, setLegalTermsMl] = useState(DEFAULT_RENTAL_TERMS_ML);

    // Theme & Styling
    const [theme, setTheme] = useState('Classic'); // Classic, Modern, Minimalist
    const [themeColor, setThemeColor] = useState('#4f46e5');
    const [brandingSettings, setBrandingSettings] = useState({});

    // Modals & History
    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [savedBills, setSavedBills] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [savingHistory, setSavingHistory] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        fetch('/api/settings/public')
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                const map = {};
                if (Array.isArray(data)) {
                    data.forEach(item => { map[item.key] = item.value; });
                }
                setBrandingSettings(map);
            })
            .catch(err => console.warn('Public settings fetch failed', err));
        fetchCustomers();
        checkDuplicatedDoc();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/auth/admin/users');
            if (Array.isArray(res.data)) {
                setCustomers(res.data);
            }
        } catch (err) {
            console.warn('Customer fetch failed:', err);
        }
    };

    const checkDuplicatedDoc = () => {
        try {
            const type = localStorage.getItem('duplicated_doc_type');
            const dataStr = localStorage.getItem('duplicated_doc_data');
            if (type === 'Rental Bill' && dataStr) {
                const parsed = JSON.parse(dataStr);
                applyRentalData(parsed, true);
                localStorage.removeItem('duplicated_doc_type');
                localStorage.removeItem('duplicated_doc_data');
                setSaveMessage('✓ Cloned rental bill loaded into studio.');
                setTimeout(() => setSaveMessage(''), 4000);
            }
        } catch (e) {
            console.warn('Duplication check error:', e);
        }
    };

    const handleSelectCustomer = (e) => {
        const id = e.target.value;
        setSelectedCustomerId(id);
        if (!id) return;
        const cust = customers.find(c => c._id === id);
        if (cust) {
            setCustomerName(cust.name || '');
            setCustomerAddress(cust.address || 'Kerala');
            setCustomerPhone(cust.phone || cust.phoneNumber || '');
            setCustomerGstin(cust.gstin || '32AAAAA0000A1Z5');
        }
    };

    // Item handlers
    const handleAddItem = () => {
        setRentedItems(prev => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                itemName: '',
                itemNo: '',
                rateType: 'Day',
                rate: 0,
                quantity: 1,
                duration: 1,
                checkoutCondition: 'Good',
                returnCondition: 'Normal Wear',
                remarks: '',
                isCombined: false
            }
        ]);
    };

    const handleAddNewCombinedSection = () => {
        const secId = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        setCombinedTotals(prev => ({ ...prev, [secId]: 0 }));
        setRentedItems(prev => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                itemName: '',
                itemNo: '',
                rateType: 'Day',
                rate: 0,
                quantity: 1,
                duration: 1,
                checkoutCondition: 'Good',
                returnCondition: 'Normal Wear',
                remarks: '',
                isCombined: true,
                isCombinedMode: true,
                combinedSectionId: secId,
                isNewSectionStart: true
            }
        ]);
    };

    const handleRemoveItem = (index) => {
        if (rentedItems.length <= 1) return;
        setRentedItems(prev => {
            const next = prev.filter((_, i) => i !== index);
            return synchronizeItemSections(next);
        });
    };

    const handleItemChange = (index, field, value) => {
        setRentedItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return synchronizeItemSections(next);
        });
    };

    const handleToggleCombine = (index, checked) => {
        setRentedItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], isCombined: checked, isCombinedMode: checked };
            const sync = synchronizeItemSections(next);
            sync.forEach(item => {
                if ((item.isCombined || item.isCombinedMode) && item.combinedSectionId && combinedTotals[item.combinedSectionId] === undefined) {
                    setCombinedTotals(c => ({ ...c, [item.combinedSectionId]: 0 }));
                }
            });
            return sync;
        });
    };

    const handleSplitSection = (index) => {
        setRentedItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], isNewSectionStart: true, combinedSectionId: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` };
            const sync = synchronizeItemSections(next);
            sync.forEach(item => {
                if ((item.isCombined || item.isCombinedMode) && item.combinedSectionId && combinedTotals[item.combinedSectionId] === undefined) {
                    setCombinedTotals(c => ({ ...c, [item.combinedSectionId]: 0 }));
                }
            });
            return sync;
        });
    };

    const handleMergeSection = (index) => {
        setRentedItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], isNewSectionStart: false };
            return synchronizeItemSections(next);
        });
    };

    const handleCombinedTotalChange = (sectionId, value) => {
        setCombinedTotals(prev => ({
            ...prev,
            [sectionId]: parseFloat(value) || 0
        }));
    };

    const handleInsertCatalogItem = (catItem) => {
        setRentedItems(prev => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                itemName: catItem.name,
                itemNo: `AST-${Math.floor(100 + Math.random() * 900)}`,
                rateType: catItem.unit === 'Weeks' ? 'Week' : 'Day',
                rate: catItem.price,
                quantity: 1,
                duration: 7,
                checkoutCondition: 'Tested & Operational',
                returnCondition: 'Pending Return',
                remarks: catItem.description,
                isCombined: false
            }
        ]);
        setShowCatalogModal(false);
        setSaveMessage(`✓ Added "${catItem.name}" to rental agreement.`);
        setTimeout(() => setSaveMessage(''), 3000);
    };

    // Calculation logic
    const rentalMeta = computeItemSectionMeta(
        rentedItems.map(item => ({
            ...item,
            price: item.rate,
            quantity: item.duration,
            total: (parseFloat(item.rate || 0) * parseFloat(item.duration || 1) * parseFloat(item.quantity || 1))
        })),
        combinedTotals
    );

    const rentalSubtotal = rentalMeta.reduce((acc, item) => {
        if (item.isCombined) {
            return item.isSectionStart ? acc + Number(item.combinedAmount || 0) : acc;
        }
        const lineTotal = (parseFloat(item.rate || 0) * parseFloat(item.duration || 1) * parseFloat(item.quantity || 1));
        return acc + lineTotal;
    }, 0);

    // Late fees calculation
    const expectedMs = new Date(expectedReturnDate).getTime();
    const actualMs = new Date(actualReturnDate).getTime();
    const daysOverdue = workflowMode === 'return' && actualMs > expectedMs 
        ? Math.ceil((actualMs - expectedMs) / (1000 * 60 * 60 * 24))
        : 0;
    const computedLateFees = daysOverdue * parseFloat(lateFeePerDay || 0);

    // Total gross charges
    const totalCharges = rentalSubtotal + computedLateFees + parseFloat(damageCharge || 0) + parseFloat(lossCharge || 0);
    
    // Settlement vs Security Deposit
    const numDeposit = parseFloat(securityDeposit || 0);
    const balanceSettlement = totalCharges - numDeposit;
    // balanceSettlement > 0 => Customer owes us money
    // balanceSettlement < 0 => We owe refund to customer

    const amountInWords = numberToIndianRupees(totalCharges);
    const settlementInWords = numberToIndianRupees(Math.abs(balanceSettlement));

    const handleDuplicateBill = () => {
        setBillNumber(generateRentalBillNumber());
        setIssueDate(new Date().toISOString().split('T')[0]);
        setSaveMessage('✓ Duplicated into new rental bill agreement.');
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const handleResetBill = () => {
        if (!window.confirm('Reset this rental document and start fresh?')) return;
        setBillNumber(generateRentalBillNumber());
        setIssueDate(new Date().toISOString().split('T')[0]);
        setSelectedCustomerId('');
        setCustomerName('');
        setCustomerAddress('');
        setCustomerPhone('');
        setCustomerGstin('');
        setSiteLocation('');
        setSecurityDeposit(10000);
        setDamageCharge(0);
        setLossCharge(0);
        setRentedItems([{ id: Date.now(), itemName: '', itemNo: '', rateType: 'Day', rate: 0, quantity: 1, duration: 1, checkoutCondition: 'Good', returnCondition: 'Good', remarks: '' }]);
        setSaveMessage('✓ Rental studio reset.');
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const handleOpenHistoryModal = async () => {
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const res = await api.get('/document-history', { params: { category: 'Rental Bills', limit: 20 } });
            setSavedBills(res.data.documents || []);
        } catch (e) {
            console.error('Failed to load rental history:', e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const applyRentalData = (data, isClone = false) => {
        if (!data) return;
        if (!isClone) {
            setBillNumber(data.billNumber || generateRentalBillNumber());
            setIssueDate(data.issueDate || new Date().toISOString().split('T')[0]);
        } else {
            setBillNumber(generateRentalBillNumber());
            setIssueDate(new Date().toISOString().split('T')[0]);
        }
        if (data.workflowMode) setWorkflowMode(data.workflowMode);
        setExpectedReturnDate(data.expectedReturnDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
        setActualReturnDate(data.actualReturnDate || new Date().toISOString().split('T')[0]);
        setCustomerName(data.customerName || '');
        setCustomerAddress(data.customerAddress || '');
        setCustomerPhone(data.customerPhone || '');
        setCustomerGstin(data.customerGstin || '');
        setSiteLocation(data.siteLocation || '');
        if (Array.isArray(data.rentedItems)) setRentedItems(data.rentedItems);
        if (data.combinedTotals) setCombinedTotals(data.combinedTotals);
        if (data.showQuantity !== undefined) setShowQuantity(data.showQuantity);
        if (data.showUnitPrice !== undefined) setShowUnitPrice(data.showUnitPrice);
        if (data.securityDeposit !== undefined) setSecurityDeposit(data.securityDeposit);
        if (data.lateFeePerDay !== undefined) setLateFeePerDay(data.lateFeePerDay);
        if (data.damageCharge !== undefined) setDamageCharge(data.damageCharge);
        if (data.lossCharge !== undefined) setLossCharge(data.lossCharge);
        if (data.damageRemarks) setDamageRemarks(data.damageRemarks);
        if (data.issuedByStaff) setIssuedByStaff(data.issuedByStaff);
        if (data.receivedByCustomer) setReceivedByCustomer(data.receivedByCustomer);
        if (data.returnedByCustomer) setReturnedByCustomer(data.returnedByCustomer);
        if (data.inspectedByStaff) setInspectedByStaff(data.inspectedByStaff);
        if (data.legalTermsEn) setLegalTermsEn(data.legalTermsEn);
        if (data.legalTermsMl) setLegalTermsMl(data.legalTermsMl);
        if (data.termsLanguage) setTermsLanguage(data.termsLanguage);
        if (data.theme) setTheme(data.theme);
        if (data.themeColor) setThemeColor(data.themeColor);
        setShowHistoryModal(false);
    };

    const handleSaveToHistory = async (autoSilent = false) => {
        if (!billNumber) {
            if (!autoSilent) alert("Bill number is required.");
            return;
        }
        setSavingHistory(true);
        try {
            const payload = {
                documentType: 'Rental Bill',
                documentNumber: billNumber,
                totalAmount: totalCharges,
                status: workflowMode === 'checkout' ? 'On Hire (Active)' : 'Returned & Settled',
                data: {
                    workflowMode,
                    billNumber, issueDate, expectedReturnDate, actualReturnDate,
                    customerName, customerAddress, customerPhone, customerGstin, siteLocation,
                    rentedItems, combinedTotals, showQuantity, showUnitPrice,
                    securityDeposit, lateFeePerDay, computedLateFees, daysOverdue,
                    damageCharge, lossCharge, damageRemarks,
                    issuedByStaff, receivedByCustomer, returnedByCustomer, inspectedByStaff,
                    legalTermsEn, legalTermsMl, theme, themeColor,
                    rentalSubtotal, totalCharges, balanceSettlement,
                    amountInWords, settlementInWords
                }
            };
            const res = await api.post('/document-history/save', payload);
            if (!autoSilent) {
                setSaveMessage(`✅ Rental Bill #${billNumber} saved to Document History (Version ${res.data.document?.version || 1}).`);
                setTimeout(() => setSaveMessage(''), 4000);
            }
        } catch (err) {
            console.error('Failed to save rental bill:', err);
            if (!autoSilent) {
                alert(err.response?.data?.message || 'Failed to save to Document History.');
            }
        } finally {
            setSavingHistory(false);
        }
    };

    const handlePrint = () => {
        handleSaveToHistory(true);
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8 font-sans">
            {/* Header Toolbar */}
            <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-2">
                        <KeyRound className="w-4 h-4" /> Asset Management & Equipment Rental Suite
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                        Equipment Rental Studio
                    </h1>
                    {saveMessage && (
                        <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 inline-block">
                            {saveMessage}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Catalog Picker */}
                    <button
                        onClick={() => setShowCatalogModal(true)}
                        className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                        <Wrench className="w-4 h-4" /> Pick Equipment
                    </button>

                    {/* Duplicate */}
                    <button
                        onClick={handleDuplicateBill}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                        <Copy className="w-4 h-4" /> Duplicate
                    </button>

                    {/* Reset */}
                    <button
                        onClick={handleResetBill}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 px-3 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                        <RotateCcw className="w-4 h-4" /> New
                    </button>

                    {/* Load History */}
                    <button
                        onClick={handleOpenHistoryModal}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                        <History className="w-4 h-4" /> Load Saved
                    </button>

                    {/* Save Button */}
                    <button
                        onClick={() => handleSaveToHistory(false)}
                        disabled={savingHistory}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                    >
                        <Save className="w-4 h-4" /> {savingHistory ? 'Saving...' : 'Save'}
                    </button>

                    {/* Print Button */}
                    <button
                        onClick={handlePrint}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                    >
                        <Printer className="w-4 h-4" /> Print Agreement
                    </button>
                </div>
            </div>

            {/* Workflow Mode Switcher */}
            <div className="no-print bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md mb-8 flex flex-wrap gap-2 w-fit">
                <button
                    onClick={() => setWorkflowMode('checkout')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
                        workflowMode === 'checkout' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <KeyRound className="w-4 h-4" /> Phase 1: Check-Out / Equipment Handover
                </button>
                <button
                    onClick={() => setWorkflowMode('return')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
                        workflowMode === 'return' 
                            ? 'bg-emerald-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <CheckCircle2 className="w-4 h-4" /> Phase 2: Process Return & Final Settlement
                </button>
            </div>

            {/* Studio Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Controls & Input Forms */}
                <div className="no-print lg:col-span-5 space-y-6">
                    {/* Metadata & Dates */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-indigo-500" /> Rental Agreement Identifier
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Rental Bill Number</label>
                                <input
                                    type="text"
                                    value={billNumber}
                                    onChange={(e) => setBillNumber(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Issue / Handover Date</label>
                                <input
                                    type="date"
                                    value={issueDate}
                                    onChange={(e) => setIssueDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Expected Return Date</label>
                                <input
                                    type="date"
                                    value={expectedReturnDate}
                                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            {workflowMode === 'return' && (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1">Actual Return Date</label>
                                    <input
                                        type="date"
                                        value={actualReturnDate}
                                        onChange={(e) => setActualReturnDate(e.target.value)}
                                        className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-200 focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        {daysOverdue > 0 && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold">
                                <span>⚠️ Return Overdue by {daysOverdue} Days</span>
                                <span>Late Fee: {formatCurrencyINR(computedLateFees)}</span>
                            </div>
                        )}
                    </div>

                    {/* Customer Info */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-500" /> Hirer / Customer Credentials
                        </h2>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Select Hirer from Database</label>
                            <select
                                value={selectedCustomerId}
                                onChange={handleSelectCustomer}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                                <option value="">-- Choose Existing Customer or Type --</option>
                                {customers.map(c => (
                                    <option key={c._id} value={c._id}>{c.name} ({c.email || c.phone || 'Client'})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-3 pt-1">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Hirer / Business Name</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Address</label>
                                <input
                                    type="text"
                                    value={customerAddress}
                                    onChange={(e) => setCustomerAddress(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">GSTIN</label>
                                    <input
                                        type="text"
                                        value={customerGstin}
                                        onChange={(e) => setCustomerGstin(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Operation / Site Location</label>
                                <input
                                    type="text"
                                    value={siteLocation}
                                    onChange={(e) => setSiteLocation(e.target.value)}
                                    placeholder="Where equipment will be deployed"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rented Equipment / Machinery Table */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Wrench className="w-4 h-4 text-indigo-500" /> Rented Machinery & Assets ({rentedItems.length})
                                </h2>
                                <div className="flex items-center gap-4 mt-2">
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showQuantity}
                                            onChange={(e) => setShowQuantity(e.target.checked)}
                                            className="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5"
                                        />
                                        Duration / Period
                                    </label>
                                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={showUnitPrice}
                                            onChange={(e) => setShowUnitPrice(e.target.checked)}
                                            className="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5"
                                        />
                                        Model / Rate
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleAddItem}
                                    className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Asset
                                </button>
                                <button
                                    onClick={handleAddNewCombinedSection}
                                    className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-100 px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition border border-amber-200 dark:border-amber-800"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Combined Package
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {rentalMeta.map((item, idx) => (
                                <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Machine #{idx + 1}</span>
                                            {item.isCombined && (
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200">
                                                    Package Item
                                                </span>
                                            )}
                                        </div>
                                        {rentedItems.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveItem(idx)}
                                                className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2">
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Machine / Tool Name</label>
                                            <input
                                                type="text"
                                                value={item.itemName}
                                                onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                                                placeholder="e.g. 400A Diesel Generator"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Asset / Serial No</label>
                                            <input
                                                type="text"
                                                value={item.itemNo}
                                                onChange={(e) => handleItemChange(idx, 'itemNo', e.target.value)}
                                                placeholder="AST-001"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Pricing Model</label>
                                            <select
                                                value={item.rateType}
                                                onChange={(e) => handleItemChange(idx, 'rateType', e.target.value)}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-1.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                            >
                                                <option value="Hour">Hour</option>
                                                <option value="Day">Day</option>
                                                <option value="Week">Week</option>
                                                <option value="Month">Month</option>
                                                <option value="Fixed">Fixed</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Rate (₹)</label>
                                            <input
                                                type="number"
                                                value={item.rate}
                                                onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                                disabled={item.isCombined}
                                                className={`w-full border rounded-xl px-2 py-1.5 text-xs font-bold focus:outline-none ${
                                                    item.isCombined
                                                        ? 'bg-slate-100 dark:bg-slate-800 border-dashed text-slate-400'
                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Duration</label>
                                            <input
                                                type="number"
                                                value={item.duration}
                                                onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Qty</label>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Combined Section Controls */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-amber-50/40 dark:bg-amber-950/20 p-2.5 rounded-xl">
                                        <label className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(item.isCombined)}
                                                onChange={(e) => handleToggleCombine(idx, e.target.checked)}
                                                className="w-4 h-4 rounded text-amber-600"
                                            />
                                            Combine into package
                                        </label>

                                        {item.isCombined && item.isSectionStart && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200">
                                                    Spans {item.sectionRowCount} item{item.sectionRowCount > 1 ? 's' : ''}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">₹</span>
                                                    <input
                                                        type="number"
                                                        value={combinedTotals[item.sectionId] ?? ''}
                                                        onChange={(e) => handleCombinedTotalChange(item.sectionId, e.target.value)}
                                                        placeholder="Package Amount"
                                                        className="w-28 bg-white dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-600 rounded-lg px-2 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 text-right focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {item.isCombined && item.isSectionFollower && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                    ↳ Bundled into package above
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSplitSection(idx)}
                                                    className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg"
                                                >
                                                    Split Section
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Condition Logs */}
                                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Checkout Condition</label>
                                            <input
                                                type="text"
                                                value={item.checkoutCondition}
                                                onChange={(e) => handleItemChange(item.id, 'checkoutCondition', e.target.value)}
                                                placeholder="Brand New / Serviced"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                                            />
                                        </div>
                                        {workflowMode === 'return' && (
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-emerald-600 block mb-0.5">Return Condition</label>
                                                <input
                                                    type="text"
                                                    value={item.returnCondition}
                                                    onChange={(e) => handleItemChange(item.id, 'returnCondition', e.target.value)}
                                                    placeholder="Normal Wear / Damaged"
                                                    className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl px-2 py-1.5 text-xs text-emerald-900 dark:text-emerald-200 focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Financial Protection & Security Deposit */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-indigo-500" /> Financial Protection & Security Deposit
                        </h2>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Security Deposit Held (₹)</label>
                                <input
                                    type="number"
                                    value={securityDeposit}
                                    onChange={(e) => setSecurityDeposit(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Late Fee / Day Overdue (₹)</label>
                                <input
                                    type="number"
                                    value={lateFeePerDay}
                                    onChange={(e) => setLateFeePerDay(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                        </div>

                        {workflowMode === 'return' && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 block">
                                    Return Damage & Loss Deductions
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[9px] font-bold text-rose-700 block mb-0.5">Damage Repair Cost (₹)</label>
                                        <input
                                            type="number"
                                            value={damageCharge}
                                            onChange={(e) => setDamageCharge(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-rose-300 rounded-xl px-2 py-1.5 text-xs font-bold text-rose-900 dark:text-rose-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-rose-700 block mb-0.5">Item Loss / Missing (₹)</label>
                                        <input
                                            type="number"
                                            value={lossCharge}
                                            onChange={(e) => setLossCharge(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-900 border border-rose-300 rounded-xl px-2 py-1.5 text-xs font-bold text-rose-900 dark:text-rose-200"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        value={damageRemarks}
                                        onChange={(e) => setDamageRemarks(e.target.value)}
                                        placeholder="Inspection remarks for damaged or missing parts"
                                        className="w-full bg-white dark:bg-slate-900 border border-rose-200 rounded-xl px-2 py-1.5 text-xs text-rose-800 dark:text-rose-300"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Staff Handover Signatures */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-3">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-500" /> Handover Staff & Acknowledgements
                        </h2>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Issued By Staff</label>
                                <input
                                    type="text"
                                    value={issuedByStaff}
                                    onChange={(e) => setIssuedByStaff(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Received By Hirer</label>
                                <input
                                    type="text"
                                    value={receivedByCustomer}
                                    onChange={(e) => setReceivedByCustomer(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-bold"
                                />
                            </div>
                        </div>
                        {workflowMode === 'return' && (
                            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Returned By</label>
                                    <input
                                        type="text"
                                        value={returnedByCustomer}
                                        onChange={(e) => setReturnedByCustomer(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Inspected By Staff</label>
                                    <input
                                        type="text"
                                        value={inspectedByStaff}
                                        onChange={(e) => setInspectedByStaff(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 font-bold"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Statutory Terms Editor Section */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500" /> Rental Terms & Conditions (നിബന്ധനകൾ)
                            </h2>
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[10px] font-bold">
                                <button
                                    type="button"
                                    onClick={() => setTermsLanguage('ml')}
                                    className={`px-2.5 py-1 rounded-lg transition ${termsLanguage === 'ml' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'}`}
                                >
                                    മലയാളം (16)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTermsLanguage('en')}
                                    className={`px-2.5 py-1 rounded-lg transition ${termsLanguage === 'en' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'}`}
                                >
                                    English (16)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTermsLanguage('both')}
                                    className={`px-2.5 py-1 rounded-lg transition ${termsLanguage === 'both' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'}`}
                                >
                                    Bilingual (Both)
                                </button>
                            </div>
                        </div>

                        {(termsLanguage === 'ml' || termsLanguage === 'both') && (
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                    വാടക നിബന്ധനകളും വ്യവസ്ഥകളും (16 Points Malayalam):
                                </label>
                                <textarea
                                    rows={8}
                                    value={legalTermsMl}
                                    onChange={(e) => setLegalTermsMl(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-sans leading-relaxed"
                                />
                            </div>
                        )}

                        {(termsLanguage === 'en' || termsLanguage === 'both') && (
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                    Statutory Rental Terms (16 Points English - Indian Contract Act Sec 73):
                                </label>
                                <textarea
                                    rows={8}
                                    value={legalTermsEn}
                                    onChange={(e) => setLegalTermsEn(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none font-sans leading-relaxed"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Live Printable Rental Agreement Preview */}
                <div className="lg:col-span-7">
                    <div className="sticky top-6">
                        <div className="no-print flex items-center justify-between bg-slate-900 text-white px-6 py-3 rounded-t-3xl border-b border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Equipment Rental Agreement ({workflowMode === 'checkout' ? 'Issue Agreement' : 'Return Settlement'})
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{theme}</span>
                        </div>

                        <div 
                            className="print-document-container bg-white dark:bg-slate-900 p-8 md:p-12 shadow-2xl rounded-b-3xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-sans"
                            style={{ '--theme-color': themeColor }}
                        >
                            {/* Header */}
                            {theme === 'Modern' ? (
                                <div className="p-6 md:p-8 rounded-2xl mb-8 text-white relative overflow-hidden" style={{ backgroundColor: themeColor }}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                        <div>
                                            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider company-name">KRISHNA ENGINEERING WORKS</h1>
                                            <p className="text-xs opacity-90 font-medium">Heavy Industrial Plant & Machinery Rental Division</p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <span className="bg-white/20 backdrop-blur px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest inline-block mb-1">
                                                RENTAL AGREEMENT
                                            </span>
                                            <p className="text-sm font-black">{billNumber}</p>
                                            <p className="text-xs opacity-80">Issued: {issueDate}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                    <div>
                                        <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white company-name">
                                            {brandingSettings?.company_name || 'KRISHNA ENGINEERING WORKS'}
                                        </h1>
                                        <p className="text-xs text-slate-500">Equipment Rental, Machinery Leasing & Plant Asset Services</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Yard: Industrial Area Thiruvazhiyode, Palakkad | Ph: +91 9447940835</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <span className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white inline-block mb-2 shadow-sm" style={{ backgroundColor: themeColor }}>
                                            {workflowMode === 'checkout' ? 'RENTAL ISSUE DOCKET' : 'SETTLEMENT RECEIPT'}
                                        </span>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">{billNumber}</p>
                                        <p className="text-xs text-slate-500">Issue Date: {issueDate}</p>
                                        <p className="text-xs text-slate-500">Expected Return: {expectedReturnDate}</p>
                                    </div>
                                </div>
                            )}

                            {/* Hirer & Site Info */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">HIRER / CLIENT CREDENTIALS:</span>
                                    <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase">{customerName}</h3>
                                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">{customerAddress}</p>
                                    {customerPhone && <p className="text-slate-600 dark:text-slate-400">Ph: {customerPhone}</p>}
                                    {customerGstin && <p className="font-mono font-bold text-slate-700 dark:text-slate-300">GSTIN: {customerGstin}</p>}
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">DEPLOYMENT SITE:</span>
                                    <p className="font-bold text-slate-900 dark:text-white">{siteLocation || 'Designated Construction Site'}</p>
                                    <p className="text-slate-500 mt-1">Status: <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                        {workflowMode === 'checkout' ? 'On Hire (Active)' : 'Returned & Settle'}
                                    </span></p>
                                    {workflowMode === 'return' && (
                                        <p className="text-slate-500">Actual Return Date: <span className="font-bold text-emerald-600">{actualReturnDate}</span></p>
                                    )}
                                </div>
                            </div>

                            {/* Equipment Table */}
                            <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: themeColor }}>
                                            <th className="p-3">#</th>
                                            <th className="p-3">Asset / Machinery Name</th>
                                            <th className="p-3 text-center">Asset No</th>
                                            {showUnitPrice && <th className="p-3 text-center">Model / Rate</th>}
                                            {showQuantity && <th className="p-3 text-center">Duration</th>}
                                            <th className="p-3">Handover Condition</th>
                                            <th className="p-3 text-right">Rent Total (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-medium text-slate-800 dark:text-slate-200 divide-y divide-slate-100 dark:divide-slate-800">
                                        {rentalMeta.map((item, idx) => {
                                            const total = (parseFloat(item.rate || 0) * parseFloat(item.duration || 1) * parseFloat(item.quantity || 1));
                                            return (
                                                <tr key={item.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900'}>
                                                    <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                                                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                                                        {item.itemName}
                                                        {item.remarks && <p className="text-[11px] text-slate-500 font-normal">{item.remarks}</p>}
                                                    </td>
                                                    <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.itemNo}</td>
                                                    {showUnitPrice && (
                                                        <td className="p-3 text-center">
                                                            {item.isCombined ? '—' : `${formatCurrencyINR(item.rate)}/${item.rateType}`}
                                                        </td>
                                                    )}
                                                    {showQuantity && (
                                                        <td className="p-3 text-center font-bold">
                                                            {item.duration} {item.rateType}s
                                                        </td>
                                                    )}
                                                    <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400">{item.checkoutCondition}</td>
                                                    {item.isCombined ? (
                                                        item.isSectionStart ? (
                                                            <td 
                                                                rowSpan={item.sectionRowCount}
                                                                className="p-2 text-right"
                                                                style={{ verticalAlign: 'middle', background: 'transparent' }}
                                                            >
                                                                <CurlyBraceTotal 
                                                                    amount={item.combinedAmount} 
                                                                    rowCount={item.sectionRowCount} 
                                                                    textColor={themeColor} 
                                                                />
                                                            </td>
                                                        ) : null
                                                    ) : (
                                                        <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                                                            {formatCurrencyINR(total)}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Settlement & Financial Protection */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
                                <div className="flex-1 space-y-3 text-xs">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                                        STATUTORY RENTAL CONTRACT TERMS & CONDITIONS (SEC. 73 INDIAN CONTRACT ACT):
                                    </span>
                                    {(termsLanguage === 'en' || termsLanguage === 'both') && (
                                        <div className="text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed border-l-2 border-indigo-400 pl-3 py-1">
                                            {legalTermsEn}
                                        </div>
                                    )}
                                    {(termsLanguage === 'ml' || termsLanguage === 'both') && (
                                        <div className="text-[11px] text-indigo-950 dark:text-indigo-200 bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 leading-relaxed font-medium whitespace-pre-line">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
                                                വാടക നിബന്ധനകളും വ്യവസ്ഥകളും:
                                            </p>
                                            {legalTermsMl}
                                        </div>
                                    )}
                                </div>

                                <div className="w-full sm:w-72 space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                        <span className="font-bold text-slate-500">Rental Hire Charges:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrencyINR(rentalSubtotal)}</span>
                                    </div>

                                    {computedLateFees > 0 && (
                                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-rose-600 font-bold">
                                            <span>Late Fee ({daysOverdue} days):</span>
                                            <span>+{formatCurrencyINR(computedLateFees)}</span>
                                        </div>
                                    )}

                                    {damageCharge > 0 && (
                                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-rose-600 font-bold">
                                            <span>Damage Surcharges:</span>
                                            <span>+{formatCurrencyINR(damageCharge)}</span>
                                        </div>
                                    )}

                                    {lossCharge > 0 && (
                                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-rose-600 font-bold">
                                            <span>Missing Parts Charge:</span>
                                            <span>+{formatCurrencyINR(lossCharge)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between py-1.5 text-sm font-black text-slate-900 dark:text-white border-t border-slate-900 dark:border-slate-100 pt-2">
                                        <span>Total Hire Charges:</span>
                                        <span style={{ color: themeColor }}>{formatCurrencyINR(totalCharges)}</span>
                                    </div>

                                    <div className="flex justify-between py-1 text-indigo-600 font-bold border-b border-slate-100 dark:border-slate-800">
                                        <span>Security Deposit Collected:</span>
                                        <span>{formatCurrencyINR(securityDeposit)}</span>
                                    </div>

                                    {workflowMode === 'return' && (
                                        <div className={`flex justify-between py-2 text-sm font-black p-2.5 rounded-xl ${
                                            balanceSettlement > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                                        }`}>
                                            <span>{balanceSettlement > 0 ? 'Balance Payable by Hirer:' : 'Refundable Security Balance:'}</span>
                                            <span>{formatCurrencyINR(Math.abs(balanceSettlement))}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Multi-Signatures Handover Block */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
                                <div className="border-t border-slate-300 dark:border-slate-600 pt-3">
                                    <p className="text-[10px] font-black uppercase text-slate-400">1. Issued By Staff</p>
                                    <p className="font-bold text-slate-900 dark:text-white mt-1">{issuedByStaff}</p>
                                    <p className="text-[10px] text-slate-400">Krishna Tool Crib</p>
                                </div>
                                <div className="border-t border-slate-300 dark:border-slate-600 pt-3">
                                    <p className="text-[10px] font-black uppercase text-slate-400">2. Received By Hirer</p>
                                    <p className="font-bold text-slate-900 dark:text-white mt-1">{receivedByCustomer}</p>
                                    <p className="text-[10px] text-slate-400">Hirer Authorized Signatory</p>
                                </div>
                                {workflowMode === 'return' ? (
                                    <>
                                        <div className="border-t border-slate-300 dark:border-slate-600 pt-3">
                                            <p className="text-[10px] font-black uppercase text-slate-400">3. Returned By Hirer</p>
                                            <p className="font-bold text-slate-900 dark:text-white mt-1">{returnedByCustomer}</p>
                                            <p className="text-[10px] text-slate-400">Hirer Representative</p>
                                        </div>
                                        <div className="border-t border-slate-300 dark:border-slate-600 pt-3">
                                            <p className="text-[10px] font-black uppercase text-slate-400">4. Inspected & Cleared By</p>
                                            <p className="font-bold text-slate-900 dark:text-white mt-1">{inspectedByStaff}</p>
                                            <p className="text-[10px] text-slate-400">Quality & Crib Inspector</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="col-span-2 text-right border-t border-slate-300 dark:border-slate-600 pt-3">
                                        <p className="text-[10px] font-black uppercase text-slate-400">Security Clearance</p>
                                        <p className="font-bold text-emerald-600 mt-1 flex items-center justify-end gap-1">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Handover Validated
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Catalog Modal */}
            <AnimatePresence>
                {showCatalogModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <h3 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                        <Wrench className="w-4 h-4 text-indigo-500" /> Rental Machinery Catalogue
                                    </h3>
                                    <p className="text-xs text-slate-500">Pick equipment from heavy plant and machinery inventory.</p>
                                </div>
                                <button
                                    onClick={() => setShowCatalogModal(false)}
                                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {RENTAL_EQUIPMENT_CATALOG.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleInsertCatalogItem(item)}
                                        className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/70 hover:border-indigo-300 rounded-2xl cursor-pointer transition flex items-center justify-between gap-4 group"
                                    >
                                        <div>
                                            <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-indigo-600">
                                                {item.name}
                                            </h4>
                                            <p className="text-[11px] text-slate-500 line-clamp-1">{item.description}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs font-black text-slate-900 dark:text-white">{formatCurrencyINR(item.price)}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">per {item.unit}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Load History Modal */}
            <AnimatePresence>
                {showHistoryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <h3 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                        <History className="w-4 h-4 text-indigo-500" /> Saved Rental Agreements Vault
                                    </h3>
                                    <p className="text-xs text-slate-500">Pick any previously saved rental agreement to load or duplicate.</p>
                                </div>
                                <button
                                    onClick={() => setShowHistoryModal(false)}
                                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {loadingHistory ? (
                                    <div className="p-8 text-center text-xs font-bold text-slate-400">Loading saved rental bills...</div>
                                ) : savedBills.length === 0 ? (
                                    <div className="p-8 text-center text-xs font-bold text-slate-400">No saved rental bills found in history.</div>
                                ) : (
                                    savedBills.map(doc => (
                                        <div
                                            key={doc._id}
                                            className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-2xl flex items-center justify-between gap-4"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{doc.documentNumber}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {new Date(doc.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[9px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold uppercase">
                                                        {doc.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                                                    {doc.data?.customerName || 'Unnamed Client'}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    Total: {formatCurrencyINR(doc.totalAmount || 0)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => applyRentalData(doc.data, false)}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition"
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    onClick={() => applyRentalData(doc.data, true)}
                                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition"
                                                    title="Clone as new"
                                                >
                                                    Clone
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RentalBills;
