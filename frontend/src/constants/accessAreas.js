/**
 * Krishna ERP - Enterprise Access Areas Registry
 * Maps each ERP administrative section to its unique identifier, route path, display name, and category.
 */

export const ERP_ACCESS_AREAS = [
    {
        category: 'Financial Management & Billing',
        description: 'Core financial ledgers, customer invoicing, cost estimation, bills, and payment records',
        items: [
            { id: 'finance', name: 'Financial Hub', path: '/admin/finance', desc: 'Accounts overview, expense vouchers, salary payouts & cashflow' },
            { id: 'invoices-studio', name: 'Invoice Studio', path: '/admin/invoices-studio', desc: 'Tax invoices, customer billing ledger, and receipt generation' },
            { id: 'quotes', name: 'Formal Quotes', path: '/admin/quotes', desc: 'Formal client quotations, proposals, and quotation history' },
            { id: 'quotations-studio', name: 'Quotation Studio', path: '/admin/quotations-studio', desc: 'Advanced technical quotation builder and cost breakdown calculator' },
            { id: 'labour-bills', name: 'Labour & Freight Bills', path: '/admin/labour-bills', desc: 'Contractor labour wage billing and external transport vouchers' },
            { id: 'rental-bills', name: 'Equipment Rental Studio', path: '/admin/rental-bills', desc: 'Heavy machinery, crane, and construction equipment lease billing' },
            { id: 'bom-costing', name: 'BOM & Costing', path: '/admin/bom-costing', desc: 'Bill of materials, fabrication estimation, and scrap sales' },
            { id: 'analytics', name: 'Analytics Hub', path: '/admin/analytics', desc: 'Revenue analytics, financial audit reports, and performance charts' }
        ]
    },
    {
        category: 'Operations, Projects & Production',
        description: 'Project delivery, factory fabrication planning, work orders, drawings, and quality control',
        items: [
            { id: 'dashboard', name: 'Core Dashboard', path: '/admin', desc: 'Enterprise overview, plant activity feed, and primary shortcuts' },
            { id: 'projects', name: 'Projects Hub', path: '/admin/projects', desc: 'Client engineering projects, milestone timelines, and deliveries' },
            { id: 'production-planning', name: 'Production Plans', path: '/admin/production-planning', desc: 'Workshop floor daily schedules, batch output, and machine shifts' },
            { id: 'progress', name: 'Project Timeline', path: '/admin/progress', desc: 'Gantt chart progress milestones and site erection tracking' },
            { id: 'tasks', name: 'Task Assignment Hub', path: '/admin/tasks', desc: 'Staff job assignments, priority deadlines, and task completions' },
            { id: 'drawings', name: 'Fabrication Drawings', path: '/admin/drawings', desc: 'Engineering CAD drawings, blueprints, and client revision stamps' },
            { id: 'scrap-waste', name: 'Scrap & Wastage', path: '/admin/scrap-waste', desc: 'Material scrap registry, recovery operations, and recycle audits' },
            { id: 'defects', name: 'Rework & Defects', path: '/admin/defects', desc: 'Quality audit tickets, fabrication defects, and corrective actions' },
            { id: 'warranty-service', name: 'Warranty & Service', path: '/admin/warranty-service', desc: 'Equipment maintenance tickets, warranty claims, and servicing' }
        ]
    },
    {
        category: 'Inventory, Fleet & Logistics',
        description: 'Raw materials stock, tools custody, company transport fleet, and real-time GPS tracking',
        items: [
            { id: 'inventory', name: 'Inventory & Tools', path: '/admin/inventory', desc: 'Warehouse materials, tool custody tracking, and inter-site stock transfers' },
            { id: 'fleet', name: 'Fleet Logistics', path: '/admin/fleet', desc: 'Company vehicle registry, driver assignments, and delivery cargo trips' },
            { id: 'live-tracking', name: 'Live Field Tracking', path: '/admin/live-tracking', desc: 'Real-time GPS tracking of drivers and field staff on active duty' }
        ]
    },
    {
        category: 'Human Resources & Workforce',
        description: 'Employee directory, face biometric attendance, shift rotations, and leave approvals',
        items: [
            { id: 'staff', name: 'Staff Management', path: '/admin/staff', desc: 'Employee master records, biometric enrollment, and salary settings' },
            { id: 'logs', name: 'Attendance Hub', path: '/admin/logs', desc: 'Biometric punch cards, attendance verification, and exceptions log' },
            { id: 'shifts', name: 'Shift Control', path: '/admin/shifts', desc: 'Plant working shifts, rotational timings, and shift assignment' },
            { id: 'leave', name: 'Leave Requests', path: '/admin/leave', desc: 'Employee leave applications, duty off approvals, and leave ledger' },
            { id: 'careers', name: 'Careers & Notices', path: '/admin/careers', desc: 'Job postings, employment vacancy notices, and public career board' },
            { id: 'applications', name: 'Applications', path: '/admin/applications', desc: 'Candidate job applications, resume screening, and applicant status' }
        ]
    },
    {
        category: 'CRM, Hospitality & Communications',
        description: 'Customer inquiries, deal pipeline, residency bookings, and instant messaging desk',
        items: [
            { id: 'crm', name: 'CRM Pipeline', path: '/admin/crm', desc: 'Customer leads, client quotation pipeline, deal stages, and followup' },
            { id: 'lodge-manager', name: 'Lodge Manager', path: '/admin/lodge-manager', desc: 'Residency building rooms, tenant check-ins, and rent reconciliation' },
            { id: 'live-chat', name: 'Technical Chat', path: '/admin/live-chat', desc: 'Customer live support chat, ticket resolution, and incoming queries' },
            { id: 'whatsapp', name: 'WhatsApp Relay', path: '/admin/whatsapp', desc: 'Automated notification delivery logs and direct client messaging' },
            { id: 'notifications', name: 'Notification Center', path: '/admin/notifications', desc: 'System alerts, dispatch reminders, and critical milestone warnings' },
            { id: 'ai-assistant', name: 'AI ERP Copilot', path: '/admin/ai-assistant', desc: 'Intelligent AI assistant for database queries and workflow analysis' },
            { id: 'ai-chat', name: 'AI Command Center', path: '/admin/ai-chat', desc: 'Interactive calculations, engineering formula prompts, and AI chat' }
        ]
    },
    {
        category: 'Documentation & System Administration',
        description: 'Digital letterhead, published articles, document archives, and core platform configuration',
        items: [
            { id: 'document-history', name: 'Document History', path: '/admin/document-history', desc: 'Generated PDFs, invoice archives, signed delivery challans' },
            { id: 'letter-pad', name: 'Digital Letter Pad', path: '/admin/letter-pad', desc: 'Official digital company letterhead editor and communications archive' },
            { id: 'portfolio', name: 'Visual Portfolio', path: '/admin/portfolio', desc: 'Company engineering works gallery, client portfolio showcase' },
            { id: 'blog', name: 'Intelligence Feed', path: '/admin/blog', desc: 'Company technical updates, engineering articles, and corporate blog' },
            { id: 'users', name: 'User Management', path: '/admin/users', desc: 'System accounts, customer credentials, and security role administration' },
            { id: 'settings', name: 'System Core', path: '/admin/settings', desc: 'Company profile, legal GSTIN, system backups, and global preferences' },
            { id: 'legal-policies', name: 'Legal & Privacy', path: '/admin/legal-policies', desc: 'Customer terms of service, privacy policies, and refund rules' }
        ]
    }
];

// Flattened list of all valid area IDs
export const ALL_ACCESS_AREA_IDS = ERP_ACCESS_AREAS.flatMap(cat => cat.items.map(i => i.id));

// Suggested defaults for Manager and Finance Admin roles
export const SUGGESTED_ROLE_AREAS = {
    finance_admin: [
        'finance',
        'invoices-studio',
        'quotes',
        'quotations-studio',
        'labour-bills',
        'rental-bills',
        'bom-costing',
        'analytics',
        'document-history'
    ],
    manager: [
        'dashboard',
        'projects',
        'production-planning',
        'progress',
        'tasks',
        'drawings',
        'scrap-waste',
        'defects',
        'inventory',
        'fleet',
        'live-tracking',
        'logs',
        'leave',
        'crm'
    ]
};

/**
 * Checks whether a given user object has access to a specific area or route path
 */
export const hasUserAccessToArea = (user, pathOrAreaId) => {
    if (!user) return false;
    const role = (user.role || user.user?.role || '').toLowerCase();
    
    // Super-admin has full, unrestricted access to all ERP modules
    if (role === 'admin') return true;

    // Only manager and finance_admin possess granular modular access
    if (role !== 'manager' && role !== 'finance_admin') {
        return false;
    }

    const userAreas = [
        ...(Array.isArray(user.accessAreas) ? user.accessAreas : []),
        ...(Array.isArray(user.permissions) ? user.permissions : []),
        ...(Array.isArray(user.user?.accessAreas) ? user.user.accessAreas : []),
        ...(Array.isArray(user.user?.permissions) ? user.user.permissions : [])
    ].map(a => String(a).toLowerCase().trim().replace(/^\/admin\//, '').replace(/^\//, ''));

    // If no access areas were assigned, access is strictly denied
    if (userAreas.length === 0) return false;

    const normalizedTarget = String(pathOrAreaId || '')
        .toLowerCase()
        .trim()
        .replace(/^\/admin\//, '')
        .replace(/^\//, '');

    const targetSlug = normalizedTarget === '' ? 'dashboard' : normalizedTarget;

    // Direct match
    if (userAreas.includes(targetSlug) || userAreas.includes(normalizedTarget)) {
        return true;
    }

    // Match by path prefix for sub-routes
    for (const area of userAreas) {
        if (targetSlug === area || targetSlug.startsWith(area + '/')) {
            return true;
        }
    }

    return false;
};
