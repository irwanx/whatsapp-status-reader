import chalk from "chalk";

const LOG_ICONS = {
  incoming: "[MESSAGE IN]",
  outgoing: "[MESSAGE OUT]",
  system: "[SYSTEM]",
  error: "[ERROR]",
};

let LOGS = true

export default async function logger({ m, type = "incoming" }) {
  try {
    if (!m || m.fromMe || !LOGS) return;
    
    const chatId = m.chat?.split("@")[0] || m.sender?.split("@")[0] || "unknown";
    if (chatId === "status") return;
    const senderName = m.name || m.pushName || "Unknown";

    const icon = LOG_ICONS[type] || "📝";

    let content = m.text || (m.isCmd ? m.command : "") || (m.isMedia ? "[Media]" : "[Non-text]");
    if (m.args?.length) content += " " + m.args.join(" ");
    content = content.slice(0, 10);

    console.log(`${icon} ${chalk.cyan(senderName)} (${chalk.gray(chatId)}) ➜ "${chalk.white(content)}"`);
  } catch (error) {
    console.error(chalk.red("⚠️ Logger error:"), error);
  }
}
