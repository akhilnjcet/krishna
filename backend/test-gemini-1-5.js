require('dotenv').config();

const testGeminiOldModel = async () => {
    const key = process.env.GEMINI_API_KEY;
    console.log("Testing Gemini with model 1.5-flash and key:", key ? "EXISTS" : "MISSING");
    
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Answer with one word: Yes' }] }]
            })
        });

        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Gemini Error:", err.message);
    }
};

testGeminiOldModel();
