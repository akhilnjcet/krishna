const SystemSetting = require('../models/SystemSetting');
const FAQ = require('../models/FAQ');
const Lead = require('../models/Lead');

exports.handleChat = async (req, res) => {
    try {
        const { messages } = req.body; 
        
        // 1. Fetch AI settings to check if enabled and get prompt
        const settingsRaw = await SystemSetting.find({ key: { $in: ['isAiEnabled', 'aiWorkMode', 'aiPrompt'] } });
        const settings = {};
        settingsRaw.forEach(s => settings[s.key] = s.value);
        
        if (settings.isAiEnabled === 'false') {
            return res.json({ reply: "Our chat assistant is currently offline. Please use our contact form or call us directly." });
        }

        // 2. Load FAQs for context or fallback
        const faqs = await FAQ.find();
        let faqContext = "CRITICAL BUSINESS FAQ DATA (USE THESE ANSWERS FIRST):\n";
        faqs.forEach((faq, index) => {
            faqContext += `${index + 1}. Q: ${faq.question} \n   A: ${faq.answer}\n`;
        });

        const userMsg = messages[messages.length - 1].content.toLowerCase();

        // 3. Handle OFFLINE (FAQ-Only) Mode
        if (settings.aiWorkMode === 'offline') {
            const matchedFaq = faqs.find(f => 
                userMsg.includes(f.question.toLowerCase()) || 
                f.question.toLowerCase().split(' ').some(word => word.length > 3 && userMsg.includes(word))
            );
            if (matchedFaq) return res.json({ reply: matchedFaq.answer });
            return res.json({ reply: "I'm sorry, I couldn't find a direct answer. Would you like to leave your contact number for a callback?" });
        }

        // 4. Construct System Prompt (Optimized for Gemini)
        const defaultPrompt = "You are a friendly and professional sales assistant for Krishna Engineering Works in Kochi, Kerala. Your goal is to answer queries about fabrication, welding, and industrial services based on the provided FAQ data. Encourage users to leave their phone number for a quick quote.";
        const basePrompt = settings.aiPrompt || defaultPrompt;

        // 5. Try Gemini (Primary - FREE)
        const geminiKey = process.env.GEMINI_API_KEY;

        if (geminiKey) {
            try {
                // Formatting history for Gemini
                const geminiHistory = messages.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

                const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: geminiHistory,
                        systemInstruction: { parts: [{ text: `${basePrompt}\n\n${faqContext}` }] },
                        generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
                    })
                });

                const data = await geminiRes.json();
                
                if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                    return res.json({ reply: data.candidates[0].content.parts[0].text });
                }

                if (data.error && data.error.code === 429) {
                    console.warn("Gemini Free Tier Quota Exhausted. Using Keyword Fallback.");
                } else {
                    console.error("Gemini Response Error:", data);
                }
            } catch (geminiErr) {
                console.error("Gemini Connectivity Error:", geminiErr.message);
            }
        }

        // 6. Final Keyword Fallback (Always Works, Always Free)
        const matchedFaq = faqs.find(f => 
            userMsg.includes(f.question.toLowerCase()) || 
            f.question.toLowerCase().split(' ').some(word => word.length > 2 && userMsg.includes(word)) ||
            (userMsg.length < 4 && f.question.toLowerCase().includes(userMsg))
        );

        if (matchedFaq) {
            return res.json({ reply: matchedFaq.answer });
        }

        return res.json({ 
            reply: "I am receiving a high volume of queries. Please contact us at +91 94460 00000 or share your number here for an immediate callback." 
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
