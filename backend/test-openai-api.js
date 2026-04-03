const OpenAI = require('openai');
require('dotenv').config();

const testOpenAI = async () => {
    try {
        console.log("Testing OpenAI with key:", process.env.OPENAI_API_KEY ? "EXISTS" : "MISSING");
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a friendly assistant." },
                { role: "user", content: "h" }
            ],
            max_tokens: 10
        });

        console.log("Response successful!");
        console.log("Reply:", response.choices[0].message.content);
    } catch (err) {
        console.error("OpenAI Error:", err.message);
        if (err.response) {
            console.error("Status:", err.status);
            console.error("Body:", err.response.data);
        }
    }
};

testOpenAI();
