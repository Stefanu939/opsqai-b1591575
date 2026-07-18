"use strict";
// OPSQAI Wizard — renderer logic (Phase A restyle).
// Talks to the main process via window.opsqai (see preload.cjs).
//
// Step order (approved in .lovable/product-polish/01-installer-ux-wireframes.md):
//   1 Welcome · 2 License · 3 System · 4 Options · 5 Database
//   6 Admin · 7 Review · 8 Install · 9 Finish
//
// The IPC contract in main.cjs is unchanged; storage/AI/SMTP now default
// to sensible values and are configured post-install from Admin.

const HERO_STEPS = new Set([1, 9]);
const TOTAL = 9;
function makeUuid() {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch (_) {}
  // RFC4122-ish fallback so a missing secure-context crypto never blanks the UI.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
const state = {
  step: 1,
  installId: makeUuid(),
  data: {
    licenseValidated: false,
    licenseCommunity: false,
    systemChecksPassed: false,
    dbConnectionTested: false,
  },
};

// Global error surface — if anything below throws, the operator sees it
// instead of a black window with no clue what happened.
window.addEventListener("error", (e) => {
  const msg = `Wizard error: ${e.message}\n${e.filename}:${e.lineno}:${e.colno}`;
  console.error(msg, e.error);
  try {
    const pre = document.createElement("pre");
    pre.style.cssText =
      "position:fixed;inset:0;margin:0;padding:24px;background:#0f172a;color:#f5f7fa;font:12px/1.5 monospace;white-space:pre-wrap;z-index:99999;overflow:auto;";
    pre.textContent = msg + "\n\n" + (e.error?.stack || "");
    document.body.appendChild(pre);
  } catch (_) {}
});

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ── External links ─────────────────────────────────────────────────
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-external]");
  if (a) { e.preventDefault(); window.opsqai.openExternal(a.dataset.external); }
});

// ── Welcome CTA ────────────────────────────────────────────────────
$("#btn-start").addEventListener("click", () => goto(2));

// ── License step ───────────────────────────────────────────────────
$("#btn-license-load").addEventListener("click", async () => {
  const r = await window.opsqai.pickLicenseFile();
  if (r.cancelled) return;
  if (!r.ok) { setLicenseStatus(r.error || "Could not read file", "err"); return; }
  $("#license-key").value = r.contents;
  await checkLicense();
});
$("#btn-license-check").addEventListener("click", checkLicense);
$("#license-community").addEventListener("change", (e) => {
  state.data.licenseCommunity = e.target.checked;
  if (e.target.checked) {
    $("#license-key").value = "";
    $("#license-claims").hidden = true;
    state.data.licenseValidated = false;
    state.data.license = null;
    setLicenseStatus("Community mode selected", "info");
  } else {
    setLicenseStatus("", null);
  }
  updateNextButton();
});
$("#license-key").addEventListener("input", () => {
  state.data.licenseValidated = false;
  $("#license-claims").hidden = true;
  setLicenseStatus("", null);
  updateNextButton();
});

async function checkLicense() {
  const contents = $("#license-key").value.trim();
  if (!contents) { setLicenseStatus("Enter a license key or select Community mode", "err"); return; }
  setLicenseStatus("Validating…", "info");
  const r = await window.opsqai.validateLicense(contents);
  if (!r.ok) {
    setLicenseStatus(r.error || "License is not valid", "err");
    state.data.licenseValidated = false;
    $("#license-claims").hidden = true;
    updateNextButton();
    return;
  }
  const c = r.claims;
  setLicenseStatus("License valid", "ok");
  $("#license-claims").hidden = false;
  $("#claims-grid").innerHTML = [
    ["Company", c.customer ?? "—"],
    ["Edition", c.edition ?? "Community"],
    ["Seats", c.seats ?? "—"],
    ["Modules", c.modules?.length ? c.modules.join(", ") : "—"],
    ["Expires", c.exp ? new Date(c.exp * 1000).toLocaleDateString() : "—"],
    ["Status", "Active"],
  ].map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(String(v))}</dd>`).join("");
  state.data.license = { contents, claims: c };
  state.data.licenseValidated = true;
  state.data.licenseCommunity = false;
  $("#license-community").checked = false;
  updateNextButton();
}
function setLicenseStatus(msg, kind) {
  const el = $("#license-status");
  if (!msg) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = msg;
  el.className = "status-pill " + (kind || "info");
}

// ── System checks (Phase B: real IPC probes on the target machine) ──
const CHECK_ORDER = [
  ["windows", "Windows 10 / 11 or Server 2019+"],
  ["cpu", "CPU architecture"],
  ["ram", "Memory (min 8 GB)"],
  ["disk", "Disk space (min 20 GB free)"],
  ["dotnet", ".NET 8 runtime"],
  ["postgres", "PostgreSQL 16 available"],
  ["ports", "Ports 443, 5432, 55432 free"],
  ["admin", "Administrator privileges"],
];
async function runSystemChecks() {
  state.data.systemChecksPassed = false;
  $("#checks-summary").textContent = "";
  updateNextButton();
  // Show spinner state up-front.
  for (const [id] of CHECK_ORDER) {
    const li = document.querySelector(`.checks li[data-check="${id}"]`);
    if (!li) continue;
    li.setAttribute("data-state", "check");
    li.querySelector("em").textContent = "Checking…";
  }
  let payload;
  try {
    payload = await window.opsqai.runSystemChecks();
  } catch (e) {
    $("#checks-summary").textContent = "System check failed: " + (e?.message || e);
    return;
  }
  const results = payload?.results || {};
  for (const [id] of CHECK_ORDER) {
    const li = document.querySelector(`.checks li[data-check="${id}"]`);
    if (!li) continue;
    const r = results[id] || { ok: false, detail: "No result" };
    li.setAttribute("data-state", r.ok ? "ok" : "err");
    li.querySelector("em").textContent = r.detail;
  }
  state.data.systemChecksPassed = !!payload?.ok;
  $("#checks-summary").textContent = payload?.ok
    ? "All checks passed."
    : "Fix the highlighted items before continuing.";
  updateNextButton();
}
$("#btn-rerun-checks").addEventListener("click", runSystemChecks);
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }


// ── Options step ───────────────────────────────────────────────────
// (Phase A: paths read-only; toggles persisted to state for Phase B.)

// ── Database step ──────────────────────────────────────────────────
$$('input[name="db-mode"]').forEach((r) =>
  r.addEventListener("change", () => {
    const external = r.value === "external" && r.checked;
    $("#db-external").hidden = !external;
    state.data.dbConnectionTested = !external; // embedded needs no test
    updateNextButton();
  }),
);
$$('input[name="db-mode"], #db-host, #db-port, #db-name, #db-user, #db-pass').forEach((el) => {
  el?.addEventListener("input", () => {
    state.data.dbConnectionTested = false;
    setDbStatus("", null);
    updateNextButton();
  });
});
$("#btn-db-test").addEventListener("click", async () => {
  setDbStatus("Testing…", "info");
  const host = $("#db-host").value.trim();
  const port = Number($("#db-port").value);
  const database = $("#db-name").value.trim();
  const user = $("#db-user").value.trim();
  const password = $("#db-pass").value;
  if (!host || !port || !database || !user || !password) {
    setDbStatus("Fill in all fields first", "err");
    return;
  }
  const r = await window.opsqai.testDatabase({ host, port, database, user, password });
  if (!r?.ok) {
    setDbStatus(r?.error || "Connection failed", "err");
    state.data.dbConnectionTested = false;
    updateNextButton();
    return;
  }
  setDbStatus("Connected · " + (r.version || "ok"), "ok");
  state.data.dbConnectionTested = true;
  updateNextButton();
});

function setDbStatus(msg, kind) {
  const el = $("#db-status");
  if (!msg) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = msg;
  el.className = "status-pill " + (kind || "info");
}

// ── Admin step: password strength ──────────────────────────────────
$("#admin-password").addEventListener("input", updatePwStrength);
$("#admin-password2").addEventListener("input", updateNextButton);
$("#admin-email").addEventListener("input", updateNextButton);
$("#admin-name").addEventListener("input", updateNextButton);

function pwScore(p) {
  const rules = {
    len: p.length >= 12,
    case: /[a-z]/.test(p) && /[A-Z]/.test(p),
    num: /\d/.test(p),
    sym: /[^A-Za-z0-9]/.test(p),
  };
  const score = Object.values(rules).filter(Boolean).length;
  return { rules, score };
}
function updatePwStrength() {
  const p = $("#admin-password").value;
  const { rules, score } = pwScore(p);
  $$("#pw-rules li").forEach((li) => li.classList.toggle("ok", rules[li.dataset.rule]));
  const fill = $("#pw-fill");
  fill.setAttribute("data-level", p ? String(Math.max(1, score)) : "0");
  const labels = ["—", "Very weak", "Weak", "Good", "Strong"];
  $("#pw-label").textContent = p ? labels[score] : "—";
  updateNextButton();
}

// ── Navigation ─────────────────────────────────────────────────────
$("#btn-cancel").addEventListener("click", () => window.opsqai.cancel());
$("#btn-back").addEventListener("click", () => goto(state.step - 1));
$("#btn-next").addEventListener("click", onNext);

function render() {
  document.getElementById("wizard").classList.toggle("hero-mode", HERO_STEPS.has(state.step));
  $$(".pane").forEach((p) => (p.hidden = Number(p.dataset.pane) !== state.step));
  $$("#steps li").forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle("active", n === state.step);
    li.classList.toggle("done", n < state.step);
  });
  const backBtn = $("#btn-back");
  const nextBtn = $("#btn-next");
  backBtn.disabled = state.step <= 2 || state.step >= 8;
  if (state.step === 7) nextBtn.textContent = "Install";
  else if (state.step === 8) nextBtn.textContent = "Please wait…";
  else nextBtn.textContent = "Next";
  updateNextButton();
}
function goto(step) {
  if (step < 1 || step > TOTAL) return;
  state.step = step;
  render();
  if (step === 3) runSystemChecks();
  if (step === 7) renderReview();
}

function updateNextButton() {
  const n = $("#btn-next");
  n.disabled = !isStepValid();
}
function isStepValid() {
  switch (state.step) {
    case 2:
      return state.data.licenseValidated || state.data.licenseCommunity;
    case 3:
      return state.data.systemChecksPassed;
    case 4:
      return true;
    case 5: {
      const mode = document.querySelector('input[name="db-mode"]:checked')?.value;
      if (mode === "external") return state.data.dbConnectionTested;
      return true;
    }
    case 6: {
      const name = $("#admin-name").value.trim();
      const email = $("#admin-email").value.trim();
      const p1 = $("#admin-password").value;
      const p2 = $("#admin-password2").value;
      const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
      const { score } = pwScore(p1);
      return !!name && emailOk && score === 4 && p1 === p2;
    }
    case 7:
      return true;
    default:
      return true;
  }
}

// ── Review pane ────────────────────────────────────────────────────
function renderReview() {
  buildConfig();
  const d = state.data;
  const dbLine = d.database.mode === "embedded"
    ? "Bundled PostgreSQL 16"
    : `External · ${d.database.external.host}:${d.database.external.port}`;
  const licLine = d.licenseCommunity
    ? "Community edition"
    : `${d.license?.claims?.customer ?? "—"} · ${d.license?.claims?.edition ?? "—"} · ${d.license?.claims?.seats ?? "—"} seats`;
  const rows = [
    ["section", "License"],
    ["Edition", licLine],
    ["section", "Installation"],
    ["Install folder", d.options.installDir],
    ["Data folder", d.options.dataDir],
    ["Desktop shortcut", d.options.desktopShortcut ? "Yes" : "No"],
    ["Start with Windows", d.options.autostart ? "Yes" : "No"],
    ["section", "Database"],
    ["Mode", dbLine],
    ["section", "Administrator"],
    ["Name", d.admin.name || "—"],
    ["Email", d.admin.email],
    ["Password", "••••••••••••"],
  ];
  $("#review").innerHTML = rows
    .map(([k, v]) =>
      k === "section"
        ? `<div class="section-title">${v}</div>`
        : `<div class="row"><span>${k}</span><strong>${escapeHtml(String(v ?? "—"))}</strong></div>`,
    )
    .join("");
}

function buildConfig() {
  const dbMode = document.querySelector('input[name="db-mode"]:checked')?.value || "embedded";
  state.data.options = {
    installDir: $("#opt-install-dir").value,
    dataDir: $("#opt-data-dir").value,
    desktopShortcut: $("#opt-desktop").checked,
    startMenu: $("#opt-startmenu").checked,
    autostart: $("#opt-autostart").checked,
  };
  state.data.database = dbMode === "external"
    ? {
        mode: "external",
        external: {
          host: $("#db-host").value.trim(),
          port: Number($("#db-port").value),
          database: $("#db-name").value.trim(),
          username: $("#db-user").value.trim(),
          password: $("#db-pass").value,
        },
      }
    : { mode: "embedded", embedded: { port: 55432 } };
  state.data.admin = {
    name: $("#admin-name").value.trim(),
    email: $("#admin-email").value.trim(),
    password: $("#admin-password").value,
  };
}

// ── Install (Step 8) ───────────────────────────────────────────────
const STAGE_MARKERS = [
  { stage: "prepare",  match: /Launching bootstrap|preparing/i,       pct: 8  },
  { stage: "postgres", match: /postgres|initdb|pg_ctl/i,              pct: 22 },
  { stage: "services", match: /installing services|winsw|nssm/i,      pct: 40 },
  { stage: "migrate",  match: /running app migrations|migrate|admin seeded/i, pct: 62 },
  { stage: "ai",       match: /ai engine|embeddings|model/i,          pct: 76 },
  { stage: "kb",       match: /knowledge|storage bucket|kb ready/i,   pct: 88 },
  { stage: "finalize", match: /health OK|Caddy root|finalizing/i,     pct: 96 },
];
let currentStageIdx = -1;

async function onNext() {
  if (!isStepValid()) return;
  if (state.step === 7) { goto(8); await runInstall(); return; }
  goto(state.step + 1);
}

async function runInstall() {
  buildConfig();
  $("#btn-cancel").disabled = true;
  $("#btn-next").disabled = true;
  markStage(0, "run");

  // Build the IPC config. Storage/AI/SMTP get sensible defaults; the
  // admin console configures them post-install. IPC contract unchanged.
  const config = {
    installId: state.installId,
    company: {
      name: state.data.license?.claims?.customer || deriveCompany(state.data.admin.email),
      contactEmail: state.data.admin.email,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin",
    },
    admin: state.data.admin,
    database: state.data.database,
    storage: { mode: "local", local: {} },
    ai: { provider: "none" },
    license: state.data.license || null,
    smtp: null,
  };

  const log = $("#log");
  const bar = $("#progress-bar");
  bar.classList.add("indeterminate");

  window.opsqai.onInstallLog((line) => {
    log.textContent += line + "\n";
    log.scrollTop = log.scrollHeight;
    for (let i = 0; i < STAGE_MARKERS.length; i++) {
      if (STAGE_MARKERS[i].match.test(line) && i > currentStageIdx) {
        for (let j = 0; j <= i - 1; j++) markStage(j, "done");
        markStage(i, "run");
        setPct(STAGE_MARKERS[i].pct);
        currentStageIdx = i;
      }
    }
  });

  const res = await window.opsqai.install(config);
  bar.classList.remove("indeterminate");

  if (res.code === 0) {
    for (let i = 0; i < STAGE_MARKERS.length; i++) markStage(i, "done");
    setPct(100);
    await sleep(400);
    goto(9);
    wireFinish();
  } else {
    if (currentStageIdx >= 0) markStage(currentStageIdx, "err");
    $("#install-title").textContent = `Installation failed (code ${res.code})`;
    $("#install-sub").textContent = "Review the log below and contact support if needed.";
    $("#log").hidden = false;
    $("#btn-cancel").disabled = false;
    $("#btn-cancel").textContent = "Close";
    $("#btn-cancel").onclick = () => window.close();
  }
}
function markStage(idx, s) {
  const li = document.querySelector(`.stages li[data-stage="${STAGE_MARKERS[idx].stage}"]`);
  if (li) li.setAttribute("data-state", s);
}
function setPct(p) {
  $("#progress-bar").classList.remove("indeterminate");
  $("#progress-bar").style.width = p + "%";
  $("#progress-pct").textContent = p + "%";
}
$("#btn-toggle-log").addEventListener("click", () => {
  const log = $("#log");
  log.hidden = !log.hidden;
  $("#btn-toggle-log").textContent = log.hidden ? "Show detailed log" : "Hide detailed log";
});

function deriveCompany(email) {
  const domain = String(email || "").split("@")[1] || "OPSQAI";
  return domain.split(".")[0].replace(/^\w/, (c) => c.toUpperCase());
}

// ── Finish (Step 9) ────────────────────────────────────────────────
function wireFinish() {
  $("#btn-finish").onclick = () => window.opsqai.finish($("#launch-app").checked);
  $("#btn-open-folder").onclick = () => window.opsqai.openExternal("file:///C:/Program%20Files/OPSQAI");
  $("#btn-view-logs").onclick = () => window.opsqai.openExternal("file:///C:/ProgramData/OPSQAI/logs");
}

// ── Utils ──────────────────────────────────────────────────────────
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ── Keyboard nav ───────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.step < 8) window.opsqai.cancel();
  if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
    if (state.step === 1) { $("#btn-start").click(); return; }
    if (state.step < TOTAL && isStepValid() && state.step !== 8) $("#btn-next").click();
  }
});

// ── Init ───────────────────────────────────────────────────────────
render();
