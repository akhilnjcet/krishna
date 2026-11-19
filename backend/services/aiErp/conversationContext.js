/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CONVERSATIONAL MEMORY & FOLLOW-UP RESOLVER
 * Resolves context, references, and implicit filters from previous messages.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const FOLLOW_UP_PATTERNS = [
    { pattern: /^(how many are )?active\??$/i, patch: { activeOnly: true } },
    { pattern: /^(how many are )?on trips?\??$/i, patch: { onTripOnly: true } },
    { pattern: /^(how many are )?available\??$/i, patch: { availableOnly: true } },
    { pattern: /^only absent( employees)?\??$/i, patch: { filters: { status: 'Absent' } } },
    { pattern: /^only present( employees)?\??$/i, patch: { filters: { status: 'Present' } } },
    { pattern: /^only (on )?leave\??$/i, patch: { filters: { status: 'Leave' } } },
    { pattern: /^department wise\??$/i, patch: { filters: { groupBy: 'department' } } },
    { pattern: /^show (their )?names\??$/i, patch: { detailLevel: 'full' } },
    { pattern: /^(show )?details\??$/i, patch: { detailLevel: 'full' } }
];

exports.resolveContextualIntent = (normalizedQuery, conversationHistory = []) => {
    // Inspect previous messages if available
    if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
        return normalizedQuery;
    }

    const qLower = normalizedQuery.cleanQuery.toLowerCase().trim();
    const isFollowUp = FOLLOW_UP_PATTERNS.some(p => p.pattern.test(qLower)) ||
        qLower.startsWith('how many are') ||
        qLower.startsWith('which are') ||
        qLower.startsWith('only ') ||
        qLower.includes('department wise') ||
        qLower === 'details' ||
        qLower === 'names';

    // If not a follow-up and normalizedQuery already has an intent, return it directly
    if (!isFollowUp && normalizedQuery.intent && normalizedQuery.intent !== 'UNKNOWN') {
        return normalizedQuery;
    }

    // Find the most recent AI/User messages with an identifiable domain
    const lastUserTurn = [...conversationHistory].reverse().find(m => m.sender === 'user' && m.text);
    const lastAiTurn = [...conversationHistory].reverse().find(m => m.sender === 'ai' && m.text);

    const prevContextText = `${lastUserTurn?.text || ''} ${lastAiTurn?.text || ''}`.toLowerCase();

    // 1. Check for drivers follow-up
    if (prevContextText.includes('driver')) {
        if (qLower.includes('active') || qLower.includes('trip') || qLower.includes('available') || qLower.includes('name') || qLower.includes('list') || qLower.includes('how many')) {
            return {
                ...normalizedQuery,
                intent: 'DRIVERS',
                contextInherited: true
            };
        }
    }

    // 2. Check for attendance follow-up
    if (prevContextText.includes('attendance') || prevContextText.includes('present') || prevContextText.includes('absent')) {
        if (qLower.includes('absent') || qLower.includes('present') || qLower.includes('leave') || qLower.includes('department') || qLower.includes('name') || qLower.includes('list')) {
            return {
                ...normalizedQuery,
                intent: 'HR_ATTENDANCE',
                contextInherited: true
            };
        }
    }

    // 3. Check for vehicles follow-up
    if (prevContextText.includes('vehicle') || prevContextText.includes('fleet') || prevContextText.includes('truck')) {
        if (qLower.includes('running') || qLower.includes('trip') || qLower.includes('available') || qLower.includes('maintenance')) {
            return {
                ...normalizedQuery,
                intent: 'VEHICLES_FLEET',
                contextInherited: true
            };
        }
    }

    // 4. Check for projects follow-up
    if (prevContextText.includes('project')) {
        if (qLower.includes('delay') || qLower.includes('progress') || qLower.includes('milestone') || qLower.includes('budget')) {
            return {
                ...normalizedQuery,
                intent: 'PROJECTS',
                contextInherited: true
            };
        }
    }

    // 5. Check for inventory follow-up
    if (prevContextText.includes('material') || prevContextText.includes('stock') || prevContextText.includes('inventory')) {
        if (qLower.includes('shortage') || qLower.includes('low') || qLower.includes('reorder') || qLower.includes('rate') || qLower.includes('price')) {
            return {
                ...normalizedQuery,
                intent: 'INVENTORY',
                contextInherited: true
            };
        }
    }

    return normalizedQuery;
};
