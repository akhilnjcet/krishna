require('dotenv').config();

const listModelsV1 = async () => {
    const key = process.env.GEMINI_API_KEY;
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
};

listModelsV1();
