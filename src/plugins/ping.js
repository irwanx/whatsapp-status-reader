import { performance } from "perf_hooks";
import { config } from "../../config.js";

export const command = ["ping"];

export default async function ping({ m, sock }) {
  const old = performance.now();
  const sentMsg = await sock.reply(m.chat, "🏓 *Ping...*", m.raw);
  const neww = performance.now();
  const speed = (neww - old).toFixed(2);
  const uptime = process.uptime(); // in seconds

  const now = new Date();
  const serverTime = now.toLocaleString("id-ID", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const msg = `🏓 *PONG!*
📶 *Kecepatan:* ${speed} ms
🖥️ *Server Waktu:* ${serverTime}
⏱️ *Uptime:* ${formatUptime(uptime)}
`;

  await sock.reply(m.chat, msg.trim(), sentMsg);
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h} jam ${m} menit ${s} detik`;
}
