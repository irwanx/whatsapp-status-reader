import chalk from "chalk";
import { jidNormalizedUser } from "@whiskeysockets/baileys";
import { emojiStringToArray, mathRandom } from "../functions.js";
import { config } from "../../config/config.js";

const storyTimestamps = new Map();

export default async function autoReadAndReactStory({ m, sock }) {
  try {
    const isStatusBroadcast = m.chat === "status@broadcast";
    if (!isStatusBroadcast || m.raw?.message?.protocolMessage) return;

    const isReactionEnabled = config.autoReactStory;
    const isReadEnabled = config.autoReadStory;
    if (!isReadEnabled && !isReactionEnabled) return;

    const uploaderJid = m.key?.participant || m.participant || null;
    if (!uploaderJid) return;

    const normalizedUploader = jidNormalizedUser(uploaderJid);
    const botJid = jidNormalizedUser(sock.user.id);

    const now = Date.now();
    const lastStoryTime = storyTimestamps.get(normalizedUploader) || 0;
    const timeSinceLastStory = now - lastStoryTime;

    // Skip if user is spamming (more than 3 stories in 60 seconds)
    if (timeSinceLastStory < 60000) {
      const storyCount =
        (storyTimestamps.get(`${normalizedUploader}_count`) || 0) + 1;
      storyTimestamps.set(`${normalizedUploader}_count`, storyCount);

      if (storyCount >= 3) {
        console.log(
          chalk.yellow(`⚠️ Skipping spam story from ${normalizedUploader}`)
        );
        return;
      }
    } else {
      storyTimestamps.set(`${normalizedUploader}_count`, 1);
    }

    storyTimestamps.set(normalizedUploader, now);

    const chatId = normalizedUploader.split("@")[0];
    const formattedDate = new Date(m.timestamp * 1000).toLocaleString("id-ID", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const line = chalk.gray("─".repeat(50));
    const header = chalk.bgGreen.black(" 📷 Status Masuk ");

    let logOutput = `\n${line}
${header}

${chalk.bold("👤 Pengunggah :")} ${chalk.cyanBright(
      m.name || "Tidak diketahui"
    )} ${chalk.gray(`(${chatId})`)}
${chalk.bold("🕒 Waktu      :")} ${chalk.yellow(formattedDate)}
${chalk.bold("🔍 Status ID  :")} ${chalk.white(m.key.id)}`;

    if (isReadEnabled) {
      await sock.readMessages([m.key]);
      logOutput += `\n${chalk.bold("📖 Dibaca     :")} ${chalk.green("Ya")}`;
    }

    if (isReactionEnabled && normalizedUploader !== botJid) {
      const emojiList = emojiStringToArray(config.reactEmote);
      const selectedEmoji = mathRandom(emojiList);

      try {
        await sock.sendMessage(
          "status@broadcast",
          {
            react: {
              text: selectedEmoji,
              key: m.key,
            },
          },
          {
            statusJidList: [botJid, normalizedUploader],
          }
        );
        logOutput += `\n${chalk.bold("🤖 Diberi React:")} ${chalk.magenta(
          selectedEmoji
        )}`;
      } catch (error) {
        logOutput += `\n${chalk.bold("🤖 Diberi React:")} ${chalk.red(
          "Gagal"
        )}`;
        console.error("Error sending reaction:", error);
      }
    } else {
      logOutput += `\n${chalk.bold("🤖 Diberi React:")} ${chalk.gray(
        "Tidak (status sendiri)"
      )}`;
    }

    logOutput += `\n${line}`;
    console.log(logOutput);
  } catch (error) {
    console.error(chalk.red("Error in autoReadAndReactStory:"), error);
  }
}
