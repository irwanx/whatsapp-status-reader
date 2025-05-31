import { config } from "../../config/config.js";

export const command = ["sc", "sourcecode"];
export const help = ["sourcecode"];
export const tags = ["info"];

export default function sourceCode({ m }) {
  m.reply(`This bot Uses Script From\n${config.sourceCode ?? "https://github.com/irwanx/whatsapp-status-reader"}`);
}
