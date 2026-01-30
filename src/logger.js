import chalk from "chalk";

const LOG_ICONS = {
  incoming: "[MESSAGE IN]",
  outgoing: "[MESSAGE OUT]",
  system: "[SYSTEM]",
  error: "[ERROR]",
};

let LOGS = true;

export default async function logger({ m, type = "incoming" }) {
  try {
    if (!m || m.fromMe || !LOGS) return;

    const chatId =
      m.chat?.split("@")[0] || m.sender?.split("@")[0] || "unknown";
    if (chatId === "status") return;
    const senderName = m.name || m.pushName || "Unknown";

    const icon = LOG_ICONS[type] || "📝";

    let content =
      m.body ||
      m.text ||
      (m.command ? m.command : "") ||
      (m.media ? "[Media]" : "[Non-text]");
    if (!content && m.type) content = `[${m.type}]`;
    content = content.length > 50 ? content.slice(0, 50) + "..." : content;

    console.log(
      `${icon} ${chalk.cyan(senderName)} (${chalk.gray(chatId)}) ➜ "${chalk.white(content)}"`,
    );
  } catch (error) {
    console.error(chalk.red("⚠️ Logger error:"), error);
  }
}
