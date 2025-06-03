import { extractMessageContent } from "@whiskeysockets/baileys";

const unwrapMessage = (message) => {
  if (!message) return null;
  if (message.ephemeralMessage)
    return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage)
    return unwrapMessage(message.viewOnceMessage.message);
  return message;
};

const extractText = (msg = {}) => {
  return (
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    msg?.documentMessage?.caption ||
    msg?.buttonsResponseMessage?.selectedButtonId ||
    msg?.listResponseMessage?.title ||
    msg?.templateButtonReplyMessage?.selectedId ||
    null
  );
};

const getMessageType = (messageContent) => {
  return messageContent ? Object.keys(messageContent)[0] : "unknown";
};

const buildQuotedMessage = (context, quotedRaw, sock, originalJid) => {
  const quotedMsg = unwrapMessage(quotedRaw);
  if (!quotedMsg) return null;

  const quotedType = getMessageType(quotedMsg);
  const quotedText = extractText(quotedMsg) || "[non-text message]";

  return {
    id: context?.stanzaId,
    chat: context?.remoteJid,
    sender: context?.participant || context?.remoteJid,
    text: quotedText,
    type: quotedType,
    raw: extractMessageContent(quotedMsg),
    media: quotedMsg,
    reply: async (text, options = {}) => {
      await sock.sendMessage(
        originalJid,
        { text },
        { quoted: { key: context, message: quotedRaw }, ...options }
      );
    },
    download: async (filepath) => {
      try {
        return await sock.downloadMediaMessage(
          { key: context, message: quotedRaw },
          filepath
        );
      } catch (err) {
        console.error("Error downloading quoted media:", err);
        return null;
      }
    },
  };
};

const parseCommand = (text, config) => {
  if (!text || !config.prefix.test(text))
    return { prefix: null, command: null, args: [] };

  const prefix = text.match(config.prefix)[0];
  const cleanText = text.replace(prefix, "").trim();
  const [command, ...args] = cleanText.split(/\s+/);

  return {
    prefix,
    command: command || null,
    args: args.filter((arg) => arg),
  };
};

const getMediaDetails = (messageContent) => {
  const mediaMessage =
    messageContent?.imageMessage ||
    messageContent?.videoMessage ||
    messageContent?.documentMessage ||
    messageContent?.audioMessage ||
    null;

  return {
    isMedia: !!mediaMessage,
    mimetype: mediaMessage?.mimetype,
    size: mediaMessage?.fileLength,
    height: mediaMessage?.height,
    width: mediaMessage?.width,
  };
};

export async function formatMessage(msg, sock, config) {
  const jid = msg.key.remoteJid;
  const rawMessage = unwrapMessage(msg.message);
  const messageContent = rawMessage || {};
  const text = extractText(messageContent);
  const mentionedJid = [];
  if (text) {
    const matches = text.match(/@(\d{5,})/g);
    if (matches) {
      for (const mention of matches) {
        const number = mention.replace("@", "").trim();
        if (!isNaN(number)) {
          mentionedJid.push(number + "@s.whatsapp.net");
        }
      }
    }
  }

  const { prefix, command, args } = parseCommand(text, config);

  const messageInfo = {
    key: msg.key,
    id: msg.key.id,
    chat: jid,
    sender: msg.key.participant || jid,
    fromMe: msg.key.fromMe || jid === sock.user?.id,
    isBaileys: msg.key.id.startsWith("3EB0") || false,
    name: msg.pushName || "",
    isGroup: jid.endsWith("@g.us"),
    isUser: jid.endsWith("@s.whatsapp.net"),
    body: text,
    text: prefix ? args.join(" ") : text,
    type: getMessageType(messageContent),
    timestamp: msg.messageTimestamp,
    raw: msg,
    media: messageContent,
    isOwner: msg.key.fromMe
      ? true
      : config.owner.includes((msg.key.participant || jid).split("@")[0]),
  };

  const context = messageContent?.extendedTextMessage?.contextInfo;
  const quoted = context
    ? buildQuotedMessage(context, context.quotedMessage, sock, jid)
    : null;

  const mediaDetails = getMediaDetails(messageContent);

  return {
    ...messageInfo,
    quoted,
    prefix,
    command,
    args,
    ...mediaDetails,
    mentionedJid,
    reply: async (text, options = {}) => {
      const mentions = [];
      if (text) {
        const matches = text.match(/@(\d{5,})/g);
        if (matches) {
          for (const mention of matches) {
            const number = mention.replace("@", "").trim();
            if (!isNaN(number)) {
              mentions.push(number + "@s.whatsapp.net");
            }
          }
        }
      }
      try {
        await sock.sendMessage(
          jid,
          { text, mentions: mentions.length ? mentions : [] },
          {
            quoted: msg,
            ephemeralExpiration: config.ephemeral,
            ...options,
          }
        );
      } catch (error) {
        console.error("Error replying to message:", error);
      }
    },
    download: async (filepath) => {
      try {
        return await sock.downloadMediaMessage(
          { message: msg.message },
          filepath
        );
      } catch (err) {
        console.error("Error downloading media:", err);
        return null;
      }
    },
  };
}
