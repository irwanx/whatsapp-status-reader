
export default async function autoPresence({ m, sock, config }) {
  try {
    if (!m || !sock) return;
    if (!config.autoPresence) return;
    if (!m.chat || typeof m.chat !== 'string') return;
    if (m.chat === "status@broadcast") return;
    if (m.key?.fromMe) return;

    const isPrivateChat = m.chat.endsWith("@s.whatsapp.net");

    if (isPrivateChat || m.isGroup) {
      const lastPresenceUpdate = sock.presenceUpdates?.[m.chat] || 0;
      const now = Date.now();
      
      if (now - lastPresenceUpdate > 30000) {
        await sock.sendPresenceUpdate(config.autoPresenceType, m.chat);
        
        if (!sock.presenceUpdates) sock.presenceUpdates = {};
        sock.presenceUpdates[m.chat] = now;
      }
    }
  } catch (error) {
    console.error('Error in autoPresence:', error);
  }
}