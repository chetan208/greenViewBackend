import makeWASocket, { DisconnectReason, BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import WhatsAppSession from '../../model/erpModels/whatsappSession';

// Silent logger
const logger = pino({ level: 'info' });

let sock: any = null;
let isConnected = false;
let qrCodeData: string | null = null;
let connectionInfo: any = null;
let isLoggingOut = false;
let reconnectAttempts = 0;

// Write queue to prevent DB overwhelm
let dbWriteQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

// The critical fix: If destroyed, ignore all save requests from Baileys
let isDestroyed = false;

const processQueue = async () => {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    while (dbWriteQueue.length > 0) {
        if (isDestroyed) {
            // Drop tasks if session is being destroyed
            dbWriteQueue.length = 0;
            break;
        }
        const task = dbWriteQueue.shift();
        if (task) {
            try { await task(); } catch (e) { console.error("WhatsApp DB Task Error:", e); }
        }
    }
    isProcessingQueue = false;
};

// Wait for the queue to empty
const waitForQueueDrain = async (): Promise<void> => {
    return new Promise(resolve => {
        const check = () => {
            if (dbWriteQueue.length === 0 && !isProcessingQueue) resolve();
            else setTimeout(check, 100);
        };
        check();
    });
};

const useMongoAuthState = async (sessionId: string) => {
    const cache = new Map<string, string>();

    try {
        const sessions = await WhatsAppSession.find({ sessionId });
        sessions.forEach(s => cache.set(s.dataKey, s.value));
        console.log(`Loaded ${sessions.length} WhatsApp session keys from MongoDB for ${sessionId}.`);
    } catch(e) {
        console.error("Failed to preload session from MongoDB:", e);
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
        } catch (error) {
            console.error("Mongo Auth State Write Error:", error);
        }
    };

    const removeData = async (id: string) => {
        if (isDestroyed) return;
        try {
            await WhatsAppSession.deleteOne({ sessionId, dataKey: id });
        } catch (e) {}
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

export const initWhatsApp = async () => {
    try {
        isDestroyed = false;
        const sessionId = process.env.WHATSAPP_SESSION_ID || 'greenview_erp_session';
        const { state, saveCreds } = await useMongoAuthState(sessionId);
        
        const makeSocket = (makeWASocket as any).default || makeWASocket;
        sock = makeSocket({
            auth: state,
            printQRInTerminal: true,
            logger: logger,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            syncFullHistory: false,
            generateHighQualityLinkPreview: false
        });

        sock.ev.on('connection.update', (update: any) => {
            if (isDestroyed) return;

            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('WhatsApp QR Code received. Please scan:');
                QRCode.toString(qr, { type: 'terminal', small: true }).then(str => {
                    console.log(str);
                }).catch(err => console.error("Terminal QR failed", err));

                QRCode.toDataURL(qr).then(url => {
                    qrCodeData = url;
                    console.log('QR Code data URL generated successfully.');
                }).catch(e => {
                    console.error("QR generation failed", e);
                });
                isConnected = false;
                connectionInfo = null;
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('🔄 WhatsApp Connection closed. Reconnecting:', shouldReconnect);
                isConnected = false;
                connectionInfo = null;
                
                if (sock) {
                    sock.ev.removeAllListeners('connection.update');
                    sock.ev.removeAllListeners('creds.update');
                }

                if (shouldReconnect && !isDestroyed && !isLoggingOut) {
                    reconnectAttempts++;
                    const delay = Math.min(5000 * Math.pow(2, reconnectAttempts - 1), 60000);
                    console.log(`⏳ Reconnecting in ${delay/1000}s`);
                    setTimeout(initWhatsApp, delay);
                } else if (!isDestroyed && !shouldReconnect) {
                    // Logged out from phone
                    logoutWhatsApp().catch(e => console.error(e));
                }
            } else if (connection === 'open') {
                console.log('\n✅ WhatsApp Client is fully authenticated and ready!');
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
        console.error('Failed to initialize WhatsApp socket:', error);
    }
};

export const getWhatsAppStatus = () => {
    return {
        connected: isConnected,
        qrCode: qrCodeData,
        user: connectionInfo
    };
};

export const logoutWhatsApp = async () => {
    if (isLoggingOut) return { success: false, error: "Logout already in progress" };
    isLoggingOut = true;
    
    try {
        if (sock) {
            sock.ev.removeAllListeners('connection.update');
            sock.ev.removeAllListeners('creds.update');
            try { await sock.logout(); } catch (e) {}
            try { sock.end(); } catch (e) {}
            sock = null;
        }

        // Wait for any pending writes to finish, then set destroyed to block new writes
        await waitForQueueDrain();
        isDestroyed = true;
        dbWriteQueue.length = 0;

        isConnected = false;
        qrCodeData = null;
        connectionInfo = null;

        const sessionId = process.env.WHATSAPP_SESSION_ID || 'greenview_erp_session';
        await WhatsAppSession.deleteMany({ sessionId });
        console.log(`Cleaned up WhatsApp database session for ${sessionId}`);

        // Restart socket after a short delay
        setTimeout(() => {
            isLoggingOut = false;
            initWhatsApp();
        }, 2000);

        return { success: true };
    } catch (error: any) {
        console.error("Error logging out WhatsApp:", error);
        isLoggingOut = false;
        return { success: false, error: error.message };
    }
};

export const sendWhatsAppMessage = async (number: string, message: string) => {
    try {
        if (!sock || !isConnected) {
            return { success: false, error: "WhatsApp service is not connected." };
        }

        if (!number || typeof number !== 'string') {
            return { success: false, error: "Invalid phone number." };
        }

        let cleanNumber = number.replace(/\D/g, '');
        if (cleanNumber.length === 10) cleanNumber = `91${cleanNumber}`;
        const jid = `${cleanNumber}@s.whatsapp.net`;

        await sock.sendMessage(jid, { text: message });
        return { success: true, status: "Sent" };
    } catch (error: any) {
        console.error(`Failed to send WhatsApp to ${number}:`, error);
        return { success: false, error: error.message };
    }
};
