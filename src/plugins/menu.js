export const command = ["menu", "help", "?"];
export const help = ["menu", "help"];
export const tags = ["main"];

const tagIcons = {
  main: "🧭",
  settings: "⚙️",
  tools: "🛠️",
  ai: "🤖",
  info: "ℹ️",
  group: "👥",
  media: "🎥",
  internet: "🌐",
  fun: "🎉",
  lainnya: "📁",
};

export default async function showMenu({ m, plugins }) {
  try {
    const tagGroups = {};

    for (const plugin of plugins) {
      const tags = Array.isArray(plugin.tags)
        ? plugin.tags
        : plugin.tags
        ? [plugin.tags]
        : ["lainnya"];

      const commandList = plugin.command || [];
      const helpList = plugin.help || commandList.map((c) => `.${c}`) || [];

      if (!helpList.length) continue;

      for (const tag of tags) {
        if (!tagGroups[tag]) {
          tagGroups[tag] = [];
        }

        helpList.forEach((hlp) => {
          if (!tagGroups[tag].includes(hlp)) {
            tagGroups[tag].push(hlp);
          }
        });
      }
    }

    const sortedTags = Object.keys(tagGroups)
      .filter((tag) => tagGroups[tag]?.length)
      .sort((a, b) => {
        if (a === "main") return -1;
        if (b === "main") return 1;
        return a.localeCompare(b);
      });

    let helpMessage = "╭───< *MENU BANTUAN* >───╮\n";
    helpMessage += `│ Hai *${m.name || "Pengguna"}*!\n`;
    helpMessage += "│ Berikut adalah daftar perintah yang tersedia:\n";
    helpMessage += "│\n";

    sortedTags.forEach((tag, index) => {
      const icon = tagIcons[tag] || "📂";
      const title = `${icon} *${tag.charAt(0).toUpperCase() + tag.slice(1)}*`;
      helpMessage += `╭─「 ${title} 」\n`;
      helpMessage += tagGroups[tag].map((cmd) => `│ 々 ${m.prefix}${cmd}`).join("\n");
      helpMessage += "\n";
      if (index < sortedTags.length - 1) {
        helpMessage += "│\n";
      }
    });

    helpMessage += "╰─────────────✧";

    await m.reply(helpMessage.trim());
  } catch (err) {
    console.error("Error in help command:", err);

    await m.reply(
      "❌ Terjadi kesalahan saat mencoba menampilkan menu bantuan. Silakan coba lagi nanti."
    );
  }
}
