import chalk from "chalk";

export default async function logger({ m }) {
  if (!m.text || m.chat === "status@broadcast" || m.fromMe) return;

  const chatId = m.chat.split("@")[0] || m.sender.split("@")[0];
  const formattedDate = new Date(m.timestamp * 1000).toLocaleString();

  let output = `${chalk.blue("📩 Pesan Baru 📩")}
${chalk.green("Dari:")} ${chalk.bold(m.name)} (${chalk.yellow(chatId)})${m.fromMe ? chalk.gray(" (dari saya)") : ""})
${chalk.gray("ID Pesan:")} ${chalk.white(m.id)}
${chalk.gray("Waktu:")} ${chalk.white(formattedDate)}
${chalk.green("Pesan:")} ${chalk.white(m.text)}`;

  if (m.quoted && m.quoted.text) {
    output += `\n${chalk.gray("Membalas:")} ${chalk.white(m.quoted.text)}`;
  }

  output += `\n${chalk.gray("-------------------------------------------")}`;

  console.log(output);
}