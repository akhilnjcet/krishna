const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

async function checkStatus() {
    const { getWhatsAppStatus } = require('./services/whatsappService');
    const status = await getWhatsAppStatus();
    console.log('WhatsApp Status:', JSON.stringify(status, null, 2));
    process.exit(0);
}

checkStatus();
