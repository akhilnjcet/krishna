/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MANGLISH & MULTILINGUAL NORMALIZER FOR ERP QUERIES
 * Normalizes colloquial, informal, Malayalam, and Manglish phrases into 
 * structured semantic intents, entities, temporal windows, and filters.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Malayalam & Manglish dictionary mapping
const PHONETIC_PATTERNS = [
    // ─── LEAVE & ABSENCE ───
    {
        intent: 'HR_LEAVE',
        patterns: [
            /leave/i,
            /avidhi/i,
            /avadhi/i,
            /leav/i,
            /aarkk?okke.*leave/i,
            /ethra.*per.*leave/i,
            /leave.*aanu/i,
            /leave.*und/i,
            /leave.*eduth/i,
            /leave.*list/i,
            /on\s*leave/i
        ]
    },

    // ─── ATTENDANCE ───
    {
        intent: 'HR_ATTENDANCE',
        patterns: [
            /attendance/i,
            /attendence/i,
            /atendance/i,
            /haajari/i,
            /hajari/i,
            /present/i,
            /absent/i,
            /vannavar/i,
            /varathavar/i,
            /innu.*aaranu/i,
            /who.*is.*absent/i,
            /who.*is.*present/i,
            /today.*attendance/i
        ]
    },

    // ─── DRIVERS ───
    {
        intent: 'DRIVERS',
        patterns: [
            /\bdriver\b/i,
            /\bdrivers\b/i,
            /drivermaar/i,
            /drivermar/i,
            /saaradhi/i,
            /driver.*details/i,
            /driver.*kaanikk/i,
            /driver.*list/i,
            /registered.*drivers/i,
            /active.*drivers/i,
            /available.*drivers/i,
            /drivers.*on.*trip/i
        ]
    },

    // ─── FLEET TRIPS (SPECIFIC TRIP LISTS & TODAY'S TRIPS) ───
    {
        intent: 'FLEET_TRIPS',
        patterns: [
            /today.*trip/i,
            /innathe.*trip/i,
            /active.*trip/i,
            /delivery.*schedule/i,
            /pickup.*delivery/i,
            /tripukal/i
        ]
    },

    // ─── VEHICLES & FLEET ───
    {
        intent: 'VEHICLES_FLEET',
        patterns: [
            /ethra.*vehicle.*trip/i,
            /vandi.*tripil/i,
            /vehicle.*tripil/i,
            /vehicles.*on.*trip/i,
            /vehicles.*available/i,
            /available.*vehicle/i,
            /running.*vehicles/i,
            /vehicle.*running/i,
            /\bvehicle\b/i,
            /\bvehicles\b/i,
            /\bvandi\b/i,
            /\bvandikal\b/i,
            /\bfleet\b/i,
            /\btruck\b/i,
            /\btrucks\b/i,
            /\blorry\b/i,
            /\blorries\b/i,
            /\bpickup\b/i
        ]
    },

    // ─── FLEET TRIPS (GENERAL FALLBACK) ───
    {
        intent: 'FLEET_TRIPS',
        patterns: [
            /\btrip\b/i,
            /\btrips\b/i,
            /tripil/i
        ]
    },

    // ─── E-WAY BILLS & TRANSPORT DOCS ───
    {
        intent: 'EWAY_BILLS',
        patterns: [
            /e-?way\s*bills?/i,
            /eway\s*bills?/i,
            /challans?/i,
            /transport\s*documents?/i,
            /expiring\s*e-?way/i,
            /e-?way.*expir/i,
            /fitness.*expiry/i,
            /insurance.*expiry/i
        ]
    },

    // ─── TRANSPORT COSTS & EXPENSES ───
    {
        intent: 'TRANSPORT_COSTS',
        patterns: [
            /transport\s*cost/i,
            /transport\s*expense/i,
            /transport\s*spend/i,
            /spent\s*on\s*transport/i,
            /freight/i,
            /vehicle\s*cost/i,
            /fuel\s*cost/i,
            /diesel\s*cost/i,
            /vandi\s*chilavu/i,
            /transport\s*chilavu/i,
            /lorry\s*vaadaka/i
        ]
    },

    // ─── LABOUR COSTS ───
    {
        intent: 'LABOUR_COSTS',
        patterns: [
            /labour\s*cost/i,
            /labor\s*cost/i,
            /labour\s*expense/i,
            /kooli/i,
            /worker\s*cost/i,
            /wages/i,
            /daily\s*wages/i
        ]
    },

    // ─── PROJECT DELAYS & STATUS ───
    {
        intent: 'PROJECTS',
        patterns: [
            /project/i,
            /projects/i,
            /paddhathi/i,
            /panikal/i,
            /delayed\s*project/i,
            /project.*delay/i,
            /etha.*project.*delay/i,
            /delay\s*aayath/i,
            /vaikiya/i,
            /overdue\s*project/i,
            /behind\s*schedule/i
        ]
    },

    // ─── INVENTORY & MATERIALS SHORTAGE ───
    {
        intent: 'INVENTORY',
        patterns: [
            /material/i,
            /materials/i,
            /inventory/i,
            /stock/i,
            /saadhanam/i,
            /shortage/i,
            /low\s*stock/i,
            /running\s*low/i,
            /kuravulla/i,
            /stock\s*kuravu/i,
            /theernnu/i,
            /steel/i,
            /plate/i,
            /pipe/i,
            /welding\s*rod/i,
            /reorder/i,
            /material\s*request/i
        ]
    },

    // ─── PRODUCTION & JOBS ───
    {
        intent: 'PRODUCTION',
        patterns: [
            /production/i,
            /job\s*order/i,
            /work\s*order/i,
            /fabrication/i,
            /innathe\s*production/i,
            /production\s*ethra/i,
            /manufacturing/i,
            /cutting.*bending/i
        ]
    },

    // ─── MACHINERY & DOWNTIME ───
    {
        intent: 'MACHINERY',
        patterns: [
            /machine/i,
            /machinery/i,
            /equipment/i,
            /downtime/i,
            /breakdown/i,
            /panimudakku/i,
            /thakararu/i,
            /repair/i,
            /tool\s*repair/i,
            /under\s*maintenance/i,
            /lathe/i,
            /crane/i,
            /generator/i
        ]
    },

    // ─── FINANCE & PAYMENTS ───
    {
        intent: 'FINANCES',
        patterns: [
            /pending\s*payment/i,
            /customer\s*payment/i,
            /outstanding/i,
            /receivable/i,
            /invoice/i,
            /invoices/i,
            /unpaid/i,
            /balance/i,
            /paisa/i,
            /panam/i,
            /kaash/i,
            /pending.*ethra/i,
            /ethra.*kittan/i,
            /revenue/i,
            /income/i,
            /expense/i,
            /cash\s*flow/i
        ]
    },

    // ─── SALARY & PAYROLL ───
    {
        intent: 'SALARY',
        patterns: [
            /salary/i,
            /salaries/i,
            /payroll/i,
            /shambalam/i,
            /sambalam/i,
            /pay\s*slip/i,
            /net\s*salary/i,
            /pending\s*salary/i
        ]
    },

    // ─── USER'S OWN VEHICLE / TRIPS ───
    {
        intent: 'MY_VEHICLE',
        patterns: [
            /my\s*vehicle/i,
            /my\s*truck/i,
            /my\s*car/i,
            /my\s*van/i,
            /assigned\s*to\s*me/i,
            /my\s*assigned/i,
            /enikku\s*ulla\s*vandi/i,
            /ente\s*vandi/i
        ]
    },
    {
        intent: 'MY_TRIPS',
        patterns: [
            /my\s*trips?/i,
            /my\s*routes?/i,
            /my\s*schedules?/i,
            /ente\s*trip/i
        ]
    },

    // ─── EXECUTIVE / BUSINESS SUMMARY ───
    {
        intent: 'EXECUTIVE_SUMMARY',
        patterns: [
            /business\s*summary/i,
            /executive\s*summary/i,
            /executive\s*briefing/i,
            /company\s*performance/i,
            /overall\s*summary/i,
            /erp\s*summary/i,
            /dashboard\s*summary/i,
            /overall\s*status/i
        ]
    },

    // ─── GREETING ───
    {
        intent: 'GREETING',
        patterns: [
            /^hi$/i,
            /^hello$/i,
            /^hey$/i,
            /^namaskaram$/i,
            /^namaste$/i,
            /who\s*are\s*you/i,
            /what\s*can\s*you\s*do/i,
            /help/i,
            /capabilities/i
        ]
    }
];

/**
 * Temporal window extractor
 * Understands: innu/today, innale/yesterday, ee maasam/this month, upcoming
 */
function extractTimeRange(query) {
    const q = query.toLowerCase();

    if (q.includes('innu') || q.includes('today') || q.includes('innathe') || q.includes('current')) {
        return 'today';
    }
    if (q.includes('innale') || q.includes('yesterday') || q.includes('innalathe')) {
        return 'yesterday';
    }
    if (q.includes('this month') || q.includes('ee maasam') || q.includes('ee masam') || q.includes('ee masathe')) {
        return 'this_month';
    }
    if (q.includes('expiring') || q.includes('upcoming') || q.includes('adutha') || q.includes('ini ulla')) {
        return 'upcoming';
    }
    return 'all';
}

/**
 * Filter flag extractor
 * Identifies: only absent, delayed only, low stock only, on trip only, available only
 */
function extractFilters(query) {
    const q = query.toLowerCase();
    const filters = {};

    if (q.includes('absent') || q.includes('varathavar')) filters.status = 'Absent';
    if (q.includes('present') || q.includes('vannavar')) filters.status = 'Present';
    if (q.includes('leave') || q.includes('avidhi')) filters.status = 'Leave';

    if (q.includes('delay') || q.includes('overdue') || q.includes('late') || q.includes('vaikiya')) filters.delayedOnly = true;
    if (q.includes('low stock') || q.includes('shortage') || q.includes('kuravulla')) filters.lowStockOnly = true;

    if (q.includes('active') || q.includes('running')) filters.activeOnly = true;
    if (q.includes('available')) filters.availableOnly = true;
    if (q.includes('trip') || q.includes('tripil') || q.includes('on trip')) filters.onTripOnly = true;

    if (q.includes('department') || q.includes('dept')) filters.groupBy = 'department';

    return filters;
}

/**
 * Detect language: 'malayalam' | 'manglish' | 'english'
 */
function detectLanguage(rawQuery) {
    // Malayalam Unicode Range: U+0D00 - U+0D7F
    const hasMalayalamScript = /[\u0D00-\u0D7F]/.test(rawQuery);
    if (hasMalayalamScript) return 'malayalam';

    const manglishMarkers = [
        'innu', 'innathe', 'innale', 'ethra', 'und', 'aanu', 'kaanikk', 'para',
        'aarkokke', 'aarokke', 'vandi', 'vandikal', 'paisa', 'panam', 'kaash',
        'kuravu', 'theernnu', 'panikal', 'chilavu', 'kooli', 'shambalam',
        'tripil', 'eduthavar', 'varan', 'kittan'
    ];
    const qLower = rawQuery.toLowerCase();
    const hasManglish = manglishMarkers.some(m => new RegExp(`\\b${m}\\b`, 'i').test(qLower));
    if (hasManglish) return 'manglish';

    return 'english';
}

/**
 * Main Normalizer function
 */
exports.normalizeErpQuery = (rawQuery) => {
    if (!rawQuery || typeof rawQuery !== 'string') {
        return { intent: 'UNKNOWN', cleanQuery: '', language: 'english', timeRange: 'all', filters: {} };
    }

    const cleanQuery = rawQuery.trim();
    const language = detectLanguage(cleanQuery);
    const timeRange = extractTimeRange(cleanQuery);
    const filters = extractFilters(cleanQuery);

    let detectedIntent = 'UNKNOWN';

    for (const item of PHONETIC_PATTERNS) {
        for (const pattern of item.patterns) {
            if (pattern.test(cleanQuery)) {
                detectedIntent = item.intent;
                break;
            }
        }
        if (detectedIntent !== 'UNKNOWN') break;
    }

    return {
        intent: detectedIntent,
        cleanQuery,
        language,
        timeRange,
        filters
    };
};
