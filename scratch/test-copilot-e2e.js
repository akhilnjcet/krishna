require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');

async function runTests() {
    console.log('=== STARTING GROQ COPILOT E2E VERIFICATION ===');
    console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);
    console.log('GROQ_MODEL:', process.env.GROQ_MODEL);

    const connectDB = require('../backend/config/database');
    await connectDB();

    const { askAiAssistant } = require('../backend/controllers/aiErpController');

    // Helper mock request runner
    async function mockQuery(query, user, conversationHistory = []) {
        return new Promise((resolve) => {
            const req = {
                body: { query, conversationHistory },
                user
            };
            const res = {
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data) {
                    resolve({ statusCode: this.statusCode || 200, data });
                }
            };
            askAiAssistant(req, res);
        });
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    // TEST 1: General Copilot Knowledge
    console.log('\n--- TEST 1: General Copilot Knowledge ---');
    const t1 = await mockQuery('Hello, who are you and what ERP areas can you assist with?', { role: 'admin', name: 'Akhil Admin' });
    console.log('Status:', t1.statusCode, 'Success:', t1.data.success);
    console.log('Model Used:', t1.data.modelUsed);
    console.log('Response Snippet:\n', t1.data.response.slice(0, 200));

    await sleep(2000);

    // TEST 2: Live ERP Driver Query
    console.log('\n--- TEST 2: Live ERP Driver Records ---');
    const t2 = await mockQuery('Which drivers are registered and what is their status?', { role: 'admin', name: 'Akhil Admin' });
    console.log('Status:', t2.statusCode, 'Model:', t2.data.modelUsed);
    console.log('Response Snippet:\n', t2.data.response.slice(0, 250));

    await sleep(2000);

    // TEST 3: External Knowledge & Web Search with Citations
    console.log('\n--- TEST 3: External Knowledge & Web Search ---');
    const t3 = await mockQuery('What are the standard yield specifications for IS 2062 structural steel in India?', { role: 'staff', name: 'Operations Staff' });
    console.log('Status:', t3.statusCode, 'Model:', t3.data.modelUsed);
    console.log('Sources Count:', t3.data.sources?.length);
    console.log('Response Snippet:\n', t3.data.response.slice(0, 250));

    await sleep(2000);

    // TEST 4: Permission Enforcement - Driver requesting company finance
    console.log('\n--- TEST 4: Permission Enforcement (Driver asking for Finances) ---');
    const t4 = await mockQuery('Show me total customer payments and company revenue ledger', { role: 'driver', name: 'Test Driver' });
    console.log('Status:', t4.statusCode);
    console.log('Response:\n', t4.data.response);

    await sleep(2000);

    // TEST 5: Multilingual (Malayalam / Manglish)
    console.log('\n--- TEST 5: Bilingual Support (Innu ethra per leave aanu?) ---');
    const t5 = await mockQuery('Innu ethra per leave aanu?', { role: 'staff', name: 'Suresh' });
    console.log('Status:', t5.statusCode);
    console.log('Response Snippet:\n', t5.data.response.slice(0, 200));

    console.log('\n=== ALL TESTS EXECUTED SUCCESSFULLY ===');
    await mongoose.disconnect();
}

runTests().catch(err => {
    console.error('Test script error:', err);
    process.exit(1);
});
