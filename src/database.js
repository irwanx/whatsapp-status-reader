import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, "../database/database.json");

// Default data structure
const defaultData = {
  groups: {},
  settings: {
    publicMode: config.publicMode,
    anticall: config.anticall,
    autoReadStory: config.autoReadStory,
    autoReactStory: config.autoReactStory,
    reactEmote: config.reactEmote,
  },
};

let data = { ...defaultData };

// Load data from file
function load() {
  try {
    if (fs.existsSync(dbFile)) {
      const raw = fs.readFileSync(dbFile, "utf-8");
      const parsed = JSON.parse(raw);
      // Merge with defaults
      data = {
        ...defaultData,
        ...parsed,
        settings: {
          ...defaultData.settings,
          ...(parsed.settings || {}),
        },
      };

      // Save back if new keys were added
      save();
    } else {
      save(); // Create file with defaultData
    }
  } catch (err) {
    console.error("Failed to load database:", err);
    data = { ...defaultData };
  }
}

// Save data to file
function save() {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to save database:", err);
  }
}

// Initialize
load();

export const database = {
  getGroupSetting: (jid, key) => {
    if (!data.groups[jid]) return undefined;
    return data.groups[jid][key];
  },

  setGroupSetting: (jid, key, value) => {
    if (!data.groups[jid]) {
      data.groups[jid] = { ...config.group };
    }
    data.groups[jid][key] = value;
    save();
  },

  getBotSetting: (key) => {
    return data.settings?.[key];
  },

  setBotSetting: (key, value) => {
    if (!data.settings) data.settings = {};
    data.settings[key] = value;
    save();
  },
};
