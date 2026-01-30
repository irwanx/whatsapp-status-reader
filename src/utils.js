import baileys from "@whiskeysockets/baileys";
const { proto } = baileys;
import chalk from "chalk";
import readline from "readline";
import { config } from "./config.js";
import { handleCommand, handleStory } from "./handler.js";
import { formatMessage } from "./formatMessage.js";
import logger from "./logger.js";

export async function handleIncomingMessages(messages, sock) {
  for (const msg of messages) {
    try {
      const m = await formatMessage(msg, sock, config);

      if (!m || m.isBaileys) continue;

      // Run auto read/react status
      await handleStory(sock, m);

      logger({ m, type: "incoming" });

      await handleCommand(m, sock);
      // }
    } catch (err) {
      console.error("❌ Message processing error:", err);
    }
  }
}

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
    `📞 Nomor : ${sock.user.id.split(":")[0]}\n`,
  );

  console.log(userName);
  console.log(userNumber);
}

const buatInterface = () => {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
};

const validasiNomor = (nomor) => {
  const bersih = nomor.replace(/[^0-9]/g, "");
  return bersih.length >= 10 && bersih.length <= 15;
};

const formatKodePairing = (kode) => kode.match(/.{1,4}/g).join("-");

export const handlePairingCode = async (sock, gunakanPairingCode) => {
  if (!gunakanPairingCode || sock.authState.creds.registered) return;

  const rl = buatInterface();
  const tanya = (teks) => new Promise((resolve) => rl.question(teks, resolve));

  try {
    console.log(chalk.yellow("Perlu registrasi perangkat\n"));

    let nomorWhatsApp;
    while (true) {
      nomorWhatsApp = await tanya(
        chalk.blue("Masukkan nomor WhatsApp (contoh: 628123456789): "),
      );
      if (validasiNomor(nomorWhatsApp)) break;
      console.log(chalk.red("Nomor tidak valid. Harap masukkan 10-15 digit."));
    }

    const nomorBersih = nomorWhatsApp.replace(/[^0-9]/g, "");
    console.log(chalk.green("\nMeminta kode pairing..."));

    const kode = await sock.requestPairingCode(nomorBersih);

    console.log(chalk.green("\n✅ Kode pairing berhasil dibuat!"));
    console.log(chalk.cyan("\n------------------------------"));
    console.log(chalk.whiteBright("  Cek WhatsApp untuk:"));
    console.log(chalk.whiteBright('  notifikasi "Tautkan perangkat baru"'));
    console.log(chalk.cyan("------------------------------"));
    console.log(
      chalk.yellow("Kode Pairing Anda:"),
      chalk.bold.whiteBright(formatKodePairing(kode)),
    );
    console.log(chalk.cyan("------------------------------"));
  } catch (error) {
    console.error(
      chalk.red("\n❌ Gagal mendapatkan kode pairing:"),
      error.message,
    );
    if (error.message.includes("registered")) {
      console.log(
        chalk.yellow("Nomor ini mungkin sudah terdaftar di perangkat lain."),
      );
    }
  } finally {
    rl.close();
  }
};

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
