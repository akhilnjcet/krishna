const mongoose = require('mongoose');

// Services
const { normalizeErpQuery } = require('../services/aiErp/manglishNormalizer');
const { resolveContextualIntent } = require('../services/aiErp/conversationContext');
const { checkModuleAccess } = require('../services/aiErp/erpModuleRegistry');
const resolvers = require('../services/aiErp/queryResolvers');
const { generateGroqResponse } = require('../services/aiErp/groqService');
const { performWebSearch, isExternalQuery } = require('../services/aiErp/webSearchService');
const { collectLiveErpData } = require('../services/aiErp/erpDataCollector');

// In-memory query audit log (last 100 queries)
const aiQueryAuditLogs = [];

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ENTITY SEARCH FALLBACK
 * If intent is generic UNKNOWN, checks whether user mentioned a specific
 * project title, driver name, vehicle registration number, or material.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function searchEntityDirectly(query, user) {
    const qTrim = query.trim();
    if (qTrim.length < 2) return null;

    const regex = new RegExp(qTrim, 'i');

    const Project = mongoose.model('Project');
    const Driver = mongoose.model('Driver');
    const Vehicle = mongoose.model('Vehicle');
    const InventoryItem = mongoose.model('InventoryItem');

    // 1. Try finding a driver
    const driver = await Driver.findOne({
        $or: [{ name: regex }, { phone: regex }, { licenseNumber: regex }]
    });
    if (driver) {
        return `### 👨‍✈️ Driver Record Found: **${driver.name}**\n\n- **Mobile**: ${driver.phone}\n- **Driving Licence**: \`${driver.licenseNumber}\` (${driver.licenseType || 'Commercial'})\n- **Licence Expiry**: ${driver.licenseExpiryDate ? new Date(driver.licenseExpiryDate).toLocaleDateString() : 'N/A'}\n- **Status**: **${driver.status}**\n- **Current Assigned Vehicle**: \`${driver.currentAssignedVehicle?.registrationNumber || 'Unassigned'}\`\n- **Emergency Contact**: ${driver.emergencyPhone || 'N/A'}`;
    }

    // 2. Try finding a vehicle
    const vehicle = await Vehicle.findOne({
        $or: [{ registrationNumber: regex }, { vehicleName: regex }]
    });
    if (vehicle) {
        return `### 🚙 Vehicle Record Found: **${vehicle.registrationNumber}**\n\n- **Vehicle Model**: **${vehicle.vehicleName}** (${vehicle.vehicleType})\n- **Status**: **${vehicle.status}**\n- **Odometer**: ${vehicle.currentOdometer?.toLocaleString()} km\n- **Fuel**: ${vehicle.fuelType}\n- **Assigned Driver**: **${vehicle.assignedDriverName || 'Unassigned'}**\n- **Tank Capacity**: ${vehicle.tankCapacityLiters || 60}L`;
    }

    // 3. Try finding a project
    const project = await Project.findOne({
        $or: [{ title: regex }, { projectCode: regex }, { 'client.name': regex }, { clientName: regex }]
    });
    if (project) {
        return `### 🏗️ Project Record Found: **${project.title}**\n\n- **Client**: ${project.client?.name || project.clientName || 'Commercial Client'}\n- **Status**: **${project.status}**\n- **Current Progress**: **${project.progress || 0}%**\n- **Deadline**: ${project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}\n- **Budget Value**: ₹${project.budget?.toLocaleString() || '—'}`;
    }

    // 4. Try finding an inventory item
    const item = await InventoryItem.findOne({
        $or: [{ name: regex }, { sku: regex }]
    });
    if (item) {
        return `### 📦 Inventory Record Found: **${item.name}**\n\n- **Category**: ${item.category || 'General'}\n- **Current Quantity**: **${item.quantity} ${item.unit || 'Kg'}**\n- **Safety Minimum Threshold**: ${item.minThreshold || 0} ${item.unit || 'Kg'}\n- **Unit Rate**: ₹${item.unitRate || 0} / ${item.unit || 'Kg'}\n- **Stock Health**: ${item.quantity <= (item.minThreshold || 0) ? '🔴 Low Stock (Reorder Alert)' : '🟢 Sufficient Stock'}`;
    }

    return null;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GREETING HANDLER
 * ─────────────────────────────────────────────────────────────────────────────
 */
function handleGreeting(user, language = 'english') {
    const greetingName = user?.name ? `**${user.name}**` : 'there';

    if (language === 'malayalam' || language === 'manglish') {
        return `നമസ്കാരം ${greetingName}! 👋 **Krishna Engineering Works AI ERP Copilot**-ലേക്ക് സ്വാഗതം.\n\nനമ്മുടെ ERP സിസ്റ്റത്തിലെ എല്ലാ ലൈവ് വിവരങ്ങളും എനിക്ക് ചോദിക്കാം:\n\n- **ഹാജരി & അവധി (Attendance & Leave)**: *"Innu ethra per leave aanu?"* അല്ലെങ്കിൽ *"Who is absent today?"*\n- **ഡ്രൈവർ & വാഹനങ്ങൾ (Drivers & Fleet)**: *"driver"*, *"Driver details kaanikk"*, അല്ലെങ്കിൽ *"Ethra vehicle tripil und?"*\n- **പ്രൊജക്റ്റുകൾ (Projects & Delays)**: *"Etha project delay aayath?"*\n- **മെറ്റീരിയൽസ് & സ്റ്റോക്ക് (Inventory)**: *"Stock kuravulla materials ethokkeya?"*\n- **പെയ്മെന്റ്സ് & ഫിനാൻസ് (Payments)**: *"Pending payment ethra und?"*\n- **പ്രൊഡക്ഷൻ (Production)**: *"Innathe production ethra aanu?"*\n\nഎന്താണ് താങ്കൾക്ക് ഇപ്പോൾ അറിയേണ്ടത്?`;
    }

    return `Hello, ${greetingName}! 👋 Welcome to the **Krishna Engineering Works AI ERP Copilot**.\n\nI am connected live across all ERP modules with zero stale or cached data. Here are a few things you can ask me:\n\n- **HR & Attendance**: *"How many employees are on leave today?"* or *"Who is absent today?"*\n- **Drivers & Fleet**: *"driver"*, *"Show all active drivers"*, or *"Which vehicles are available?"*\n- **Trips & Dispatches**: *"Show today's vehicle trips"* or *"Which drivers are on trips?"*\n- **E-Way Bills & Logistics**: *"Which E-Way Bills are expiring?"* or *"How much was spent on transport this month?"*\n- **Projects & Production**: *"Which projects are delayed?"* or *"What is today's production?"*\n- **Inventory & Materials**: *"Which materials are running low?"*\n${user.role === 'admin' ? '- **Finances & Receivables (Admin)**: *"Show pending customer payments"*\n' : ''}- **Executive Summary**: *"Summarize business performance"*\n\nHow can I assist your operations today?`;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * UNKNOWN INTENT CLARIFYING RESPONSE
 * ─────────────────────────────────────────────────────────────────────────────
 */
function handleUnknownIntent(query, language = 'english') {
    if (language === 'malayalam' || language === 'manglish') {
        return `### 🤖 AI ERP Copilot\n\nക്ഷമിക്കണം, **"${query}"** എന്ന ചോദ്യവുമായി ബന്ധപ്പെട്ട നിർദ്ദിഷ്ട ERP റെക്കോർഡ് കണ്ടെത്താനായില്ല.\n\nദയവായി താഴെ പറയുന്ന വിഭാഗങ്ങളിൽ ഒന്ന് ചോദിക്കുക:\n- **ഡ്രൈവർമാർ**: *"driver"*, *"Driver details kaanikk"* അല്ലെങ്കിൽ *"Active drivers"* \n- **അവധി & ഹാജരി**: *"Innu ethra per leave aanu?"*, *"Who is absent today?"*\n- **വാഹനങ്ങൾ**: *"Ethra vehicle tripil und?"*, *"Which vehicles are available?"*\n- **പ്രൊജക്റ്റുകൾ**: *"Etha project delay aayath?"*\n- **സ്റ്റോക്ക്**: *"Stock kuravulla materials ethokkeya?"*\n- **പെയ്മെന്റുകൾ**: *"Pending payment ethra und?"*`;
    }

    return `### 🤖 AI ERP Copilot\n\nI could not identify an explicit ERP category or record matching: **"${query}"**\n\nTo retrieve verified live records, please ask about any of the following ERP operations:\n\n- **Driver & Fleet Management**: e.g. *"driver"*, *"Show all active drivers"*, *"Which vehicles are running?"*\n- **Workforce & Attendance**: e.g. *"How many employees are on leave today?"*, *"Who is absent today?"*\n- **Logistics & Transport**: e.g. *"Which E-Way Bills are expiring?"*, *"How much was spent on transport this month?"*\n- **Projects & Milestones**: e.g. *"Which projects are delayed?"*, *"Show active projects"*\n- **Inventory & Shortages**: e.g. *"Which materials are running low?"*, *"Any material shortage?"*\n- **Production & Machinery**: e.g. *"What is today's production?"*, *"Which machines are under maintenance?"*\n- **Executive Briefing**: e.g. *"Summarize business performance"*`;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MAIN QUERY CONTROLLER ENDPOINT: POST /api/ai-erp/query
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.askAiAssistant = async (req, res) => {
    try {
        const { query, conversationHistory = [] } = req.body;
        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a question or query for the ERP assistant.'
            });
        }

        const user = req.user || { role: 'staff', name: 'Staff Member' };
        const rawQuery = query.trim();

        // 1. Normalize Query (Language detection, Phonetic Malayalam/Manglish mapping)
        let normalized = normalizeErpQuery(rawQuery);

        // 2. Resolve Contextual Intent if follow-up
        normalized = resolveContextualIntent(normalized, conversationHistory);

        // 3. Collect Live ERP Ground-Truth Data & enforce Role-Based Access
        const erpResult = await collectLiveErpData(normalized, user, rawQuery);
        if (erpResult.authorized === false) {
            return res.json({
                success: true,
                intent: normalized.intent,
                language: normalized.language,
                response: erpResult.reason,
                generatedAt: new Date()
            });
        }

        // 4. Check if external information / web search is needed
        let searchResults = [];
        const needsExternalSearch = isExternalQuery(rawQuery, normalized.intent);
        if (needsExternalSearch) {
            try {
                searchResults = await performWebSearch(rawQuery);
            } catch (searchErr) {
                console.warn('Web search attempt failed:', searchErr.message);
            }
        }

        let responseText = null;
        let sources = [];
        let modelUsed = 'Rule-based Native Grounding';

        // 5. Query Groq Engine if configured
        if (process.env.GROQ_API_KEY) {
            try {
                const groqResult = await generateGroqResponse({
                    query: rawQuery,
                    liveData: erpResult.data,
                    searchResults,
                    conversationHistory,
                    user,
                    language: normalized.language
                });

                if (groqResult?.content) {
                    responseText = groqResult.content;
                    sources = groqResult.sources || [];
                    modelUsed = groqResult.modelUsed || 'Groq AI';
                }
            } catch (groqErr) {
                console.warn('Groq generation fallback triggered:', groqErr.message);
            }
        }

        // 6. Resilient Fallback: If Groq was not available or failed, use authoritative native resolvers
        if (!responseText) {
            if (erpResult.data) {
                if (typeof erpResult.data === 'string') {
                    responseText = erpResult.data;
                } else {
                    responseText = `### 📋 Live ERP Records Found\n\n\`\`\`json\n${JSON.stringify(erpResult.data, null, 2)}\n\`\`\``;
                }
            } else if (searchResults.length > 0) {
                responseText = `### 🌐 External Web Search Findings\n\n`;
                searchResults.forEach((sr, idx) => {
                    responseText += `${idx + 1}. **[${sr.title}](${sr.url})**\n   ${sr.snippet}\n\n`;
                });
                sources = searchResults.map(s => ({ title: s.title, url: s.url, source: s.source }));
            } else if (normalized.intent === 'GREETING') {
                responseText = handleGreeting(user, normalized.language);
            } else {
                responseText = handleUnknownIntent(rawQuery, normalized.language);
            }
        }

        // 7. Bilingual header if user queried in Malayalam/Manglish and header not already included
        if ((normalized.language === 'malayalam' || normalized.language === 'manglish') && 
            normalized.intent !== 'GREETING' && 
            normalized.intent !== 'UNKNOWN' &&
            !responseText.includes('ലൈവ് വിവരങ്ങൾ')) {
            responseText = `> 🌐 **ലൈവ് വിവരങ്ങൾ (Live ERP Data Grounded)**\n\n` + responseText;
        }

        // 8. Generate Data Snapshot for Dashboard Widget
        const Project = mongoose.model('Project');
        const InventoryItem = mongoose.model('InventoryItem');
        const Vehicle = mongoose.model('Vehicle');

        const [activeProjects, delayedProjects, lowStockCount, totalVehicles] = await Promise.all([
            Project.countDocuments({ status: { $nin: ['completed', 'Completed', 'cancelled', 'Cancelled'] } }).catch(() => 0),
            Project.countDocuments({ status: { $nin: ['completed', 'Completed', 'cancelled', 'Cancelled'] }, deadline: { $lt: new Date() } }).catch(() => 0),
            InventoryItem.countDocuments({ type: 'material', $expr: { $lte: ['$quantity', '$minThreshold'] } }).catch(() => 0),
            Vehicle.countDocuments().catch(() => 0)
        ]);

        const dataSnapshot = {
            activeProjects,
            delayedProjects,
            lowStockCount,
            totalVehicles
        };

        // 9. Sanitized Audit log entry (strip passwords, tokens)
        const sanitizedQuery = rawQuery
            .replace(/\b(password|secret|token|pin)\s*[:=]\s*\S+/gi, '$1=***')
            .slice(0, 500);

        aiQueryAuditLogs.unshift({
            timestamp: new Date(),
            query: sanitizedQuery,
            intent: normalized.intent,
            language: normalized.language,
            userId: user._id || 'system',
            userName: user.name || 'User',
            userRole: user.role || 'staff',
            modelUsed
        });
        if (aiQueryAuditLogs.length > 100) aiQueryAuditLogs.pop();

        res.json({
            success: true,
            response: responseText,
            intent: normalized.intent,
            language: normalized.language,
            modelUsed,
            sources,
            dataSnapshot,
            generatedAt: new Date()
        });

    } catch (err) {
        console.error('AI ERP Assistant query error:', err);
        res.status(500).json({
            success: false,
            message: `Internal Query Processing Error: ${err.message}`
        });
    }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * GET AUDIT LOGS: GET /api/ai-erp/audit-logs (Admin Only)
 * ─────────────────────────────────────────────────────────────────────────────
 */
exports.getAiAuditLogs = async (req, res) => {
    try {
        res.json({
            success: true,
            logs: aiQueryAuditLogs
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
