import { config } from "../../config/config.js";

export default async function autoReply({ m, sock }) {
  if (!m.text || m.key?.fromMe || m.isGroup || m.isBaileys) return;

  try {
    const text = m.body.toLowerCase() ?? m.text.toLowerCase();

    const autoReplies = {
      "^tes$": "On!",
      "^halo|hi|hello|hai$": `${m.text} juga ${m.name || "kak"}! 👋`,
      "^p|ping$": "Pong! 🏓",
      "^(owner|creator)$": `Owner bot: ${config.owner
        .map((o) => `@${o}`)
        .join(", ")}`,
      "^(terima kasih|thanks|makasih)$": "Sama-sama! 😊",
    };

    for (const [pattern, reply] of Object.entries(autoReplies)) {
      if (new RegExp(`^(${pattern})$`, "i").test(text)) {
        await m.reply(reply);
        return;
      }
    }
  } catch (error) {
    console.error("Error in autoReply:", error);
  }
}
