export default async function casePlugin({ m, sock }) {
    if(!m.command) return
  const getUserInfo = () => {
    return `👤 Info Pengguna:
- Nama: ${m.name || 'Tidak diketahui'}
- Nomor: ${m.sender.split('@')[0]}
- Waktu: ${new Date().toLocaleString('id-ID')}`;
  };

  switch (m.command.toLowerCase()) {
    case "info":
      sock.reply(m.chat, getUserInfo(), m.raw);
      break;

    default:
    //   m.reply("❓ Maaf, perintah tidak dikenali.");
      break;
  }
}
