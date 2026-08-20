"use strict";

const certificate = process.env.CSC_LINK || process.env.WIN_CSC_LINK || process.env.CSC_NAME;
if (!certificate) {
  console.error("Signed build requires CSC_LINK (PFX path/base64/URL) and CSC_KEY_PASSWORD, or CSC_NAME for a certificate installed in the Windows certificate store.");
  process.exit(1);
}

console.log("Code-signing certificate configuration detected.");
