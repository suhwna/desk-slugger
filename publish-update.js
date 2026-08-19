"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const packageJson = require("./package.json");
const changelog = require("./changelog.json");

const source = path.join(__dirname, "dist", `Desk-Slugger-${packageJson.version}.exe`);
const updateDirectory = path.join(__dirname, "updates");
const destination = path.join(updateDirectory, "Desk-Slugger-latest.exe");

if (!fs.existsSync(source)) throw new Error(`Build not found: ${source}`);
fs.mkdirSync(updateDirectory, { recursive: true });
fs.copyFileSync(source, destination);
const hash = crypto.createHash("sha256");
hash.update(fs.readFileSync(destination));
const stat = fs.statSync(destination);
const manifest = {
  version: packageJson.version,
  sha256: hash.digest("hex"),
  size: stat.size,
  publishedAt: new Date().toISOString(),
  history: changelog
};
fs.writeFileSync(path.join(updateDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Published Desk Slugger ${packageJson.version} (${stat.size} bytes)`);
