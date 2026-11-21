const axios = require('axios');

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WEB SEARCH SERVICE FOR KRISHNA ERP COPILOT
 * Provides external information grounding for questions requiring current external
 * data (e.g. steel market prices, GST rules, engineering standards, industry news).
 * 
 * Safety & Privacy:
 * - Minimum necessary query sent to search providers.
 * - Sensitive ERP data, credentials, and user IDs are strictly stripped.
 * - Multi-tier search: Tavily/Serper (if configured) -> Google News/Search RSS -> Wikipedia.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Cleans query to ensure no internal ERP IDs, passwords, or emails are leaked in web searches
function sanitizeSearchQuery(rawQuery) {
    if (!rawQuery) return '';
    return rawQuery
        .replace(/([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/g, '') // remove emails
        .replace(/\b[0-9a-fA-F]{24}\b/g, '') // remove MongoDB ObjectIds
        .replace(/gsk_[a-zA-Z0-9]+/g, '') // remove api keys
        .replace(/sk-[a-zA-Z0-9]+/g, '')
        .replace(/\b(password|secret|token|pass|pin)\s*[:=]\s*\S+/gi, '')
        .trim();
}

/**
 * Perform web search using Google News / Search RSS
 */
async function searchGoogleRss(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-IN&gl=IN&ceid=IN:en`;
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 6000
        });

        const items = [];
        const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/g;
        let match;
        let count = 0;

        while ((match = itemRegex.exec(res.data)) !== null && count < 4) {
            const rawTitle = match[1] || '';
            const link = match[2] || '';
            const pubDate = match[3] || '';

            // Clean title of CDATA or HTML entities
            const title = rawTitle
                .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim();

            if (title && link) {
                items.push({
                    title,
                    url: link,
                    snippet: `Published: ${pubDate}. News report on ${title}.`,
                    source: 'Google News / Web'
                });
                count++;
            }
        }
        return items;
    } catch (err) {
        console.warn('Google RSS search fallback error:', err.message);
        return [];
    }
}

/**
 * Perform factual lookup using Wikipedia OpenSearch API
 */
async function searchWikipedia(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodedQuery}&limit=3&format=json`;
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'KrishnaErpCopilot/1.0 (contact@krishnaengineeringkerala.in)'
            },
            timeout: 5000
        });

        if (Array.isArray(res.data) && res.data.length >= 4) {
            const titles = res.data[1] || [];
            const descriptions = res.data[2] || [];
            const links = res.data[3] || [];
            const items = [];

            for (let i = 0; i < titles.length; i++) {
                if (titles[i] && links[i]) {
                    items.push({
                        title: titles[i],
                        url: links[i],
                        snippet: descriptions[i] || `Technical reference for ${titles[i]} on Wikipedia.`,
                        source: 'Wikipedia'
                    });
                }
            }
            return items;
        }
        return [];
    } catch (err) {
        console.warn('Wikipedia search error:', err.message);
        return [];
    }
}

/**
 * Perform search via Tavily API if TAVILY_API_KEY is configured
 */
async function searchTavily(query) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) return null;

    try {
        const res = await axios.post('https://api.tavily.com/search', {
            api_key: apiKey,
            query,
            search_depth: 'basic',
            max_results: 4
        }, { timeout: 6000 });

        if (res.data && Array.isArray(res.data.results)) {
            return res.data.results.map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.content,
                source: 'Tavily Search'
            }));
        }
    } catch (err) {
        console.warn('Tavily search error:', err.message);
    }
    return null;
}

/**
 * Main Web Search Dispatcher
 */
async function performWebSearch(query) {
    const cleanQuery = sanitizeSearchQuery(query);
    if (!cleanQuery || cleanQuery.length < 3) return [];

    // 1. Try Tavily if configured
    const tavilyResults = await searchTavily(cleanQuery);
    if (tavilyResults && tavilyResults.length > 0) {
        return tavilyResults;
    }

    // 2. Query Google News/Search RSS and Wikipedia in parallel
    const [googleResults, wikiResults] = await Promise.all([
        searchGoogleRss(cleanQuery),
        searchWikipedia(cleanQuery)
    ]);

    const combined = [...googleResults, ...wikiResults];
    return combined.slice(0, 5);
}

/**
 * Checks if a user's prompt is asking for external/web information
 */
function isExternalQuery(query, intent) {
    if (!query) return false;
    const q = query.toLowerCase();

    // Explicit requests for web search or current market/world info
    const externalKeywords = [
        'search web', 'google', 'internet', 'what is the price of', 'current price',
        'steel rate', 'gst rate', 'standard for', 'is 2062', 'astm', 'is code',
        'weather', 'market rate', 'market trend', 'latest news', 'definition of',
        'what does is ', 'what is hsn', 'hsn code'
    ];

    if (externalKeywords.some(kw => q.includes(kw))) {
        return true;
    }

    // If intent was UNKNOWN and contains general information keywords
    if (intent === 'UNKNOWN' && (q.includes('what is') || q.includes('who is') || q.includes('how to') || q.includes('meaning') || q.includes('price'))) {
        return true;
    }

    return false;
}

module.exports = {
    performWebSearch,
    sanitizeSearchQuery,
    isExternalQuery
};
