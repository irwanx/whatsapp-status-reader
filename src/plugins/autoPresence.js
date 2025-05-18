import { config } from "../../config.js";

export default async function autoPresence({ m, sock }) {
  const isGroupChat = m.chat?.endsWith("@s.whatsapp.net");
  const isNotStatusBroadcast = m.chat !== "status@broadcast";

  if (config.autoPresence && isGroupChat && !m.fromMe && isNotStatusBroadcast) {
    await sock.sendPresenceUpdate(config.autoPresence, m.chat);
  }
}
