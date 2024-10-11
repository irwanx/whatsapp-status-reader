import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, makeInMemoryStore } from '@whiskeysockets/baileys';
import NodeCache from "node-cache";
import pino from "pino";
import chalk from 'chalk';

import { createLogger } from './config/logger.js';
import { handleConnectionUpdate } from './events/connectionEvents.js';
import { handleMessageUpsertEvent } from './events/messageEvents.js';
import { patchMessageBeforeSending, getMessage } from './utils/socketHelper.js';
import client from './lib/client.js';
import { handlePairingCode } from './utils/pairingCodeHandler.js';

const msgRetryCounterCache = new NodeCache();
const logger = createLogger();

export const usePairingCode = process.argv.includes('--pairing-code');

const store = makeInMemoryStore({
    logger: pino({
        level: "fatal"
    }).child({
        level: "fatal"
    })
})

export async function connectoWhatsapps() {
    console.log(`${chalk.yellow('🔗 Pairing Code Status:')} ${chalk.green(usePairingCode ? 'Enabled' : 'Disabled')}
`);

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

    await handlePairingCode(sock, usePairingCode);
    handleConnectionUpdate(sock, version, isLatest);
    client({ sock, store });
    handleMessageUpsertEvent(sock);
    sock.ev.on("creds.update", saveCreds);

    return sock;
}

connectoWhatsapps();