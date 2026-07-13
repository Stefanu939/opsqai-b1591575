"use strict";
// OPSQAI Wizard — renderer logic. Runs in a sandboxed context; talks to
// the main process via window.opsqai (see preload.cjs).

const state = {
  step: 1,
  total: 10,
  installId: crypto.randomUUID(),
  data: {},
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// External links
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-external]");
  if (a) {
    e.preventDefault();
    window.opsqai.openExternal(a.dataset.external);
  }
});

// External-config toggles
$$('input[name="db-mode"]').forEach((r) =>
  r.addEventListener("change", () => {
    $("#db-external").hidden = r.value !== "external" || !r.checked;
  }),
);
$$('input[name="storage-mode"]').forEach((r) =>
  r.addEventListener("change", () => {
    $("#storage-s3").hidden = r.value !== "s3" || !r.checked;
  }),
);

$("#btn-cancel").addEventListener("click", () => window.opsqai.cancel());
$("#btn-back").addEventListener("click", () => goto(state.step - 1));
$("#btn-next").addEventListener("click", onNext);

function render() {
  $$(".pane").forEach((p) => (p.hidden = Number(p.dataset.pane) !== state.step));
  $$("#steps li").forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle("active", n === state.step);
    li.classList.toggle("done", n < state.step);
  });
  $("#btn-back").disabled = state.step === 1 || state.step === 10;
  const nextBtn = $("#btn-next");
  if (state.step === 9) {
    nextBtn.textContent = "Install";
    nextBtn.classList.add("btn-primary");
  } else if (state.step === 10) {
    nextBtn.textContent = "Finish";
    nextBtn.disabled = true;
  } else {
    nextBtn.textContent = "Next";
    nextBtn.disabled = false;
  }
}
function goto(step) {
  if (step < 1 || step > state.total) return;
  state.step = step;
  render();
}

// -------- Step validation ---------------------------------------------------
async function validate() {
  switch (state.step) {
    case 2:
      if (!$("#license-accept").checked) {
        alert("You must accept the license agreement to continue.");
        return false;
      }
      state.data.licenseAccepted = true;
      return true;
    case 4: {
      const name = $("#company-name").value.trim();
      const email = $("#company-email").value.trim();
      if (!name) {
        alert("Enter your company name.");
        return false;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        alert("Enter a valid contact email.");
        return false;
      }
      state.data.company = { name, contactEmail: email, timezone: $("#company-tz").value };
      return true;
    }
    case 5: {
      const email = $("#admin-email").value.trim();
      const p1 = $("#admin-password").value,
        p2 = $("#admin-password2").value;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        alert("Enter a valid admin email.");
        return false;
      }
      if (p1.length < 12) {
        alert("Admin password must be at least 12 characters.");
        return false;
      }
      if (p1 !== p2) {
        alert("Passwords do not match.");
        return false;
      }
      state.data.admin = { email, password: p1 };
      return true;
    }
    case 6: {
      const mode = document.querySelector('input[name="db-mode"]:checked').value;
      if (mode === "external") {
        const port = $("#db-port").value;
        const v = await window.opsqai.validatePort(port);
        if (!v.ok) {
          alert(v.error);
          return false;
        }
        const host = $("#db-host").value.trim();
        const dbName = $("#db-name").value.trim();
        const user = $("#db-user").value.trim();
        const pass = $("#db-pass").value;
        if (!host || !dbName || !user || !pass) {
          alert("Fill in all external database fields.");
          return false;
        }
        state.data.database = {
          mode: "external",
          external: { host, port: Number(port), database: dbName, username: user, password: pass },
        };
      } else {
        state.data.database = { mode: "embedded", embedded: { port: 55432 } };
      }
      return true;
    }
    case 7: {
      const mode = document.querySelector('input[name="storage-mode"]:checked').value;
      if (mode === "s3") {
        const endpoint = $("#s3-endpoint").value.trim();
        const bucket = $("#s3-bucket").value.trim();
        const key = $("#s3-key").value.trim();
        const secret = $("#s3-secret").value;
        if (!endpoint || !bucket || !key || !secret) {
          alert("Fill in all S3 fields.");
          return false;
        }
        state.data.storage = {
          mode: "s3",
          s3: {
            endpoint,
            region: $("#s3-region").value.trim(),
            bucket,
            accessKey: key,
            secretKey: secret,
          },
        };
      } else {
        state.data.storage = { mode: "local", local: {} };
      }
      return true;
    }
    case 8: {
      const provider = $("#ai-provider").value;
      const key = $("#ai-key").value.trim();
      state.data.ai =
        provider === "none" ? { provider: "none" } : { provider, apiKey: key || null };
      return true;
    }
    default:
      return true;
  }
}

function renderReview() {
  const d = state.data;
  const rows = [
    ["section", "Company"],
    ["Name", d.company?.name],
    ["Contact email", d.company?.contactEmail],
    ["Time zone", d.company?.timezone],
    ["section", "Administrator"],
    ["Email", d.admin?.email],
    ["Password", "••••••••"],
    ["section", "Database"],
    [
      "Mode",
      d.database?.mode === "embedded"
        ? "Embedded PostgreSQL 16"
        : `External (${d.database?.external?.host}:${d.database?.external?.port})`,
    ],
    ["section", "Storage"],
    ["Mode", d.storage?.mode === "local" ? "Local file system" : `S3 (${d.storage?.s3?.bucket})`],
    ["section", "AI provider"],
    ["Provider", d.ai?.provider === "none" ? "Not configured" : d.ai?.provider],
  ];
  $("#review").innerHTML = rows
    .map(([k, v]) =>
      k === "section"
        ? `<div class="section-title">${v}</div>`
        : `<div class="row"><span>${k}</span><strong>${v ?? "—"}</strong></div>`,
    )
    .join("");
}

// -------- Install -----------------------------------------------------------
async function runInstall() {
  const config = {
    installId: state.installId,
    company: state.data.company,
    admin: state.data.admin,
    database: state.data.database,
    storage: state.data.storage,
    ai: state.data.ai,
  };
  const log = $("#log");
  const bar = $("#progress-bar");
  bar.classList.add("indeterminate");

  window.opsqai.onInstallLog((line) => {
    log.textContent += line + "\n";
    log.scrollTop = log.scrollHeight;
    // Coarse progress hints
    if (line.includes("postgres ready")) setBar(30);
    else if (line.includes("running app migrations")) setBar(50);
    else if (line.includes("Caddy root CA trusted")) setBar(75);
    else if (line.includes("health OK")) setBar(95);
  });

  const res = await window.opsqai.install(config);
  bar.classList.remove("indeterminate");
  if (res.code === 0) {
    setBar(100);
    $("#install-title").textContent = "Installation complete";
    $("#finish").hidden = false;
    $("#btn-next").textContent = "Finish";
    $("#btn-next").disabled = false;
    $("#btn-next").onclick = () => window.opsqai.finish($("#launch-app").checked);
  } else {
    $("#install-title").textContent = `Installation failed (code ${res.code})`;
    $("#btn-cancel").textContent = "Close";
    $("#btn-cancel").onclick = () => window.close();
  }
}
function setBar(pct) {
  $("#progress-bar").style.width = pct + "%";
}

// -------- Navigation --------------------------------------------------------
async function onNext() {
  if (!(await validate())) return;
  if (state.step === 9) {
    goto(10);
    await runInstall();
    return;
  }
  goto(state.step + 1);
  if (state.step === 9) renderReview();
}

render();
