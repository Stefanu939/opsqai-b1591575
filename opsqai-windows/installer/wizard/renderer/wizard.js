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

// Some already-packaged Windows builds can contain the older shell-only
// index.html (`<div id="wizard"></div>`) while loading the newer imperative
// renderer. In that state the script runs, toggles `hero-mode`, then has no
// panes/buttons to bind, leaving a navy-black window. Keep the renderer
// self-contained: if the static markup is missing, rebuild it before binding.
const WIZARD_SHELL_HTML = String.raw`
  <!-- ─── Sidebar (hidden on Welcome + Finish) ─────────────────────── -->
  <aside class="sidebar" id="sidebar">
    <div class="brand">
      <div class="brand-mark">
        <span class="brand-mono">O</span><span class="brand-word">OPSQAI</span>
      </div>
      <div class="brand-sub">Self-Hosted · Setup</div>
    </div>
    <ol class="steps" id="steps">
      <li data-step="1"><span class="idx">1</span> Welcome</li>
      <li data-step="2"><span class="idx">2</span> License</li>
      <li data-step="3"><span class="idx">3</span> System check</li>
      <li data-step="4"><span class="idx">4</span> Options</li>
      <li data-step="5"><span class="idx">5</span> Database</li>
      <li data-step="6"><span class="idx">6</span> Administrator</li>
      <li data-step="7"><span class="idx">7</span> Review</li>
      <li data-step="8"><span class="idx">8</span> Install</li>
      <li data-step="9"><span class="idx">9</span> Finish</li>
    </ol>
    <div class="footer-brand">
      <span>© OPSQAI</span>
      <span class="build-tag">v1.0.0</span>
    </div>
  </aside>

  <!-- ─── Content ──────────────────────────────────────────────────── -->
  <main class="content">
    <!-- 1 · Welcome (full-bleed hero, no sidebar) -->
    <section class="pane pane-hero" data-pane="1">
      <div class="hero-inner">
        <div class="hero-mark">OPSQAI</div>
        <h1 class="hero-title">Self-Hosted</h1>
        <p class="hero-sub">The private AI operations platform for your organisation.</p>
        <div class="hero-meta">
          <span>Version 1.0.0</span>
          <span class="dot"></span>
          <span>Windows · Native</span>
          <span class="dot"></span>
          <span>~5 min setup</span>
        </div>
        <button class="btn btn-primary btn-lg" id="btn-start">Get Started</button>
        <p class="hero-legal">
          By continuing you accept the
          <a href="#" data-external="https://opsqai.de/legal/eula">OPSQAI License Agreement</a>.
        </p>
      </div>
    </section>

    <!-- 2 · License Activation -->
    <section class="pane" data-pane="2" hidden>
      <header class="pane-head">
        <h1>Activate your OPSQAI license</h1>
        <p class="lead">A valid license unlocks your edition, seats and modules. Nothing is installed until activation succeeds.</p>
      </header>

      <div class="form">
        <label>
          <span class="label-row">License key</span>
          <textarea id="license-key" rows="5" spellcheck="false" placeholder="OPSQAI-XXXX-XXXX-XXXX-XXXX  or paste the contents of your .opsqai file"></textarea>
        </label>

        <div class="row">
          <button type="button" class="btn" id="btn-license-load">Load from file…</button>
          <button type="button" class="btn btn-primary" id="btn-license-check">Validate</button>
          <span id="license-status" class="status-pill" hidden></span>
        </div>

        <div id="license-claims" class="claims-card" hidden>
          <div class="claims-title">
            <svg viewBox="0 0 20 20" class="ic-check" aria-hidden="true">
              <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>
            License valid
          </div>
          <div class="claims-grid" id="claims-grid"></div>
        </div>

        <div class="community-fallback">
          <label class="checkbox">
            <input type="checkbox" id="license-community" />
            <span>I don't have a license yet — continue in Community mode</span>
          </label>
          <p class="hint">Community mode enables core features for up to 3 users. You can activate a license later from Admin → License.</p>
        </div>
      </div>
    </section>

    <!-- 3 · System Check -->
    <section class="pane" data-pane="3" hidden>
      <header class="pane-head">
        <h1>System check</h1>
        <p class="lead">Verifying your Windows environment. Every item must pass to continue.</p>
      </header>

      <ul class="checks" id="system-checks">
        <li data-check="windows"><i></i><b>Windows 10 / 11 or Server 2019+</b><em></em></li>
        <li data-check="cpu"><i></i><b>CPU architecture</b><em></em></li>
        <li data-check="ram"><i></i><b>Memory (min 8 GB)</b><em></em></li>
        <li data-check="disk"><i></i><b>Disk space (min 20 GB free)</b><em></em></li>
        
        <li data-check="postgres"><i></i><b>PostgreSQL 16 available</b><em></em></li>
        <li data-check="ports"><i></i><b>Ports 443, 5432, 55432 free</b><em></em></li>
        <li data-check="admin"><i></i><b>Administrator privileges</b><em></em></li>
      </ul>

      <div class="row">
        <button type="button" class="btn" id="btn-rerun-checks">Re-run checks</button>
        <span id="checks-summary" class="hint"></span>
      </div>
    </section>

    <!-- 4 · Installation Options -->
    <section class="pane" data-pane="4" hidden>
      <header class="pane-head">
        <h1>Installation options</h1>
        <p class="lead">Where to install OPSQAI and how it should integrate with Windows.</p>
      </header>

      <div class="form">
        <label>
          <span class="label-row">Installation folder</span>
          <div class="path-row">
            <input id="opt-install-dir" value="C:\\Program Files\\OPSQAI" readonly />
            <button type="button" class="btn btn-ghost" disabled title="Fixed in this release">Browse…</button>
          </div>
        </label>

        <label>
          <span class="label-row">Data folder <em class="hint-inline">databases, backups, uploads</em></span>
          <div class="path-row">
            <input id="opt-data-dir" value="C:\\ProgramData\\OPSQAI" readonly />
            <button type="button" class="btn btn-ghost" disabled title="Fixed in this release">Browse…</button>
          </div>
          <p class="hint">Space required: <strong>~4.8 GB</strong> · Available: <strong id="opt-disk-free">—</strong></p>
        </label>

        <div class="opt-toggles">
          <label class="checkbox"><input type="checkbox" id="opt-desktop" checked /><span>Create Desktop shortcut</span></label>
          <label class="checkbox"><input type="checkbox" id="opt-startmenu" checked /><span>Add OPSQAI to Start Menu</span></label>
          <label class="checkbox"><input type="checkbox" id="opt-autostart" /><span>Start OPSQAI when Windows starts</span></label>
        </div>
      </div>
    </section>

    <!-- 5 · Database -->
    <section class="pane" data-pane="5" hidden>
      <header class="pane-head">
        <h1>Database</h1>
        <p class="lead">How should OPSQAI store your data?</p>
      </header>

      <div class="radio-cards">
        <label class="radio-card">
          <input type="radio" name="db-mode" value="embedded" checked />
          <div><strong>Recommended — bundled PostgreSQL 16</strong><p>Installed and managed by OPSQAI. Zero configuration. Best for most customers.</p></div>
        </label>
        <label class="radio-card">
          <input type="radio" name="db-mode" value="external" />
          <div><strong>Advanced — connect to my own PostgreSQL server</strong><p>For customers with a database team or an existing enterprise cluster.</p></div>
        </label>
      </div>

      <div class="form" id="db-external" hidden>
        <div class="grid-2">
          <label>Host<input id="db-host" placeholder="db.internal.acme" /></label>
          <label>Port<input id="db-port" type="number" value="5432" /></label>
        </div>
        <label>Database<input id="db-name" value="opsqai" /></label>
        <div class="grid-2">
          <label>Username<input id="db-user" placeholder="opsqai_app" /></label>
          <label>Password<input id="db-pass" type="password" /></label>
        </div>
        <div class="row">
          <button type="button" class="btn btn-primary" id="btn-db-test">Test connection</button>
          <span id="db-status" class="status-pill" hidden></span>
        </div>
      </div>
    </section>

    <!-- 6 · Administrator -->
    <section class="pane" data-pane="6" hidden>
      <header class="pane-head">
        <h1>Create the first administrator</h1>
        <p class="lead">This account has full access to OPSQAI. You can add more users after installation.</p>
      </header>

      <div class="form">
        <label>Full name<input id="admin-name" type="text" placeholder="Anna Weber" /></label>
        <label>Email<input id="admin-email" type="email" placeholder="anna@acme.de" /></label>
        <label>
          Password
          <input id="admin-password" type="password" placeholder="At least 12 characters" />
          <div class="pw-strength"><div class="pw-bar"><div id="pw-fill"></div></div><span id="pw-label" class="pw-label">—</span></div>
          <ul class="pw-rules" id="pw-rules">
            <li data-rule="len">12+ characters</li>
            <li data-rule="case">Upper &amp; lower case</li>
            <li data-rule="num">A number</li>
            <li data-rule="sym">A symbol</li>
          </ul>
        </label>
        <label>Confirm password<input id="admin-password2" type="password" /></label>
      </div>
    </section>

    <!-- 7 · Review -->
    <section class="pane" data-pane="7" hidden>
      <header class="pane-head">
        <h1>You're ready to install</h1>
        <p class="lead">Review your settings. Nothing has been installed yet. Installation takes about 3–5 minutes.</p>
      </header>
      <div class="review" id="review"></div>
    </section>

    <!-- 8 · Install progress -->
    <section class="pane" data-pane="8" hidden>
      <header class="pane-head">
        <h1 id="install-title">Installing OPSQAI…</h1>
        <p class="lead" id="install-sub">Please keep this window open until setup finishes.</p>
      </header>

      <ol class="stages" id="stages">
        <li data-stage="prepare"><span class="stage-dot"></span>Preparing installation</li>
        <li data-stage="postgres"><span class="stage-dot"></span>Installing bundled PostgreSQL</li>
        <li data-stage="services"><span class="stage-dot"></span>Installing OPSQAI services</li>
        <li data-stage="migrate"><span class="stage-dot"></span>Creating database &amp; applying migrations</li>
        <li data-stage="ai"><span class="stage-dot"></span>Initializing AI engine</li>
        <li data-stage="kb"><span class="stage-dot"></span>Creating knowledge storage</li>
        <li data-stage="finalize"><span class="stage-dot"></span>Finalizing installation</li>
      </ol>

      <div class="progress"><div class="progress-bar" id="progress-bar"></div></div>
      <div class="progress-meta">
        <span id="progress-pct">0%</span>
        <button type="button" class="btn-linky" id="btn-toggle-log">Show detailed log</button>
      </div>
      <pre id="log" class="log" hidden></pre>
    </section>

    <!-- 9 · Finish -->
    <section class="pane pane-hero" data-pane="9" hidden>
      <div class="hero-inner finish-inner">
        <div class="finish-check">
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M12 20l6 6 12-13" fill="none" stroke="currentColor" stroke-width="3" />
          </svg>
        </div>
        <h1 class="hero-title">OPSQAI is ready</h1>
        <p class="hero-sub">Your platform is installed and running.</p>

        <ul class="finish-grid">
          <li>License activated</li>
          <li>Database created</li>
          <li>Services installed</li>
          <li>AI engine online</li>
          <li>Knowledge base ready</li>
          <li>Administrator created</li>
        </ul>

        <label class="checkbox center"><input type="checkbox" id="launch-app" checked /><span>Launch OPSQAI now</span></label>

        <div class="finish-actions">
          <button class="btn" id="btn-open-folder">Open installation folder</button>
          <button class="btn" id="btn-view-logs">View logs</button>
          <button class="btn btn-primary" id="btn-finish">Launch OPSQAI</button>
        </div>
      </div>
    </section>

    <!-- ─── Footer actions (hidden on hero panes) ────────────────── -->
    <nav class="actions" id="actions">
      <button class="btn btn-ghost" id="btn-cancel">Cancel</button>
      <div class="spacer"></div>
      <button class="btn" id="btn-back">Back</button>
      <button class="btn btn-primary" id="btn-next">Next</button>
    </nav>
  </main>
`;

function ensureWizardShell() {
  let root = document.getElementById("wizard");
  if (!root) {
    root = document.createElement("div");
    root.id = "wizard";
    document.body.prepend(root);
  }
  if (document.getElementById("btn-start") && document.querySelector(".pane[data-pane='1']")) {
    return;
  }
  root.className = "wizard";
  root.innerHTML = WIZARD_SHELL_HTML;
}

ensureWizardShell();

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

// Per-session attempt tracking. Each entry: {code, sqlstate, file, line, logPath}.
const attempts = [];
let lastConfig = null;
let currentLogPath = null;
let lastFailure = null;

async function onNext() {
  if (!isStepValid()) return;
  if (state.step === 7) { goto(8); await runInstall(false); return; }
  goto(state.step + 1);
}

function parseFailLine(line) {
  const m = /\[(\w+)\]\s+FAIL\s+(.*)$/.exec(String(line || ""));
  if (!m) return null;
  const out = { component: m[1] };
  const re = /(\w+)=("(?:[^"\\]|\\.)*"|\S+)/g;
  let match;
  while ((match = re.exec(m[2])) !== null) {
    let v = match[2];
    if (v.startsWith('"') && v.endsWith('"')) {
      try { v = JSON.parse(v); } catch { v = v.slice(1, -1); }
    }
    out[match[1]] = v;
  }
  return out;
}

let installInFlight = false;

async function runInstall(withReset) {
  // Guard against double-clicks (Retry / Reset & Retry). The pasted log
  // showed every bootstrap line duplicated, which meant two concurrent
  // spawns of init.js. One at a time — always.
  if (installInFlight) return;
  installInFlight = true;
  buildConfig();
  $("#btn-cancel").disabled = true;
  $("#btn-next").disabled = true;

  // Reset install UI (in case this is a retry).
  document.querySelectorAll(".stages li").forEach((li) => li.removeAttribute("data-state"));
  currentStageIdx = -1;
  $("#install-title").textContent = "Installing OPSQAI…";
  $("#install-sub").textContent = "Please keep this window open until setup finishes.";
  const failCard = document.getElementById("fail-card");
  if (failCard) failCard.remove();
  markStage(0, "run");

  const config = lastConfig || {
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
  lastConfig = config;
  lastFailure = null;

  const log = $("#log");
  const bar = $("#progress-bar");
  bar.classList.add("indeterminate");

  window.opsqai.onInstallLog((line) => {
    log.textContent += line + "\n";
    log.scrollTop = log.scrollHeight;

    // Capture the per-install log path as it's announced.
    const m = /^\[bootstrap\]\s+log:\s+(.+)$/.exec(line.trim());
    if (m) currentLogPath = m[1];

    // Capture structured failures.
    const parsed = parseFailLine(line);
    if (parsed && (parsed.component === "bootstrap" || parsed.component === "migrate")) {
      lastFailure = parsed;
      if (parsed.log_path) currentLogPath = parsed.log_path;
    }

    for (let i = 0; i < STAGE_MARKERS.length; i++) {
      if (STAGE_MARKERS[i].match.test(line) && i > currentStageIdx) {
        for (let j = 0; j <= i - 1; j++) markStage(j, "done");
        markStage(i, "run");
        setPct(STAGE_MARKERS[i].pct);
        currentStageIdx = i;
      }
    }
  });

  let res;
  try {
    res = withReset
      ? await window.opsqai.resetAndInstall(config)
      : await window.opsqai.install(config);
  } finally {
    installInFlight = false;
  }
  bar.classList.remove("indeterminate");

  if (res.code === 0) {
    for (let i = 0; i < STAGE_MARKERS.length; i++) markStage(i, "done");
    setPct(100);
    await sleep(400);
    goto(9);
    wireFinish();
  } else {
    if (currentStageIdx >= 0) markStage(currentStageIdx, "err");
    renderFailureCard(res.code);
  }
}

function renderFailureCard(exitCode) {
  const f = lastFailure || { code: "OPSQAI-E1901", message: `bootstrap exit ${exitCode}` };
  attempts.push({
    code: f.code || "OPSQAI-E1901",
    sqlstate: f.sqlstate || "",
    file: f.file || "",
    line: f.line || "",
  });

  const dbMode = state.data.database?.mode || "embedded";
  const transient = /E1101|E1301/.test(f.code || "");
  const isPackaging = /E1902/.test(f.code || "");
  const sameSig = (() => {
    if (attempts.length < 2) return false;
    const a = attempts[attempts.length - 1];
    const b = attempts[attempts.length - 2];
    return a.code === b.code && a.sqlstate === b.sqlstate && a.file === b.file && a.line === b.line;
  })();

  $("#install-title").textContent = `Installation failed — ${f.code || "OPSQAI-E1901"}`;
  $("#install-sub").textContent = "Review the details below.";
  $("#log").hidden = false;

  const card = document.createElement("div");
  card.id = "fail-card";
  card.className = "fail-card";
  const rows = [
    ["Error", f.code || "OPSQAI-E1901"],
    f.file ? ["File", f.file] : null,
    f.line ? ["Line", f.line] : null,
    f.sqlstate ? ["SQLSTATE", f.sqlstate] : null,
    ["Reason", f.message || "(no details)"],
  ].filter(Boolean);
  const rowsHtml = rows
    .map(([k, v]) => `<div class="row"><span>${k}</span><strong>${escapeHtml(String(v))}</strong></div>`)
    .join("");

  const showReset = dbMode === "embedded" && !transient && !isPackaging;
  const banner = sameSig && showReset
    ? `<div class="fail-banner">Same error repeated (${escapeHtml(f.code)}${f.file ? ` at ${escapeHtml(String(f.file))}:${escapeHtml(String(f.line))}` : ""}). The embedded database is likely in a bad state — Reset embedded database & retry is recommended.</div>`
    : "";
  const resetHint = showReset
    ? `<p class="fail-hint">Resetting the embedded database only affects the bundled PostgreSQL instance. External PostgreSQL installations are never modified.</p>`
    : "";

  card.innerHTML = `
    ${banner}
    <div class="fail-rows">${rowsHtml}</div>
    ${resetHint}
    <div class="fail-actions">
      <button class="btn" id="fail-retry"${sameSig ? " disabled title=\"Same error repeated — retrying will not help\"" : ""}>Retry</button>
      ${showReset ? `<button class="btn btn-primary" id="fail-reset">Reset embedded database &amp; retry</button>` : ""}
      <button class="btn btn-ghost" id="fail-log">Open Log</button>
    </div>
  `;
  const pane = document.querySelector('.pane[data-pane="8"]');
  pane.appendChild(card);

  document.getElementById("fail-retry")?.addEventListener("click", () => runInstall(false));
  document.getElementById("fail-reset")?.addEventListener("click", () => runInstall(true));
  document.getElementById("fail-log")?.addEventListener("click", () => window.opsqai.openLog(currentLogPath));

  $("#btn-cancel").disabled = false;
  $("#btn-cancel").textContent = "Close";
  $("#btn-cancel").onclick = () => window.close();
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
  $("#btn-view-logs").onclick = () => window.opsqai.openLogsFolder();
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
