// Offline signing helper. Usage:
//   node sign-manifest.js --in manifest.unsigned.json --key priv.pem --out manifest.json
//
// The signer canonicalises the JSON exactly like the on-device verifier
// (see services/updater/index.js -> canonicalize()) and produces an
// Ed25519 signature encoded as base64.

"use strict";
const fs = require("fs");
const crypto = require("crypto");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) throw new Error(`missing --${name}`);
  return process.argv[i + 1];
}
function canonicalize(v) {
  if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
  if (v && typeof v === "object") {
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonicalize(v[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(v);
}

const doc = JSON.parse(fs.readFileSync(arg("in"), "utf8"));
delete doc.signature;
const priv = crypto.createPrivateKey(fs.readFileSync(arg("key"), "utf8"));
const sig = crypto.sign(null, Buffer.from(canonicalize(doc), "utf8"), priv);
doc.signature = sig.toString("base64");
fs.writeFileSync(arg("out"), JSON.stringify(doc, null, 2));
console.log(`signed -> ${arg("out")}`);
