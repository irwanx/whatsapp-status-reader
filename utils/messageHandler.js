import { extractMessageBody } from './messageParser.js';
import { delay } from '@whiskeysockets/baileys';
import chalk from 'chalk';

export async function handleIncomingMessages(messages, sock) {
    for (const msg of messages) {
        if (msg.message) {
            const body = extractMessageBody(msg);

            if (msg.key.remoteJid === 'status@broadcast') {
                if (!msg.message.protocolMessage) {
                    console.log(`Lihat status ${msg.pushName} ${msg.key.participant.split('@')[0]}\n`);
                    await sock.readMessages([msg.key]);
                    await delay(1000);
                    await sock.readMessages([msg.key]);
                }
                return;
            }

            if (msg.key.remoteJid.endsWith('@s.whatsapp.net') !== sock.user.id) {
                if (!msg.message.protocolMessage) {
                    const senderNumber = msg.key.remoteJid.split('@')[0];
                    const formattedMessage = `${chalk.blue('📩 Pesan Baru 📩')}
${chalk.green('Dari:')} ${chalk.bold(msg.pushName)} (${chalk.yellow(senderNumber)})
${chalk.green('Pesan:')} ${chalk.white(body)}
${chalk.gray('-------------------------------------------')}`;
                    console.log(formattedMessage);
                }
            }
        }
    }
}
