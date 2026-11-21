const axios = require('axios');

async function searchWeb(query) {
    try {
        const res = await axios.post('https://html.duckduckgo.com/html/', new URLSearchParams({ q: query }).toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 7000
        });

        const html = res.data;
        const results = [];
        // Regex to extract title, url, snippet from duckduckgo html
        const titleRegex = /<h2 class="result__title">[\s\S]*?<a class="result__url" href="([^"]+)">([\s\S]*?)<\/a>/g;
        const snippetRegex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;

        // Alternative robust extraction:
        const blocks = html.split('<div class="result results_links results_links_deep');
        for (let i = 1; i < Math.min(blocks.length, 6); i++) {
            const block = blocks[i];
            const urlMatch = block.match(/<a class="result__url" href="([^"]+)"/);
            const titleMatch = block.match(/<a class="result__a"[^>]*>([\s\S]*?)<\/a>/);
            const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

            if (urlMatch && titleMatch) {
                // Decode duckduckgo redirect URL e.g. //duckduckgo.com/l/?uddg=https%3A%2F%2F...
                let rawUrl = urlMatch[1];
                if (rawUrl.includes('uddg=')) {
                    const params = new URLSearchParams(rawUrl.split('?')[1]);
                    rawUrl = params.get('uddg') || rawUrl;
                }
                const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
                const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

                results.push({
                    title,
                    url: rawUrl,
                    snippet
                });
            }
        }
        return results;
    } catch (err) {
        console.error('Web search error:', err.message);
        return [];
    }
}

(async () => {
    const res = await searchWeb('GST rate on fabricated structural steel india');
    console.log('SEARCH RESULTS COUNT:', res.length);
    console.log(JSON.stringify(res.slice(0, 3), null, 2));
})();
