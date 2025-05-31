import fs from "fs";
import path from "path";

const folderPath = "./database";
const dbFile = path.join(folderPath, "users.json");

function ensureDb() {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, "{}", "utf-8");
  }
}

function load() {
  ensureDb();
  try {
    const raw = fs.readFileSync(dbFile, "utf-8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error("❌ Gagal membaca database:", err);
    return {};
  }
}

function save(data) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("❌ Gagal menyimpan database:", err);
  }
}

export const pcService = {
  getAll: () => load(),

  get: (jid) => {
    const db = load();
    return db[jid] || null;
  },

  update: (jid, data) => {
    const db = load();
    db[jid] = { ...db[jid], ...data };
    save(db);
  },

  setIfNotExist: (jid, data) => {
    const db = load();
    if (!db[jid]) {
      db[jid] = data;
      save(db);
    }
  },

  isCooldownOver: (jid, cooldownMs = 86400000) => {
    const db = load();
    return !db[jid] || Date.now() - db[jid].pc > cooldownMs;
  },
};
