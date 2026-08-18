const els = {
  setup: document.getElementById("setup"),
  feed: document.getElementById("feed"),
  save: document.getElementById("save"),
  list: document.getElementById("list"),
  empty: document.getElementById("empty"),
  status: document.getElementById("status"),
  refresh: document.getElementById("refresh"),
  forget: document.getElementById("forget"),
};

function fmt(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function render(events, feedUrl, updatedAt) {
  els.setup.hidden = Boolean(feedUrl);
  els.forget.hidden = !feedUrl;
  els.status.textContent = feedUrl
    ? updatedAt
      ? `Updated ${new Date(updatedAt).toLocaleTimeString()}`
      : "Connected"
    : "Not connected";
  els.list.textContent = "";
  const upcoming = (events || []).slice(0, 25);
  els.empty.hidden = !feedUrl || upcoming.length > 0;
  for (const e of upcoming) {
    const li = document.createElement("li");
    li.className = "item";
    const when = document.createElement("div");
    when.className = "when";
    when.textContent = e.allDay ? new Date(e.start).toLocaleDateString() : fmt(e.start);
    const what = document.createElement("div");
    what.className = "what";
    what.textContent = e.title;
    li.append(when, what);
    if (e.kind) {
      const k = document.createElement("span");
      k.className = "kind";
      k.textContent = e.kind;
      li.append(k);
    }
    els.list.append(li);
  }
}

async function load() {
  const state = await chrome.storage.local.get(["feedUrl", "events", "updatedAt"]);
  if (state.feedUrl) els.feed.value = state.feedUrl;
  render(state.events, state.feedUrl, state.updatedAt);
}

els.save.addEventListener("click", async () => {
  const feedUrl = els.feed.value.trim();
  if (!/^https?:\/\//i.test(feedUrl)) {
    els.status.textContent = "Enter a valid https link";
    return;
  }
  await chrome.storage.local.set({ feedUrl });
  els.status.textContent = "Syncing…";
  await chrome.runtime.sendMessage({ type: "sync" });
  await load();
});

els.refresh.addEventListener("click", async () => {
  els.status.textContent = "Syncing…";
  await chrome.runtime.sendMessage({ type: "sync" });
  await load();
});

els.forget.addEventListener("click", async () => {
  await chrome.storage.local.clear();
  els.feed.value = "";
  await load();
});

load();
