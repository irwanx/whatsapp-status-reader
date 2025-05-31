import { downloadContentFromMessage, WA_DEFAULT_EPHEMERAL } from "@whiskeysockets/baileys";
import { fileTypeFromBuffer } from 'file-type';
import { config } from "../../config/config.js";

export const command = ["readonce", "readviewonce", "rvo", "r"];
export const help = ["readonce <balas pesan view-once>"];
export const tags = ["media"];

const VIEW_ONCE_TYPES = {
  IMAGE: 'imageMessage',
  VIDEO: 'videoMessage'
};

const ERROR_MESSAGES = {
  NOT_QUOTED: `╭─❌ *Gagal Membaca*
│ Balas pesan *sekali lihat (view-once)* berupa gambar/video
╰─`,
  NOT_VIEW_ONCE: `╭─⚠️ *Bukan View-Once*
│ Pesan yang kamu balas *bukan* pesan view-once.
╰─`,
  DOWNLOAD_FAILED: `❌ *Gagal mengunduh media view-once.*
_Mungkin media sudah tidak tersedia atau kedaluwarsa._`,
  UNSUPPORTED_TYPE: `╭─⚠️ *Tidak Didukung*
│ Jenis media view-once ini tidak didukung
╰─`
};

export default async function readViewOnce({ m, sock }) {
  try {
    if (!m.quoted?.raw) {
      return await m.reply(ERROR_MESSAGES.NOT_QUOTED);
    }

    const quotedMsg = m.quoted.raw;
    const messageType = Object.keys(quotedMsg)[0];
    
    if (!quotedMsg[messageType]?.viewOnce) {
      return await m.reply(ERROR_MESSAGES.NOT_VIEW_ONCE);
    }

    if (!Object.values(VIEW_ONCE_TYPES).includes(messageType)) {
      return await m.reply(ERROR_MESSAGES.UNSUPPORTED_TYPE);
    }

    const mediaType = messageType === VIEW_ONCE_TYPES.IMAGE ? 'image' : 'video';
    const stream = await downloadContentFromMessage(quotedMsg[messageType], mediaType);
    
    const bufferChunks = [];
    for await (const chunk of stream) {
      bufferChunks.push(chunk);
    }
    const buffer = Buffer.concat(bufferChunks);

    const fileInfo = await fileTypeFromBuffer(buffer);
    if (!fileInfo) {
      throw new Error('Invalid media content');
    }

    const defaultCaption = messageType === VIEW_ONCE_TYPES.IMAGE 
      ? '📸 Berhasil membaca pesan view-once.' 
      : '🎥 Berhasil membaca video view-once.';
    const caption = quotedMsg[messageType]?.caption?.trim() || defaultCaption;

    await sock.sendMessage(
      m.chat,
      {
        [mediaType]: buffer,
        caption: caption,
        mimetype: fileInfo.mime,
        ...(mediaType === 'video' && { gifPlayback: false })
      },
      {
        quoted: m.raw,
        ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL
      }
    );

  } catch (err) {
    console.error('Error processing view-once message:', err);
    await m.reply(err.message.includes('download') 
      ? ERROR_MESSAGES.DOWNLOAD_FAILED 
      : `❌ Terjadi kesalahan: ${err.message}`);
  }
}