require('dotenv').config();

const testGeminiV1 = async () => {
    const key = process.env.GEMINI_API_KEY;
    console.log("Testing Gemini 2.0 Flash via v1-API with key:", key ? "EXISTS" : "MISSING");
    
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Answer one word: Yes' }] }]
            })
        });

        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Gemini Error:", err.message);
    }
};

testGeminiV1();
