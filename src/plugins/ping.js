import { performance } from "perf_hooks";
import os from "os";
import { sizeFormatter } from 'human-readable';

const format = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`,
});

export const command = ["ping", "speed", "info"];
export const help = ["ping", "speed", "info"];
export const tags = ["info", "tools"];

export default async function ping({ m, sock }) {
  try {
    const startTime = performance.now();
    const pingMessage = await sock.reply(m.chat, "🏓 *Mengukur ping dan sistem info...*", m.raw);

    // Hitung latensi
    const latency = (performance.now() - startTime).toFixed(2);

    // Dapatkan info sistem
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || "Unknown";
    const cpuSpeed = cpus[0]?.speed || 0;
    const platform = `${os.platform()} ${os.arch()}`;
    const nodeVersion = process.version;

    // Hitung CPU usage
    const cpuUsage = cpus.map(cpu => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return {
        model: cpu.model.trim(),
        speed: cpu.speed,
        usage: {
          user: (cpu.times.user / total * 100).toFixed(2),
          sys: (cpu.times.sys / total * 100).toFixed(2),
          idle: (cpu.times.idle / total * 100).toFixed(2),
          total: (100 - (cpu.times.idle / total * 100)).toFixed(2)
        }
      };
    });

    // Waktu server
    const serverTime = new Date().toLocaleString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Jakarta",
    });

    const loadAvg = os.loadavg();
    const loadAvgInfo = loadAvg.length > 0
      ? `1m: ${loadAvg[0].toFixed(2)}, 5m: ${loadAvg[1].toFixed(2)}, 15m: ${loadAvg[2].toFixed(2)}`
      : 'Tidak tersedia';

    const responseMessage = `
🏓 *PONG!* 🏓

📶 *Latensi Bot:* ${latency} ms
⏱️ *Uptime:* ${formatDuration(uptime)}
📅 *Waktu:* ${serverTime}

💻 *Informasi Sistem:*
- *CPU:* ${cpuModel} (${cpus.length} core)
- *Kecepatan:* ${cpuSpeed} MHz
- *Penggunaan CPU:* ${cpuUsage[0].usage.total}%
- *Load Average:* ${loadAvgInfo}
- *RAM:* ${format(usedMem)} / ${format(totalMem)} (${(usedMem / totalMem * 100).toFixed(2)}%)
- *Platform:* ${platform}
- *Node.js:* ${nodeVersion}

📊 *Penggunaan Memori:*
- *RSS:* ${format(memoryUsage.rss)}
- *Heap Total:* ${format(memoryUsage.heapTotal)}
- *Heap Used:* ${format(memoryUsage.heapUsed)}
- *External:* ${format(memoryUsage.external)}

🌐 *Informasi Jaringan:*
- *IP Address:* **.**.**.**
- *Network Interfaces:* Terdeteksi ${Object.keys(os.networkInterfaces()).length} interface
    `.trim();

    await sock.reply(m.chat, responseMessage, pingMessage);
  } catch (error) {
    console.error("Error in ping command:", error);
    await sock.reply(
      m.chat,
      "❌ Gagal mengukur ping dan sistem info. Silakan coba lagi.",
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