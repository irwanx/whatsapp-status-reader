import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  delay,
  jidNormalizedUser,
} from "baileys";
import baileys from "baileys";
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
const readStatusCache = new NodeCache({ stdTTL: 86400 });
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let reconnectTimeout = null;
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

  const tryReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.log(
        chalk.red(
          `❌ Batas percobaan reconnect (${maxReconnectAttempts}x) tercapai. Bot dihentikan.`,
        ),
      );
      console.log(
        chalk.yellow(
          `💡 Hapus folder 'auth' dan scan QR lagi untuk memulai ulang.`,
        ),
      );
      process.exit(1);
    }
    reconnectAttempts++;
    const delayMs = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    console.log(
      chalk.yellow(
        `Percobaan reconnect ${reconnectAttempts}/${maxReconnectAttempts} dalam ${delayMs / 1000}s...`,
      ),
    );
    reconnectTimeout = setTimeout(() => {
      connectoWhatsapps();
    }, delayMs);
  };

  sock.ev.on("connection.update", function ({ connection, lastDisconnect }) {
    switch (connection) {
      case "close":
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        switch (new Boom(lastDisconnect?.error)?.output?.statusCode) {
          case DisconnectReason.badSession:
            console.log(
              chalk.red(`File Sesi Buruk, harap hapus sesi dan pindai lagi.`),
            );
            process.exit(1);
            break;
          case DisconnectReason.connectionClosed:
            console.log(chalk.yellow("Koneksi ditutup, mencoba reconnect..."));
            tryReconnect();
            break;
          case DisconnectReason.connectionLost:
            console.log(
              chalk.yellow("Koneksi Hilang dari Server, mencoba reconnect..."),
            );
            tryReconnect();
            break;
          case DisconnectReason.connectionReplaced:
            console.log(
              chalk.yellow(
                "Koneksi Diganti, sesi baru lainnya dibuka, mencoba reconnect...",
              ),
            );
            tryReconnect();
            break;
          case DisconnectReason.loggedOut:
            console.error(
              chalk.red(`Perangkat Keluar/Di-logout, silakan pindai lagi.`),
            );
            process.exit(1);
            break;
          case DisconnectReason.restartRequired:
            console.log(
              chalk.yellow("Diperlukan Restart, mencoba reconnect..."),
            );
            tryReconnect();
            break;
          case DisconnectReason.timedOut:
            console.log(
              chalk.yellow("Koneksi Habis Waktu, mencoba reconnect..."),
            );
            tryReconnect();
            break;
          case DisconnectReason.Multidevicemismatch:
            console.error(
              chalk.red(
                "Ketidakcocokan beberapa perangkat, harap pindai lagi.",
              ),
            );
            process.exit(1);
            break;
          default:
            console.log(chalk.red(lastDisconnect?.error));
            tryReconnect();
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
        reconnectAttempts = 0;
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
        if (readStatusCache.get(msg.key.id)) return;
        if (!msg.message || Object.keys(msg.message).length === 0) return;
        readStatusCache.set(msg.key.id, true);
        let chosenEmoji;
        await sock.readMessages([msg.key]);
        await delay(1000);
        if (config.autoReactStory) {
          chosenEmoji = mathRandom(emojiStringToArray(config.reactEmote));
          try {
            await sock.sendMessage(
              "status@broadcast",
              { react: { text: chosenEmoji, key: msg.key } },
              { statusJidList: [botJid, normalizedUploader] },
            );
          } catch (err) {
            if (err.message === "not-acceptable" || err.data === 406) {
              console.log(
                chalk.yellow(
                  `[⚠️ React Gagal] Session tidak tersedia untuk ${normalizedUploader?.split("@")[0]}, skip.`,
                ),
              );
            } else {
              console.error(chalk.red(`[❌ React Error] ${err.message}`));
            }
          }
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
