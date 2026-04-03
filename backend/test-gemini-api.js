require('dotenv').config();

const testGemini = async () => {
    const key = process.env.GEMINI_API_KEY;
    console.log("Testing Gemini with key:", key ? "EXISTS" : "MISSING");
    
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Hello, are you there?' }] }]
            })
        });

        const data = await res.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            console.log("Gemini Heartbeat Confirmed!");
            console.log("Reply:", data.candidates[0].content.parts[0].text);
        } else {
            console.error("Gemini Failure Response:", JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Gemini Connection Error:", err.message);
    }
};

testGemini();
