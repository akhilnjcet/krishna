const SystemSetting = require('../models/SystemSetting');
const ChatbotContactSetting = require('../models/ChatbotContactSetting');
const FAQ = require('../models/FAQ');
const Lead = require('../models/Lead');
const ChatLog = require('../models/ChatLog');
const { buildKnowledgePrompt } = require('../utils/aiKnowledgeEngine');

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

    if (/(warehouse|shed|factory|industrial building|roofing sheet|truss|gate|staircase|railing)/i.test(m)) {
        return `We specialize in custom fabrication for structural sheds, roofing, trusses, staircases, and gates! 🛠️\n\nCould you share your approximate **dimensions (Length x Width x Height)** and **location**? You can also click **Get Quote** or call us directly at **${phone}** for a free site estimate!`;
    }

    if (/(price|cost|rate|charge|how much|quote|quotation|estimate)/i.test(m))
        return `We provide free custom site estimations! 📋 Please click **Get Quote** or call us at **${phone}** to discuss your project specifications.`;
    
    if (/(location|address|where|place|office|shop|workshop|yard)/i.test(m))
        return `Our works yard & office is located at **Industrial Area, Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala**. Contact us at **${phone}** for location guidance!`;
    
    if (/(working hour|open|timing|available|time)/i.test(m))
        return `We are open **Monday–Saturday, 9:00 AM – 6:00 PM**. For urgent technical queries, call **${phone}**.`;
    
    if (/(weld|fabricat|pipe|beam|ismb|steel|contact|call|mobile|number|phone)/i.test(m))
        return `You can call or WhatsApp our engineering team directly at **${phone}**. We'll assist you immediately!`;
    
    if (/(hi|hello|hey|good morning|good evening|greet)/i.test(m))
        return `Hello! 👋 Welcome to **Krishna Engineering Works AI Assistant**. How can we assist with your fabrication, roofing, or structural steel project today? You can ask about our services, get an instant estimate, or call **${phone}**.`;
    
    return null;
};

exports.handleChat = async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "Invalid messages array payload." });
        }

        // 1. Fetch System Settings & Admin Chatbot Contact Settings
        const [settingsRaw, contactSettings, faqs] = await Promise.all([
            SystemSetting.find({
                key: { $in: ['isAiEnabled', 'aiWorkMode', 'aiPrompt', 'footer_phone', 'floating_whatsapp', 'company_name', 'company_address', 'company_email'] }
            }),
            ChatbotContactSetting.findOne(),
            FAQ.find()
        ]);

        const settings = {};
        settingsRaw.forEach(s => settings[s.key] = s.value);

        const companyInfo = {
            company_name: contactSettings?.companyName || settings.company_name || 'Krishna Engineering Works',
            footer_phone: contactSettings?.primaryPhone || settings.footer_phone || '+91 9447940835',
            floating_whatsapp: contactSettings?.whatsappNumber || settings.floating_whatsapp || '919447940835',
            footer_email: contactSettings?.email || settings.company_email || 'contact@krishnaengg.com',
            footer_address: settings.company_address || 'Industrial Area Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala 679514',
            businessHours: contactSettings?.businessHours || 'Monday - Saturday: 9:00 AM - 6:00 PM'
        };

        const phone = companyInfo.footer_phone;

        if (settings.isAiEnabled === 'false') {
            return res.json({ reply: `Our AI chat assistant is currently offline. Please call us at ${phone} or message on WhatsApp for immediate assistance.` });
        }

        const lastUserMsg = messages[messages.length - 1].content;

        // Diagnostic Ping for Admin verification
        if (lastUserMsg === 'SYSTEM_DIAGNOSTIC_PING') {
            const geminiKey = process.env.GEMINI_API_KEY;
            if (settings.aiWorkMode === 'offline') return res.json({ reply: "SYSTEM ONLINE [OFFLINE MODE: Rule-based FAQ Fallback Active]" });
            if (!geminiKey) return res.json({ reply: "SYSTEM PARTIAL ONLINE [ONLINE MODE: Gemini API Key missing, routing to Smart FAQ Fallback]" });
            return res.json({ reply: "SYSTEM FULLY OPERATIONAL [ONLINE MODE: AI Agent Neural Engine connected successfully]" });
        }

        let botReply = '';
        let providerUsed = 'faq_rule';

        // 2. Offline / Rule-only mode
        if (settings.aiWorkMode === 'offline') {
            const matched = matchFaq(lastUserMsg, faqs);
            if (matched) {
                botReply = matched.answer;
                providerUsed = 'faq_rule';
            } else {
                const intent = intentReply(lastUserMsg, phone);
                if (intent) {
                    botReply = intent;
                    providerUsed = 'intent_rule';
                } else {
                    botReply = `Thank you for reaching out! For detailed project pricing or specialized fabrication advice, please call us at **${phone}** or click **Get Quote** to request an estimate.`;
                    providerUsed = 'fallback';
                }
            }
        } else {
            // 3. Online AI Agent Mode: Build Full Domain Knowledge Prompt
            const knowledgeBasePrompt = buildKnowledgePrompt(companyInfo, faqs);
            const customPromptHeader = settings.aiPrompt ? `${settings.aiPrompt}\n\n` : '';
            const fullSystemInstruction = `${customPromptHeader}${knowledgeBasePrompt}`;

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
                                systemInstruction: { parts: [{ text: fullSystemInstruction }] },
                                generationConfig: { maxOutputTokens: 350, temperature: 0.7 }
                            })
                        }
                    );

                    const data = await geminiRes.json();

                    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        botReply = data.candidates[0].content.parts[0].text;
                        providerUsed = 'gemini';
                    } else if (data.error?.code === 429) {
                        console.warn("⚠️ Gemini quota limit — using smart rule fallback.");
                    } else if (data.error) {
                        console.error("Gemini API Error:", data.error);
                    }
                } catch (geminiErr) {
                    console.error("Gemini Connectivity Error:", geminiErr.message);
                }
            }

            // 4. Graceful Rule-Based Fallback if AI provider is not available / error occurred
            if (!botReply) {
                const matched = matchFaq(lastUserMsg, faqs);
                if (matched) {
                    botReply = matched.answer;
                    providerUsed = 'faq_rule';
                } else {
                    const intent = intentReply(lastUserMsg, phone);
                    if (intent) {
                        botReply = intent;
                        providerUsed = 'intent_rule';
                    } else {
                        botReply = `I'm here to help with all your structural steel fabrication and roofing needs! For exact project estimates or custom advice, please call or WhatsApp us at **${phone}**, or click **Get Quote** to share your project details. 😊`;
                        providerUsed = 'fallback';
                    }
                }
            }
        }

        // 5. Persist Chat Log asynchronously
        ChatLog.create({
            userId: req.user ? req.user.id : undefined,
            visitorIp: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
            userMessage: lastUserMsg,
            botReply,
            providerUsed
        }).catch(err => console.warn('Chat log save error:', err.message));

        return res.json({ reply: botReply, providerUsed });

    } catch (err) {
        console.error('Chat System Critical Error:', err);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
};

// Admin: Get Chat History
exports.getChatHistory = async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const parsedLimit = parseInt(limit);
        const parsedPage = parseInt(page);
        const skip = (parsedPage - 1) * parsedLimit;

        const logs = await ChatLog.find()
            .populate('userId', 'name email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parsedLimit);

        const total = await ChatLog.countDocuments();

        res.json({ logs, total, page: parsedPage, pages: Math.ceil(total / parsedLimit) });
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).json({ error: 'Failed to fetch chat history' });
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
