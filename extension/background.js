// Fetches the private OPSQAI ICS feed and caches upcoming events locally.

const HORIZON_DAYS = 30;

function unfold(text) {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function parseIcsDate(value) {
  // Formats: 20260818T140000Z, 20260818T140000, 20260818
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0", s = "0", z] = m;
  const allDay = !m[4];
  const ms = z
    ? Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
    : new Date(+y, +mo - 1, +d, +h, +mi, +s).getTime();
  return { iso: new Date(ms).toISOString(), allDay };
}

function unescapeText(v) {
  return v.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseIcs(raw) {
  const lines = unfold(raw).split(/\r?\n/);
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) cur = {};
    else if (line.startsWith("END:VEVENT")) {
      if (cur?.start) events.push(cur);
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx);
      const value = line.slice(idx + 1);
      const name = key.split(";")[0].toUpperCase();
      if (name === "DTSTART") {
        const p = parseIcsDate(value);
        if (p) {
          cur.start = p.iso;
          cur.allDay = p.allDay;
        }
      } else if (name === "SUMMARY") cur.title = unescapeText(value);
      else if (name === "LOCATION") cur.location = unescapeText(value);
      else if (name === "CATEGORIES") cur.kind = unescapeText(value).toLowerCase();
    }
  }
  return events;
}

async function sync() {
  const { feedUrl } = await chrome.storage.local.get("feedUrl");
  if (!feedUrl) return { ok: false, error: "no-feed" };
  try {
    const res = await fetch(feedUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.text();
    const now = Date.now();
    const limit = now + HORIZON_DAYS * 86400000;
    const events = parseIcs(raw)
      .filter((e) => {
        const t = new Date(e.start).getTime();
        return t >= now - 12 * 3600000 && t <= limit;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .map((e) => ({
        title: e.title || "Untitled",
        start: e.start,
        allDay: !!e.allDay,
        kind: e.kind || "",
        location: e.location || "",
      }));
    await chrome.storage.local.set({ events, updatedAt: new Date().toISOString(), error: null });
    return { ok: true, count: events.length };
  } catch (err) {
    await chrome.storage.local.set({ error: String(err && err.message ? err.message : err) });
    return { ok: false, error: String(err) };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("opsqai-sync", { periodInMinutes: 30 });
  sync();
});
chrome.runtime.onStartup.addListener(() => sync());
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === "opsqai-sync") sync();
});
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "sync") {
    sync().then(reply);
    return true;
  }
  if (msg?.type === "get") {
    chrome.storage.local.get(["events", "updatedAt", "feedUrl"]).then(reply);
    return true;
  }
  return false;
});
