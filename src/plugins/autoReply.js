export default async function autoReply({ m, sock }) {
  if (/test/i.test(m.text)) {
    await sock.reply(m.chat, "On!", m.raw);
  }
}
