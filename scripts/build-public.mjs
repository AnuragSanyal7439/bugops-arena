import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const staticFiles = [
  "_redirects",
  "config.js",
  "index.html",
  "levels.js",
  "manifest.webmanifest",
  "robots.txt",
  "script.js",
  "style.css"
];

await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });

for (const file of staticFiles) {
  await copyFile(path.join(root, file), path.join(publicDir, file));
}
