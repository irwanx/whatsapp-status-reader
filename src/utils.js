import baileys from "@whiskeysockets/baileys";
const { proto } = baileys;
import chalk from "chalk";
import readline from "readline";
import { loadPlugins } from "./loadPlugins.js";
import { formatMessage } from "./formatMessage.js";

const plugins = await loadPlugins();

export function logVersionInfo(version, isLatest) {
  const waVersion = chalk.bold.blue(`WA v${version.join(".")}`);
  const latestStatus = isLatest
    ? chalk.green("Up-to-date")
    : chalk.red("Outdated");
  const symbol = isLatest ? chalk.green("✔") : chalk.red("✘");

  console.log(`${symbol} ${waVersion} - Status: ${latestStatus}`);
}

export function logUserInfo(sock) {
  const userName = chalk.bold.cyanBright(`\n👤 Nama : ${sock.user.name}`);
  const userNumber = chalk.bold.yellow(
    `📞 Nomor : ${sock.user.id.split(":")[0]}\n`
  );

  console.log(userName);
  console.log(userNumber);
}

export async function handleIncomingMessages(messages, sock) {
  for (const msg of messages) {
    const m = formatMessage(msg, sock)
    if (!m && !m.fromMe) continue;
    for (const plugin of plugins) {
      try {
        if (plugin.command) {
          if (plugin.command.includes(m.command)) {
            await plugin.default({ m, sock })
          }
        } else {
          await plugin.default({ m, sock })
        }
      } catch (err) {
        console.error(`❌ Plugin error:`, err)
      }
    }
  }
}

export const handlePairingCode = async (sock, usePairingCode) => {
  if (usePairingCode && !sock.authState.creds.registered) {
    const phoneNumber = await question(
      `Silakan masukkan nomor WhatsApp Anda: `
    );
    if (/\d/.test(phoneNumber)) {
      const code = await sock.requestPairingCode(
        phoneNumber.replace(/[^0-9]/g, "")
      );
      console.log(
        chalk.green(
          "jika ada notif whatsapp [Memasukkan kode menautkan perangkat baru] maka sudah di pastikan berhasil!"
        )
      );
      console.log(
        chalk.cyan(`Pairing code: ${code.match(/.{1,4}/g).join("-")}`)
      );
    } else {
      console.log("Nomor telepon tidak valid.");
      process.exit();
    }
  }
  closeQuestionInterface();
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export const question = (text) =>
  new Promise((resolve) => rl.question(text, resolve));

export function closeQuestionInterface() {
  rl.close();
}

export function patchMessageBeforeSending(message) {
  if (
    message.buttonsMessage ||
    message.templateMessage ||
    message.listMessage
  ) {
    return {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadataVersion: 2,
            deviceListMetadata: {},
          },
          ...message,
        },
      },
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
