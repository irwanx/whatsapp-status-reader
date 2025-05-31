import { patchConfig } from "../../services/configService.js";

export const command = ["autoreadsw", "autoreactsw", "autopresence", "firstchat"];
export const help = [
  "autoreadsw on/off",
  "autoreactsw on/off",
  "autopresence on/off",
  "firstchat on/off",
];
export const tags = ["settings"];

export default async function switchSetting({ m }) {
  if(!m.isOwner) return m.reply("❌ Hanya owner yang dapat mengubah pengaturan ini.");
  const args = m.text.trim();
  const cmd = m.command?.toLowerCase();
  const option = args?.toLowerCase();

  if (!["on", "off"].includes(option)) {
    return m.reply(`Gunakan *.${cmd} on* atau *.${cmd} off*`);
  }

  const enable = option === "on";

  const settingMap = {
    autoreadsw: "autoReadStory",
    autoreactsw: "autoReactStory",
    autopresence: "autoPresence",
    firstchat: "firstChat",
  };

  const targetKey = settingMap[cmd];
  if (!targetKey) {
    return m.reply("❌ Perintah tidak dikenali.");
  }

  await patchConfig({ [targetKey]: enable });

  return m.reply(
    `✅ *${targetKey}* telah di- *${enable ? "aktifkan" : "nonaktifkan"}*.`
  );
}
