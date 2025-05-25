export default async function casePlugin({ m, sock }) {
  if (!m.command) return;

  try {
    switch (m.command.toLowerCase()) {
      case "info":
      case "profile":
      case "whois":
        await handleUserInfo(m, sock);
        break;

      case "groupinfo":
      case "ginfo":
        if (m.isGroup) {
          await handleGroupInfo(m, sock);
        } else {
          await sock.reply(
            m.chat,
            "❌ Perintah ini hanya tersedia di grup",
            m.raw
          );
        }
        break;
      default:
        // Perintah tidak dikenali
        break;
    }
  } catch (error) {
    console.error("Error in casePlugin:", error);
    await sock.reply(
      m.chat,
      "⚠️ Terjadi kesalahan saat memproses perintah",
      m.raw
    );
  }
}

async function handleUserInfo(m, sock) {
  const userData = {
    name: m.name || "Tidak diketahui",
    number: m.sender.split("@")[0],
    time: new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour12: false,
    }),
    isAdmin: m.isAdmin || false,
    isOwner: m.isOwner || false,
  };

  const userInfo = `👤 *Informasi Pengguna*
  
📌 *Nama:* ${userData.name}
📞 *Nomor:* ${userData.number}
🕒 *Waktu:* ${userData.time}
${
  userData.isOwner
    ? "👑 *Owner Bot*"
    : userData.isAdmin
    ? "⭐ *Admin*"
    : "👤 *Pengguna*"
}

💬 *Chat ID:* ${m.chat.split('@')[0]}
`.trim();

  await sock.reply(m.chat, userInfo, m.raw);
}

async function handleGroupInfo(m, sock) {
  const groupMetadata = await sock.groupMetadata(m.chat);
  const participants = groupMetadata.participants;

  const groupInfo = `👥 *Informasi Grup*
  
📌 *Nama Grup:* ${groupMetadata.subject}
👤 *Anggota:* ${participants.length} orang
🆔 *Grup ID:* ${m.chat.split("@")[0]}
📅 *Dibuat:* ${new Date(groupMetadata.creation * 1000).toLocaleString("id-ID")}

${groupMetadata.desc ? `📝 *Deskripsi:*\n${groupMetadata.desc}` : ""}
`.trim();

  await sock.reply(m.chat, groupInfo, m.raw);
}