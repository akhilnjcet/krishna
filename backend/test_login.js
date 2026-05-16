const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing Customer Login (8594030186)...');
        const res = await axios.post('http://localhost:5000/api/auth/login', {
            username: '8594030186',
            password: '123'
        });
        console.log('SUCCESS! Data:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('FAILED!');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Message:', err.response.data.message);
        } else {
            console.error('Error:', err.message);
        }
    }
}

testLogin();
