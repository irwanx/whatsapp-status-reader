import chalk from "chalk";

const LOG_COLORS = {
  incoming: chalk.bgBlueBright.black,
  outgoing: chalk.bgGreen.black,
  system: chalk.bgMagenta.black,
  error: chalk.bgRed.black,
};

export default async function logger({ m, type = "incoming" }) {
  try {
    if (!m || m.chat === "status@broadcast" || m.fromMe) return;

    const isMedia = m.isMedia;
    const messageContent =
      m.text ||
      (isMedia ? `[Media: ${m.mimetype}]` : "") ||
      (m.isCmd ? `[Command: ${m.command}]` : "") ||
      "[Non-text message]";

    const chatId =
      m.chat?.split("@")[0] || m.sender?.split("@")[0] || "unknown";
    const senderName = m.name || m.pushName || "Unknown";

    const formattedDate = new Date(
      (m.timestamp || Date.now()) * 1000
    ).toLocaleString("id-ID", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Jakarta",
    });

    const headerText =
      {
        incoming: " 📥 Pesan Masuk ",
        outgoing: " 📤 Pesan Keluar ",
        system: " ⚙️ Sistem ",
        error: " ❌ Error ",
      }[type] || " 📝 Log ";

    const header =
      LOG_COLORS[type]?.(headerText) || LOG_COLORS.incoming(headerText);
    const line = chalk.gray("─".repeat(60));

    let output = `\n${line}\n${header}\n\n`;

    output += `${chalk.bold("🆔 ID:")} ${chalk.white(m.key?.id || "N/A")}\n`;
    output += `${chalk.bold("👤 Pengirim:")} ${chalk.cyanBright(
      senderName
    )} ${chalk.gray(`(${chatId})`)}\n`;
    output += `${chalk.bold("💬 Chat:")} ${chalk.yellow(
      m.isGroup ? "Grup" : "Privat"
    )}\n`;
    output += `${chalk.bold("🕒 Waktu:")} ${chalk.yellow(formattedDate)}\n`;

    output += `${chalk.bold("📝 Konten:")} ${chalk.white(messageContent)}\n`;

    if (m.quoted) {
      const quotedText =
        m.quoted.text?.substring(0, 50) +
        (m.quoted.text?.length > 50 ? "..." : "");
      output += `${chalk.bold("↪️ Membalas:")} ${chalk.gray(
        quotedText || "[media]"
      )}\n`;
    }

    if (m.command) {
      output += `${chalk.bold("⚡ Command:")} ${chalk.green(m.command)}\n`;
      output += `${chalk.bold("🔧 Args:")} ${chalk.gray(
        m.args.join(" ") || "none"
      )}\n`;
    }

    if (isMedia) {
      output += `${chalk.bold("📁 Media:")} ${chalk.gray(
        `${m.mimetype} (${formatBytes(m.size)})`
      )}\n`;
    }

    output += line;
    console.log(output);
  } catch (error) {
    console.error(chalk.red("⚠️ Logger error:"), error);
  }
}

function formatBytes(bytes) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
