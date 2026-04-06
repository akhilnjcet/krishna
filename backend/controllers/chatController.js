const SystemSetting = require('../models/SystemSetting');
const FAQ = require('../models/FAQ');
const Lead = require('../models/Lead');

/* ─── Keyword-based FAQ matcher ─────────────────────────────────── */
const matchFaq = (userMsg, faqs) => {
    const msg = userMsg.toLowerCase().trim();

    // Exact / substring match
    let match = faqs.find(f => msg.includes(f.question.toLowerCase()));
    if (match) return match;

    // Word overlap (words > 3 chars)
    match = faqs.find(f =>
        f.question.toLowerCase().split(' ').some(w => w.length > 3 && msg.includes(w))
    );
    if (match) return match;

    return null;
};

/* ─── Quick intent reply (works without AI) ─────────────────────── */
const intentReply = (msg, phone) => {
    const m = msg.toLowerCase();
    if (/(price|cost|rate|charge|how much|quote|quotation)/i.test(m))
        return `We provide free quotations! Please call us at ${phone} or share your phone number and we'll call you back with a custom quote.`;
    if (/(location|address|where|place|office|shop|workshop)/i.test(m))
        return `We are located at Thiruvazhiyode, Sreekrishnapuram, Kerala 679514. You can also reach us at ${phone}.`;
    if (/(working hour|open|timing|available|time)/i.test(m))
        return `We are available Monday–Saturday, 9 AM – 6 PM. For urgent needs call ${phone}.`;
    if (/(weld|fabricat|gate|grill|shutter|roofing|steel|contact|call|mobile|number|phone)/i.test(m))
        return `You can call or WhatsApp us directly at ${phone}. Our experts will help you right away!`;
    if (/(hi|hello|hey|good morning|good evening|greet)/i.test(m))
        return `Hello! 👋 Welcome to Krishna Engineering Works. How can we help you today? You can ask about our services, get a quote, or call us at ${phone}.`;
    return null;
};

exports.handleChat = async (req, res) => {
    try {
        const { messages } = req.body;

        // 1. Fetch settings (AI flags + real phone number)
        const settingsRaw = await SystemSetting.find({
            key: { $in: ['isAiEnabled', 'aiWorkMode', 'aiPrompt', 'footer_phone', 'floating_whatsapp'] }
        });
        const settings = {};
        settingsRaw.forEach(s => settings[s.key] = s.value);

        // Use real phone from settings, with correct fallback
        const phone = settings.footer_phone || '+91 9447940835';
        const waNumber = settings.floating_whatsapp || '919447940835';

        if (settings.isAiEnabled === 'false') {
            return res.json({ reply: `Our chat assistant is currently offline. Please call us at ${phone} or WhatsApp us for immediate assistance.` });
        }

        // 2. Load FAQs
        const faqs = await FAQ.find();
        let faqContext = "CRITICAL BUSINESS FAQ DATA (USE THESE ANSWERS FIRST):\n";
        faqs.forEach((faq, i) => {
            faqContext += `${i + 1}. Q: ${faq.question}\n   A: ${faq.answer}\n`;
        });

        const userMsg = messages[messages.length - 1].content;

        // 3. Offline / FAQ-only mode
        if (settings.aiWorkMode === 'offline') {
            const matched = matchFaq(userMsg, faqs);
            if (matched) return res.json({ reply: matched.answer });
            const intent = intentReply(userMsg, phone);
            if (intent) return res.json({ reply: intent });
            return res.json({ reply: `I couldn't find a direct answer. Would you like to leave your contact number for a callback? Or call us now at ${phone}.` });
        }

        // 4. System prompt
        const defaultPrompt = `You are a friendly and professional sales assistant for Krishna Engineering Works, a leading steel fabrication and welding company in Kerala. Your direct contact number is ${phone}. Always answer based on the FAQ data. Encourage users to call ${phone} or share their phone number for a callback. Keep replies concise and helpful.`;
        const basePrompt = settings.aiPrompt || defaultPrompt;

        // 5. Try Gemini
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            try {
                const geminiHistory = messages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

                const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: geminiHistory,
                            systemInstruction: { parts: [{ text: `${basePrompt}\n\n${faqContext}` }] },
                            generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
                        })
                    }
                );

                const data = await geminiRes.json();

                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                    return res.json({ reply: data.candidates[0].content.parts[0].text });
                }

                if (data.error?.code === 429) {
                    console.warn("⚠️  Gemini quota exhausted — using smart fallback.");
                } else if (data.error) {
                    console.error("Gemini API Error:", data.error);
                }
            } catch (geminiErr) {
                console.error("Gemini Connectivity Error:", geminiErr.message);
            }
        }

        // 6. Smart keyword fallback (always available, no API needed)
        const matched = matchFaq(userMsg, faqs);
        if (matched) return res.json({ reply: matched.answer });

        const intent = intentReply(userMsg, phone);
        if (intent) return res.json({ reply: intent });

        // 7. Final graceful reply with CORRECT phone number from settings
        return res.json({
            reply: `I'm here to help! For the fastest response, please call or WhatsApp us at **${phone}**. You can also share your phone number and we'll call you back right away! 😊`
        });

    } catch (err) {
        console.error('Chat System Critical Error:', err);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
};

exports.captureLead = async (req, res) => {
    try {
        const { name, phone, message } = req.body;
        if (!phone) return res.status(400).json({ error: "Phone number is required." });
        const newLead = new Lead({ name: name || 'Unknown', phone, message });
        await newLead.save();
        res.json({ success: true, message: "Lead captured successfully!" });
    } catch (err) {
        console.error('Lead Capture Error:', err);
        res.status(500).json({ error: 'Failed to capture lead' });
    }
};
