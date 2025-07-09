import { patchConfig } from "../../services/configService.js";

export const command = [
  "autoreadsw",
  "autoreactsw",
  "autopresence",
  "firstchat",
  "public",
  "status",
];
export const help = [
  "autoreadsw on/off",
  "autoreactsw on/off",
  "autopresence on/off",
  "firstchat on/off",
  "public on/off",
  "status",
];
export const tags = ["settings"];

export default async function switchSetting({ m, config }) {
  if (!m.isOwner) return;
  const args = m.text.trim();
  const cmd = m.command?.toLowerCase();
  const option = args?.toLowerCase();

  const settingMap = {
    autoreadsw: "autoReadStory",
    autoreactsw: "autoReactStory",
    autopresence: "autoPresence",
    firstchat: "firstChat",
    public: "publicMode",
  };

  if (cmd === "status") {
    const statusList = Object.entries(settingMap).map(([cmdKey, configKey]) => {
      const status = config[configKey] ? "✅ ON" : "❌ OFF";
      return `• *${cmdKey}*: ${status}`;
    });

    return m.reply(
      "*📊 Status Pengaturan Saat Ini:*\n\n" + statusList.join("\n")
    );
  }
  if (!["on", "off"].includes(option)) {
    return m.reply(`Gunakan *.${cmd} on* atau *.${cmd} off*`);
  }

  const enable = option === "on";

  const targetKey = settingMap[cmd];
  if (!targetKey) {
    return m.reply("❌ Perintah tidak dikenali.");
  }

  await patchConfig({ [targetKey]: enable });

  return m.reply(
    `✅ *${targetKey}* telah di- *${enable ? "aktifkan" : "nonaktifkan"}*.`
  );
}
