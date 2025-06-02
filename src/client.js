import { fileTypeFromStream } from "file-type";
import { createWriteStream, createReadStream } from "fs";
import { unlink } from "fs/promises";
import { pipeline } from "stream/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import baileys from "@whiskeysockets/baileys";

const { jidNormalizedUser, downloadContentFromMessage, toReadable, toBuffer } =
  baileys;
const __dirname = dirname(fileURLToPath(import.meta.url));
const config = (await import("../config/config.js")).config;

class WhatsAppClient {
  constructor(sock) {
    this.sock = sock;
  }

  parseMention(text = "") {
    return [...text.matchAll(/@(\d{5,16})/g)].map(
      (match) => match[1] + "@s.whatsapp.net"
    );
  }

  getContentType(content) {
    if (!content) return null;
    return Object.keys(content).find(
      (k) =>
        (k === "conversation" ||
          k.endsWith("Message") ||
          k.endsWith("V2") ||
          k.endsWith("V3")) &&
        k !== "senderKeyDistributionMessage"
    );
  }

  decodeJid(jid) {
    return /:\d+@/.test(jid) ? jidNormalizedUser(jid) : jid;
  }

  async getFile(input, saveToFile = false) {
    let data, filename, res;

    switch (true) {
      case Buffer.isBuffer(input):
      case input instanceof ArrayBuffer:
        data = toReadable(input);
        break;
      case typeof input === "string" && /^data:.*?;base64,/.test(input):
        data = toReadable(Buffer.from(input.split(",")[1], "base64"));
        break;
      case typeof input === "string" && /^https?:\/\//.test(input):
        res = await fetch(input);
        data = res.body;
        break;
      case typeof input === "string":
        filename = input;
        data = createReadStream(input);
        break;
      case input instanceof Readable:
        data = input;
        break;
      default:
        throw new TypeError("Unsupported input type");
    }

    const typeResult = (await fileTypeFromStream(data)) || {
      mime: "application/octet-stream",
      ext: ".bin",
    };

    if (saveToFile && !filename) {
      filename = join(__dirname, `../tmp/${Date.now()}${typeResult.ext}`);
      await pipeline(data, createWriteStream(filename));
      data = createReadStream(filename); // Reset stream
    }

    return {
      ...typeResult,
      data,
      filename,
      res,
      toBuffer: async () => {
        const chunks = [];
        for await (const chunk of data) chunks.push(chunk);
        return Buffer.concat(chunks);
      },
      clear: async () => {
        data.destroy?.();
        if (filename) await unlink(filename).catch(() => {});
      },
    };
  }

  async downloadMediaMessage(message) {
    const mimeMap = {
      imageMessage: "image",
      videoMessage: "video",
      stickerMessage: "sticker",
      documentMessage: "document",
      audioMessage: "audio",
      ptvMessage: "video",
    };

    const msgContent = message.msg;
    let mediaType = mimeMap[message.type];

    if (msgContent?.thumbnailDirectPath && !msgContent.url) {
      return toBuffer(
        await downloadContentFromMessage(
          {
            directPath: msgContent.thumbnailDirectPath,
            mediaKey: msgContent.mediaKey,
          },
          "thumbnail-link"
        )
      );
    }

    return toBuffer(await downloadContentFromMessage(msgContent, mediaType));
  }

  async reply(jid, text = "", quoted, options = {}) {
    return this.sock.sendMessage(
      jid,
      { text, ...options },
      { quoted, ephemeralExpiration: config.ephemeral, ...options }
    );
  }

  async sendMedia(jid, media, quoted, options = {}) {
    const file = await this.getFile(media);
    const buffer = await file.toBuffer();
    const [mediaType] = file.mime.split("/");
    const messageType = mediaType === "application" ? "document" : mediaType;

    return this.sock.sendMessage(
      jid,
      {
        [messageType]: buffer,
        mimetype: file.mime,
        ...options,
      },
      { quoted, ephemeralExpiration: config.ephemeral }
    );
  }
}

export default (sock) => new WhatsAppClient(sock);
