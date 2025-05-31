import { performance } from "perf_hooks";
import os from "os";

export const command = ["ping", "speed"];
export const help = ["ping", "speed"];
export const tags = ["info"];

export default async function ping({ m, sock }) {
  try {
    const startTime = performance.now();

    const pingMessage = await sock.reply(
      m.chat,
      "🏓 *Mengukur ping...*",
      m.raw
    );

    const latency = (performance.now() - startTime).toFixed(2);

    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuInfo = os.cpus()[0];

    const serverTime = new Date().toLocaleString("id-ID", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Jakarta",
    });

    const responseMessage = `
🏓 *PONG!* 🏓

📶 *Latensi Bot:* ${latency} ms
⏱️ *Uptime:* ${formatDuration(uptime)}
📅 *Waktu Server:* ${serverTime}

💻 *Sistem Info:*
- *CPU:* ${cpuInfo.model} (${os.cpus().length} core)
- *RAM:* ${formatBytes(memoryUsage.rss)} used / ${formatBytes(
      os.totalmem()
    )} total
- *Platform:* ${os.platform()} ${os.arch()}

🔧 *Versi Node:* ${process.version}
    `.trim();

    await sock.reply(m.chat, responseMessage, pingMessage);
  } catch (error) {
    console.error("Error in ping command:", error);
    await sock.reply(
      m.chat,
      "❌ Gagal mengukur ping. Silakan coba lagi.",
      m.raw
    );
  }
}

function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    days > 0 && `${days} hari`,
    hours > 0 && `${hours} jam`,
    minutes > 0 && `${minutes} menit`,
    `${secs} detik`,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
