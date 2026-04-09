/**
 * storyDb.js
 * Persistent storage (lowdb JSON) untuk story handler:
 *  - Cegah double-read (readStatus)
 *  - Rate limit: skip jika sender kirim >3 story dalam 1 menit
 *
 * File DB akan dibuat otomatis di: /database/story_read.json
 */

import { JSONFilePreset } from "lowdb/node";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "story_read.json");

const defaultData = {
  readStatus: {},
  rateLimit: {},
};

let db;

/** Inisialisasi DB — panggil sekali saat startup */
export async function initStoryDb() {
  db = await JSONFilePreset(DB_PATH, defaultData);
  db.data.readStatus ??= {};
  db.data.rateLimit ??= {};
  await db.write();
  console.log("[📦 StoryDB] Database siap:", DB_PATH);
}

// ─── Read Status ─────────────────────────────────────────────────────────────

/** Cek apakah story sudah pernah diproses */
export function isAlreadyRead(storyId) {
  return !!db.data.readStatus[storyId];
}

/**
 * Tandai story sebagai sudah diproses, simpan juga info kontennya
 * @param {string} storyId - unique key
 * @param {object} info - { sender, pushName, type, emoji, time }
 */
export async function markAsRead(storyId, info = {}) {
  db.data.readStatus[storyId] = {
    seenAt: Date.now(),
    ...info,
  };
  await db.write();
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const RATE_LIMIT_COUNT = 5;          // Maks story per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 menit

/**
 * Cek rate limit sender.
 * @returns {boolean} true = SKIP (kena limit), false = boleh lanjut
 */
export async function isRateLimited(sender) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Ambil timestamps dalam window, buang yang sudah expired
  const timestamps = (db.data.rateLimit[sender] ?? []).filter(
    (ts) => ts > windowStart
  );

  if (timestamps.length >= RATE_LIMIT_COUNT) {
    db.data.rateLimit[sender] = timestamps;
    await db.write();
    return true; // kena rate limit → SKIP
  }

  // Masih aman → catat timestamp ini
  timestamps.push(now);
  db.data.rateLimit[sender] = timestamps;
  await db.write();
  return false;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

/** Hapus data lama agar file JSON tidak membengkak. Dipanggil otomatis tiap restart. */
export async function cleanupOldData() {
  const now = Date.now();
  const DAY_MS = 86_400_000;

  for (const [id, val] of Object.entries(db.data.readStatus)) {
    const ts = typeof val === "object" ? val.seenAt : val;
    if (now - ts > DAY_MS) delete db.data.readStatus[id];
  }

  for (const [sender, timestamps] of Object.entries(db.data.rateLimit)) {
    const fresh = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (fresh.length === 0) delete db.data.rateLimit[sender];
    else db.data.rateLimit[sender] = fresh;
  }

  await db.write();
  console.log("[🧹 StoryDB] Cleanup data lama selesai.");
}
