import { downloadContentFromMessage, WA_DEFAULT_EPHEMERAL } from "@whiskeysockets/baileys";
import { config } from "../../config.js";

export const command = ["readonce", "readviewonce", "rvo", "r"];

export default async function readViewOnce({ m, sock }) {
  if (!m.quoted || !m.quoted.raw) {
    return m.reply(`╭─❌ *Gagal Membaca*
│ Balas pesan *sekali lihat (view-once)* berupa gambar/video
╰─`);
  }

  const quotedMsg = m.quoted.raw;
  const type = Object.keys(quotedMsg || {})[0];

  if (!quotedMsg[type]?.viewOnce) {
    return m.reply(`╭─⚠️ *Bukan View-Once*
│ Pesan yang kamu balas *bukan* pesan view-once.
╰─`);
  }

  try {
    const stream = await downloadContentFromMessage(
      quotedMsg[type],
      type === "imageMessage" ? "image" : "video"
    );

    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    const caption = quotedMsg[type]?.caption?.trim() || "📸 Berhasil membaca pesan view-once.";

    await sock.sendMessage(
      m.chat,
      {
        [type === "imageMessage" ? "image" : "video"]: buffer,
        caption,
      },
      {
        quoted: m.raw,
        ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL,
      }
    );
  } catch (err) {
    console.error("❌ Gagal membaca view-once:", err);
    await m.reply(`❌ *Terjadi kesalahan saat membuka pesan view-once.*\n\n_Mungkin media sudah tidak tersedia atau kedaluwarsa._`);
  }
}
