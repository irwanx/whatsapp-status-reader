import {makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import NodeCache from "node-cache";
import chalk from 'chalk';

import { createLogger } from './src/logger.js';
import { patchMessageBeforeSending, getMessage, handlePairingCode } from './src/utils.js';
import client from './src/client.js';
import { handleConnectionUpdate, handleMessageUpsertEvent } from './src/events.js';

const msgRetryCounterCache = new NodeCache();
const logger = createLogger();

export const usePairingCode = process.argv.includes('--pairing-code');

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
    client({ sock });
    handleMessageUpsertEvent(sock);
    sock.ev.on("creds.update", saveCreds);

    return sock;
}

connectoWhatsapps();