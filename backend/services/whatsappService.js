const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

// State variables
let sock = null;
let isConnecting = false;
let baileys = null;
let connectionPromise = null;
let openResolver = null;
let heartbeatTimer = null;
let authSaveTimer = null;
let reconnectAttempts = 0;

// Completely silent logs to see only our messages
const logger = pino({ level: 'silent' });

/**
 * Back up all session auth files (creds.json + all Signal keys) to MongoDB.
 * Preserves the entire cryptographic key store across server restarts and 24-hour cycles.
 */
function debouncedSaveFullAuth(authPath) {
    if (authSaveTimer) clearTimeout(authSaveTimer);
    authSaveTimer = setTimeout(async () => {
        try {
            if (!fs.existsSync(authPath)) return;
            const files = fs.readdirSync(authPath);
            const bundle = {};
            for (const file of files) {
                const filePath = path.join(authPath, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (stats.isFile() && stats.size < 1024 * 1024) { // < 1MB per file
                        bundle[file] = fs.readFileSync(filePath, 'utf-8');
                    }
                } catch (e) {}
            }

            if (bundle['creds.json']) {
                const SystemSetting = require('../models/SystemSetting');
                // Save legacy key for backward compatibility
                await SystemSetting.findOneAndUpdate(
                    { key: 'whatsapp_creds' },
                    { value: bundle['creds.json'], updatedAt: Date.now() },
                    { upsert: true }
                ).exec();

                // Save complete auth bundle (all pre-keys and app state sync keys)
                await SystemSetting.findOneAndUpdate(
                    { key: 'whatsapp_auth_bundle' },
                    { value: bundle, updatedAt: Date.now() },
                    { upsert: true }
                ).exec();
            }
        } catch (err) {
            console.error('[WhatsApp Relay] Auth bundle sync failed:', err.message);
        }
    }, 2000);
}

/**
 * Load/Restore Full Authentication State (creds + all Signal keys) from MongoDB
 */
async function syncCredsWithDb(authPath, isVercel) {
    const connectDB = require('../config/database');
    await connectDB().catch(() => {}); // Ensure DB is ready

    const SystemSetting = require('../models/SystemSetting');
    const credsPath = path.join(authPath, 'creds.json');

    if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
    }

    const localFiles = fs.readdirSync(authPath);

    // If local auth is missing or only has 1 file (missing signal keys), restore complete bundle
    if (!fs.existsSync(credsPath) || localFiles.length < 2) {
        try {
            console.log('📦 Local WhatsApp session incomplete. Querying MongoDB for complete auth bundle...');
            const bundleSetting = await SystemSetting.findOne({ key: 'whatsapp_auth_bundle' });

            if (bundleSetting && bundleSetting.value && typeof bundleSetting.value === 'object') {
                const bundle = bundleSetting.value;
                let restoredCount = 0;
                for (const [fileName, fileData] of Object.entries(bundle)) {
                    if (typeof fileData === 'string' && fileName) {
                        fs.writeFileSync(path.join(authPath, fileName), fileData, 'utf-8');
                        restoredCount++;
                    }
                }
                console.log(`✅ Successfully restored complete WhatsApp auth bundle (${restoredCount} files) from MongoDB.`);
                return;
            }

            // Fallback for older single-file records
            const setting = await SystemSetting.findOne({ key: 'whatsapp_creds' });
            if (setting && setting.value) {
                const rawData = typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value);
                fs.writeFileSync(credsPath, rawData, 'utf-8');
                console.log(`🚀 Successfully restored legacy 'creds.json' from MongoDB.`);
            } else {
                console.log('⚠️ No WhatsApp session found in MongoDB. QR scan required.');
            }
        } catch (err) {
            console.error('❌ Failed to restore session from DB:', err.message);
        }
    } else {
        console.log(`✅ Session intact (${localFiles.length} files found locally).`);
        debouncedSaveFullAuth(authPath);
    }
}

async function startWhatsAppConnection() {
    if (isConnecting && connectionPromise) return connectionPromise;
    isConnecting = true;

    connectionPromise = (async () => {
        try {
            // Clean up any existing socket before creating a new one to prevent 440 (connectionReplaced)
            if (sock) {
                try {
                    sock.ev.removeAllListeners();
                    sock.end();
                } catch (e) {}
                sock = null;
            }

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
                ? '/tmp/whatsapp_auth'
                : path.join(__dirname, '../whatsapp_auth_info');

            if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

            // Restore from DB
            await syncCredsWithDb(authPath, isVercel);

            const { state, saveCreds } = await useMultiFileAuthState(authPath);
            
            // Use latest version to prevent rejection from WA servers
            const { version } = await fetchLatestBaileysVersion();
            console.log(`[WhatsApp Relay] Using WA protocol v${version.join('.')}`);

            sock = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, logger),
                },
                logger: logger,
                printQRInTerminal: false,
                browser: Browsers.windows('Desktop'),
                syncFullHistory: false, // Don't download massive chats
                generateHighQualityLinkPreview: false,
                markOnlineOnConnect: false, // Keep phone notifications active
                connectTimeoutMs: 60000, 
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 30000, // Standard 30s ping keeps connection alive
                retryRequestDelayMs: 3000,
                mobile: false,
                getMessage: async (key) => ({ conversation: 'Success' })
            });

            // Extreme Persistence: Save credentials AND all key rotations to disk and MongoDB
            sock.ev.on('creds.update', async () => {
                try {
                    await saveCreds(); 
                    debouncedSaveFullAuth(authPath);
                } catch (err) {
                    console.error('[WhatsApp Relay] Persistence Fail on creds.update:', err.message);
                }
            });

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    const SystemSetting = require('../models/SystemSetting');
                    try {
                        await SystemSetting.findOneAndUpdate(
                            { key: 'whatsapp_qr' },
                            { value: qr, updatedAt: Date.now() },
                            { upsert: true }
                        );
                    } catch (err) {}
                }

                if (connection === 'open') {
                    const SystemSetting = require('../models/SystemSetting');
                    SystemSetting.deleteOne({ key: 'whatsapp_qr' }).catch(() => {}); 
                    isConnecting = false;
                    reconnectAttempts = 0;
                    console.log('✅ [WhatsApp Relay] Connection opened successfully and authenticated.');

                    // Sync complete bundle to MongoDB
                    debouncedSaveFullAuth(authPath);

                    // 24/7 Heartbeat Watchdog: Every 5 minutes, send light presence frame and verify socket
                    if (heartbeatTimer) clearInterval(heartbeatTimer);
                    heartbeatTimer = setInterval(async () => {
                        try {
                            if (sock && sock.user) {
                                // Keeps WebSocket pipeline authenticated on WhatsApp edge without showing 'online'
                                await sock.sendPresenceUpdate('unavailable').catch(() => {});
                                debouncedSaveFullAuth(authPath);
                            } else if (!isConnecting) {
                                console.log('⚠️ [WhatsApp Relay] Heartbeat detected idle socket. Restoring connection...');
                                startWhatsAppConnection().catch(() => {});
                            }
                        } catch (hbErr) {
                            console.warn('[WhatsApp Relay] Heartbeat ping warning:', hbErr.message);
                        }
                    }, 5 * 60 * 1000);

                    if (openResolver) {
                        openResolver(sock);
                        openResolver = null;
                    }
                }

                if (connection === 'close') {
                    isConnecting = false;
                    connectionPromise = null;
                    const statusCode = (lastDisconnect?.error instanceof Boom) 
                        ? lastDisconnect.error.output?.statusCode 
                        : (lastDisconnect?.error?.code || 0);

                    console.log(`⚠️ [WhatsApp Relay] Connection closed (code: ${statusCode}, reason: ${lastDisconnect?.error?.message || 'unknown'})`);

                    // Clean up socket instance
                    if (sock) {
                        try {
                            sock.ev.removeAllListeners();
                            sock.end();
                        } catch (e) {}
                        sock = null;
                    }

                    if (openResolver) {
                        if (statusCode === 401) {
                            openResolver(null);
                            openResolver = null;
                        }
                    }

                    // Only DisconnectReason.loggedOut (401) represents a real user unpair from phone
                    if (statusCode === baileys.DisconnectReason.loggedOut || statusCode === 401) {
                        console.warn('❌ [WhatsApp Relay] Device logged out / unlinked from WhatsApp. Scan QR code to re-link.');
                        if (heartbeatTimer) {
                            clearInterval(heartbeatTimer);
                            heartbeatTimer = null;
                        }
                        return;
                    }

                    // For all other codes (428 Connection Closed, 515 Restart Required, 408 Timed Out, 440 Replaced, etc.):
                    // Reconnect automatically with backoff to prevent permanent logout after 24 hours
                    reconnectAttempts++;
                    const reconnectDelay = statusCode === 440 ? 10000 : 5000;
                    console.log(`🔄 [WhatsApp Relay] Auto-reconnecting in ${reconnectDelay / 1000}s (Attempt #${reconnectAttempts})...`);
                    setTimeout(() => {
                        startWhatsAppConnection().catch(err => {
                            console.error('[WhatsApp Relay] Auto-reconnect error:', err.message);
                        });
                    }, reconnectDelay);
                }
            });

            // Return a promise that resolves when the connection is actually OPEN
            return new Promise((resolve) => {
                if (sock && !isConnecting && sock.user) return resolve(sock);
                openResolver = resolve;
                
                // Timeout if connection takes too long
                setTimeout(() => {
                    if (openResolver) {
                        openResolver(sock); 
                        openResolver = null;
                    }
                }, 15000);
            });

        } catch (err) {
            console.error('❌ Failed to initialize WhatsApp socket:', err.message);
            isConnecting = false;
            connectionPromise = null;
            if (openResolver) openResolver(null);
            return null;
        }
    })();

    return connectionPromise;
}

const { sendMetaWhatsApp } = require('./metaWhatsAppService');

/**
 * Ensures WhatsApp is connected before proceeding (Baileys only)
 */
async function ensureWhatsApp() {
    if (process.env.META_ACCESS_TOKEN) return true; // Skip for Meta
    if (sock && !isConnecting && sock.user) return sock;
    return startWhatsAppConnection();
}

/**
 * Send a WhatsApp message (Auto-switches between Baileys and Meta)
 */
async function sendWhatsAppMessage(number, message) {
    if (process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID) {
        return sendMetaWhatsApp(number, message);
    }

    try {
        const client = await ensureWhatsApp();
        if (!client) return;
        
        let cleanNumber = number.replace(/\D/g, '');
        if (cleanNumber.length === 10) cleanNumber = '91' + cleanNumber;
        if (cleanNumber.length < 10) return;
        
        const jid = `${cleanNumber}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
    } catch (error) {}
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
    const timeStr = isNaN(timeValue.getTime()) ? new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : timeValue.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
    
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

async function sendLoginAlert(user) {
    const userPhone = user.phoneNumber || user.phone;
    if (!userPhone) return;
    const timeStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const message = `*Login Alert: Krishna Engineering Portal*\n\nHello ${user.name || 'User'},\n\nYour account was just logged into.\n\n*Time:* ${timeStr}\n\nIf this was not you, please contact support immediately.`;
    await sendWhatsAppMessage(userPhone, message);
}

async function getWhatsAppStatus() {
    if (process.env.META_ACCESS_TOKEN && process.env.META_PHONE_NUMBER_ID) {
        return {
            connected: true,
            isConnecting: false,
            qr: null,
            phone: process.env.META_PHONE_NUMBER_ID,
            provider: 'META_CLOUD_API_OFFICIAL'
        };
    }

    const connectDB = require('../config/database');
    await connectDB().catch(() => {});
    
    const SystemSetting = require('../models/SystemSetting');
    const qrSetting = await SystemSetting.findOne({ key: 'whatsapp_qr' });
    
    return {
        connected: !!(sock && !isConnecting && sock.user),
        isConnecting,
        qr: qrSetting ? qrSetting.value : null,
        phone: sock?.user?.id?.split(':')[0] || null,
        provider: 'LEGACY_QR_PAIRING'
    };
}

async function logoutWhatsApp() {
    try {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
        if (authSaveTimer) {
            clearTimeout(authSaveTimer);
            authSaveTimer = null;
        }
        if (sock) {
            try {
                await sock.logout().catch(() => {});
                sock.ev.removeAllListeners();
                sock.end();
            } catch (e) {}
            sock = null;
        }

        const SystemSetting = require('../models/SystemSetting');
        await SystemSetting.deleteMany({ key: { $in: ['whatsapp_creds', 'whatsapp_auth_bundle', 'whatsapp_qr'] } });

        const isVercel = process.env.VERCEL === '1';
        const authPath = isVercel 
            ? '/tmp/whatsapp_auth'
            : path.join(__dirname, '../whatsapp_auth_info');

        if (fs.existsSync(authPath)) {
            // Delete folder recursively
            fs.rmSync(authPath, { recursive: true, force: true });
        }

        isConnecting = false;
        connectionPromise = null;
        reconnectAttempts = 0;
        return { success: true };
    } catch (err) {
        console.error('Logout Fail:', err);
        throw err;
    }
}

module.exports = {
    startWhatsAppConnection,
    sendWhatsAppMessage,
    sendProgressUpdate,
    sendAttendanceAlert,
    sendAbsentAlert,
    sendTaskAssignment,
    sendDailyReport,
    sendLoginAlert,
    getWhatsAppStatus,
    logoutWhatsApp,
    ensureWhatsApp
};
