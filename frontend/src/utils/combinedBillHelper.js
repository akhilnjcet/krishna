import { numberToIndianRupees } from './numberToIndianRupees';

/**
 * Pre-configured Product & Service Catalog for Krishna Engineering Works ERP
 */
export const PRECONFIGURED_CATALOG = [
    // Structural Steel & PEB Raw Materials
    {
        id: 'cat-steel-1',
        category: 'Structural Steel',
        name: 'ISMB 150 Heavy Steel I-Beam',
        description: 'IS 2062 Grade A heavy duty structural steel joist/beam for primary columns & rafters',
        price: 4600,
        unit: 'Kg',
        taxRate: 18
    },
    {
        id: 'cat-steel-2',
        category: 'Structural Steel',
        name: 'ISMB 200 Heavy Steel Column Section',
        description: 'IS 2062 heavy industrial steel beam for main eave columns and crane gantry girders',
        price: 6800,
        unit: 'Kg',
        taxRate: 18
    },
    {
        id: 'cat-steel-3',
        category: 'Structural Steel',
        name: 'Square Hollow Section (SHS 80x80x4mm)',
        description: 'High-tensile square tubular steel section for engineered roof trusses and wind bracings',
        price: 890,
        unit: 'Metres',
        taxRate: 18
    },
    {
        id: 'cat-steel-4',
        category: 'Structural Steel',
        name: 'Rectangular Hollow Section (RHS 100x50x4mm)',
        description: 'Cold-formed hollow steel tube for heavy structural purlins and girts',
        price: 940,
        unit: 'Metres',
        taxRate: 18
    },
    {
        id: 'cat-steel-5',
        category: 'Structural Steel',
        name: 'High-Tensile Foundation Anchor Bolt Kit (M20x600mm)',
        description: 'Heavy duty foundation anchor bolt with double hex nuts, heavy washers, and template plate',
        price: 420,
        unit: 'Sets',
        taxRate: 18
    },

    // Roofing & Cladding
    {
        id: 'cat-roof-1',
        category: 'Roofing & Cladding',
        name: 'Galvalume PPGL 0.50mm Trapezoidal Roof Sheet',
        description: 'AZ150 alloy coated (55% Al, 43.5% Zn), premium exterior weather-shield color profile',
        price: 1350,
        unit: 'Metres',
        taxRate: 18
    },
    {
        id: 'cat-roof-2',
        category: 'Roofing & Cladding',
        name: 'Galvalume PPGL 0.45mm Wall Cladding Sheet',
        description: 'Corrosion-resistant exterior side cladding sheet with customized color coat',
        price: 1180,
        unit: 'Metres',
        taxRate: 18
    },
    {
        id: 'cat-roof-3',
        category: 'Roofing & Cladding',
        name: 'Polycarbonate Multiwall Daylight Sheet (2mm)',
        description: 'UV-coated shatterproof transparent roof skylight sheet with 85% natural daylight transmission',
        price: 2450,
        unit: 'Metres',
        taxRate: 18
    },
    {
        id: 'cat-roof-4',
        category: 'Roofing & Cladding',
        name: 'Heavy Duty Galvalume Ridge Cap (0.50mm)',
        description: 'Ridge crest flashings with pre-notched profile for factory peak waterproofing',
        price: 680,
        unit: 'Metres',
        taxRate: 18
    },
    {
        id: 'cat-roof-5',
        category: 'Roofing & Cladding',
        name: 'Heavy Industrial Rainwater Gutter & Downpipe Kit',
        description: 'Fabricated 1.2mm GI rainwater gutter with heavy discharge spouts and brackets',
        price: 850,
        unit: 'Metres',
        taxRate: 18
    },

    // Fabrication & Labor Services
    {
        id: 'cat-labor-1',
        category: 'Fabrication & Labor',
        name: 'Industrial Heavy Truss Fabrication Work',
        description: 'Complete workshop fabrication of roof trusses, cutting, fitting, weld preparation, and jig assembly',
        price: 110000,
        unit: 'Job',
        taxRate: 18
    },
    {
        id: 'cat-labor-2',
        category: 'Fabrication & Labor',
        name: 'On-site Erection & Crane Alignment Labor',
        description: 'Hydraulic mobile crane rigging, column plumbling, torque tightening, and high-altitude bolt fastening',
        price: 32000,
        unit: 'Job',
        taxRate: 18
    },
    {
        id: 'cat-labor-3',
        category: 'Fabrication & Labor',
        name: 'Certified Structural Welding (MIG / SMAW)',
        description: 'High-tensile full-penetration welding conforming to AWS D1.1 structural welding standards',
        price: 1850,
        unit: 'Days',
        taxRate: 18
    },
    {
        id: 'cat-labor-4',
        category: 'Fabrication & Labor',
        name: 'Two-Coat Epoxy Zinc Phosphate Primer Application',
        description: 'Surface preparation, wire-brush descaling, and high-build anti-corrosive primer coating',
        price: 28,
        unit: 'Sq.Ft',
        taxRate: 18
    },
    {
        id: 'cat-labor-5',
        category: 'Fabrication & Labor',
        name: 'Skilled Structural Fitter & Helper Crew (Daily Wage)',
        description: 'Dedicated site crew including senior fabricator/fitter + 2 skilled riggers',
        price: 3400,
        unit: 'Shifts',
        taxRate: 18
    },

    // Logistics & Transport
    {
        id: 'cat-trans-1',
        category: 'Transport & Logistics',
        name: 'Multi-Axle Trailer Freight Dispatch (Palakkad to Kochi)',
        description: 'Heavy trailer transit for oversized 40ft truss girders and steel sections',
        price: 18500,
        unit: 'Trips',
        taxRate: 5
    },
    {
        id: 'cat-trans-2',
        category: 'Transport & Logistics',
        name: 'Medium Goods Truck Freight (Palakkad to Thrissur/Malappuram)',
        description: 'Direct freight delivery for roofing sheets, purlins, fasteners, and accessories',
        price: 8500,
        unit: 'Trips',
        taxRate: 5
    },
    {
        id: 'cat-trans-3',
        category: 'Transport & Logistics',
        name: 'Site Mobile Crane Loading & Unloading Charge',
        description: '15-Ton Hydra mobile crane loading at works yard and unloading at installation site',
        price: 6000,
        unit: 'Shifts',
        taxRate: 18
    },

    // Rental Assets
    {
        id: 'cat-rent-1',
        category: 'Rental Assets',
        name: '400A Diesel Generator Welding Set',
        description: 'Heavy duty mobile diesel driven dual-operator welding generator unit',
        price: 2200,
        unit: 'Days',
        taxRate: 18
    },
    {
        id: 'cat-rent-2',
        category: 'Rental Assets',
        name: 'Magnetic Base Core Drill Machine (Up to 50mm)',
        description: 'Portable industrial electromagnetic core drilling machine with annular cutters',
        price: 1200,
        unit: 'Days',
        taxRate: 18
    },
    {
        id: 'cat-rent-3',
        category: 'Rental Assets',
        name: 'Steel Tubular Scaffolding Set (50 Frames + Cross Braces)',
        description: 'Heavy duty modular scaffolding frames with safety pins, walk boards, and swivel base jacks',
        price: 4500,
        unit: 'Weeks',
        taxRate: 18
    },
    {
        id: 'cat-rent-4',
        category: 'Rental Assets',
        name: '5-Ton Lifting Chain Pulley Block with Webbing Slings',
        description: 'Certified 5T spur gear chain hoist with 6-metre lift height and heavy rated safety hooks',
        price: 450,
        unit: 'Days',
        taxRate: 18
    },
    {
        id: 'cat-rent-5',
        category: 'Rental Assets',
        name: 'Airless Paint Spray Machine (High Pressure)',
        description: 'Electric airless diaphragm spray pump for rapid uniform structural painting',
        price: 1500,
        unit: 'Days',
        taxRate: 18
    }
];

/**
 * Computes billing financials including line item extensions, combined bundles,
 * discounts (percentage or fixed), tax/GST, and grand totals.
 */
export function computeBillFinancials({
    items = [],
    discountType = 'none', // 'none' | 'percent' | 'fixed'
    discountValue = 0,
    taxPercentage = 18,
    showTax = true,
    advancePaid = 0
}) {
    // Group or sum items
    let subtotal = 0;
    const processedItems = items.map(item => {
        const qty = parseFloat(item.quantity ?? 1) || 0;
        const rate = parseFloat(item.rate ?? item.price ?? 0) || 0;
        const lineTotal = item.isBundleHeader && item.bundlePrice !== undefined
            ? parseFloat(item.bundlePrice || 0)
            : qty * rate;

        // If this item is part of a bundled section whose price is governed by the header, we don't double count
        if (!item.isChildOfBundle) {
            subtotal += lineTotal;
        }

        return {
            ...item,
            lineTotal
        };
    });

    // Discount
    let discountAmount = 0;
    const numDisc = parseFloat(discountValue) || 0;
    if (discountType === 'percent') {
        discountAmount = (subtotal * Math.min(100, Math.max(0, numDisc))) / 100;
    } else if (discountType === 'fixed') {
        discountAmount = Math.min(subtotal, Math.max(0, numDisc));
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxRate = parseFloat(taxPercentage) || 0;
    const taxAmount = showTax ? (taxableAmount * taxRate) / 100 : 0;
    const grandTotal = taxableAmount + taxAmount;
    const numAdvance = parseFloat(advancePaid) || 0;
    const balanceDue = Math.max(0, grandTotal - numAdvance);

    return {
        processedItems,
        subtotal,
        discountType,
        discountValue: numDisc,
        discountAmount,
        taxableAmount,
        taxPercentage: taxRate,
        taxAmount,
        grandTotal,
        advancePaid: numAdvance,
        balanceDue,
        amountInWords: numberToIndianRupees(grandTotal),
        balanceInWords: numberToIndianRupees(balanceDue)
    };
}

/**
 * Group flat list of items into combined sections for display
 */
export function groupItemsBySections(items = []) {
    const sections = [];
    const unbundled = [];
    const sectionMap = new Map();

    items.forEach(item => {
        if (item.sectionId) {
            if (!sectionMap.has(item.sectionId)) {
                sectionMap.set(item.sectionId, {
                    sectionId: item.sectionId,
                    sectionName: item.sectionName || 'Combined Bundle',
                    bundlePrice: item.bundlePrice,
                    useBundleTotalOnly: Boolean(item.useBundleTotalOnly),
                    items: []
                });
            }
            sectionMap.get(item.sectionId).items.push(item);
        } else {
            unbundled.push(item);
        }
    });

    return {
        sections: Array.from(sectionMap.values()),
        standaloneItems: unbundled
    };
}

/**
 * Computes section metadata for each item in the list.
 * Identifies consecutive combined items and determines row spans,
 * section starts, section followers, and combined amounts.
 */
export const computeItemSectionMeta = (items = [], combinedTotals = {}, enableQuantity = true, enableUnitPrice = true) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    const metaList = [];
    const totalsObj = combinedTotals instanceof Map ? Object.fromEntries(combinedTotals) : (combinedTotals || {});

    let i = 0;
    while (i < items.length) {
        const item = items[i];
        const isCombined = Boolean(item.isCombinedMode ?? item.isCombined);

        if (!isCombined) {
            const hasQtyFlag = enableQuantity !== false && item.hasQuantity !== false;
            const hasQty = hasQtyFlag && item.quantity !== undefined && item.quantity !== null && item.quantity !== '' && Number(item.quantity) > 0;
            const qty = hasQty ? Number(item.quantity) : 1;
            const hasPriceFlag = enableUnitPrice !== false && item.hasUnitPrice !== false;
            const price = hasPriceFlag ? (Number(item.price ?? item.rate ?? item.dailyRate ?? 0) || 0) : 0;
            const hasDirectTotal = item.total !== undefined && item.total !== null && item.total !== '';
            const directTotal = hasDirectTotal ? Number(item.total) : null;
            const calculatedTotal = price > 0
                ? (item.autoCalculate !== false ? qty * price : price)
                : (directTotal !== null ? directTotal : (item.price ? Number(item.price) : 0));

            metaList.push({
                ...item,
                originalIndex: i,
                isCombined: false,
                hasQuantity: hasQtyFlag,
                hasUnitPrice: hasPriceFlag,
                sectionId: null,
                isSectionStart: false,
                sectionRowCount: 1,
                isSectionFollower: false,
                combinedAmount: null,
                displayPrice: hasPriceFlag && price > 0 ? price : null,
                displayTotal: directTotal !== null && price === 0 ? directTotal : calculatedTotal
            });
            i++;
        } else {
            // Start of a combined section
            const sectionId = item.combinedSectionId || item.sectionId || `sec-${i}-${Date.now()}`;
            let rowCount = 1;
            let j = i + 1;

            while (j < items.length) {
                const nextItem = items[j];
                const nextIsCombined = Boolean(nextItem.isCombinedMode ?? nextItem.isCombined);
                if (!nextIsCombined) break;
                // If explicitly flagged as a new section start, do not group with this section
                if (nextItem.isNewSectionStart) break;
                // If it already has a different defined section ID, keep them distinct
                const nextSectionId = nextItem.combinedSectionId || nextItem.sectionId;
                if (nextSectionId && nextSectionId !== sectionId) break;
                rowCount++;
                j++;
            }

            const rawAmount = totalsObj[sectionId] !== undefined ? totalsObj[sectionId] : item.combinedAmount;
            const combinedAmount = rawAmount !== undefined && rawAmount !== '' ? Number(rawAmount) : 0;

            // Add the first row (the section start with rowSpan)
            metaList.push({
                ...item,
                originalIndex: i,
                isCombined: true,
                hasQuantity: item.hasQuantity !== false,
                hasUnitPrice: item.hasUnitPrice !== false,
                sectionId: sectionId,
                isSectionStart: true,
                sectionRowCount: rowCount,
                isSectionFollower: false,
                combinedAmount: combinedAmount,
                displayPrice: null,
                displayTotal: null
            });

            // Add the remaining follower rows (their total cell will be spanned by the first row)
            for (let k = i + 1; k < j; k++) {
                metaList.push({
                    ...items[k],
                    originalIndex: k,
                    isCombined: true,
                    hasQuantity: items[k].hasQuantity !== false,
                    hasUnitPrice: items[k].hasUnitPrice !== false,
                    sectionId: sectionId,
                    isSectionStart: false,
                    sectionRowCount: 0,
                    isSectionFollower: true,
                    combinedAmount: combinedAmount,
                    displayPrice: null,
                    displayTotal: null
                });
            }

            i = j;
        }
    }

    return metaList;
};

/**
 * Calculates Grand Total, Subtotal, and Tax according to:
 * Grand Total = All combined-section amounts + All individual item totals
 */
export const calculateBillTotals = (items = [], combinedTotals = {}, showTax = false, discountType = 'none', discountValue = 0, taxPercentage = 18, enableQuantity = true, enableUnitPrice = true) => {
    const totalsObj = combinedTotals instanceof Map ? Object.fromEntries(combinedTotals) : (combinedTotals || {});

    // 1. Sum individual uncombined items
    let individualTotal = 0;
    (items || []).forEach(item => {
        const isCombined = Boolean(item.isCombinedMode ?? item.isCombined);
        if (!isCombined) {
            const hasQtyFlag = enableQuantity !== false && item.hasQuantity !== false;
            const hasQty = hasQtyFlag && item.quantity !== undefined && item.quantity !== null && item.quantity !== '' && Number(item.quantity) > 0;
            const qty = hasQty ? Number(item.quantity) : 1;
            const hasPriceFlag = enableUnitPrice !== false && item.hasUnitPrice !== false;
            const price = hasPriceFlag ? (Number(item.price ?? item.rate ?? item.dailyRate ?? 0) || 0) : 0;
            const hasDirectTotal = item.total !== undefined && item.total !== null && item.total !== '';
            const directTotal = hasDirectTotal ? Number(item.total) : null;
            const itemTotal = price > 0
                ? (item.autoCalculate !== false ? qty * price : (directTotal !== null ? directTotal : price))
                : (directTotal !== null ? directTotal : (item.price ? Number(item.price) : 0));

            individualTotal += itemTotal;
        }
    });

    // 2. Sum distinct combined sections that are currently present in items
    const activeSectionIds = new Set();
    (items || []).forEach(item => {
        const isCombined = Boolean(item.isCombinedMode ?? item.isCombined);
        const secId = item.combinedSectionId || item.sectionId;
        if (isCombined && secId) {
            activeSectionIds.add(secId);
        }
    });

    let combinedSectionsSum = 0;
    activeSectionIds.forEach(secId => {
        const amt = Number(totalsObj[secId]) || 0;
        combinedSectionsSum += amt;
    });

    const subTotal = individualTotal + combinedSectionsSum;

    // Discount
    let discountAmount = 0;
    const numDisc = parseFloat(discountValue) || 0;
    if (discountType === 'percent') {
        discountAmount = (subTotal * Math.min(100, Math.max(0, numDisc))) / 100;
    } else if (discountType === 'fixed') {
        discountAmount = Math.min(subTotal, Math.max(0, numDisc));
    }

    const taxableAmount = Math.max(0, subTotal - discountAmount);
    const taxRate = parseFloat(taxPercentage) || 0;
    const taxAmount = showTax ? (taxableAmount * taxRate) / 100 : 0;
    const totalAmount = taxableAmount + taxAmount;

    return {
        individualTotal,
        combinedSectionsSum,
        subTotal,
        discountAmount,
        taxableAmount,
        taxAmount,
        totalAmount
    };
};

/**
 * Synchronizes item section IDs and attributes linearly to guarantee
 * no overlapping sections, orphaned IDs, or duplicate assignments.
 */
export const synchronizeItemSections = (items = []) => {
    const result = [...items];
    let currentSectionId = null;

    for (let i = 0; i < result.length; i++) {
        const item = { ...result[i] };
        const isCombined = Boolean(item.isCombinedMode ?? item.isCombined);

        if (isCombined) {
            const prevIsCombined = i > 0 && Boolean(result[i - 1].isCombinedMode ?? result[i - 1].isCombined);

            if (!prevIsCombined || item.isNewSectionStart) {
                currentSectionId = item.combinedSectionId || item.sectionId || `sec-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`;
                item.combinedSectionId = currentSectionId;
                item.sectionId = currentSectionId;
                item.isNewSectionStart = prevIsCombined;
            } else {
                item.combinedSectionId = currentSectionId;
                item.sectionId = currentSectionId;
                item.isNewSectionStart = false;
            }

            item.isCombinedMode = true;
            item.isCombined = true;
            item.price = item.price !== undefined ? item.price : (item.rate || 0);
            item.total = 0;
        } else {
            currentSectionId = null;
            item.combinedSectionId = null;
            item.sectionId = null;
            item.isCombinedMode = false;
            item.isCombined = false;
            item.isNewSectionStart = false;
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price ?? item.rate ?? item.dailyRate ?? 0) || 0;
            item.total = item.autoCalculate !== false ? qty * price : price;
        }

        result[i] = item;
    }

    return result;
};
