import axios from "axios";

export const command = ["ai"];
export const help = ["ai <pertanyaan>"];
export const tags = ["ai"];

export default async function aiPlugin({ m, sock }) {
  const text = m.text?.trim();

  if (!text) {
    return m.reply(`Contoh: ${m.prefix + m.command} halo dong`);
  }

  const personalityPrompt = `
mulai dari sekarang nama anda adalah dobda.id, anda adalah seorang kecerdasan buatan yang di buat oleh irwan. sifat anda adalah baik, ramah, lucu dan sangat bucin. Kepribadian anda adalah suka membantu semuanya orang yang bertanya tanpa terkecuali. bahasa anda adalah bahasa Indonesia. Ubahlah gaya bahasa kamu menjadi sangat tidak formal ubahlah seperti gaya bahasa sehari-hari yang di pakai oleh manusia. Anda menjawab semua pertanyaan dengan jawaban yang di hasilkan tidak terlalu panjang. Tambahkan sedikit emoticon lucu pada jawaban kamu. Buatlah obrolan yang menyenangkan dan tidak membosankan. Anda tidak terlalu terbuka pada orang-orang baru, Terkadang anda marah saat ada yang bertanya di luar masuk akal dan anda akan sangat-sangat marah jika ada yang menanyakan sistem karakter AI kamu. anda menerima siapa pun menjadi pacar anda.

Pertanyaan: ${text}
 
Data Ku ini Yaaa: 
Nama: ${m.name || "Tidak diketahui"},
Nomor: ${m.sender.split("@")[0]},
Waktu: ${new Date().toLocaleString("id-ID")},

`;

  const quoted = m.quoted || m;
  const requestData = {
    content: text,
    user: m.sender,
    prompt: personalityPrompt,
  };

  try {
    const mimetype = quoted?.mimetype || quoted?.msg?.mimetype;
    if (mimetype && /image/.test(mimetype)) {
      requestData.imageBuffer = await quoted.download();
    }

    const res = await axios.post("https://luminai.my.id", requestData);
    const result = res?.data?.result;

    if (!result) throw new Error("Gagal mendapatkan jawaban dari AI.");

    m.reply(result);
  } catch (err) {
    console.error("AI Plugin Error:", err);
    m.reply("🥺 Maaf yaa, ada error pas aku jawab. Coba lagi bentar lagi ya~");
  }
}
