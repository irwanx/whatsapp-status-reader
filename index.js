import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  delay,
  Browsers,
  jidNormalizedUser,
} from "@whiskeysockets/baileys";
import baileys from "@whiskeysockets/baileys";
const { proto } = baileys;
import { Boom } from "@hapi/boom";
import NodeCache from "node-cache";
import readline from "readline";
import pino from "pino";
import moment from "moment-timezone";
import chalk from "chalk";
import CFonts from "cfonts";
import { config } from "./config.js";
import { join, dirname } from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const logger = pino({
  timestamp: () => `,"time":"${new Date().toJSON()}" `,
}).child({});
logger.level = "silent";

const usePairingCode = process.argv.includes("--pairing-code");
const msgRetryCounterCache = new NodeCache();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(__dirname);
const { name, author, version: appVersion } = require(
  join(__dirname, "./package.json"),
);

async function connectoWhatsapps() {
  CFonts.say("WSR Bot", {
    font: "block",
    align: "center",
    colors: ["red", "white"],
    background: "transparent",
    space: true,
  });
  CFonts.say(`'${name}' v${appVersion}\nBy @${author.name || author}`, {
    font: "console",
    align: "center",
    colors: ["whiteBright"],
    background: "transparent",
  });

  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version, isLatest } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: !usePairingCode,
    browser: Browsers.macOS("Safari"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterCache,
    syncFullHistory: true,
    generateHighQualityLinkPreview: true,
    patchMessageBeforeSending,
    getMessage,
  });

  if (usePairingCode && !sock.authState.creds.registered) {
    var phoneNumber = await question(
      chalk.green("📱 Masukkan nomor WhatsApp Anda") +
        chalk.gray(" (contoh: 628123456789): "),
    );
    if (/\d/.test(phoneNumber)) {
      const code = await sock.requestPairingCode(
        phoneNumber.replace(/[^0-9]/g, ""),
      );
      console.log(
        chalk.green("✅ Jika ada notifikasi WhatsApp"),
        "[Memasukkan kode tautan perangkat baru]",
        chalk.green("maka dipastikan berhasil!"),
      );
      console.log(
        chalk.yellow(`🔑 Kode Penyandingan:`),
        code.match(/.{1,4}/g).join("-"),
      );
    } else {
      console.log(chalk.red("❌ Nomor telepon tidak valid."));
      process.exit();
    }
  }

  sock.ev.on("connection.update", function ({ connection, lastDisconnect }) {
    switch (connection) {
      case "close":
        switch (new Boom(lastDisconnect?.error)?.output?.statusCode) {
          case DisconnectReason.badSession:
            console.log(
              chalk.red(`File Sesi Buruk, harap hapus sesi dan pindai lagi.`),
            );
            process.exit();
            break;
          case DisconnectReason.connectionClosed:
            console.log(chalk.yellow("Koneksi ditutup, menyambung kembali..."));
            connectoWhatsapps();
            break;
          case DisconnectReason.connectionLost:
            console.log(
              chalk.yellow("Koneksi Hilang dari Server, menyambung kembali..."),
            );
            connectoWhatsapps();
            break;
          case DisconnectReason.connectionReplaced:
            console.log(
              chalk.yellow(
                "Koneksi Diganti, sesi baru lainnya dibuka, menyambung kembali...",
              ),
            );
            connectoWhatsapps();
            break;
          case DisconnectReason.loggedOut:
            console.error(chalk.red(`Perangkat Keluar, silakan pindai lagi.`));
            process.exit();
            break;
          case DisconnectReason.restartRequired:
            console.log(chalk.yellow("Diperlukan Restart, memulai ulang..."));
            connectoWhatsapps();
            break;
          case DisconnectReason.timedOut:
            console.log(
              chalk.yellow("Koneksi Habis Waktu, sedang menyambung..."),
            );
            connectoWhatsapps();
            break;
          case DisconnectReason.Multidevicemismatch:
            console.error(
              chalk.red(
                "Ketidakcocokan beberapa perangkat, harap pindai lagi.",
              ),
            );
            process.exit();
            break;
          default:
            console.log(chalk.red(lastDisconnect?.error));
        }
        break;
      case "connecting":
        console.log(
          chalk.yellow(
            `Versi WhatsApp ${version.join(".")} ${isLatest ? "Terbaru" : "Perlu Diperbarui"}`,
          ),
        );
        break;
      case "open":
        console.log(chalk.green("✅ Terhubung sebagai:"), sock.user.name);
        console.log(
          chalk.green("🔗 Nomor:"),
          `https://wa.me/${sock.user.id.split(":")[0]}`,
        );
        rl.close();
        break;
      default:
    }
  });

  sock.ev.on("creds.update", function () {
    saveCreds();
  });

  sock.ev.on("messages.upsert", async function ({ messages }) {
    let body;
    for (let msg of messages) {
      if (msg.message) {
        body = extractText(unwrapMessage(msg.message) || {}) ?? "";
      }
      const zonaWaktu = "Asia/Jakarta";
      const waktuSekarang = moment().tz(zonaWaktu);
      const timeString = waktuSekarang.format("HH.mm - D MMM");
      if (config.autoReadStory && msg.key.remoteJid === "status@broadcast") {
        if (msg.key.fromMe || msg.message?.reactionMessage) return;
        const botJid = jidNormalizedUser(sock.user.id);
        const normalizedUploader = jidNormalizedUser(msg.key.participant);
        if (msg.message?.protocolMessage) return;
        let chosenEmoji;
        await sock.readMessages([msg.key]);
        await delay(1000);
        if (config.autoReactStory) {
          chosenEmoji = mathRandom(emojiStringToArray(config.reactEmote));
          await sock.sendMessage(
            "status@broadcast",
            { react: { text: chosenEmoji, key: msg.key } },
            { statusJidList: [botJid, normalizedUploader] },
          );
        }
        console.log(
          chalk.blue(`[📢 - ${timeString}]`),
          `- ${normalizedUploader?.split("@")[0]} (${msg.pushName}) ${chosenEmoji ?? ""}`,
        );
      }
      if (!msg.key.remoteJid.endsWith("@broadcast")) {
        if (msg.message?.protocolMessage) return;
        console.log(
          chalk.cyan(`[💬 - ${timeString}]`),
          `- ${msg.key.remoteJid.split("@")[0]} (${msg.pushName}) ${body?.slice(0, 15)}`,
        );
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
              deviceListMetadata: {},
            },
            ...message,
          },
        },
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

function emojiStringToArray(str) {
  const spl = str.split(/([\uD800-\uDBFF][\uDC00-\uDFFF])/);
  const arr = [];
  for (let i = 0; i < spl.length; i++) {
    let char = spl[i];
    if (char !== "") {
      arr.push(char);
    }
  }
  return arr;
}

function mathRandom(x) {
  return x[Math.floor(x.length * Math.random())];
}

function unwrapMessage(message) {
  if (!message) return null;
  if (message.ephemeralMessage)
    return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage)
    return unwrapMessage(message.viewOnceMessage.message);
  return message;
}

function extractText(msg = {}) {
  return (
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    msg?.documentMessage?.caption ||
    msg?.buttonsResponseMessage?.selectedButtonId ||
    msg?.listResponseMessage?.title ||
    msg?.templateButtonReplyMessage?.selectedId ||
    ""
  );
}

connectoWhatsapps();
