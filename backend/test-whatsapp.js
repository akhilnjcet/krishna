require('dotenv').config();
const { startWhatsAppConnection, sendWhatsAppMessage } = require('./services/whatsappService');

/**
 * Standalone Test Script for WhatsApp
 * This will connect to WhatsApp and send a test message to your configured phone number.
 */

async function runTest() {
    console.log("---------------------------------------");
    console.log("🚀 WhatsApp System Test Initializing...");
    console.log("---------------------------------------");

    try {
        const sock = await startWhatsAppConnection();

        sock.ev.on('connection.update', async (update) => {
            const { connection } = update;

            if (connection === 'open') {
                const testNumber = process.env.WHATSAPP_PHONE_NUMBER;
                
                if (!testNumber) {
                    console.log("\n❌ ERROR: WHATSAPP_PHONE_NUMBER not found in .env");
                    console.log("Please add your number to .env (e.g., WHATSAPP_PHONE_NUMBER=919876543210)");
                    process.exit(1);
                }

                console.log(`\n✅ Connected! Sending test message to: ${testNumber}`);
                
                const testMsg = `🚀 *WhatsApp Notification System Test*

Hello! This is a test message from your *Industrial Work Management Web Application*.

✅ Connection: Successful
✅ Service: Baileys free integration
✅ Time: ${new Date().toLocaleString()}

Your notification system is now ready to send progress updates, task assignments, and attendance alerts!`;

                await sendWhatsAppMessage(testNumber, testMsg);
                
                console.log("\n---------------------------------------");
                console.log("🎉 SUCCESS: Test message sent!");
                console.log("Check your WhatsApp on the target number.");
                console.log("---------------------------------------");
                
                // We keep it running for a few seconds to ensure delivery
                setTimeout(() => {
                    console.log("Closing test script...");
                    process.exit(0);
                }, 5000);
            }
        });
    } catch (error) {
        console.error("\n❌ Test failed with error:", error);
        process.exit(1);
    }
}

runTest();
