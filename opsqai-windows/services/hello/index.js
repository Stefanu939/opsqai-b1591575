// Phase 1 smoke-test service.
// Confirms: bundled Node runs, WinSW auto-restart works, Event Log receives
// output, logs rotate under %ProgramData%\OPSQAI\logs.
//
// Real services replace this file in Phase 2+.

'use strict';

const http = require('http');
const os = require('os');

const PORT = Number(process.env.OPSQAI_HELLO_PORT || 17650);
const started = new Date();

function log(msg) {
  // WinSW captures stdout/stderr into log files and Event Log.
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      service: 'OpsqaiHello',
      host: os.hostname(),
      pid: process.pid,
      uptimeSec: Math.round((Date.now() - started.getTime()) / 1000),
    }));
    return;
  }
  res.writeHead(404); res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  log(`OpsqaiHello listening on 127.0.0.1:${PORT}`);
});

for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    log(`Received ${sig}, shutting down.`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  });
}

process.on('uncaughtException', (err) => {
  log(`uncaughtException: ${err.stack || err}`);
  process.exit(1); // WinSW will restart per onfailure policy
});
