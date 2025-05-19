import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import syntaxError from "syntax-error";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = __dirname;

const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));

const allowedFolders = [
  projectRoot,
  ...Object.values(pkg.directories || {}).map((f) => path.join(projectRoot, f))
];

function getAllJsFiles(dirPath) {
  let jsFiles = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name.startsWith(".") ||
        entry.name === "sessions" ||
        entry.name === "auth" ||
        entry.name === "logs"
      ) continue;

      jsFiles = jsFiles.concat(getAllJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      jsFiles.push(fullPath);
    }
  }

  return jsFiles;
}

for (const folder of allowedFolders) {
  if (!fs.existsSync(folder)) continue;

  const jsFiles = getAllJsFiles(folder);

  for (const file of jsFiles) {
    const content = fs.readFileSync(file, "utf8");
    const error = syntaxError(content, file, {
      sourceType: "module",
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: true,
    });

    if (error) {
      console.error(`\n❌ Syntax error ditemukan di: ${file}\n`);
      console.error(error);
      process.exit(1);
    } else {
      console.log(`✅ OK: ${path.relative(projectRoot, file)}`);
    }
  }
}
