import baileys from '@whiskeysockets/baileys';
import { Boom } from "@hapi/boom";
import NodeCache from "node-cache";
import readline from 'readline'
import pino from "pino";
const {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    delay,
    proto,
    Browsers
} = baileys

const logger = pino({
    timestamp: () => `,"time":"${new Date().toJSON()}"`
}).child({});
logger.level = "silent";

const useStore = !process.argv.includes("--no-store");
const usePairingCode = process.argv.includes('--pairing-code');

const msgRetryCounterCache = new NodeCache();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = text => new Promise(resolve => rl.question(text, resolve));

async function connectoWhatsapps() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: !usePairingCode,
        browser: Browsers.ubuntu('CHROME'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        msgRetryCounterCache,
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending,
        getMessage
    });

    if (usePairingCode && !sock.authState.creds.registered) {
        var phoneNumber = await question(`Silakan masukkan nomor WhatsApp Anda: `)
        if (/\d/.test(phoneNumber)) {
            const code = await sock.requestPairingCode(
                phoneNumber.replace(/[^0-9]/g, "")
            );
            console.log("jika ada notif whatsapp [Memasukkan kode menautkan perangkat baru] maka sudah di pastikan berhasil!");
            console.log(`Pairing code: ${code.match(/.{1,4}/g).join("-")}`);
        } else {
            console.log("Nomor telepon tidak valid.");
            process.exit();
        }
    }

    sock.ev.on("connection.update", function ({ connection, lastDisconnect }) {
        switch (connection) {
            case "close":
                switch (new Boom(lastDisconnect?.error)?.output?.statusCode) {
                    case DisconnectReason.badSession:
                        console.log(
                            `Bad Session File, hapus session dan scan scan lagi.`
                        );
                        process.exit();
                        break;
                    case DisconnectReason.connectionClosed:
                        console.log(
                            "Connection closed, menyambungkan kembali..."
                        );
                        connectoWhatsapps();
                        break;
                    case DisconnectReason.connectionLost:
                        console.log(
                            "Connection Lost from Server, menyambungkan kembali..."
                        );
                        connectoWhatsapps();
                        break;
                    case DisconnectReason.connectionReplaced:
                        console.log(
                            "Connection Replaced, sesi baru lainnya dibuka dan terhubung kembali..."
                        );
                        connectoWhatsapps();
                        break;
                    case DisconnectReason.loggedOut:
                        console.log(`Device Logged Out, scan ulang lagi.`);
                        process.exit();
                        break;
                    case DisconnectReason.restartRequired:
                        console.log("Restart Required, memulai ulang...");
                        connectoWhatsapps();
                        break;
                    case DisconnectReason.timedOut:
                        console.log(
                            "Connection TimedOut, menyambungkan kembali..."
                        );
                        connectoWhatsapps();
                        break;
                    case DisconnectReason.Multidevicemismatch:
                        console.log("Multi device mismatch, scan ulang lagi.");
                        process.exit();
                        break;
                    default:
                        console.log(``);
                }
                break;
            case "connecting":
                console.log(
                    `using WA v${version.join(".")}, isLatest ${isLatest}`
                );
                break;
            case "open":
                console.log(" Nama :", sock.user.name);
                console.log(" Nomor:", sock.user.id.split(":")[0]);
                rl.close();
                break;
            default:
        }
    });

    sock.ev.on("creds.update", function () {
        saveCreds();
    });

    sock.ev.on("messages.upsert", async function ({ messages, type }) {
        var type, msgg, body;
        for (let msg of messages) {
            if (msg.message) {
                type = Object.entries(msg.message)[0][0];
                msgg = (type == 'viewOnceMessageV2') ? msg.message[type].message[Object.entries(msg.message[type].message)[0][0]] : msg.message[type];
                body = (type == 'conversation') ? msgg : (type == 'extendedTextMessage') ? msgg.text : (type == 'imageMessage') && msgg.caption ? msgg.caption : (type == 'videoMessage') && msgg.caption ? msgg.caption : (type == 'templateButtonReplyMessage') && msgg.selectedId ? msgg.selectedId : (type == 'buttonsResponseMessage') && msgg.selectedButtonId ? msgg.selectedButtonId : (type == 'listResponseMessage') && msgg.singleSelectReply.selectedRowId ? msgg.singleSelectReply.selectedRowId : '';
            }
            if (msg.key.remoteJid === 'status@broadcast') {
                if (msg.message?.protocolMessage) return;
                console.log(`Lihat status ${msg.pushName} ${msg.key.participant.split('@')[0]}\n`);
                await sock.readMessages([msg.key]);
                await delay(1000);
                return sock.readMessages([msg.key]);
            }
            if (msg.key.remoteJid.endsWith('@s.whatsapp.net')) {
                if (msg.message?.protocolMessage) return;
                console.log(`Pesan baru\nDari : ${msg.pushName}\nNomor : ${msg.key.remoteJid.split('@')[0]}\nPesan: ${body}\n`);
            }
        }
    });

    return sock;

    function patchMessageBeforeSending(message) {
        const requiresPatch = !!(
            message.buttonsMessage ||
            message.templateMessage ||
            message.listMessage
        );
        if (requiresPatch) {
            message = {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadataVersion: 2,
                            deviceListMetadata: {}
                        },
                        ...message
                    }
                }
            };
        }
        return message;
    }

    async function getMessage(key) {
        if (store) {
            const msg = await store.loadMessage(key.remoteJid, key.id);
            return msg?.message || undefined;
        }
        return proto.Message.fromObject({});
    }
}

connectoWhatsapps();