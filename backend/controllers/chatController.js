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
        const settingsRaw = await SystemSetting.find({ key: { $in: ['isAiEnabled', 'aiPrompt'] } });
        const settings = {};
        settingsRaw.forEach(s => settings[s.key] = s.value);
        
        if (settings.isAiEnabled === 'false') {
            return res.json({ reply: "Our chat assistant is currently offline. Please use the contact form to reach us." });
        }

        // 2. Prepare OpenAI Instance
        initOpenAI();
        if (!openai) {
            return res.json({ reply: "OpenAI is not configured. Please add OPENAI_API_KEY to the server environment." });
        }

        // 3. Fetch FAQs to inject into system prompt
        const faqs = await FAQ.find();
        let faqContext = "Here are some frequently asked questions you MUST know about the business:\n";
        faqs.forEach((faq, index) => {
            faqContext += `${index + 1}. Q: ${faq.question} \n   A: ${faq.answer}\n`;
        });

        // 4. Construct System Prompt
        const defaultPrompt = "You are a friendly and professional sales assistant for Krishna Engineering Works in Kochi, Kerala. Your goal is to answer queries about fabrication, welding, and industrial services, and to gently encourage the user to provide their phone number so we can provide a quick quote.";
        const basePrompt = settings.aiPrompt || defaultPrompt;
        
        const systemMessage = {
            role: "system",
            content: `${basePrompt}\n\n${faqContext}`
        };

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [systemMessage, ...messages],
            max_tokens: 250,
            temperature: 0.7
        });

        res.json({ reply: response.choices[0].message.content });

    } catch (err) {
        console.error('Chat Error:', err);
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
