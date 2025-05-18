import chalk from "chalk";

export default async function logger({ m }) {
  if (!m.text || m.chat === "status@broadcast" || m.fromMe) return;

  const chatId = m.chat.split("@")[0] || m.sender.split("@")[0];
  const formattedDate = new Date(m.timestamp * 1000).toLocaleString("id-ID", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const header = chalk.bgBlueBright.black(" 📥 Pesan Masuk ");
  const line = chalk.gray("─".repeat(50));

  let output = `
${line}
${header}

${chalk.bold("🆔 ID Pesan :")} ${chalk.white(m.id)}
${chalk.bold("👤 Pengirim :")} ${chalk.cyanBright(m.name)} ${chalk.gray(`(${chatId})`)}
${chalk.bold("🕒 Waktu    :")} ${chalk.yellow(formattedDate)}
${chalk.bold("💬 Pesan    :")} ${chalk.white(m.text)}`;

  if (m.quoted && m.quoted.text) {
    output += `\n${chalk.bold("↪️ Membalas:")} ${chalk.gray(m.quoted.text)}`;
  }

  output += `\n${line}`;

  console.log(output);
}