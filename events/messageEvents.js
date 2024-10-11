import { handleIncomingMessages } from '../utils/messageHandler.js';

export function handleMessageUpsertEvent(sock) {
    sock.ev.on("messages.upsert", async function ({ messages, type }) {
        handleIncomingMessages(messages, sock, type)
    });
}