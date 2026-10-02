"use strict";
// Remote access for workstations in other locations — no VPN, no OPSQAI relay.
//
// When the administrator enables "Allow computers from other locations" in
// the app, the app writes %ProgramData%\OPSQAI\config\remote.json with
// { enabled: true, externalPort, hostname? }. This loop (running as the
// platform service) then:
//   1. asks the office router via UPnP to forward externalPort → local 443,
//   2. reads the router's public IP (from the router itself, no web service),
//   3. opens a Windows firewall rule for that port from any address,
//   4. writes the result back into remote.json (status, publicIp, error).
// Data always flows directly between the company's own computers.
// Disabling removes the router mapping and the firewall rule.

const dgram = require("dgram");
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

const CFG = path.join(process.env.ProgramData || "C:\\ProgramData", "OPSQAI", "config", "remote.json");
const RULE = "OPSQAI Remote workstations (HTTPS)";
const SERVICES = [
  "urn:schemas-upnp-org:service:WANIPConnection:2",
  "urn:schemas-upnp-org:service:WANIPConnection:1",
  "urn:schemas-upnp-org:service:WANPPPConnection:1",
];

function read() {
  try {
    return JSON.parse(fs.readFileSync(CFG, "utf8"));
  } catch {
    return null;
  }
}
function write(patch) {
  const cur = read() || {};
  const next = { ...cur, ...patch, checkedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(CFG), { recursive: true });
  fs.writeFileSync(CFG, JSON.stringify(next, null, 2));
}

function isPrivate(ip) {
  const m = /^(\d+)\.(\d+)\./.exec(ip || "");
  if (!m) return true;
  const a = +m[1], b = +m[2];
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a === 0;
}

function discoverGateway() {
  return new Promise((resolve) => {
    const sock = dgram.createSocket("udp4");
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      try { sock.close(); } catch {}
      resolve(v);
    };
    sock.on("message", (msg) => {
      const loc = /^location:\s*(.+)$/im.exec(String(msg));
      if (loc) finish(loc[1].trim());
    });
    sock.on("error", () => finish(null));
    sock.bind(0, () => {
      for (const st of ["urn:schemas-upnp-org:device:InternetGatewayDevice:1", "urn:schemas-upnp-org:device:InternetGatewayDevice:2"]) {
        const q = Buffer.from(
          `M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: ${st}\r\n\r\n`,
        );
        sock.send(q, 1900, "239.255.255.250");
      }
    });
    setTimeout(() => finish(null), 4000);
  });
}

function httpReq(url, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method, headers, timeout: 6000 }, (res) => {
      let buf = "";
      res.on("data", (c) => (buf += c));
      res.on("end", () => resolve({ status: res.statusCode, body: buf, localAddress: req.socket && req.socket.localAddress }));
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function findControl(location) {
  const r = await httpReq(location);
  for (const st of SERVICES) {
    const i = r.body.indexOf(st);
    if (i < 0) continue;
    const ctl = /<controlURL>([^<]+)<\/controlURL>/i.exec(r.body.slice(i));
    if (ctl) return { url: new URL(ctl[1], location).toString(), st, localAddress: r.localAddress };
  }
  return null;
}

async function soap(ctl, action, args) {
  const inner = Object.entries(args).map(([k, v]) => `<${k}>${v}</${k}>`).join("");
  const body =
    `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">` +
    `<s:Body><u:${action} xmlns:u="${ctl.st}">${inner}</u:${action}></s:Body></s:Envelope>`;
  const r = await httpReq(ctl.url, {
    method: "POST",
    headers: { "Content-Type": 'text/xml; charset="utf-8"', SOAPAction: `"${ctl.st}#${action}"`, "Content-Length": Buffer.byteLength(body) },
    body,
  });
  if (r.status !== 200) {
    const code = /<errorCode>(\d+)<\/errorCode>/.exec(r.body);
    throw new Error(`router refused ${action}${code ? ` (UPnP ${code[1]})` : ` (HTTP ${r.status})`}`);
  }
  return r.body;
}

function netsh(args) {
  return new Promise((resolve) => execFile("netsh", args, { windowsHide: true }, () => resolve()));
}
async function firewall(port, on) {
  await netsh(["advfirewall", "firewall", "delete", "rule", `name=${RULE}`]);
  if (on) {
    await netsh(["advfirewall", "firewall", "add", "rule", `name=${RULE}`, "dir=in", "action=allow", "protocol=TCP", `localport=443`, "profile=any", "remoteip=any"]);
  }
}

let lastMapped = null; // { ctl, port }

async function tick() {
  const cfg = read();
  const port = Number(cfg && cfg.externalPort) || 44300;
  if (!cfg || !cfg.enabled) {
    if (lastMapped) {
      try { await soap(lastMapped.ctl, "DeletePortMapping", { NewRemoteHost: "", NewExternalPort: lastMapped.port, NewProtocol: "TCP" }); } catch {}
      await firewall(0, false);
      lastMapped = null;
      write({ status: "off", publicIp: null, error: null });
    }
    return;
  }
  try {
    const loc = await discoverGateway();
    if (!loc) throw Object.assign(new Error("no_upnp"), { code: "no_upnp" });
    const ctl = await findControl(loc);
    if (!ctl) throw Object.assign(new Error("no_upnp"), { code: "no_upnp" });
    const localIp = ctl.localAddress || Object.values(os.networkInterfaces()).flat().find((a) => a && a.family === "IPv4" && !a.internal)?.address;
    // Lease 2h, renewed every 10 min; routers that reject leases get 0 (permanent).
    const args = {
      NewRemoteHost: "",
      NewExternalPort: port,
      NewProtocol: "TCP",
      NewInternalPort: 443,
      NewInternalClient: localIp,
      NewEnabled: 1,
      NewPortMappingDescription: "OPSQAI workstations",
      NewLeaseDuration: 7200,
    };
    try {
      await soap(ctl, "AddPortMapping", args);
    } catch {
      await soap(ctl, "AddPortMapping", { ...args, NewLeaseDuration: 0 });
    }
    lastMapped = { ctl, port };
    const ipXml = await soap(ctl, "GetExternalIPAddress", {});
    const publicIp = (/<NewExternalIPAddress>([^<]*)</i.exec(ipXml) || [])[1] || null;
    await firewall(port, true);
    if (!publicIp || isPrivate(publicIp)) {
      // The internet provider puts the office behind its own NAT (CGNAT):
      // nothing on the office router can make it reachable from outside.
      write({ status: "cgnat", publicIp, port, error: "provider_nat" });
    } else {
      write({ status: "ready", publicIp, port, localIp, error: null });
    }
  } catch (e) {
    write({ status: "router_manual", port, error: e.code || String(e.message || e), localIp: Object.values(os.networkInterfaces()).flat().find((a) => a && a.family === "IPv4" && !a.internal)?.address || null });
    // The admin may forward the port by hand; keep the firewall open for it.
    await firewall(port, true);
  }
}

function start() {
  const run = () => tick().catch((e) => console.error(`[remote] ${e && e.message}`));
  run();
  setInterval(run, 10 * 60 * 1000);
  // React quickly when the admin toggles the setting.
  let last = "";
  setInterval(() => {
    const c = read();
    const sig = c ? `${c.enabled}:${c.externalPort}:${c.requestedAt || ""}` : "";
    if (sig !== last) {
      last = sig;
      run();
    }
  }, 5000);
}

module.exports = { start };
