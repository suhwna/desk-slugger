"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { version } = require("../package.json");

const executable = path.join(__dirname, "..", "dist", `Desk-Slugger-${version}.exe`);
const command = "$s=Get-AuthenticodeSignature -LiteralPath $env:DESK_SLUGGER_SIGNATURE_TARGET; [pscustomobject]@{Status=[string]$s.Status;Subject=[string]$s.SignerCertificate.Subject}|ConvertTo-Json -Compress";
const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
  encoding: "utf8",
  windowsHide: true,
  env: { ...process.env, DESK_SLUGGER_SIGNATURE_TARGET: executable }
});
if (result.error || result.status !== 0) {
  console.error(result.error?.message || result.stderr || "Unable to verify Authenticode signature.");
  process.exit(1);
}

let signature;
try {
  signature = JSON.parse(String(result.stdout).replace(/^\uFEFF/, "").trim());
} catch {
  console.error(`Unexpected signature verification output: ${result.stdout}`);
  process.exit(1);
}
if (signature.Status !== "Valid") {
  console.error(`Invalid Authenticode signature: ${signature.Status}`);
  process.exit(1);
}
console.log(`Valid Authenticode signature: ${signature.Subject}`);
