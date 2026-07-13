// OpsqaiWorker — background jobs runner. Phase 2 stub keeps the service
// registered and healthy; Phase 4 wires it to the app's job queue.

'use strict';
const { loadConfig } = require('../common/config');
loadConfig(); // fail fast if config missing

const HEARTBEAT_MS = 30_000;
setInterval(() => console.log(`[worker] heartbeat ${new Date().toISOString()}`), HEARTBEAT_MS);
console.log('[worker] started');

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(0));
