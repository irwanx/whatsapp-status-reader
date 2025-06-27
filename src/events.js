import { Boom } from "@hapi/boom";
import { DisconnectReason } from "@whiskeysockets/baileys";
import chalk from "chalk";
import fs from "fs/promises";
import { handleIncomingMessages } from "./utils.js";

const AUTH_DIR_PATH = "../auth";

class ConnectionHandler {
  constructor(sock, versionInfo, whatsappConnector) {
    this.sock = sock;
    this.version = versionInfo?.version;
    this.isLatest = versionInfo?.isLatest;
    this.connectoWhatsapps = whatsappConnector;
  }

  initialize() {
    this.setupConnectionUpdateListener();
    this.setupMessageUpsertListener();
  }

  setupConnectionUpdateListener() {
    this.sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
      switch (connection) {
        case "close":
          this.handleDisconnection(lastDisconnect?.error);
          break;
        case "connecting":
          this.logVersionInfo();
          break;
        case "open":
          this.logUserInfo();
          break;
      }
    });
  }

  setupMessageUpsertListener() {
    this.sock.ev.on("messages.upsert", ({ messages, type }) => {
      handleIncomingMessages(messages, this.sock, type);
    });
  }

  async handleDisconnection(error) {
    const errorCode = new Boom(error)?.output?.statusCode;

    const handlers = {
      [DisconnectReason.badSession]: this.handleBadSession.bind(this),
      [DisconnectReason.connectionClosed]:
        this.handleConnectionClosed.bind(this),
      [DisconnectReason.connectionLost]: this.handleConnectionLost.bind(this),
      [DisconnectReason.connectionReplaced]:
        this.handleConnectionReplaced.bind(this),
      [DisconnectReason.loggedOut]: this.handleLoggedOut.bind(this),
      [DisconnectReason.restartRequired]: this.handleRestartRequired.bind(this),
      [DisconnectReason.timedOut]: this.handleTimedOut.bind(this),
      [DisconnectReason.multideviceMismatch]:
        this.handleMultideviceMismatch.bind(this),
    };

    const handler =
      handlers[errorCode] || this.handleUnknownDisconnection.bind(this);
    await handler();
  }

  handleBadSession() {
    console.log(
      chalk.red.bold("❌ Bad Session File!") +
        chalk.yellow(" Hapus session dan scan ulang.")
    );
    process.exit(1);
  }

  handleConnectionClosed() {
    console.log(
      chalk.yellow("🔌 Connection closed!") +
        chalk.cyan(" Menyambungkan kembali...")
    );
    this.scheduleReconnection();
  }

  handleConnectionLost() {
    console.log(
      chalk.red("⚡ Connection Lost from Server!") +
        chalk.cyan(" Menyambungkan kembali...")
    );
    this.scheduleReconnection();
  }

  handleConnectionReplaced() {
    console.log(
      chalk.magenta("🔄 Connection Replaced!") +
        chalk.cyan(" Sesi baru lainnya dibuka dan terhubung kembali...")
    );
    this.scheduleReconnection();
  }

  async handleLoggedOut() {
    console.log(
      chalk.red.bold("🚪 Device Logged Out!") +
        chalk.yellow(" Menghapus session dan scan ulang.")
    );
    await this.deleteAuthDirectory();
  }

  async handleRestartRequired() {
    console.log(
      chalk.blue("🔁 Restart Required!") +
        chalk.cyan(" Memulai ulang dengan aman...")
    );
    await this.safeRestart();
  }

  handleTimedOut() {
    console.log(
      chalk.red("⏲️ Connection Timed Out!") +
        chalk.cyan(" Menyambungkan kembali...")
    );
    this.scheduleReconnection();
  }

  handleMultideviceMismatch() {
    console.log(
      chalk.red.bold("💥 Multi-device mismatch!") +
        chalk.yellow(" Scan ulang lagi.")
    );
    process.exit(1);
  }

  async handleUnknownDisconnection() {
    console.log(chalk.gray("Unknown disconnection reason."));
    await this.safeRestart();
  }

  async safeRestart() {
    try {
      await this.sock.end();
      await new Promise((resolve) => setTimeout(resolve, 3000));
      this.connectoWhatsapps();
    } catch (error) {
      console.error(chalk.red("❌ Gagal melakukan restart aman:", error));
      process.exit(1);
    }
  }

  scheduleReconnection(delay = 3000) {
    setTimeout(() => this.connectoWhatsapps(), delay);
  }

  async deleteAuthDirectory() {
    try {
      await fs.rm(AUTH_DIR_PATH, { recursive: true, force: true });
      console.log(chalk.green("✔️ Direktori auth berhasil dihapus."));
      this.scheduleReconnection();
    } catch (err) {
      console.error(chalk.red("❌ Gagal menghapus direktori auth:", err));
    }
  }

  logVersionInfo() {
    console.log(
      chalk.green(`Versi saat ini: ${this.version}`),
      this.isLatest ? chalk.blue("(Terbaru)") : chalk.yellow("(Perlu update)")
    );
  }

  logUserInfo() {
    if (this.sock.user) {
      console.log(
        chalk.green("✅ Terhubung sebagai:"),
        chalk.cyan(this.sock.user.name || this.sock.user.id)
      );
    } else {
      console.log(chalk.yellow("⚠️ Terhubung, tapi user info belum tersedia."));
    }
  }
}

export default ConnectionHandler;
