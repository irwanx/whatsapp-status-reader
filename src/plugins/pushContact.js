import { delay, WA_DEFAULT_EPHEMERAL } from "@whiskeysockets/baileys";
import { config } from "../../config/config.js";

export const command = ["pushkontak", "pushcontact"];
export const help = ["pushkontak <pesan khusus>"];
export const tags = ["group"];

const CACHE_TTL = 5 * 60 * 1000;
const DELAY_BETWEEN_SENDS = 3000;
const MIN_COOLDOWN_MS = 60 * 1000;
const COOLDOWN_MULTIPLIER = 1.5;

/**
 * Memformat durasi dalam milidetik menjadi string yang mudah dibaca.
 * @param {number} ms Milidetik
 * @returns {string} String format waktu
 */
const formatTime = (ms) => {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let timeString = "";
  if (hours > 0) timeString += `${hours} jam `;
  if (minutes > 0) timeString += `${minutes} menit `;
  if (seconds > 0 || timeString === "") timeString += `${seconds} detik`;
  return timeString.trim() || "0 detik";
};

/**
 * Mengambil metadata grup dengan mekanisme caching.
 * @param {object} sock Instance Baileys socket
 * @param {string} chatId ID grup
 * @returns {Promise<object>} Metadata grup
 */
const getGroupMetadataWithCache = async (sock, chatId) => {
  sock.groupMetadataCache = sock.groupMetadataCache || {};

  const now = Date.now();
  const cachedEntry = sock.groupMetadataCache[chatId];

  if (cachedEntry && now - cachedEntry.timestamp < CACHE_TTL) {
    return cachedEntry.metadata;
  }

  try {
    const metadata = await sock.groupMetadata(chatId);
    if (!metadata || !metadata.participants) {
      throw new Error(
        "Metadata grup tidak valid atau tidak memiliki partisipan."
      );
    }
    sock.groupMetadataCache[chatId] = { metadata, timestamp: now };
    return metadata;
  } catch (error) {
    console.error(
      `[PushKontak Cache] Gagal mengambil metadata untuk ${chatId}:`,
      error
    );
    throw new Error("GAGAL_MENGAMBIL_DATA_GRUP");
  }
};

export default async function pushContact({ m, sock }) {
  sock.pushContactState = sock.pushContactState || {
    activeGroups: {},
    cooldownUntil: {},
  };
  const pluginState = sock.pushContactState;

  if (!m.isGroup) {
    return m.reply("❌ Perintah ini hanya dapat digunakan di dalam grup!");
  }

  const groupId = m.chat;
  const senderId = m.sender;
  const currentTime = Date.now();

  if (pluginState.activeGroups[groupId]) {
    const timeElapsed = currentTime - pluginState.activeGroups[groupId];
    return sock.sendMessage(
      m.chat,
      {
        text: `⏳ Proses push kontak untuk grup ini masih berjalan.\nDimulai ${formatTime(
          timeElapsed
        )} yang lalu. Mohon tunggu hingga selesai.`,
      },
      {
        quoted: m.raw,
        ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL,
      }
    );
  }

  if (
    pluginState.cooldownUntil[groupId] &&
    currentTime < pluginState.cooldownUntil[groupId]
  ) {
    const remainingCooldown = pluginState.cooldownUntil[groupId] - currentTime;
    return sock.sendMessage(
      m.chat,
      {
        text: `⏱️ Grup ini sedang dalam masa cooldown.\nHarap tunggu ${formatTime(
          remainingCooldown
        )} lagi sebelum menggunakan perintah ini.`,
      },
      {
        quoted: m.raw,
        ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL,
      }
    );
  }

  pluginState.activeGroups[groupId] = currentTime;

  try {
    const groupMetadata = await getGroupMetadataWithCache(sock, groupId);

    if (!m.isOwner)
      m.reply("❌ Perintah ini hanya dapat digunakan oleh Owner Bot.");

    const botJid = sock.user?.id?.replace(/:.*$/, "") + "@s.whatsapp.net";

    const recipients = groupMetadata.participants
      .map((p) => p.id)
      .filter((id) => id !== botJid && id !== senderId);

    if (recipients.length === 0) {
      return m.reply(
        "❌ Tidak ada anggota lain di grup ini untuk dikirimi pesan."
      );
    }

    const customMessage = m.text || "";
    const totalRecipients = recipients.length;
    const estimatedTimeMs = totalRecipients * DELAY_BETWEEN_SENDS;
    const cooldownDurationMs = Math.max(
      MIN_COOLDOWN_MS,
      estimatedTimeMs * COOLDOWN_MULTIPLIER
    );

    let mesg = await sock.sendMessage(
      groupId,
      {
        text: `🚀 Memulai proses Push Kontak...\n\n👥 Total Target: ${totalRecipients} anggota\n💬 Pesan Anda: "${customMessage}"\n⏳ Estimasi Waktu Selesai: ${formatTime(
          estimatedTimeMs
        )}`,
      },
      {
        quoted: m.raw,
        ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL,
      }
    );

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < totalRecipients; i++) {
      const recipientJid = recipients[i];
      const messageToSend = `📢 ${customMessage}\n\n[ BROADCAST ALL ]`;

      try {
        await sock.sendMessage(
          recipientJid,
          { text: messageToSend },
          {
            quoted: m.raw,
            ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL,
          }
        );
        successCount++;
      } catch (err) {
        failureCount++;
        console.warn(
          `[PushKontak] Gagal mengirim ke ${recipientJid} (Grup: ${groupId}): ${err.message}`
        );
      }

      if (i < totalRecipients - 1) {
        await delay(DELAY_BETWEEN_SENDS);
      }
    }

    pluginState.cooldownUntil[groupId] = currentTime + cooldownDurationMs;

    await sock.sendMessage(
      groupId,
      {
        text: `✅ Push Kontak Selesai!\n\n👍 Berhasil Terkirim: ${successCount} anggota\n👎 Gagal Terkirim: ${failureCount} anggota\n\n⏱️ Grup ini akan memasuki masa cooldown selama ${formatTime(
          cooldownDurationMs
        )}.`,
        edit: mesg.key,
      },
      {
        quoted: m.raw,
        ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL,
      }
    );
  } catch (error) {
    console.error(`[PushKontak] Kesalahan utama di grup ${groupId}:`, error);
    let userErrorMessage =
      "🚨 Terjadi kesalahan internal saat menjalankan perintah Push Kontak.";
    if (error.message === "GAGAL_MENGAMBIL_DATA_GRUP") {
      userErrorMessage =
        "❌ Gagal memuat data anggota grup. Pastikan Bot adalah anggota grup ini.";
    }
    await m.reply(userErrorMessage);
  } finally {
    delete pluginState.activeGroups[groupId];
  }
}
