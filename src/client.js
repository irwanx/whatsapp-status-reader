import { fileTypeStream } from "file-type";
import Stream, { Readable } from "stream";
import * as fs from "fs";
import fetch from "node-fetch";

import baileys from "@fizzxydev/baileys-pro";
import { config } from "../config.js";
const { jidNormalizedUser, downloadContentFromMessage, toReadable, toBuffer } =
  baileys;

export default function client(sock) {
  const saveStreamToFile = (stream, file) =>
    new Promise((resolve, reject) => {
      const writable = stream.pipe(fs.createWriteStream(file));
      writable.once("finish", () => {
        resolve();
        writable.destroy();
      });
      writable.once("error", () => {
        reject();
        writable.destroy();
      });
    });
  const isReadableStream = (stream) => {
    if (typeof Stream.isReadable === "function")
      return Stream.isReadable(stream);
    if (stream && stream[kIsReadable] != null) return stream[kIsReadable];
    if (typeof stream?.readable !== "boolean") return null;
    if (isDestroyed(stream)) return false;
    return (
      (isReadableNodeStream(stream) &&
        !!stream.readable &&
        !isReadableFinished(stream)) ||
      stream instanceof fs.ReadStream ||
      stream instanceof Readable
    );
  };

  const client = Object.defineProperties(sock, {
    parseMention: {
      value(text = "") {
        return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(
          (v) => v[1] + "@s.whatsapp.net"
        );
      },
      enumerable: true,
      writable: true,
    },
    getContentType: {
      value(content) {
        if (content) {
          const keys = Object.keys(content);
          const key = keys.find(
            (k) =>
              (k === "conversation" ||
                k.endsWith("Message") ||
                k.endsWith("V2") ||
                k.endsWith("V3")) &&
              k !== "senderKeyDistributionMessage"
          );
          return key;
        }
      },
      enumerable: true,
    },
    decodeJid: {
      value(jid) {
        if (/:\d+@/gi.test(jid)) {
          const decode = jidNormalizedUser(jid);
          return decode;
        } else return jid;
      },
    },
    getFile: {
      async value(PATH, saveToFile = false) {
        let res, filename, data;
        if (Buffer.isBuffer(PATH) || isReadableStream(PATH)) data = PATH;
        else if (PATH instanceof ArrayBuffer) data = PATH.toBuffer();
        else if (/^data:.*?\/.*?;base64,/i.test(PATH))
          data = Buffer.from(PATH.split`,`[1], "base64");
        else if (/^https?:\/\//.test(PATH)) {
          res = await fetch(PATH);
          data = res.body;
        } else if (fs.existsSync(PATH)) {
          filename = PATH;
          data = fs.createReadStream(PATH);
        } else data = Buffer.alloc(0);

        let isStream = isReadableStream(data);
        if (!isStream || Buffer.isBuffer(data)) {
          if (!Buffer.isBuffer(data))
            throw new TypeError(
              "Converting buffer to stream, but data have type" + typeof data,
              data
            );
          data = toReadable(data);
          isStream = true;
        }

        const streamWithType = (await fileTypeStream(data)) || {
          ...data,
          mime: "application/octet-stream",
          ext: ".bin",
        };

        if (data && saveToFile && !filename) {
          filename = path.join(
            __dirname,
            `../tmp/${Date.now()}.${streamWithType.fileType.ext}`
          );
          await saveStreamToFile(data, filename);
        }

        return {
          res,
          filename,
          ...streamWithType.fileType,
          data: streamWithType,
          async toBuffer() {
            const buffers = [];
            for await (const chunk of streamWithType) buffers.push(chunk);
            return Buffer.concat(buffers);
          },
          async clear() {
            streamWithType.destroy();
            if (filename) await fs.promises.unlink(filename);
          },
        };
      },
      enumerable: true,
    },
    downloadMediaMessage: {
      async value(message, filename) {
        let mime = {
          imageMessage: "image",
          videoMessage: "video",
          stickerMessage: "sticker",
          documentMessage: "document",
          audioMessage: "audio",
          ptvMessage: "video",
        }[message.type];

        if ("thumbnailDirectPath" in message.msg && !("url" in message.msg)) {
          message = {
            directPath: message.msg.thumbnailDirectPath,
            mediaKey: message.msg.mediaKey,
          };
          mime = "thumbnail-link";
        } else {
          message = message.msg;
        }

        return await toBuffer(await downloadContentFromMessage(message, mime));
      },
      enumerable: true,
    },
    reply: {
      async value(jid, text = "", quoted, options) {
        return sock.sendMessage(
          jid,
          {
            ...options,
            text: text,
          },
          {
            quoted,
            ...options,
            ephemeralExpiration: config.ephemeral,
          }
        );
      },
      writable: true,
    },
    sendMedia: {
      async value(jid, path, quoted, options = {}) {
        let { mime } = await sock.getFile(path).then((res) => res);
        let data = await sock.getFile(path).then((res) => res.toBuffer());
        let messageType = mime.split("/")[0];
        let pase =
          messageType.replace("application", "document") || messageType;
        return await sock.sendMessage(
          jid,
          {
            [`${pase}`]: data,
            mimetype: mime,
            ...options,
          },
          {
            quoted,
          }
        );
      },
      enumerable: true,
    },
  });
  return client;
}