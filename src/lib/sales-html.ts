// Client-specific HTML One-Pager and Security sheet (print-ready, vector art).
// No prices: everything leads to the free 30-day pilot. Opened in a new tab;
// the user saves it as PDF via the browser print dialog (human action).
// Colours are the Midnight Command brand palette, embedded because the
// document is standalone (it does not load the app stylesheet).

export type HtmlDocInput = {
  company: string;
  contact?: string;
  sender?: string;
  industry?: string;
  pains?: string[];
  pilotGoal?: string;
  modules?: string[];
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,system-ui,sans-serif;background:#0B132B;color:#E8EAF6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:16mm 16mm 12mm;background:linear-gradient(160deg,#0B132B 0%,#131c3d 60%,#1c1240 100%);position:relative;overflow:hidden}
h1,h2,h3{font-family:'Space Grotesk',sans-serif}
h1{font-size:30px;line-height:1.1;margin:10px 0 8px}
h2{font-size:15px;color:#C9A7FF;text-transform:uppercase;letter-spacing:.12em;margin:18px 0 8px}
p,li{font-size:12.5px;line-height:1.55;color:#C8CCE0}
.eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#A78BFA}
.brand{display:flex;align-items:center;gap:8px;font-family:'Space Grotesk';font-weight:700;letter-spacing:.08em}
.grid{display:grid;gap:10px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}
.card{border:1px solid rgba(167,139,250,.28);background:rgba(255,255,255,.04);border-radius:12px;padding:12px}
.card h3{font-size:13.5px;margin:6px 0 4px;color:#fff}
.pill{display:inline-block;border:1px solid #7928CA;background:rgba(121,40,202,.25);color:#fff;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:600}
.hero{display:grid;grid-template-columns:1.3fr 1fr;gap:14px;align-items:center}
.cta{margin-top:16px;border-radius:14px;padding:14px 16px;background:linear-gradient(90deg,#7928CA,#4F46E5);color:#fff}
.cta p{color:#F3E8FF}
.foot{position:absolute;bottom:8mm;left:16mm;right:16mm;display:flex;justify-content:space-between;font-size:10px;color:#8A90B0}
ul{padding-left:16px}
.step{display:flex;gap:10px;align-items:flex-start}
.num{flex:none;width:24px;height:24px;border-radius:50%;background:#7928CA;color:#fff;font:700 12px 'Space Grotesk';display:grid;place-items:center}
.toolbar{position:fixed;top:12px;right:12px;z-index:9}
.toolbar button{font:600 13px Inter;background:#7928CA;color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}
@media print{.toolbar{display:none}body{background:#0B132B}@page{size:A4;margin:0}}
`;

const MARK = `<svg width="26" height="26" viewBox="0 0 32 32"><defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A78BFA"/><stop offset="1" stop-color="#7928CA"/></linearGradient></defs><path d="M16 2l12 7v14l-12 7-12-7V9z" fill="none" stroke="url(#m)" stroke-width="2.4"/><circle cx="16" cy="16" r="4.5" fill="url(#m)"/></svg>`;

const ICON = {
  doc: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.8"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h7M9 17h5"/></svg>`,
  people: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.6c2.6.1 4.6 1.8 5.3 4.6"/></svg>`,
  truck: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.8"><path d="M2 6h11v10H2zM13 9h4.5l3.5 3.5V16h-8"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/></svg>`,
  puzzle: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.8"><path d="M4 8h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4v-4a2 2 0 1 0 0-4z"/></svg>`,
  lock: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.8"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  log: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.8"><path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h4"/></svg>`,
  key: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.8"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/></svg>`,
  shield: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" stroke-width="1.8"><path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>`,
};

/** Vector diagram: company network boundary with server, local AI and workstations. */
function networkSvg(company: string) {
  const c = esc(company.length > 26 ? company.slice(0, 25) + "…" : company);
  return `<svg viewBox="0 0 320 220" width="100%">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7928CA"/><stop offset="1" stop-color="#4F46E5"/></linearGradient></defs>
  <rect x="6" y="6" width="308" height="208" rx="18" fill="rgba(121,40,202,.08)" stroke="#7928CA" stroke-dasharray="6 5"/>
  <text x="20" y="28" fill="#C9A7FF" font-family="Space Grotesk" font-size="11" letter-spacing="2">REȚEAUA ${c.toUpperCase()}</text>
  <rect x="115" y="62" width="90" height="70" rx="12" fill="url(#g)"/>
  <text x="160" y="92" text-anchor="middle" fill="#fff" font-family="Space Grotesk" font-weight="700" font-size="13">Server</text>
  <text x="160" y="110" text-anchor="middle" fill="#F3E8FF" font-family="Inter" font-size="10">AI local + date</text>
  ${[40, 160, 280].map((x) => `<line x1="160" y1="132" x2="${x}" y2="172" stroke="#A78BFA" stroke-width="1.5"/><rect x="${x - 26}" y="172" width="52" height="28" rx="7" fill="#131c3d" stroke="#A78BFA"/><text x="${x}" y="190" text-anchor="middle" fill="#E8EAF6" font-family="Inter" font-size="9.5">Stație</text>`).join("")}
  <g transform="translate(250 48)"><circle r="18" fill="#131c3d" stroke="#ef4444" stroke-width="1.5"/><path d="M-8 3a6 6 0 0 1 1-11 8 8 0 0 1 15 2 5 5 0 0 1 0 9z" fill="none" stroke="#ef4444" stroke-width="1.5"/><line x1="-12" y1="12" x2="12" y2="-12" stroke="#ef4444" stroke-width="2"/></g>
  <text x="250" y="80" text-anchor="middle" fill="#fca5a5" font-family="Inter" font-size="9">fără cloud</text>
</svg>`;
}

function shell(title: string, body: string) {
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body><div class="toolbar"><button onclick="print()">Salvează ca PDF</button></div>${body}</body></html>`;
}

function header(company: string, eyebrow: string) {
  return `<div style="display:flex;justify-content:space-between;align-items:center"><div class="brand">${MARK} OPSQAI</div><span class="eyebrow">${esc(eyebrow)}</span></div>`;
}

function footer(sender: string) {
  const d = new Date().toLocaleDateString("ro-RO");
  return `<div class="foot"><span>${esc(sender)} · OPSQAI · opsqai.de</span><span>Document pregătit ${d} · confidențial</span></div>`;
}

export function onePagerHtml(i: HtmlDocInput) {
  const company = i.company.trim() || "Compania dumneavoastră";
  const sender = i.sender?.trim() || "Echipa OPSQAI";
  const pains = (i.pains?.length ? i.pains : [
    "Angajații pierd timp căutând proceduri și documente interne.",
    "Instruirea colegilor noi consumă timpul celor experimentați.",
    "Aceleași întrebări ajung zilnic la HR și la șefii de echipă.",
  ]).slice(0, 4);
  const want = (m: string) => !i.modules?.length || i.modules.some((x) => x.toLowerCase().includes(m));
  const mods = [
    { k: "core", icon: ICON.doc, t: "Core", d: "Asistent care răspunde din documentele firmei, cu sursa citată, plus Academy cu lecții și teste." },
    { k: "hr", icon: ICON.people, t: "HR", d: "Dosare, concedii, onboarding și răspunsuri rapide la întrebările angajaților." },
    { k: "transport", icon: ICON.truck, t: "Transport", d: "Flotă, curse, CMR și proceduri pentru șoferi și dispecerat." },
    { k: "custom", icon: ICON.puzzle, t: "Module custom", d: "Construim fluxul specific al firmei, pe procesele dumneavoastră." },
  ].filter((m) => m.k === "core" || want(m.k));
  const body = `<div class="page">
${header(company, "Propunere pilot")}
<div class="hero" style="margin-top:22px">
  <div>
    <span class="pill">Pilot gratuit · 30 de zile</span>
    <h1>OPSQAI pentru ${esc(company)}</h1>
    <p>Inteligență artificială instalată pe serverul ${esc(company)}. Procedurile, documentele și instruirea devin răspunsuri clare, în câteva secunde, fără ca datele să părăsească firma.</p>
    ${i.contact ? `<p style="margin-top:8px;color:#fff">În atenția: <b>${esc(i.contact)}</b></p>` : ""}
  </div>
  <div>${networkSvg(company)}</div>
</div>
<h2>Ce rezolvăm${i.industry ? ` · ${esc(i.industry)}` : ""}</h2>
<div class="grid g2">${pains.map((p) => `<div class="card"><p>${esc(p)}</p></div>`).join("")}</div>
<h2>Ce primiți</h2>
<div class="grid ${mods.length >= 4 ? "g4" : mods.length === 3 ? "g3" : "g2"}">${mods.map((m) => `<div class="card">${m.icon}<h3>${m.t}</h3><p>${m.d}</p></div>`).join("")}</div>
<h2>Cum arată pilotul</h2>
<div class="grid g3">
  <div class="card step"><span class="num">1</span><div><h3>Săptămâna 1</h3><p>Instalăm pe serverul firmei și încărcăm procedurile unui departament.</p></div></div>
  <div class="card step"><span class="num">2</span><div><h3>Săptămânile 2–3</h3><p>Echipa folosește asistentul și Academy în munca de zi cu zi.</p></div></div>
  <div class="card step"><span class="num">3</span><div><h3>Săptămâna 4</h3><p>Raport cu rezultatele măsurate și decizia dumneavoastră, fără obligații.</p></div></div>
</div>
${i.pilotGoal ? `<div class="card" style="margin-top:10px"><span class="eyebrow">Obiectivul pilotului</span><p style="color:#fff;margin-top:4px">${esc(i.pilotGoal)}</p></div>` : ""}
<div class="cta"><h3 style="font-size:16px">Pilotul este gratuit.</h3><p>Fără costuri de licență și fără obligații. Vă cerem doar o persoană de contact internă, acces la 10–20 de proceduri și o întâlnire de evaluare la final.</p></div>
${footer(sender)}
</div>`;
  return shell(`OPSQAI pentru ${company}`, body);
}

export function securityHtml(i: HtmlDocInput) {
  const company = i.company.trim() || "Compania dumneavoastră";
  const sender = i.sender?.trim() || "Echipa OPSQAI";
  const items = [
    [ICON.lock, "Datele rămân la dumneavoastră", "Documentele, întrebările și răspunsurile stau pe serverul firmei. Modelul AI rulează local."],
    [ICON.shield, "Operatorul datelor", `${company} rămâne operatorul datelor în sensul GDPR. OPSQAI nu are acces la conținut.`],
    [ICON.people, "Acces pe roluri", "Fiecare utilizator vede doar documentele și modulele permise rolului său."],
    [ICON.log, "Jurnal de audit", "Acțiunile importante sunt înregistrate local, pentru verificare internă."],
    [ICON.key, "Licență semnată", "Licența este verificată criptografic. Telemetria trimite doar cifre agregate, fără conținut."],
    [ICON.doc, "Retenție și drepturi", "Reguli de păstrare configurabile și fluxuri pentru cererile persoanelor vizate."],
  ];
  const body = `<div class="page">
${header(company, "Securitate & GDPR")}
<div class="hero" style="margin-top:22px">
  <div>
    <span class="pill">Pentru IT și DPO</span>
    <h1>Securitatea datelor ${esc(company)}</h1>
    <p>OPSQAI se instalează în rețeaua dumneavoastră. Nu trimite documente sau conversații în cloud și funcționează și fără internet.</p>
  </div>
  <div>${networkSvg(company)}</div>
</div>
<h2>Garanții tehnice</h2>
<div class="grid g3">${items.map(([ic, t, d]) => `<div class="card">${ic}<h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("")}</div>
<h2>Ce iese din rețea</h2>
<div class="grid g2">
  <div class="card"><h3 style="color:#86efac">Iese</h3><ul><li>Verificarea licenței</li><li>Cifre agregate de utilizare (fără conținut)</li><li>Actualizări semnate, aprobate de administrator</li></ul></div>
  <div class="card"><h3 style="color:#fca5a5">Nu iese niciodată</h3><ul><li>Documente și proceduri</li><li>Întrebările angajaților și răspunsurile</li><li>Date personale din HR sau Transport</li></ul></div>
</div>
<div class="cta"><h3 style="font-size:16px">Verificați în pilotul gratuit de 30 de zile.</h3><p>Echipa dumneavoastră IT poate inspecta instalarea, traficul de rețea și jurnalele înainte de orice decizie. OPSQAI oferă controale tehnice care vă sprijină conformitatea; nu reprezintă o certificare.</p></div>
${footer(sender)}
</div>`;
  return shell(`Securitate OPSQAI — ${company}`, body);
}

export function openHtml(html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
