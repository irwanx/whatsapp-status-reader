import { config } from "../config.js";
import { escapeRegExp } from "./functions.js";

export function formatMessage(msg, sock) {
  const jid = msg.key.remoteJid;
  const isGroup = jid.endsWith("@g.us");
  const isUser = jid.endsWith("@s.whatsapp.net");
  const messageContent = msg.message;

  const text =
    messageContent?.conversation ||
    messageContent?.extendedTextMessage?.text ||
    messageContent?.imageMessage?.caption ||
    messageContent?.videoMessage?.caption ||
    null;

  let quoted = null;
  const context = messageContent?.extendedTextMessage?.contextInfo;
  const quotedMessage = context?.quotedMessage;

  if (quotedMessage) {
    quoted = {
      id: context.stanzaId,
      chat: context.remoteJid,
      sender: context.participant,
      text:
        quotedMessage?.conversation ||
        quotedMessage?.extendedTextMessage?.text ||
        quotedMessage?.imageMessage?.caption ||
        quotedMessage?.videoMessage?.caption ||
        "[non-text message]",
      raw: quotedMessage,
    };
  }

  const prefix = config.prefix.test(text) ? text.match(config.prefix)[0] : "";
  let command = null;
  let args = [];

  if (text && prefix) {
    command = text.replace(prefix, "").trim().split(/ +/).shift();
    args = text
      .trim()
      .replace(new RegExp("^" + escapeRegExp(prefix), "i"), "")
      .replace(command, "")
      .split(/ +/)
      .filter((a) => a);
    if (command && command.startsWith(prefix)) {
      text = args.join(" ");
    }
  }

  const fromMe = msg.key.fromMe || jid === sock.user.id;
  const isBaileys = !!fromMe;

  return {
    key: msg.key,
    id: msg.key.id,
    chat: jid,
    sender: msg.key.participant || jid,
    fromMe,
    isBaileys,
    name: msg.pushName || "",
    isGroup,
    isUser,
    text,
    quoted,
    prefix: command ? prefix : null,
    command,
    args,
    timestamp: msg.messageTimestamp,
    raw: msg,
    reply: async (text, options = {}) => {
      try {
        if (!jid || !text) {
          throw new Error("Chat ID or text is undefined.");
        }
        await sock.sendMessage(
          jid,
          { text },
          { quoted: msg, ephemeralExpiration: config.ephemeral, ...options }
        );
      } catch (error) {
        console.error("Error replying to message:", error);
      }
    },
  };
}
