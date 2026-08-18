// Injects a collapsible OPSQAI agenda panel into Gmail / Outlook Web.

(function () {
  if (window.__opsqaiCompanion) return;
  window.__opsqaiCompanion = true;

  const root = document.createElement("div");
  root.id = "opsqai-companion";
  root.innerHTML = `
    <button class="oq-toggle" title="OPSQAI agenda">OQ</button>
    <section class="oq-panel" hidden>
      <header class="oq-head">
        <span class="oq-title">OPSQAI Agenda</span>
        <button class="oq-refresh" title="Refresh">↻</button>
        <button class="oq-close" title="Close">×</button>
      </header>
      <div class="oq-body"><p class="oq-muted">Loading…</p></div>
    </section>`;
  document.documentElement.appendChild(root);

  const panel = root.querySelector(".oq-panel");
  const body = root.querySelector(".oq-body");

  function fmt(e) {
    const d = new Date(e.start);
    return e.allDay
      ? d.toLocaleDateString()
      : d.toLocaleString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
  }

  function paint(state) {
    body.textContent = "";
    if (!state?.feedUrl) {
      const p = document.createElement("p");
      p.className = "oq-muted";
      p.textContent = "Open the extension popup and paste your OPSQAI calendar link.";
      body.appendChild(p);
      return;
    }
    const events = (state.events || []).slice(0, 12);
    if (!events.length) {
      const p = document.createElement("p");
      p.className = "oq-muted";
      p.textContent = "Nothing scheduled in the next 30 days.";
      body.appendChild(p);
      return;
    }
    for (const e of events) {
      const item = document.createElement("div");
      item.className = "oq-item";
      const when = document.createElement("div");
      when.className = "oq-when";
      when.textContent = fmt(e);
      const what = document.createElement("div");
      what.className = "oq-what";
      what.textContent = e.title;
      item.append(when, what);
      body.appendChild(item);
    }
  }

  async function load() {
    try {
      paint(await chrome.runtime.sendMessage({ type: "get" }));
    } catch {
      /* extension context invalidated — ignore */
    }
  }

  root.querySelector(".oq-toggle").addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) load();
  });
  root.querySelector(".oq-close").addEventListener("click", () => {
    panel.hidden = true;
  });
  root.querySelector(".oq-refresh").addEventListener("click", async () => {
    body.innerHTML = '<p class="oq-muted">Syncing…</p>';
    try {
      await chrome.runtime.sendMessage({ type: "sync" });
    } catch {
      /* ignore */
    }
    load();
  });
})();
