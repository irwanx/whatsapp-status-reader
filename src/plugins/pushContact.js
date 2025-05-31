import { delay, WA_DEFAULT_EPHEMERAL } from "@whiskeysockets/baileys";
import axios from "axios";
import { config } from "../../config/config.js";

export const command = ["pushkontak", "pushContact", "pc"];
export const help = ["pushkontak <pesan khusus>"];
export const tags = ["group"];

const CACHE_TTL = 5 * 60 * 1000; // 5 menit cache
const DELAY_BETWEEN_SENDS = 2000; // Delay 2 detik antar pengiriman
const COOLDOWN_MULTIPLIER = 1.5; // Faktor penambah waktu tunggu

if (typeof global.pushContactState === "undefined") {
  global.pushContactState = {
    activeGroups: {},
    cooldownGroups: {},
  };
}

const getCachedMetadata = async (sock, chatId) => {
  try {
    sock.metadataCache = sock.metadataCache ?? {};
    const now = Date.now();
    const cache = sock.metadataCache[chatId];

    let isFromCache = true;

    if (!cache || now - cache.timestamp > CACHE_TTL) {
      const metadata = await sock.groupMetadata(chatId);
      sock.metadataCache[chatId] = { metadata, timestamp: now };
      isFromCache = false;
      return { metadata, isFromCache };
    }

    return { metadata: cache.metadata, isFromCache };
  } catch (error) {
    console.error("[CACHE] Error metadata:", error);
    throw new Error("GAGAL_MENGAMBIL_DATA_GRUP");
  }
};

const fetchThumbnailBuffer = async () => {
  const defaultThumbnail =
    "https://www.irwanx.my.id/static/android-chrome-512x512.png";
  const thumbnailUrl = config.thumbnailUrl || defaultThumbnail;

  try {
    const response = await axios.get(thumbnailUrl, {
      responseType: "arraybuffer",
      timeout: 10000,
    });
    return Buffer.from(response.data, "binary");
  } catch (error) {
    console.warn("❌ Gagal mengambil thumbnail utama, mencoba fallback");
    try {
      const response = await axios.get(defaultThumbnail, {
        responseType: "arraybuffer",
        timeout: 10000,
      });
      return Buffer.from(response.data, "binary");
    } catch (fallbackError) {
      console.error("❌ Gagal thumbnail fallback:", fallbackError.message);
      return null;
    }
  }
};

const getProgressBar = (percent) => {
  const filled = Math.floor(percent / 10);
  return `《 ${"■".repeat(filled)}${"□".repeat(10 - filled)} 》 ${percent}%`;
};

const sendContactPush = async (sock, jid, customText, thumbBuffer) => {
  try {
    await sock.sendMessage(
      jid,
      {
        text: `*📢 Broadcast dari Grup*\n\n${customText}`,
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true,
          mentionedJid: [jid],
          externalAdReply: {
            title: "Pesan Grup",
            body: "Pesan otomatis dari grup",
            mediaType: 1,
            previewType: "PHOTO",
            thumbnail: thumbBuffer || undefined,
            sourceUrl: config.linkFakeUrl || "https://www.irwanx.my.id",
          },
        },
      },
      { ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL }
    );
    return true;
  } catch (error) {
    console.error(`[KIRIM] Gagal ke ${jid}: ${error.message}`);
    return false;
  }
};

const updateProgress = async (
  sock,
  chatId,
  messageKey,
  sent,
  total,
  cacheStatus,
  estimatedTime
) => {
  try {
    const percent = Math.floor((sent / total) * 100);
    const progressBar = getProgressBar(percent);
    const cacheInfo = cacheStatus ? "(data cache)" : "(data baru)";
    const timeRemaining = estimatedTime - sent * DELAY_BETWEEN_SENDS;

    await sock.sendMessage(
      chatId,
      {
        text: `📨 Progress: *${sent}/${total}* ${cacheInfo}\n${progressBar}\n🕒 Perkiraan sisa: ${formatTime(
          timeRemaining
        )}`,
        edit: messageKey,
      },
      { ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL }
    );

    await delay(500);
  } catch (error) {
    console.warn("[PROGRESS] Gagal update progress:", error.message);
  }
};

const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} jam ${minutes % 60} menit`;
  } else if (minutes > 0) {
    return `${minutes} menit ${seconds % 60} detik`;
  }
  return `${seconds} detik`;
};

const isAdmin = (participants, senderId) => {
  const participant = participants.find((p) => p.id === senderId);
  return participant && participant.admin !== null;
};

export default async function pushContact({ m, sock }) {
  if (!m.isGroup) {
    return sock.sendMessage(
      m.chat,
      { text: "❌ Perintah hanya bisa digunakan di grup!" },
      { ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL }
    );
  }

  const groupId = m.chat;
  const senderId = m.sender;
  const now = Date.now();

  if (global.pushContactState.activeGroups[groupId]) {
    const activeSince = global.pushContactState.activeGroups[groupId];
    const elapsed = now - activeSince;

    return sock.sendMessage(
      groupId,
      {
        text:
          `⏳ Grup ini sedang dalam proses push kontak!\n` +
          `🕒 Proses dimulai ${formatTime(elapsed)} yang lalu\n\n` +
          `Silakan tunggu hingga proses selesai.`,
      },
      { ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL }
    );
  }

  if (
    global.pushContactState.cooldownGroups[groupId] &&
    global.pushContactState.cooldownGroups[groupId] > now
  ) {
    const cooldownEnd = global.pushContactState.cooldownGroups[groupId];
    const remaining = cooldownEnd - now;

    return sock.sendMessage(
      groupId,
      {
        text:
          `⏱️ Grup ini baru saja melakukan push kontak!\n` +
          `❌ Tunggu ${formatTime(
            remaining
          )} lagi sebelum bisa menggunakan fitur ini.`,
      },
      { ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL }
    );
  }

  try {
    global.pushContactState.activeGroups[groupId] = now;

    const { metadata, isFromCache } = await getCachedMetadata(sock, groupId);
    const participants = metadata.participants || [];
    const totalParticipants = participants.length;

    if (!isAdmin(participants, senderId)) {
      delete global.pushContactState.activeGroups[groupId];
      return sock.sendMessage(
        groupId,
        { text: "❌ Hanya admin yang bisa menggunakan perintah ini!" },
        { ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL }
      );
    }

    if (totalParticipants === 0) {
      delete global.pushContactState.activeGroups[groupId];
      return sock.sendMessage(
        groupId,
        { text: "❌ Tidak ada anggota grup!" },
        { ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL }
      );
    }

    const estimatedTime = totalParticipants * DELAY_BETWEEN_SENDS;
    const cooldownTime = Math.max(60000, estimatedTime * COOLDOWN_MULTIPLIER);

    const customText = m.args.join(" ") || "Tidak ada pesan khusus.";

    const loadingMsg = await sock.sendMessage(
      groupId,
      {
        text:
          `⏳ Memulai proses push kontak...\n` +
          `📊 Total anggota: ${totalParticipants}\n` +
          `⏱️ Perkiraan selesai: ${formatTime(estimatedTime)}`,
      },
      { ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL }
    );

    let sentCount = 0;
    let successCount = 0;

    await updateProgress(
      sock,
      groupId,
      loadingMsg.key,
      0,
      totalParticipants,
      isFromCache,
      estimatedTime
    );

    const thumbBuffer = await fetchThumbnailBuffer();

    for (const participant of participants) {
      const sendSuccess = await sendContactPush(
        sock,
        participant.id,
        customText,
        thumbBuffer
      );

      sentCount++;
      if (sendSuccess) successCount++;

      await updateProgress(
        sock,
        groupId,
        loadingMsg.key,
        sentCount,
        totalParticipants,
        isFromCache,
        estimatedTime
      );

      await delay(DELAY_BETWEEN_SENDS);
    }

    await sock.sendMessage(
      groupId,
      {
        text: [
          `✅ Push kontak selesai!`,
          `- Total anggota: ${totalParticipants}`,
          `- Berhasil dikirim: ${successCount}`,
          `- Gagal: ${totalParticipants - successCount}`,
          `\n⏱️ Cooldown aktif: ${formatTime(cooldownTime)}`,
        ].join("\n"),
        edit: loadingMsg.key,
      },
      { ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL }
    );

    global.pushContactState.cooldownGroups[groupId] = now + cooldownTime;

    setTimeout(() => {
      if (global.pushContactState.cooldownGroups[groupId]) {
        delete global.pushContactState.cooldownGroups[groupId];
      }
    }, cooldownTime);
  } catch (error) {
    console.error("[PUSH-CONTACT] Error:", error);
    let errorMessage = "🚨 Terjadi kesalahan internal";

    if (error.message.includes("GAGAL_MENGAMBIL_DATA_GRUP")) {
      errorMessage = "❌ Gagal mengambil data grup, pastikan bot adalah admin";
    }

    await sock.sendMessage(
      groupId,
      { text: errorMessage },
      { ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL }
    );
  } finally {
    delete global.pushContactState.activeGroups[groupId];
  }
}
