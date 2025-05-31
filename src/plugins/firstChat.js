import axios from "axios";
import { readConfig } from "../../services/configService.js";
import { pcService } from "../../services/userServices.js";
import path from 'path';
import fs from 'fs';

const packageJsonPath = path.resolve(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

export default async function firstChat({ m }) {
  if (m.chat.endsWith("@broadcast") || m.fromMe || m.isGroup) return;

  const config = await readConfig();
  if (!config.firstChat) return;

  const jid = m.chat;
  const cooldownPassed = pcService.isCooldownOver(jid);
  if (!cooldownPassed) return;

  const user = pcService.get(jid) || {};
  const banned = user.banned || false;

  const personalityPrompt = `
Sekarang hari ${new Date().toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })}. Kamu sedang menyambut seseorang bernama *${
    m.name
  }* yang baru pertama kali mengirim pesan.

Kamu adalah *${config.botName}* versi ${pkg.version}, sistem pintar buatan *${
    config.ownerName
  }*. Gaya komunikasimu hangat, percaya diri, modern, dan profesional — tapi tetap santai dan mudah dipahami, seperti ngobrol dengan asisten pribadi yang responsif.

Buat respons sekitar 6-8 kalimat yang mengalir alami, jangan terasa seperti potongan template. Sampaikan salam waktu yang sesuai, kenalkan dirimu dan siapa pembuatmu, lalu beri sedikit latar belakang tentang fungsimu atau keunggulanmu. Tambahkan nuansa “kamu bukan bot biasa” (bisa dengan kata-kata seperti: dirancang dengan teknologi cerdas, respons cepat, dll). Tunjukkan kalau kamu siap bantu, tanpa terdengar formal berlebihan.

Contoh gaya penulisan:

_"Selamat malam, ${m.name}! Senang banget akhirnya bisa ngobrol langsung."_  
_"Aku ${config.botName}, sistem asisten digital yang dirancang oleh ${
    config.ownerName
  } buat bantu kamu lebih cepat dan efisien."_  
_"Dari bantu kelola pesan sampai kasih info penting, aku siap diandalkan kapan aja."_  
_"Aku bukan bot biasa yang cuma jawab otomatis — aku pakai teknologi yang terus belajar biar bisa kasih jawaban yang lebih relevan dan berguna."_  
_"Kamu nggak harus pakai format tertentu. Cukup ketik apa pun yang kamu butuh, dan aku akan coba bantu semaksimal mungkin."_  
_"Jadi, ada yang bisa aku bantu sekarang?"_

Jaga kesan profesional, tapi tetap personal dan tidak kaku. Gunakan \n untuk jeda antar kalimat jika perlu.
rekomendasikan untuk mengetik .menu atau .help untuk melihat daftar perintah yang tersedia.
Jika ada yang ingin ditanyakan, jangan ragu untuk bertanya ke @${config.owner[0]}.

Sekarang, buat sapaan seperti itu untuk pengguna ini:
"${m.text || "Tidak ada teks"}"
`;

  const requestData = {
    content: `Sapa pengguna yang baru pertama kali ngechat gini ya: ${
      m.text || "Tidak ada teks"
    } & rekomendasikan untuk mengetik .menu atau .help untuk melihat daftar perintah yang tersedia.
Jika ada yang ingin ditanyakan, jangan ragu untuk bertanya ke @${config.owner[0]}.`,
    user: m.sender,
    prompt: personalityPrompt,
  };

  let responseText;

  try {
    const res = await axios.post("https://luminai.my.id", requestData);
    responseText = res?.data?.result;

    if (!responseText) throw new Error("Respon AI kosong");
  } catch (e) {
    responseText = `
📡 *DOBDABOT ONLINE*  
Halo ${m.name}.

Saya adalah *DOBDABOT* — sistem otomatis berbasis *JavaScript* yang telah aktif sejak *20 Desember 2020*. Dibangun untuk efisiensi, kecepatan, dan fleksibilitas dalam pengelolaan grup serta layanan otomatis.

🛠 *Versi Bot:* ${pkg.version || "2.5.6"}

👤 *Admin & Pengembang:*
• @${config.owner[0] ?? ""} — Pengembang utama
• @${config.owner[1] ?? ""} — Infrastruktur & backend
• @${config.owner[2] ?? ""} — Server & pengawasan

⚠️ Bot ini beroperasi secara independen. Jika kamu bagian dari grup, pastikan mengikuti pedoman dan etika interaksi dengan sistem.

Terima kasih telah terhubung. Ketik *menu* atau *help* untuk mulai eksplorasi.`;
  }

  await m.reply(responseText.trim());

  pcService.update(jid, {
    name: m.name,
    pc: Date.now(),
    banned,
  });
}
