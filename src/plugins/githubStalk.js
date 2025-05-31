import { WA_DEFAULT_EPHEMERAL } from "@whiskeysockets/baileys";
import { config } from "../../config/config.js";

export const command = ["ghstalk", "githubstalk"];
export const help = ["githubstalk <username>"];
export const tags = ["internet"];

export default async function githubstalk({ m, sock }) {
  const username = m.text.trim();

  if (!username) {
    return m.reply(`⚠️ Harap masukkan username GitHub.\n\nContoh: ${m.prefix + m.command} irwanx`);
  }

  await m.reply("🔍 Sedang mencari data pengguna GitHub...");

  try {
    const res = await fetch(`https://api.github.com/users/${username}`);
    if (!res.ok) throw new Error("Pengguna tidak ditemukan");

    const anu = await res.json();

    const hasil = `*── 「 GITHUB STALK 」 ──*
👤 *Username:* ${anu.login}
🧑 *Nama:* ${anu.name || "-"}
📝 *Bio:* ${anu.bio || "-"}
🏢 *Perusahaan:* ${anu.company || "-"}
🌐 *Blog:* ${anu.blog || "-"}
📍 *Lokasi:* ${anu.location || "-"}
📁 *Repo Publik:* ${anu.public_repos}
🧾 *Gists Publik:* ${anu.public_gists}
👥 *Follower:* ${anu.followers}
➡️ *Following:* ${anu.following}
📅 *Bergabung:* ${new Date(anu.created_at).toLocaleDateString("id-ID")}
🔗 *Profil:* ${anu.html_url}`;

    await sock.sendMessage(m.chat, {
      image: { url: anu.avatar_url },
      caption: hasil,
      contextInfo: {
        externalAdReply: {
          title: anu.name || anu.login,
          body: "GitHub Profile",
          thumbnailUrl: anu.avatar_url,
          sourceUrl: anu.html_url,
          mediaType: 1,
          renderLargerThumbnail: true,
          showAdAttribution: true
        }
      }
    }, {
      quoted: m.raw,
      ephemeralExpiration: config.ephemeral || WA_DEFAULT_EPHEMERAL
    });

  } catch (e) {
    console.error("Error:", e);
    await m.reply(`❌ Gagal mengambil data: ${e.message}`);
  }
}
