import baileys from '@whiskeysockets/baileys';
const { proto } = baileys

export function patchMessageBeforeSending(message) {
    if (message.buttonsMessage || message.templateMessage || message.listMessage) {
        return {
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

export async function getMessage(key, store) {
    if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id);
        return msg?.message || undefined;
    }
    return proto.Message.fromObject({});
}
