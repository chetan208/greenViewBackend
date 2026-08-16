import makeWASocket, { DisconnectReason, BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import WhatsAppSession from '../../model/erpModels/whatsappSession';

// ─── Environment Detection ───
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const ENV_LABEL = IS_PRODUCTION ? '🟢 PRODUCTION' : '🟡 DEV';

// ─── Silent logger — suppresses all Baileys internal noise ───
const logger = pino({ level: 'silent' });

let sock: any = null;
let isConnected = false;
let qrCodeData: string | null = null;
let connectionInfo: any = null;
let isLoggingOut = false;
let reconnectAttempts = 0;
let isDestroyed = false;

// ─── DB Write Queue ───
let dbWriteQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

const processQueue = async () => {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    while (dbWriteQueue.length > 0) {
        if (isDestroyed) {
            dbWriteQueue.length = 0;
            break;
        }
        const task = dbWriteQueue.shift();
        if (task) {
            try { await task(); } catch (_) { /* silently skip failed DB writes */ }
        }
    }
    isProcessingQueue = false;
};

const waitForQueueDrain = async (): Promise<void> => {
    return new Promise(resolve => {
        const check = () => {
            if (dbWriteQueue.length === 0 && !isProcessingQueue) resolve();
            else setTimeout(check, 100);
        };
        check();
    });
};

// ─── MongoDB Auth State ───
const useMongoAuthState = async (sessionId: string) => {
    const cache = new Map<string, string>();

    try {
        const sessions = await WhatsAppSession.find({ sessionId });
        sessions.forEach(s => cache.set(s.dataKey, s.value));
        console.log(`[WhatsApp] Loaded ${sessions.length} session keys (${sessionId})`);
    } catch(e) {
        console.error(`[WhatsApp] Failed to load session:`, e);
    }

    const writeData = async (data: any, id: string) => {
        if (isDestroyed) return;
        try {
            const value = JSON.stringify(data, BufferJSON.replacer);
            const category = id.split('-')[0];
            await WhatsAppSession.findOneAndUpdate(
                { sessionId, dataKey: id },
                { sessionId, dataKey: id, category, value },
                { upsert: true, new: true }
            );
        } catch (_) { /* silently skip */ }
    };

    const removeData = async (id: string) => {
        if (isDestroyed) return;
        try {
            await WhatsAppSession.deleteOne({ sessionId, dataKey: id });
        } catch (_) {}
    };

    let credsStr = cache.get(`creds`);
    let creds = credsStr ? JSON.parse(credsStr, BufferJSON.reviver) : initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type: string, ids: string[]) => {
                    const data: any = {};
                    for (const id of ids) {
                        const key = `${type}-${id}`;
                        let value = cache.get(key);
                        if (value) {
                            let parsed = JSON.parse(value, BufferJSON.reviver);
                            if (type === 'app-state-sync-key' && parsed) {
                                parsed = proto.Message.AppStateSyncKeyData.fromObject(parsed);
                            }
                            data[id] = parsed;
                        }
                    }
                    return data;
                },
                set: async (data: any) => {
                    if (isDestroyed) return;
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                const strVal = JSON.stringify(value, BufferJSON.replacer);
                                cache.set(key, strVal);
                                dbWriteQueue.push(() => writeData(value, key));
                            } else {
                                cache.delete(key);
                                dbWriteQueue.push(() => removeData(key));
                            }
                        }
                    }
                    processQueue();
                }
            }
        },
        saveCreds: () => {
            if (isDestroyed) return;
            const strVal = JSON.stringify(creds, BufferJSON.replacer);
            cache.set(`creds`, strVal);
            return writeData(creds, 'creds');
        }
    };
};

// ─── Get Session ID (isolated per environment) ───
const getSessionId = (): string => {
    if (process.env.WHATSAPP_SESSION_ID) return process.env.WHATSAPP_SESSION_ID;
    return IS_PRODUCTION ? 'greenview_production_session' : 'greenview_dev_session';
};

// ─── Init WhatsApp Connection ───
export const initWhatsApp = async () => {
    try {
        isDestroyed = false;
        const sessionId = getSessionId();
        
        console.log(`\n[WhatsApp] ${ENV_LABEL} — Connecting (session: ${sessionId})`);
        
        const { state, saveCreds } = await useMongoAuthState(sessionId);
        
        const makeSocket = (makeWASocket as any).default || makeWASocket;
        sock = makeSocket({
            auth: state,
            printQRInTerminal: false,
            logger: logger,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            syncFullHistory: false,
            generateHighQualityLinkPreview: false
        });

        sock.ev.on('connection.update', (update: any) => {
            if (isDestroyed) return;

            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(`[WhatsApp] QR Code received — scan from ERP dashboard or terminal.`);
                
                // Only print QR in terminal for dev mode
                if (!IS_PRODUCTION) {
                    QRCode.toString(qr, { type: 'terminal', small: true }).then(str => {
                        console.log(str);
                    }).catch(() => {});
                }

                QRCode.toDataURL(qr).then(url => {
                    qrCodeData = url;
                }).catch(() => {});
                
                isConnected = false;
                connectionInfo = null;
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                isConnected = false;
                connectionInfo = null;
                
                if (sock) {
                    sock.ev.removeAllListeners('connection.update');
                    sock.ev.removeAllListeners('creds.update');
                }

                if (shouldReconnect && !isDestroyed && !isLoggingOut) {
                    reconnectAttempts++;
                    const delay = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 60000);
                    console.log(`[WhatsApp] Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts})`);
                    setTimeout(initWhatsApp, delay);
                } else if (!isDestroyed && !shouldReconnect) {
                    console.log(`[WhatsApp] Session logged out from phone. Cleaning up...`);
                    logoutWhatsApp().catch(() => {});
                }
            } else if (connection === 'open') {
                console.log(`[WhatsApp] ✅ Connected and ready! (${ENV_LABEL})`);
                isConnected = true;
                qrCodeData = null;
                connectionInfo = sock.user;
                reconnectAttempts = 0;
            }
        });

        sock.ev.on('creds.update', () => {
            if (!isDestroyed) saveCreds();
        });

    } catch (error) {
        console.error('[WhatsApp] Init failed:', error);
    }
};

// ─── Status ───
export const getWhatsAppStatus = () => {
    return {
        connected: isConnected,
        qrCode: qrCodeData,
        user: connectionInfo
    };
};

// ─── Logout ───
export const logoutWhatsApp = async () => {
    if (isLoggingOut) return { success: false, error: "Logout already in progress" };
    isLoggingOut = true;
    
    try {
        if (sock) {
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            try { await sock.logout(); } catch (_) {}
            try { sock.end(); } catch (_) {}
            sock = null;
        }

        await waitForQueueDrain();
        isDestroyed = true;
        dbWriteQueue.length = 0;

        isConnected = false;
        qrCodeData = null;
        connectionInfo = null;

        const sessionId = getSessionId();
        await WhatsAppSession.deleteMany({ sessionId });
        console.log(`[WhatsApp] Session cleaned up (${sessionId})`);

        setTimeout(() => {
            isLoggingOut = false;
            initWhatsApp();
        }, 2000);

        return { success: true };
    } catch (error: any) {
        console.error("[WhatsApp] Logout error:", error);
        isLoggingOut = false;
        return { success: false, error: error.message };
    }
};

// ─── Send Message ───
export const sendWhatsAppMessage = async (number: string, message: string) => {
    try {
        if (!sock || !isConnected) {
            return { success: false, error: "WhatsApp not connected." };
        }

        if (!number || typeof number !== 'string') {
            return { success: false, error: "Invalid phone number." };
        }

        let cleanNumber = number.replace(/\D/g, '');
        if (cleanNumber.length === 10) cleanNumber = `91${cleanNumber}`;
        const jid = `${cleanNumber}@s.whatsapp.net`;

        await sock.sendMessage(jid, { text: message });
        console.log(`[WhatsApp] ✉ Message sent to ${cleanNumber.slice(-4).padStart(cleanNumber.length, '*')}`);
        return { success: true, status: "Sent" };
    } catch (error: any) {
        console.error(`[WhatsApp] Send failed (${number}):`, error.message);
        return { success: false, error: error.message };
    }
};
