import "./src/suppressLogs.js";
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import NodeCache from "node-cache";
import chalk from "chalk";
import pino from "pino";

import {
  handlePairingCode,
  patchMessageBeforeSending,
  getMessage,
  client,
  ConnectionHandler,
} from "./src/index.js";

const msgRetryCounterCache = new NodeCache();

const store = {
  contacts: {},
  bind: (ev) => {
    ev.on("contacts.update", (updates) => {
      for (const update of updates) {
        if (update.id) {
          store.contacts[update.id] = {
            ...store.contacts[update.id],
            ...update,
          };
        }
      }
    });
    ev.on("contacts.upsert", (updates) => {
      for (const update of updates) {
        if (update.id) {
          store.contacts[update.id] = {
            ...store.contacts[update.id],
            ...update,
          };
        }
      }
    });
  },
};

const logger = pino({
  timestamp: () => `,"time":"${new Date().toJSON()}"`,
}).child({});
logger.level = "silent";

export const usePairingCode = process.argv.includes("--pairing-code");

export class WhatsAppConnector {
  constructor() {
    this.sock = null;
    this.state = null;
    this.saveCreds = null;
  }

  async initialize() {
    try {
      console.log(
        `${chalk.yellow("🔗 Pairing Code Status:")} ${chalk.green(
          usePairingCode ? "Enabled" : "Disabled",
        )}\n`,
      );

      const authState = await useMultiFileAuthState("auth");
      this.state = authState.state;
      this.saveCreds = authState.saveCreds;

      const versionInfo = await fetchLatestBaileysVersion();

      this.sock = this.createSocket(versionInfo.version);

      await handlePairingCode(this.sock, usePairingCode);

      this.setupEventHandlers(versionInfo);

      client(this.sock);

      store.bind(this.sock.ev);
      this.sock.store = store;

      return this.sock;
    } catch (error) {
      console.error(
        chalk.red("❌ Failed to initialize WhatsApp connection:"),
        error,
      );
      throw error;
    }
  }

  createSocket(version) {
    return makeWASocket({
      version,
      logger,
      printQRInTerminal: !usePairingCode,
      browser: Browsers.macOS("Safari"),
      auth: {
        creds: this.state.creds,
        keys: makeCacheableSignalKeyStore(this.state.keys, logger),
      },
      msgRetryCounterCache,
      generateHighQualityLinkPreview: true,
      markOnlineOnConnect: false,
      patchMessageBeforeSending,
      getMessage,
    });
  }

  setupEventHandlers(versionInfo) {
    new ConnectionHandler(
      this.sock,
      versionInfo,
      this.initialize.bind(this),
    ).initialize();

    this.sock.ev.on("creds.update", this.saveCreds);
  }
}

(async () => {
  try {
    const connector = new WhatsAppConnector();
    await connector.initialize();
  } catch (error) {
    console.error(chalk.red("❌ Application failed to start:"), error);
    process.exit(1);
  }
})();
