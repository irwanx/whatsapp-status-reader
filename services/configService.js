import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, "../config/config.json");

export async function readConfig() {
  const data = await fs.readFile(configPath, "utf-8");
  const config = JSON.parse(data);

  config.prefix = new RegExp(config.prefix, "i");

  return config;
}

export async function updateConfig(newData) {
  if (newData.prefix instanceof RegExp) {
    newData.prefix = newData.prefix.source;
  }

  await fs.writeFile(configPath, JSON.stringify(newData, null, 2));
  return true;
}

export async function patchConfig(partialUpdate) {
  const current = await readConfig();

  const updated = {
    ...current,
    ...partialUpdate,
  };

  return updateConfig(updated);
}

export async function resetConfig(defaults) {
  await updateConfig(defaults);
  return true;
}
