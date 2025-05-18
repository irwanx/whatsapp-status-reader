import chalk from "chalk";
import { config } from "../../config.js";
import { jidNormalizedUser } from "@whiskeysockets/baileys";
import { emojiStringToArray, mathRandom } from "../functions.js";

export default async function autoReadAndReactStory({ m, sock }) {
  const isStatusBroadcast = m.chat === "status@broadcast";
  const isReactionEnabled = config.autoReactStory;
  const isReadEnabled = config.autoReadStory;

  if (!isStatusBroadcast || (!isReadEnabled && !isReactionEnabled)) return;
  if (m.raw?.message?.protocolMessage) return;

  const uploaderJid = m.key?.participant || m.participant || null;
  const botJid = jidNormalizedUser(sock.user.id);

  if (!uploaderJid) return;

  const normalizedUploader = jidNormalizedUser(uploaderJid);
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

${chalk.bold("👤 Pengunggah :")} ${chalk.cyanBright(m.name || "Tidak diketahui")} ${chalk.gray(`(${chatId})`)}
${chalk.bold("🕒 Waktu      :")} ${chalk.yellow(formattedDate)}
${chalk.bold("🔍 Status ID  :")} ${chalk.white(m.key.id)}`;

  if (isReadEnabled) {
    await sock.readMessages([m.key]);
    logOutput += `\n${chalk.bold("📖 Dibaca     :")} ${chalk.green("Ya")}`;
  }

  if (isReactionEnabled && normalizedUploader !== botJid) {
    const emojiList = emojiStringToArray(config.reactEmote);
    const selectedEmoji = mathRandom(emojiList);

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

    logOutput += `\n${chalk.bold("🤖 Diberi React:")} ${chalk.magenta(selectedEmoji)}`;
  } else {
    logOutput += `\n${chalk.bold("🤖 Diberi React:")} ${chalk.gray("Tidak (status sendiri)")}`;
  }

  logOutput += `\n${line}`;
  console.log(logOutput);
}