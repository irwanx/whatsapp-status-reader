import baileys from "@whiskeysockets/baileys";
const { proto } = baileys;
import chalk from "chalk";
import readline from "readline";
import { loadPlugins } from "./loadPlugins.js";
import { formatMessage } from "./formatMessage.js";
import logger from "./logger.js";
import { readConfig } from "../services/configService.js";

const plugins = await loadPlugins();

export async function handleIncomingMessages(messages, sock) {
  for (const msg of messages) {
    try {
      const config = await readConfig();
      const m = await formatMessage(msg, sock, config);

      if (!m || m.isBaileys) continue;

      const commandPlugins = plugins.filter((p) => p.command);
      const nonCommandPlugins = plugins.filter((p) => !p.command);

      logger({ m, type: "incoming" });

      if (m.prefix && m.command) {
        const lowerCommand = m.command.toLowerCase();

        if (config.publicMode ? m.isOwner ? true : false : true) {
          for (const plugin of commandPlugins) {
            try {
              if (plugin.command.includes(lowerCommand)) {
                await plugin.default({ m, sock, plugins, config });
              }
            } catch (err) {
              console.error(
                `❌ Command plugin error (${plugin.command.join(",")}):`,
                err
              );
            }
          }
        }
      }

      if (!m.prefix || !m.command) {
        for (const plugin of nonCommandPlugins) {
          try {
            await plugin.default({ m, sock, plugins, config });
          } catch (err) {
            console.error(`❌ Non-command plugin error (${plugin.name}):`, err);
          }
        }
      }
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
    `📞 Nomor : ${sock.user.id.split(":")[0]}\n`
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
        chalk.blue("Masukkan nomor WhatsApp (contoh: 628123456789): ")
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
      chalk.bold.whiteBright(formatKodePairing(kode))
    );
    console.log(chalk.cyan("------------------------------"));
  } catch (error) {
    console.error(
      chalk.red("\n❌ Gagal mendapatkan kode pairing:"),
      error.message
    );
    if (error.message.includes("registered")) {
      console.log(
        chalk.yellow("Nomor ini mungkin sudah terdaftar di perangkat lain.")
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
