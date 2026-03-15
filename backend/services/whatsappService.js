const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

// State variables
let sock;
let isConnecting = false;
let baileys = null;
let connectionPromise = null;
let openResolver = null;

// Completely silent logs to see only our messages
const logger = pino({ level: 'silent' });

/**
 * Load/Save Credentials from MongoDB for persistence on Vercel
 */
async function syncCredsWithDb(authPath, isVercel) {
    const SystemSetting = require('../models/SystemSetting');
    const credsPath = path.join(authPath, 'creds.json');

    // Load from DB if file doesn't exist (e.g. fresh Vercel instance)
    if (!fs.existsSync(credsPath)) {
        try {
            const setting = await SystemSetting.findOne({ key: 'whatsapp_creds' });
            if (setting && setting.value) {
                console.log('📦 Found WhatsApp session in MongoDB. Writing to /tmp...');
                const rawData = typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value);
                fs.writeFileSync(credsPath, rawData);
                console.log(`✅ Session written to ${credsPath} (${rawData.length} bytes)`);
            } else {
                console.log('⚠️ No WhatsApp session found in MongoDB settings.');
            }
        } catch (err) {
            console.error('❌ Failed to restore creds from DB:', err.message);
        }
    }
}

async function startWhatsAppConnection() {
    if (isConnecting) return;
    isConnecting = true;

    try {
        // Dynamic import for ESM module in CJS environment
        if (!baileys) {
            baileys = await import('@whiskeysockets/baileys');
        }

        const {
            default: makeWASocket,
            useMultiFileAuthState,
            DisconnectReason,
            Browsers,
            makeCacheableSignalKeyStore,
            fetchLatestBaileysVersion
        } = baileys;

        // Use /tmp for auth on Vercel/Serverless as other dirs are read-only
        const isVercel = process.env.VERCEL === '1';
        const authPath = isVercel 
            ? path.join('/tmp', 'whatsapp_auth_info')
            : path.join(__dirname, '../whatsapp_auth_info');

        if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

        // Restore from DB
        await syncCredsWithDb(authPath, isVercel);

        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        
        // Fetch latest version
        const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3005, 12] }));

        sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            logger: logger,
            printQRInTerminal: false,
            browser: Browsers.macOS('Desktop'),
            syncFullHistory: false,
            markOnlineOnConnect: true,
            connectTimeoutMs: 30000,
            defaultQueryTimeoutMs: 30000,
            getMessage: async (key) => ({ conversation: 'Success' })
        });

        // Wrap saveCreds to also update DB
        const wrappedSaveCreds = async () => {
            await saveCreds();
            const SystemSetting = require('../models/SystemSetting');
            try {
                const credsFilePath = path.join(authPath, 'creds.json');
                if (fs.existsSync(credsFilePath)) {
                    const credsData = fs.readFileSync(credsFilePath, 'utf-8');
                    await SystemSetting.findOneAndUpdate(
                        { key: 'whatsapp_creds' },
                        { value: credsData, updatedAt: Date.now() },
                        { upsert: true }
                    );
                }
            } catch (err) {}
        };

        sock.ev.on('creds.update', wrappedSaveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('🔄 New WhatsApp QR Code generated. Saving to DB...');
                const SystemSetting = require('../models/SystemSetting');
                try {
                    await SystemSetting.findOneAndUpdate(
                        { key: 'whatsapp_qr' },
                        { value: qr, updatedAt: Date.now() },
                        { upsert: true }
                    );
                } catch (err) {
                    // Silent fail
                }
                
                console.log('\n=================================================');
                console.log('      PLEASE SCAN THE QR CODE ON YOUR WEB DASHBOARD');
                console.log('=================================================');
            }

            if (connection === 'open') {
                console.log('\n✅ SUCCESS! WhatsApp is connected!');
                const SystemSetting = require('../models/SystemSetting');
                SystemSetting.deleteOne({ key: 'whatsapp_qr' }).catch(() => {}); 
                isConnecting = false;
                if (openResolver) {
                    openResolver(sock);
                    openResolver = null;
                }
            }

            if (connection === 'close') {
                isConnecting = false;
                const statusCode = (lastDisconnect.error instanceof Boom) ? lastDisconnect.error.output.statusCode : 0;
                
                if (openResolver) {
                    // Force resolve if logged out or permanent fail
                    if (statusCode === 401 || statusCode === 403) {
                        openResolver(null);
                        openResolver = null;
                    }
                }
                
                if (statusCode === 401 || statusCode === 403 || statusCode === 440) {
                    console.log(`WhatsApp Session Conflict (Code: ${statusCode}). Stopping auto-reconnect.`);
                    return;
                }

                let waitTime = 5000; 
                if (statusCode === 405) {
                    console.log(`WhatsApp restricted (Code: 405). Waiting 30s...`);
                    waitTime = 30000;
                } else {
                    console.log(`WhatsApp connection closed (Code: ${statusCode}). Reconnecting in ${waitTime/1000}s...`);
                }

                if (statusCode !== baileys.DisconnectReason.loggedOut) {
                    setTimeout(() => {
                        startWhatsAppConnection().catch(err => console.log('Retry error:', err.message));
                    }, waitTime);
                }
            } else if (connection === 'open') {
                console.log('\n✅ SUCCESS! WhatsApp is connected!');
                isConnecting = false;
            }
        });
    } catch (err) {
        console.error('❌ Failed to initialize WhatsApp socket:', err.message);
        isConnecting = false;
        connectionPromise = null;
        if (openResolver) openResolver(null);
        return null;
    }

    // Return a promise that resolves when the connection is actually OPEN
    return new Promise((resolve) => {
        if (sock && !isConnecting && sock.user) return resolve(sock);
        openResolver = resolve;
        
        // Timeout if connection takes too long
        setTimeout(() => {
            if (openResolver) {
                console.log('⏰ WhatsApp connection timeout.');
                openResolver(sock); // Resolve with whatever we have
                openResolver = null;
            }
        }, 12000);
    });
}

/**
 * Ensures WhatsApp is connected before proceeding
 */
async function ensureWhatsApp() {
    if (sock && !isConnecting) return sock;
    
    if (isConnecting && connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = startWhatsAppConnection();
    return connectionPromise;
}

/**
 * Send a WhatsApp message
 */
async function sendWhatsAppMessage(number, message) {
    try {
        const client = await ensureWhatsApp();
        
        if (!client) {
            console.error(`❌ Cannot send message to ${number}: WhatsApp fail.`);
            return;
        }
        let cleanNumber = number.replace(/\D/g, '');
        // Auto-add India country code (91) if only 10 digits are provided
        if (cleanNumber.length === 10) {
            cleanNumber = '91' + cleanNumber;
        }
        
        if (cleanNumber.length < 10) {
            console.error(`❌ Invalid phone number: ${number}`);
            return;
        }
        const jid = `${cleanNumber}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        console.log(`✅ WhatsApp message sent to ${cleanNumber}`);
    } catch (error) {
        console.error(`❌ Failed to send WhatsApp message to ${number}:`, error.message);
    }
}

// Business logic functions
async function sendProgressUpdate(project, updateData) {
    const targetPhone = project.customerId ? (project.customerId.phoneNumber || project.customerId.phone) : null;
    if (!targetPhone) return;
    const message = `*Project Update*\n\n*Project:* ${project.title || 'Work'}\n*Progress:* ${updateData.progress}% Complete\n\n*Today's Work:*\n${updateData.todayWork || 'Notes added.'}\n\n*Next Work:*\n${updateData.nextWork || 'Scheduled.'}`;
    await sendWhatsAppMessage(targetPhone, message);
}

async function sendAttendanceAlert(staff, attendance) {
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' });
    const timeValue = attendance.login_time ? new Date(attendance.login_time) : new Date();
    const timeStr = isNaN(timeValue.getTime()) ? new Date().toLocaleTimeString() : timeValue.toLocaleTimeString();
    
    const message = `*Attendance Update*\n\n*Staff:* ${staff.name}\n*Status:* Success\n*Time:* ${timeStr}\n\n*Face Verification Successful*`;
    for (const admin of admins) {
        const adminPhone = admin.phoneNumber || admin.phone;
        if (adminPhone) await sendWhatsAppMessage(adminPhone, message);
    }
}

async function sendTaskAssignment(staff, task) {
    const staffPhone = staff.phoneNumber || staff.phone;
    if (!staffPhone) return;
    const message = `*New Task Assigned*\n\n*Task:* ${task.title}\n*Date:* Today`;
    await sendWhatsAppMessage(staffPhone, message);
}

async function sendDailyReport(report, staff) {
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' });
    const message = `*Daily Work Report*\n\n*Project:* ${report.projectName || 'Project'}\n*Staff:* ${staff.name}\n\n*Progress:* ${report.progress}%\n*Status:* Completed`;
    for (const admin of admins) {
        const adminPhone = admin.phoneNumber || admin.phone;
        if (adminPhone) await sendWhatsAppMessage(adminPhone, message);
    }
}

async function sendAbsentAlert(staff) {
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' });
    const message = `*Attendance Alert*\n\n*Staff:* ${staff.name}\n*Status:* Absent`;
    for (const admin of admins) {
        const adminPhone = admin.phoneNumber || admin.phone;
        if (adminPhone) await sendWhatsAppMessage(adminPhone, message);
    }
}

async function getWhatsAppStatus() {
    const SystemSetting = require('../models/SystemSetting');
    const qrSetting = await SystemSetting.findOne({ key: 'whatsapp_qr' });
    
    return {
        connected: !!sock && !isConnecting && sock.user,
        isConnecting,
        qr: qrSetting ? qrSetting.value : null,
        phone: sock?.user?.id?.split(':')[0] || null
    };
}

module.exports = {
    startWhatsAppConnection,
    sendWhatsAppMessage,
    sendProgressUpdate,
    sendAttendanceAlert,
    sendAbsentAlert,
    sendTaskAssignment,
    sendDailyReport,
    getWhatsAppStatus,
    ensureWhatsApp
};
