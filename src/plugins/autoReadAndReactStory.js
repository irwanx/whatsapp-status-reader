import chalk from "chalk";
import { jidNormalizedUser } from "@whiskeysockets/baileys";
import { emojiStringToArray, mathRandom } from "../functions.js";

export default async function autoReadAndReactStory({ m, sock, config }) {
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

    const senderName = m.name || m.pushName || "Tidak diketahui";
    const chatId = normalizedUploader.split("@")[0];

    let isRead = false;
    let selectedEmoji = null;

    if (isReadEnabled) {
      await sock.readMessages([m.key]);
      isRead = true;
    }

    if (isReactionEnabled && normalizedUploader !== botJid) {
      const emojiList = emojiStringToArray(config.reactEmote);
      selectedEmoji = mathRandom(emojiList);

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
      } catch (error) {
        console.error("Error sending reaction:", error);
      }
    }

    const icon = "[STATUS]";
    const readStatus = isRead ? "✔️ Dibaca" : "✖️ Belum";
    const reactStatus = selectedEmoji ? `✔️ React: ${selectedEmoji}` : "";
    const statusMsg = `"${readStatus}, ${reactStatus}"`;

    console.log(`${icon} ${chalk.cyan(senderName)} (${chalk.gray(chatId)}) ➜ ${statusMsg}`);
  } catch (error) {
    console.error("Error in autoReadAndReactStory:", error);
  }
}
