import {
  downloadContentFromMessage,
  jidNormalizedUser,
} from "@whiskeysockets/baileys";
import { fileTypeFromBuffer } from "file-type";
import { emojiStringToArray, mathRandom } from "./functions.js";
import chalk from "chalk";
import { config } from "./config.js";
import { database } from "./database.js";

function getTargetJids(m) {
  const targets = [];

  if (m.mentionedJid && m.mentionedJid.length > 0) {
    targets.push(...m.mentionedJid);
  }

  if (m.quoted && m.quoted.sender) {
    targets.push(m.quoted.sender);
  }

  return [...new Set(targets)];
}

export async function handleCommand(m, sock) {
  // Public/Self Mode Check
  const publicMode = database.getBotSetting("publicMode");
  const isPublic = publicMode !== undefined ? publicMode : config.publicMode;

  if (!isPublic && !m.isOwner && !m.key.fromMe) {
    return; // Ignore everyone else in Self mode
  }

  const lowerCommand = m.command?.toLowerCase();

  const groupOnlyCommands = [
    "kick",
    "hidetag",
    "tagall",
    "add",
    "group",
    "setname",
    "setdesc",
    "ephemeral",
    "addmode",
  ];
  if (groupOnlyCommands.includes(lowerCommand) && !m.isGroup) {
    return m.reply("⚠️ Command ini hanya bisa digunakan di grup!");
  }

  if (groupOnlyCommands.includes(lowerCommand)) {
    if (!m.isAdmin) {
      return m.reply("⛔ Kamu bukan admin!");
    }

    const botAdminRequired = [
      "kick",
      "add",
      "group",
      "setname",
      "setdesc",
      "ephemeral",
      "addmode",
    ];
    if (botAdminRequired.includes(lowerCommand) && !m.isBotAdmin) {
      return m.reply("⛔ Bot bukan admin!");
    }
  }

  switch (lowerCommand) {
    case "group": {
      if (m.args.length === 0) {
        return m.reply(
          "❌ Gunakan: .group open/close/lock/unlock\n\n- open: Member bisa kirim pesan\n- close: Hanya admin bisa kirim pesan\n- unlock: Member bisa edit info grup\n- lock: Hanya admin bisa edit info grup",
        );
      }
      const option = m.args[0].toLowerCase();
      try {
        if (option === "open") {
          await sock.groupSettingUpdate(m.chat, "not_announcement");
          await m.reply("✅ Grup dibuka untuk semua member.");
        } else if (option === "close") {
          await sock.groupSettingUpdate(m.chat, "announcement");
          await m.reply("✅ Grup ditutup (hanya admin).");
        } else if (option === "unlock") {
          await sock.groupSettingUpdate(m.chat, "unlocked");
          await m.reply("✅ Edit info grup dibuka untuk semua member.");
        } else if (option === "lock") {
          await sock.groupSettingUpdate(m.chat, "locked");
          await m.reply("✅ Edit info grup dikunci (hanya admin).");
        } else {
          await m.reply("❌ Opsi tidak valid. Gunakan: open/close/lock/unlock");
        }
      } catch (err) {
        await m.reply("❌ Gagal mengubah setting grup: " + err.message);
      }
      break;
    }

    case "setname": {
      const text = m.text || "";
      if (!text) return m.reply("❌ Masukkan nama baru grup!");
      try {
        await sock.groupUpdateSubject(m.chat, text);
        await m.reply("✅ Nama grup berhasil diubah!");
      } catch (err) {
        await m.reply("❌ Gagal mengubah nama grup: " + err.message);
      }
      break;
    }

    case "setdesc": {
      const text = m.text || "";
      if (!text) return m.reply("❌ Masukkan deskripsi baru grup!");
      try {
        await sock.groupUpdateDescription(m.chat, text);
        await m.reply("✅ Deskripsi grup berhasil diubah!");
      } catch (err) {
        await m.reply("❌ Gagal mengubah deskripsi grup: " + err.message);
      }
      break;
    }

    case "ephemeral": {
      if (m.args.length === 0) {
        return m.reply(
          "❌ Masukkan durasi! (0, 86400, 604800, 7776000)\n0 = Mati, 86400 = 24 Jam, 604800 = 7 Hari, 7776000 = 90 Hari",
        );
      }
      const duration = parseInt(m.args[0]);
      if (isNaN(duration)) return m.reply("❌ Durasi harus berupa angka!");
      try {
        await sock.groupToggleEphemeral(m.chat, duration);
        await m.reply(`✅ Pesan sementara diset ke ${duration} detik.`);
      } catch (err) {
        await m.reply("❌ Gagal mengubah pesan sementara: " + err.message);
      }
      break;
    }

    case "addmode": {
      const mode = m.args[0]?.toLowerCase();
      if (mode !== "admin" && mode !== "all") {
        return m.reply("❌ Gunakan: .addmode admin atau .addmode all");
      }
      try {
        await sock.groupMemberAddMode(
          m.chat,
          mode === "all" ? "all_member_add" : "admin_add",
        );
        await m.reply(
          `✅ Mode tambah member diubah ke: ${mode === "all" ? "Semua Member" : "Hanya Admin"}`,
        );
      } catch (err) {
        await m.reply("❌ Gagal mengubah add mode: " + err.message);
      }
      break;
    }
    case "ping": {
      await m.reply("Pong! 🏓");
      break;
    }

    case "kick": {
      const targets = getTargetJids(m);

      if (targets.length === 0) {
        return m.reply("❌ Tag atau reply pesan orang yang mau di-kick!");
      }

      try {
        await sock.groupParticipantsUpdate(m.chat, targets, "remove");
        await m.reply(`✅ Berhasil kick ${targets.length} member!`);
      } catch (err) {
        console.error("Kick error:", err);
        await m.reply("❌ Gagal kick member: " + err.message);
      }
      break;
    }

    case "hidetag": {
      try {
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants.map((p) => p.id);
        const text = m.text || "Hidetag dari admin";

        await sock.sendMessage(m.chat, {
          text: text,
          mentions: participants,
        });
      } catch (err) {
        await m.reply("❌ Gagal hidetag: " + err.message);
      }
      break;
    }

    case "tagall": {
      try {
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;

        const messageText = m.text || (m.quoted && m.quoted.text) || "";
        let text = `📢 *Tag All Members*\n${messageText ? `${messageText}\n` : ""}\n`;

        participants.forEach((p, i) => {
          text += `${i + 1}. @${p.id.split("@")[0]}\n`;
        });

        await sock.sendMessage(m.chat, {
          text: text,
          mentions: participants.map((p) => p.id),
        });
      } catch (err) {
        await m.reply("❌ Gagal tagall: " + err.message);
      }
      break;
    }

    case "add": {
      if (m.args.length === 0) {
        return m.reply(
          "❌ Masukkan nomor yang mau ditambahkan!\nContoh: .add 628xxx",
        );
      }

      try {
        const numbers = m.args.map((arg) => {
          let num = arg.replace(/[^0-9]/g, "");
          if (!num.startsWith("62")) num = "62" + num;
          return num + "@s.whatsapp.net";
        });

        const result = await sock.groupParticipantsUpdate(
          m.chat,
          numbers,
          "add",
        );
        await m.reply(`✅ Berhasil add ${numbers.length} member!`);
      } catch (err) {
        await m.reply("❌ Gagal add member: " + err.message);
      }
      break;
    }

    case "link": {
      try {
        const code = await sock.groupInviteCode(m.chat);
        await m.reply("🔗 Link Grup:\nhttps://chat.whatsapp.com/" + code);
      } catch (err) {
        await m.reply("❌ Gagal mengambil link grup: " + err.message);
      }
      break;
    }

    case "revoke": {
      try {
        const code = await sock.groupRevokeInvite(m.chat);
        await m.reply(
          "✅ Link grup berhasil direset!\nLink baru: https://chat.whatsapp.com/" +
            code,
        );
      } catch (err) {
        await m.reply("❌ Gagal reset link grup: " + err.message);
      }
      break;
    }

    case "leave": {
      try {
        await m.reply("Sayonara! 👋");
        await sock.groupLeave(m.chat);
      } catch (err) {
        await m.reply("❌ Gagal keluar grup: " + err.message);
      }
      break;
    }

    case "join": {
      if (!m.isOwner)
        return m.reply("⛔ Hanya owner yang bisa memasukkan bot ke grup!");

      if (!m.text) return m.reply("❌ Masukkan link grup!");
      try {
        let code = m.text.replace("https://chat.whatsapp.com/", "");
        const response = await sock.groupAcceptInvite(code);
        await m.reply("✅ Berhasil bergabung ke grup! ID: " + response);
      } catch (err) {
        await m.reply("❌ Gagal bergabung: " + err.message);
      }
      break;
    }

    case "requests": {
      try {
        const response = await sock.groupRequestParticipantsList(m.chat);
        if (response.length === 0)
          return m.reply("✅ Tidak ada permintaan join.");

        let text = "📋 *Daftar Permintaan Join*\n\n";
        response.forEach((p, i) => {
          text += `${i + 1}. @${p.jid.split("@")[0]}\n`;
        });
        text +=
          "\nGunakan .approve atau .reject diikuti nomor urut atau tag orangnya.";
        await m.reply(text);
      } catch (err) {
        await m.reply("❌ Gagal mengambil daftar request: " + err.message);
      }
      break;
    }

    case "approve": {
      const targets = getTargetJids(m);
      if (targets.length === 0)
        return m.reply("❌ Tag orang yang mau di-approve!");

      try {
        await sock.groupRequestParticipantsUpdate(m.chat, targets, "approve");
        await m.reply(`✅ Berhasil menyetujui ${targets.length} permintaan!`);
      } catch (err) {
        await m.reply("❌ Gagal approve: " + err.message);
      }
      break;
    }

    case "reject": {
      const targets = getTargetJids(m);
      if (targets.length === 0)
        return m.reply("❌ Tag orang yang mau di-reject!");

      try {
        await sock.groupRequestParticipantsUpdate(m.chat, targets, "reject");
        await m.reply(`✅ Berhasil menolak ${targets.length} permintaan!`);
      } catch (err) {
        await m.reply("❌ Gagal reject: " + err.message);
      }
      break;
    }

    case "creategroup": {
      if (!m.isOwner)
        return m.reply("⛔ Hanya owner yang bisa membuat grup via bot!");

      const title = m.args[0];
      const targets = getTargetJids(m);

      if (!title)
        return m.reply(
          "❌ Masukkan nama grup! Contoh: .creategroup NamaGrup @tag",
        );
      if (targets.length === 0)
        return m.reply("❌ Tag member yang ingin ditambahkan!");

      try {
        const group = await sock.groupCreate(title, targets);
        await m.reply(
          `✅ Grup berhasil dibuat!\nID: ${group.gid}\nNama: ${title}`,
        );
        await sock.sendMessage(group.id, { text: "Halo semua! 👋" });
      } catch (err) {
        await m.reply("❌ Gagal membuat grup: " + err.message);
      }
      break;
    }

    case "inspect": {
      if (!m.text.includes("chat.whatsapp.com"))
        return m.reply("❌ Masukkan link grup!");

      try {
        let code = m.text.replace(/.*chat.whatsapp.com\//, "").trim();
        const response = await sock.groupGetInviteInfo(code);

        let info = `🔎 *Group Inspector*\n\n`;
        info += `🆔 ID: ${response.id}\n`;
        info += `📛 Nama: ${response.subject}\n`;
        info += `👤 Owner: ${response.owner ? response.owner.split("@")[0] : "Tidak diketahui"}\n`;
        info += `📅 Dibuat: ${new Date(response.creation * 1000).toLocaleString()}\n`;
        if (response.desc) info += `📝 Deskripsi: ${response.desc}\n`;

        await m.reply(info);
      } catch (err) {
        await m.reply("❌ Gagal inspect link: " + err.message);
      }
      break;
    }

    case "del": {
      if (!m.quoted) return m.reply("❌ Reply pesan yang ingin dihapus!");

      const key = {
        remoteJid: m.chat,
        fromMe: m.quoted.fromMe,
        id: m.quoted.id,
        participant: m.quoted.sender,
      };

      try {
        await sock.sendMessage(m.chat, { delete: key });
      } catch (err) {
        await m.reply("❌ Gagal menghapus pesan: " + err.message);
      }
      break;
    }

    case "groups": {
      if (!m.isOwner)
        return m.reply("⛔ Hanya owner yang bisa melihat daftar grup!");

      try {
        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);

        let text = `📋 *Daftar Grup (${groupList.length})*\n\n`;
        groupList.forEach((g, i) => {
          text += `${i + 1}. ${g.subject}\n🆔 ${g.id}\n\n`;
        });

        await m.reply(text);
      } catch (err) {
        await m.reply("❌ Gagal mengambil daftar grup: " + err.message);
      }
      break;
    }

    case "sc":
    case "sourcecode": {
      m.reply(
        `This bot Uses Script From\n${config.sourceCode ?? "https://github.com/irwanx/whatsapp-status-reader"}`,
      );
      break;
    }

    case "rvo":
    case "readonce":
    case "readviewonce": {
      const VIEW_ONCE_TYPES = {
        IMAGE: "imageMessage",
        VIDEO: "videoMessage",
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
╰─`,
      };

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

        const mediaType =
          messageType === VIEW_ONCE_TYPES.IMAGE ? "image" : "video";
        const stream = await downloadContentFromMessage(
          quotedMsg[messageType],
          mediaType,
        );

        const bufferChunks = [];
        for await (const chunk of stream) {
          bufferChunks.push(chunk);
        }
        const buffer = Buffer.concat(bufferChunks);

        const fileInfo = await fileTypeFromBuffer(buffer);
        if (!fileInfo) {
          throw new Error("Invalid media content");
        }

        const defaultCaption =
          messageType === VIEW_ONCE_TYPES.IMAGE
            ? "📸 Berhasil membaca pesan view-once."
            : "🎥 Berhasil membaca video view-once.";
        const caption =
          quotedMsg[messageType]?.caption?.trim() || defaultCaption;

        await sock.sendMessage(
          m.chat,
          {
            [mediaType]: buffer,
            caption: caption,
            mimetype: fileInfo.mime,
            ...(mediaType === "video" && { gifPlayback: false }),
          },
          {
            quoted: m.raw,
            ephemeralExpiration: config.ephemeral || 86400,
          },
        );
      } catch (err) {
        console.error("Error processing view-once message:", err);
        await m.reply(
          err.message.includes("download")
            ? ERROR_MESSAGES.DOWNLOAD_FAILED
            : `❌ Terjadi kesalahan: ${err.message}`,
        );
      }
      break;
    }

    case "say": {
      if (!m.text) return m.reply("❌ Masukkan teks yang ingin diulangi!");
      await m.reply(m.text);
      break;
    }

    case "kalkulator":
    case "calc": {
      if (!m.text)
        return m.reply(
          "❌ Masukkan soal matematika! Contoh: .kalkulator 10*5+2",
        );

      const expression = m.text.replace(/[^0-9\+\-\*\/\(\)\.]/g, ""); // Sanitize
      try {
        // Safe eval using Function constructor restricted to math
        const result = new Function("return " + expression)();
        await m.reply(`🧮 *Hasil:* ${result}`);
      } catch (err) {
        await m.reply("❌ Format salah atau tidak bisa dihitung!");
      }
      break;
    }

    case "welcome": {
      if (!m.isGroup)
        return m.reply("⚠️ Command ini hanya bisa digunakan di grup!");
      if (!m.isAdmin) return m.reply("⛔ Kamu bukan admin!");

      const args = m.args[0]?.toLowerCase();
      if (args === "on") {
        database.setGroupSetting(m.chat, "welcome", true);
        await m.reply("✅ Fitur Welcome & Goodbye diaktifkan!");
      } else if (args === "off") {
        database.setGroupSetting(m.chat, "welcome", false);
        await m.reply("✅ Fitur Welcome & Goodbye dinonaktifkan!");
      } else {
        await m.reply("❌ Gunakan: .welcome on/off");
      }
      break;
    }

    case "setwelcome": {
      if (!m.isGroup)
        return m.reply("⚠️ Command ini hanya bisa digunakan di grup!");
      if (!m.isAdmin) return m.reply("⛔ Kamu bukan admin!");
      if (!m.text)
        return m.reply(
          "❌ Masukkan teks welcome!\nContoh: .setwelcome Selamat datang @user di @group",
        );

      database.setGroupSetting(m.chat, "welcomeMsg", m.text);
      await m.reply("✅ Pesan welcome kustom berhasil disimpan!");
      break;
    }

    case "delwelcome": {
      if (!m.isGroup)
        return m.reply("⚠️ Command ini hanya bisa digunakan di grup!");
      if (!m.isAdmin) return m.reply("⛔ Kamu bukan admin!");

      database.setGroupSetting(m.chat, "welcomeMsg", null);
      await m.reply("✅ Pesan welcome dikembalikan ke default.");
      break;
    }

    case "setleave": {
      if (!m.isGroup)
        return m.reply("⚠️ Command ini hanya bisa digunakan di grup!");
      if (!m.isAdmin) return m.reply("⛔ Kamu bukan admin!");
      if (!m.text)
        return m.reply(
          "❌ Masukkan teks goodbye!\nContoh: .setleave Sayonara @user!",
        );

      database.setGroupSetting(m.chat, "leaveMsg", m.text);
      await m.reply("✅ Pesan goodbye kustom berhasil disimpan!");
      break;
    }

    case "delleave": {
      if (!m.isGroup)
        return m.reply("⚠️ Command ini hanya bisa digunakan di grup!");
      if (!m.isAdmin) return m.reply("⛔ Kamu bukan admin!");

      database.setGroupSetting(m.chat, "leaveMsg", null);
      await m.reply("✅ Pesan goodbye dikembalikan ke default.");
      break;
    }

    case "owner":
    case "creator": {
      const ownerNumber = config.owner;
      const ownerName = config.ownerName || "Irwan";

      const vcard =
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        `FN:${ownerName}\n` +
        `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}\n` +
        "END:VCARD";

      await sock.sendMessage(
        m.chat,
        {
          contacts: {
            displayName: ownerName,
            contacts: [{ vcard }],
          },
        },
        { quoted: m.raw, ephemeralExpiration: config.ephemeral || 86400 },
      );
      break;
    }

    case "autoreadstatus": {
      if (!m.isOwner)
        return m.reply("⛔ Hanya owner yang bisa ubah setting ini!");
      const args = m.args[0]?.toLowerCase();
      if (args === "on") {
        database.setBotSetting("autoReadStory", true);
        await m.reply("✅ Auto Read Status diaktifkan!");
      } else if (args === "off") {
        database.setBotSetting("autoReadStory", false);
        await m.reply("✅ Auto Read Status dinonaktifkan!");
      } else {
        await m.reply("❌ Gunakan: .autoreadstatus on/off");
      }
      break;
    }

    case "autoreactstatus": {
      if (!m.isOwner)
        return m.reply("⛔ Hanya owner yang bisa ubah setting ini!");
      const args = m.args[0]?.toLowerCase();
      if (args === "on") {
        database.setBotSetting("autoReactStory", true);
        await m.reply("✅ Auto React Status diaktifkan!");
      } else if (args === "off") {
        database.setBotSetting("autoReactStory", false);
        await m.reply("✅ Auto React Status dinonaktifkan!");
      } else {
        await m.reply("❌ Gunakan: .autoreactstatus on/off");
      }
      break;
    }

    case "setemote": {
      if (!m.isOwner)
        return m.reply("⛔ Hanya owner yang bisa ubah setting ini!");

      const currentEmotes =
        database.getBotSetting("reactEmote") || config.reactEmote;

      if (!m.text)
        return m.reply(
          `📝 *Daftar Emoji Saat Ini:* ${currentEmotes}\n\nUntuk mengubah, gunakan: .setemote 🗿,🔥,✨`,
        );

      database.setBotSetting("reactEmote", m.text);
      await m.reply(`✅ Emoji berhasil diset ke: ${m.text}`);
      break;
    }

    case "anticall": {
      if (!m.isOwner)
        return m.reply("⛔ Hanya owner yang bisa ubah setting anticall!");
      const args = m.args[0]?.toLowerCase();
      if (args === "on") {
        database.setBotSetting("anticall", true);
        await m.reply(
          "✅ Anti-Call diaktifkan (Bot akan reject telpon otomatis).",
        );
      } else if (args === "off") {
        database.setBotSetting("anticall", false);
        await m.reply("✅ Anti-Call dinonaktifkan.");
      } else {
        await m.reply("❌ Gunakan: .anticall on/off");
      }
      break;
    }

    case "mode": {
      if (!m.isOwner) return m.reply("⛔ Hanya owner yang bisa ubah mode bot!");
      const args = m.args[0]?.toLowerCase();

      if (args === "public") {
        database.setBotSetting("publicMode", true);
        await m.reply("✅ Mode bot diubah ke PUBLIC (Semua orang bisa pakai).");
      } else if (args === "self" || args === "private") {
        database.setBotSetting("publicMode", false);
        await m.reply("✅ Mode bot diubah ke SELF (Hanya owner).");
      } else {
        await m.reply("❌ Gunakan: .mode public/self");
      }
      break;
    }

    case "self": {
      if (!m.isOwner) return;
      database.setBotSetting("publicMode", false);
      await m.reply("✅ Mode bot diubah ke SELF (Hanya owner).");
      break;
    }

    case "public": {
      if (!m.isOwner) return;
      database.setBotSetting("publicMode", true);
      await m.reply("✅ Mode bot diubah ke PUBLIC (Semua orang bisa pakai).");
      break;
    }

    case "antilink": {
      if (!m.isGroup)
        return m.reply("⚠️ Command ini hanya bisa digunakan di grup!");
      if (!m.isAdmin) return m.reply("⛔ Kamu bukan admin!");

      const args = m.args[0]?.toLowerCase();
      if (args === "on") {
        database.setGroupSetting(m.chat, "antilink", true);
        await m.reply("✅ Anti-Link diaktifkan!");
      } else if (args === "off") {
        database.setGroupSetting(m.chat, "antilink", false);
        await m.reply("✅ Anti-Link dinonaktifkan!");
      } else {
        await m.reply("❌ Gunakan: .antilink on/off");
      }
      break;
    }

    case "menu": {
      const menuText = `
🤖 *Bot Menu* 🤖

👑 *Owner Commands*
- .autoreadstatus on/off
- .autoreactstatus on/off
- .setemote <emojis>
- .anticall on/off
- .mode public/self
- .creategroup <nama> @tag
- .groups (List groups)
- .join <link>

🔰 *Group Admin*
- .welcome on/off
- .setwelcome <teks>
- .delwelcome (Reset)
- .setleave <teks>
- .delleave (Reset)
- .antilink on/off
- .kick @tag
- .add <number>
- .hidetag <text>
- .tagall <text>
- .group open/close/lock/unlock
- .setname <text>
- .setdesc <text>
- .ephemeral <seconds>
- .addmode admin/all
- .link (Get link)
- .revoke (Reset link)
- .requests (List join requests)
- .approve @tag
- .reject @tag

🛠️ *Utility*
- .ping
- .owner (Contact)
- .inspect <link>
- .del (Reply msg)
- .sc (Source Code)
- .rvo (Read ViewOnce)
- .say <text>
- .kalkulator <angka>
- .menu

ℹ️ *Note:*
- Gunakan command di grup.
- Pastikan bot adalah admin untuk fitur admin.
`;
      await m.reply(menuText.trim());
      break;
    }

    default:
      // Handle unknown commands or ignore

      // Anti-Link Check
      const isAntiLinkActive = database.getGroupSetting(m.chat, "antilink");
      if (
        m.isGroup &&
        m.text?.includes("chat.whatsapp.com") &&
        !m.isAdmin &&
        !m.isOwner &&
        isAntiLinkActive
      ) {
        console.log(`[AntiLink] Link detected from ${m.sender}`);

        // Check if bot is admin
        if (m.isBotAdmin) {
          try {
            // Check if the link is for the current group
            const code = await sock.groupInviteCode(m.chat);
            if (m.text.includes(code)) {
              console.log("[AntiLink] Link is for current group, ignoring.");
              return;
            }

            // Delete message
            await sock.sendMessage(m.chat, { delete: m.key });

            // Notify
            await sock.sendMessage(m.chat, {
              text: `⛔ *Anti-Link Detected*\n\nMaaf @${m.sender.split("@")[0]}, mengirim link grup lain dilarang di sini!`,
              mentions: [m.sender],
            });

            // Kick user
            await sock.groupParticipantsUpdate(m.chat, [m.sender], "remove");

            return; // Stop further processing
          } catch (err) {
            console.error("Anti-Link error:", err);
          }
        } else {
          // Just notify if bot is not admin (optional, or silently ignore)
          // await m.reply("⚠️ Terdeteksi link grup, tapi bot bukan admin untuk menindak.");
          console.log("Anti-Link: Bot not admin, skipping kick.");
        }
      }
      break;
  }
}

export async function handleGroupParticipantsUpdate(sock, data) {
  const { id, participants, action } = data;
  const isWelcomeActive = database.getGroupSetting(id, "welcome");

  if (!isWelcomeActive) return;

  try {
    const groupMetadata = await sock.groupMetadata(id);
    const groupName = groupMetadata.subject;
    const groupDesc = groupMetadata.desc || "Tidak ada deskripsi.";

    const customWelcome = database.getGroupSetting(id, "welcomeMsg");
    const customLeave = database.getGroupSetting(id, "leaveMsg");

    for (const item of participants) {
      const participantJid = item.phoneNumber || item.id;
      if (!participantJid) continue;

      let message = "";
      if (action === "add") {
        message =
          customWelcome ||
          `Selamat datang @user di grup *@group*! 👋\n\nJangan lupa baca deskripsi grup ya.`;
      } else if (action === "remove") {
        message =
          customLeave ||
          `Selamat tinggal @user! 👋\n\nSemoga sukses di tempat baru.`;
      }

      if (message) {
        // Tag replacement logic
        message = message.replace(/@user/g, `@${participantJid.split("@")[0]}`);
        message = message.replace(/@group/g, groupName);
        message = message.replace(/@desc/g, groupDesc);

        await sock.sendMessage(id, {
          text: message,
          mentions: [participantJid],
        });
      }
    }
  } catch (err) {
    console.error("Error in group-participants.update handler:", err);
  }
}

export async function handleCall(sock, data) {
  const isAntiCallActive = database.getBotSetting("anticall");
  if (!isAntiCallActive) return;

  for (const call of data) {
    if (call.status === "offer") {
      try {
        console.log(`[AntiCall] Rejecting call from ${call.from}`);
        await sock.rejectCall(call.id, call.from);

        await sock.sendMessage(call.from, {
          text: `⛔ *BOT UPDATE*\n\nMaaf, bot ini tidak menerima panggilan (Telpon/VC).\nKamu telah otomatis direject oleh sistem Anti-Call.`,
        });
      } catch (err) {
        console.error("Error rejecting call:", err);
      }
    }
  }
}

const reactedStatus = new Set();
function getStatusUniqueId(m) {
  return `${m.key?.participant || m.participant}-${m.messageTimestamp}`;
}

export async function handleStory(sock, m) {
  try {
    const isStatusBroadcast = m.chat === "status@broadcast";
    if (!isStatusBroadcast || m.raw?.message?.protocolMessage) return;

    // Check database settings first, then fall back to config
    const dbRead = database.getBotSetting("autoReadStory");
    const isReadEnabled = dbRead !== undefined ? dbRead : config.autoReadStory;

    const dbReact = database.getBotSetting("autoReactStory");
    const isReactionEnabled =
      dbReact !== undefined ? dbReact : config.autoReactStory;

    if (!isReadEnabled && !isReactionEnabled) return;

    const uploaderJid = m.key?.participant || m.participant || null;
    if (!uploaderJid) return;

    const normalizedUploader = jidNormalizedUser(uploaderJid);
    const botJid = jidNormalizedUser(sock.user.id);

    if (normalizedUploader === botJid) return;

    const uniqueId = getStatusUniqueId(m);
    if (reactedStatus.has(uniqueId)) return;
    reactedStatus.add(uniqueId);

    const senderName = m.name || m.pushName || "Tidak diketahui";
    const chatId = normalizedUploader.split("@")[0];

    let isRead = false;
    let selectedEmoji = null;

    if (isReadEnabled) {
      await sock.readMessages([m.key]);
      isRead = true;
    }

    if (isReactionEnabled) {
      const dbEmote = database.getBotSetting("reactEmote");
      const emojiListStr = dbEmote || config.reactEmote;
      const emojiList = emojiStringToArray(emojiListStr);
      selectedEmoji = mathRandom(emojiList);

      // Random delay to seem more human-like
      await new Promise((res) => setTimeout(res, Math.random() * 2000 + 1000));

      try {
        await sock.sendMessage(
          "status@broadcast",
          {
            react: {
              text: selectedEmoji,
              key: m.key,
            },
          },
          {
            statusJidList: [botJid, normalizedUploader],
          },
        );
      } catch (error) {
        console.error("❌ Error sending reaction:", error);
      }
    }

    const icon = "[STATUS]";
    const readStatus = isRead ? "✔️ Dibaca" : "✖️ Belum";
    const reactStatus = selectedEmoji ? `✔️ React: ${selectedEmoji}` : "";
    const statusMsg = `"${readStatus}${reactStatus ? `, ${reactStatus}` : ""}"`;

    console.log(
      `${icon} ${chalk.cyan(senderName)} (${chalk.gray(chatId)}) ➜ ${statusMsg}`,
    );
  } catch (error) {
    console.error("❌ Error in handleStory:", error);
  }
}
