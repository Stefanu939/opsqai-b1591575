// OpsqaiUpdater — polls the signed manifest at cfg.updates.manifestUrl.
// Phase 2: verification + apply logic is stubbed. Phase 4 fills it in
// using the same Ed25519 primitive as the license verifier (separate key).

'use strict';
const https = require('https');
const { loadConfig } = require('../common/config');

const cfg = loadConfig();
const POLL_MS = 6 * 60 * 60 * 1000; // 6h

function pollOnce() {
  https.get(cfg.updates.manifestUrl, (res) => {
    let body = '';
    res.on('data', (c) => body += c);
    res.on('end', () => console.log(`[updater] manifest ${res.statusCode} (${body.length} bytes)`));
  }).on('error', (e) => console.log(`[updater] fetch error: ${e.message}`));
}

pollOnce();
setInterval(pollOnce, POLL_MS);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(0));
