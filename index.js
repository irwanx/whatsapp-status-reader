import * as pkg from "@neoxr/wb";
const { Client } = pkg;
import NodeCache from "node-cache";
import moment from "moment-timezone";
import chalk from "chalk";
import CFonts from "cfonts";
import { config } from "./config.js";
import { join, dirname } from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import fs from 'node:fs'

import * as latest from "baileys";
import past from "baileys";
const baileys = latest.proto?.WebMessageInfo ? latest : past;

const readStatusCache = new NodeCache({ stdTTL: 86400 });

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

  const { version } = await latest.fetchLatestBaileysVersion()

  const client = new Client(
    {
      plugsdir: "plugins",
      online: true,
      bypass_disappearing: true,
      bot: (id) => {
        // Detect message from bot by message ID
        return id && (id.startsWith("BAE") || /[-]/.test(id));
      },
      pairing: {
        state: true, // Set to 'false' if you want to use QR scan
        number: config.botNumber, // Your bot number
        code: "WSRXBOTX",
      },
      custom_id: "wsr",
      presence: true,
      create_session: {
        type: "local",
        session: "session",
        config: "",
      },
      engines: [baileys],
      debug: false,
    },
    {
      version: version,
      browser: latest.Browsers.macOS("Safari"),
      shouldIgnoreJid: (jid) => {
        return /(newsletter|bot)/.test(jid);
      },
    },
  );

  // Sesuai source neoxr: gunakan .once untuk connect
  client.once("connect", async (res) => {
    console.log(chalk.green("[✅ Connected to WhatsApp]"));
    if (res && typeof res === "object" && res.message) {
      console.log(res.message);
    }
  });

  // Sesuai source neoxr: error pakai .register
  client.register("error", async (error) => {
    console.error(chalk.red(`[❌ Error] ${error?.message || error}`));
  });

  // Sesuai source neoxr: ready pakai .once
  client.once("ready", async () => {
    console.log(chalk.green("[🤖 Ready] Bot is online!"));

    // Sesuai source neoxr listeners-extra.js:
    // stories pakai client.register, ctx berisi ctx.message.key dan ctx.sender
    client.register("stories", async (ctx) => {
      try {
        const sock = client.sock;

        // ctx.message.key sesuai neoxr source, fallback ke ctx.key
        const storyKey = ctx.message?.key ?? ctx.key;
        const sender = ctx.sender ?? ctx.message?.key?.participant;

        if (storyKey && sender && sender !== sock.decodeJid(sock.user.id)) {

          // Cek cache supaya tidak double-read
          if (readStatusCache.get(storyKey.id)) return;
          readStatusCache.set(storyKey.id, true);

          const zonaWaktu = "Asia/Jakarta";
          const timeString = moment().tz(zonaWaktu).format("HH.mm - D MMM");
          const normalizedUploader = latest.jidNormalizedUser(sender);

          // Auto read story
          if (config.autoReadStory) {
            await sock.readMessages([storyKey]);
            await latest.delay(1000);
          }

          // Auto react story
          let chosenEmoji;
          if (config.autoReactStory) {
            chosenEmoji = mathRandom(emojiStringToArray(config.reactEmote));
            try {
              // Sesuai neoxr: sendMessage ke status@broadcast dengan statusJidList: [ctx.sender]
              await sock.sendMessage(
                "status@broadcast",
                {
                  react: {
                    text: chosenEmoji,
                    key: storyKey,
                  },
                },
                {
                  statusJidList: [sender],
                },
              );
            } catch (err) {
              if (err.message === "not-acceptable" || err.data === 406) {
                console.log(
                  chalk.yellow(
                    `[⚠️ React Gagal] ${normalizedUploader?.split("@")[0]}, skip.`,
                  ),
                );
              } else {
                console.error(chalk.red(`[❌ React Error] ${err.message}`));
              }
            }
          }

          console.log(
            chalk.blue(`[📢 - ${timeString}]`),
            `- ${normalizedUploader?.split("@")[0]} (${ctx.pushName || ""}) ${chosenEmoji ?? ""}`,
          );
        }
      } catch (e) {
        console.error(chalk.red(`[❌ Stories Error] ${e.message}`));
      }
    });

    // Sesuai source neoxr: message pakai client.register
    // ctx adalah object langsung (bukan { messages })
    client.register("message", async (ctx) => {
      try {
        // Sesuai neoxr: baileys(client.sock) dipanggil di sini (init handler)
        setupClient(client.sock);

        const { m, body } = ctx;
        if (!m) return;

        const zonaWaktu = "Asia/Jakarta";
        const timeString = moment().tz(zonaWaktu).format("HH.mm - D MMM");

        // Log pesan masuk yang bukan broadcast
        if (m.chat && !m.chat.endsWith("@broadcast")) {
          if (m.message?.protocolMessage) return;
          console.log(
            chalk.cyan(`[💬 - ${timeString}]`),
            `- ${m.chat.split("@")[0]} (${m.pushName || ""}) ${(body ?? "").slice(0, 15)}`,
          );
        }
      } catch (e) {
        console.error(chalk.red(`[❌ Message Error] ${e.message}`));
      }
    });
  });

  return client;
}

function emojiStringToArray(str) {
  const spl = str.split(/([\uD800-\uDBFF][\uDC00-\uDFFF])/);
  const arr = [];
  for (let i = 0; i < spl.length; i++) {
    if (spl[i] !== "") arr.push(spl[i]);
  }
  return arr;
}

function mathRandom(x) {
  return x[Math.floor(x.length * Math.random())];
}

function setupClient(client) {
   /**
    * Gets the name associated with a user's JID from the global database.
    * @param {string} jid - The JID (WhatsApp ID) of the user.
    * @returns {string|null} - The name of the user, or null if the user is not found.
    */
   client.getName = jid => {
      const isFound = global.db.users.find(v => v.jid === client.decodeJid(jid))
      if (!isFound) return null
      return isFound.name
   }

   /**
    * Get all admin and superadmin IDs from a group participants list.
    *
    * @param {Array} participants - Array of participant objects from the group metadata.
    * @returns {Array<string>} List of participant IDs who are admins or superadmins.
    */
   client.getAdmin = participants => participants
      ?.filter(i => i.admin === 'admin' || i.admin === 'superadmin')
      ?.map(i => i.id) || []

   /**
    * Fetches the profile picture of a given WhatsApp JID.
    *
    * If the user has no profile picture or if an error occurs while fetching it,
    * the function will return a default image instead.
    *
    * @param {string} jid - The WhatsApp JID (user identifier) whose profile picture is requested.
    * @returns {Promise<string|Buffer>} - A URL of the profile picture if available, 
    *                                     otherwise the default image as a Buffer.
    */
   client.profilePicture = async jid => {
      const defaults = fs.readFileSync('./media/image/default.jpg')
      try {
         const picture = await client.profilePictureUrl(jid, 'image')
         return picture ?? defaults
      } catch (e) {
         return defaults
      }
   }
}

connectoWhatsapps().catch((e) => {
  console.error(chalk.red(`[❌ Fatal] ${e.message}`));
  connectoWhatsapps();
});
