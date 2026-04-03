const OpenAI = require('openai');
const SystemSetting = require('../models/SystemSetting');
const FAQ = require('../models/FAQ');
const Lead = require('../models/Lead');

let openai = null;
const initOpenAI = () => {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
};

exports.handleChat = async (req, res) => {
    try {
        const { messages } = req.body; // Array of {role: 'user'|'assistant', content: '...'}
        
        // 1. Fetch AI settings to check if enabled and get prompt
        const settingsRaw = await SystemSetting.find({ key: { $in: ['isAiEnabled', 'aiWorkMode', 'aiPrompt'] } });
        const settings = {};
        settingsRaw.forEach(s => settings[s.key] = s.value);
        
        if (settings.isAiEnabled === 'false') {
            return res.json({ reply: "Our chat assistant is currently offline. Please use the contact form to reach us." });
        }

        // 2. Load FAQs for use in both AI and Keyword Matching
        const faqs = await FAQ.find();
        let faqContext = "Here are some frequently asked questions you MUST know about the business:\n";
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

            if (matchedFaq) {
                return res.json({ reply: `[OFFLINE MODE] ${matchedFaq.answer}` });
            }
            return res.json({ reply: "I am operating in Offline Mode. I couldn't find a direct match for your question. Would you like to leave your number so we can call you back?" });
        }

        // 4. Construct System Prompt (For Online mode)
        const defaultPrompt = "You are a friendly and professional sales assistant for Krishna Engineering Works in Kochi, Kerala. Your goal is to answer queries about fabrication, welding, and industrial services, and to gently encourage the user to provide their phone number so we can provide a quick quote.";
        const basePrompt = settings.aiPrompt || defaultPrompt;
        
        const systemMessage = {
            role: "system",
            content: `${basePrompt}\n\n${faqContext}`
        };

        // 5. Prepare AI Provider (Prioritize Gemini for Free Tier)
        const geminiKey = process.env.GEMINI_API_KEY;
        const openAiKey = process.env.OPENAI_API_KEY;

        if (geminiKey) {
            try {
                // Formatting messages for Gemini
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
                        generationConfig: { maxOutputTokens: 250, temperature: 0.7 }
                    })
                });

                const data = await geminiRes.json();
                if (data.candidates && data.candidates[0].content.parts[0].text) {
                    return res.json({ reply: data.candidates[0].content.parts[0].text });
                }
                console.error("Gemini Parse Failure:", data);
                // Continue to OpenAI if Gemini fails for some reason
            } catch (geminiErr) {
                console.error("Gemini System Error:", geminiErr.message);
            }
        }

        // 3. Fallback to OpenAI if Gemini is not available or failed
        initOpenAI();
        if (openai && openAiKey) {
            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [systemMessage, ...messages],
                    max_tokens: 250,
                    temperature: 0.7
                });

                return res.json({ reply: response.choices[0].message.content });
            } catch (openaiErr) {
                console.error("OpenAI Execution Error:", openaiErr.message);
            }
        }

        // 4. ULTIMATE FALLBACK: Keyword Matcher (TOTALLY FREE)
        const userMsg = messages[messages.length - 1].content.toLowerCase();
        const matchedFaq = faqs.find(f => 
            userMsg.includes(f.question.toLowerCase()) || 
            f.question.toLowerCase().split(' ').some(word => word.length > 3 && userMsg.includes(word))
        );

        if (matchedFaq) {
            return res.json({ 
                reply: `[OFFLINE MODE] I matched this for you: \n\n${matchedFaq.answer}` 
            });
        }

        return res.json({ 
            reply: "I am currently in maintenance. Please reach us at +91 94460 00000 or leave your phone number for a callback." 
        });

    } catch (err) {
        console.error('Chat System Critical Error:', err);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
};

exports.captureLead = async (req, res) => {
    try {
        const { name, phone, message } = req.body;
        
        if (!phone) {
            return res.status(400).json({ error: "Phone number is required." });
        }

        const newLead = new Lead({ name: name || 'Unknown', phone, message });
        await newLead.save();

        res.json({ success: true, message: "Lead captured successfully!" });
    } catch (err) {
        console.error('Lead Capture Error:', err);
        res.status(500).json({ error: 'Failed to capture lead' });
    }
};
