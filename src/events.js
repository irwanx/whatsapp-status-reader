import { Boom } from "@hapi/boom";
import { DisconnectReason } from "@whiskeysockets/baileys";
import { connectoWhatsapps } from "../index.js";
import chalk from "chalk";
import fs from "fs/promises";
import {
  logUserInfo,
  logVersionInfo,
  handleIncomingMessages,
  closeQuestionInterface,
} from "./utils.js";

const AUTH_DIR_PATH = "../auth";

export function handleConnectionUpdate(sock, version, isLatest) {
  sock.ev.on("connection.update", function ({ connection, lastDisconnect }) {
    const errorCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
    switch (connection) {
      case "close":
        handleDisconnection(errorCode);
        break;
      case "connecting":
        logVersionInfo(version, isLatest);
        break;
      case "open":
        logUserInfo(sock);
        closeQuestionInterface();
        break;
      default:
    }
  });
}

export function handleDisconnection(errorCode) {
  switch (errorCode) {
    case DisconnectReason.badSession:
      console.log(
        chalk.red.bold("❌ Bad Session File!") +
          chalk.yellow(" Hapus session dan scan ulang.")
      );
      process.exit();
      break;
    case DisconnectReason.connectionClosed:
      console.log(
        chalk.yellow("🔌 Connection closed!") +
          chalk.cyan(" Menyambungkan kembali...")
      );
      connectoWhatsapps();
      break;
    case DisconnectReason.connectionLost:
      console.log(
        chalk.red("⚡ Connection Lost from Server!") +
          chalk.cyan(" Menyambungkan kembali...")
      );
      connectoWhatsapps();
      break;
    case DisconnectReason.connectionReplaced:
      console.log(
        chalk.magenta("🔄 Connection Replaced!") +
          chalk.cyan(" Sesi baru lainnya dibuka dan terhubung kembali...")
      );
      connectoWhatsapps();
      break;
    case DisconnectReason.loggedOut:
      console.log(
        chalk.red.bold("🚪 Device Logged Out!") +
          chalk.yellow(" Menghapus session dan scan ulang.")
      );
      deleteAuthDirectory();
      break;
    case DisconnectReason.restartRequired:
      console.log(
        chalk.blue("🔁 Restart Required!") + chalk.cyan(" Memulai ulang...")
      );
      connectoWhatsapps();
      break;
    case DisconnectReason.timedOut:
      console.log(
        chalk.red("⏲️ Connection Timed Out!") +
          chalk.cyan(" Menyambungkan kembali...")
      );
      connectoWhatsapps();
      break;
    case DisconnectReason.Multidevicemismatch:
      console.log(
        chalk.red.bold("💥 Multi-device mismatch!") +
          chalk.yellow(" Scan ulang lagi.")
      );
      process.exit();
      break;
    default:
      console.log(chalk.gray("Unknown disconnection reason."));
  }
}

async function deleteAuthDirectory() {
  try {
    await fs.rm(AUTH_DIR_PATH, { recursive: true, force: true });
    console.log(chalk.green("✔️ Direktori auth berhasil dihapus."));

    console.log(chalk.blue("🔄 Memulai proses login ulang..."));
    connectoWhatsapps();
  } catch (err) {
    console.error(chalk.red("❌ Gagal menghapus direktori auth:", err));
  }
}

export function handleMessageUpsertEvent(sock) {
  sock.ev.on("messages.upsert", async function ({ messages, type }) {
    handleIncomingMessages(messages, sock, type);
  });
}
