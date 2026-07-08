
# Plan: Model "Self-Hosted OPSQAI + License Server"

## Obiectivul tău
- Tu nu mai ești owner al datelor. Fiecare firmă rulează OPSQAI pe infrastructura ei (self-hosted, Docker).
- Tu vinzi doar **licențe pe module**. Basic = Chat + KB + FAQ. Restul modulelor (Academy, Analytics, Audit, Brand, Compliance, etc.) se deblochează cu chei separate, plată unică per modul.
- Tu păstrezi controlul asupra codului (release `opsqai 1.2` din Lovable) și emiterii de licențe.
- Clientul are wizard de instalare + updates automate (pull imagine Docker nouă).

---

## Arhitectura (2 aplicații distincte)

```text
┌─────────────────────────────────┐        ┌────────────────────────────────┐
│  LICENSE SERVER (Lovable Cloud) │        │  OPSQAI SELF-HOSTED (client)   │
│  = aplicația ta actuală, redusă │        │  = Docker Compose la client    │
│                                 │        │                                │
│  • Emitere licențe (per firmă)  │◄──────►│  • App OPSQAI (Node/Vite)      │
│  • Portal admin (tu)            │  HTTPS │  • Postgres local              │
│  • Portal client (firma)        │        │  • Storage local (MinIO/FS)    │
│  • Facturare module unice       │        │  • License Client (verifică)   │
│  • Update feed (versiuni)       │        │  • Update Agent (Watchtower)   │
│  • Distribuie release notes     │        │  • Setup Wizard (prima rulare) │
└─────────────────────────────────┘        └────────────────────────────────┘
```

**Regula de aur**: License Server nu vede niciodată datele operaționale ale clientului. Doar `install_id`, `licensed_modules`, `expiry`, `heartbeat`.

---

## Modelul de licențiere

**Licență = JWT semnat offline** cu cheia privată OPSQAI (Ed25519). Clientul îl verifică local cu cheia publică inclusă în build. Nu depinde de rețea pentru operare zilnică, doar pentru refresh periodic (heartbeat 7 zile).

Payload licență:
```json
{
  "install_id": "acme-prod-01",
  "company_name": "ACME GmbH",
  "tier": "basic",
  "modules": ["chat", "kb", "faq", "academy"],
  "issued_at": 1720000000,
  "expires_at": 1751536000,
  "max_users": 100,
  "hard_expiry": false
}
```

- **Basic (inclus mereu)**: `chat`, `kb`, `faq`, `notifications`, `bilingual_ui`, `pwa`
- **Add-on module** (plată unică per modul, cheie separată):
  `academy`, `analytics`, `ai_sop_generator`, `audit_log`, `rbac`, `compliance_center`, `brand_center`, `executive_dashboard`, `enterprise_export`, `sop_versioning`, `knowledge_gaps`, `internal_requests`

Când clientul spune "vreau Academy", tu:
1. Emiți în portal o licență nouă care include `"academy"` în array-ul `modules`.
2. Clientul o lipește în UI → app-ul verifică semnătura → deblochează ruta `/academy`.

---

## Ce construim (în ordine, 4 faze)

### Faza 1 — License Server (aplicația curentă rămâne, dar se schimbă rolul)
Pe aplicația existentă (Lovable Cloud):
- Tabel nou `licenses` (install_id, company, modules jsonb, issued_at, expires_at, revoked, signature).
- Tabel `license_installs` (install_id, last_heartbeat_at, app_version, user_count).
- Tabel `license_orders` (facturi module, unit_price, paid_at) — plată unică prin Stripe.
- Server function `issueLicense(install_id, modules, expires_at)` → semnează JWT cu Ed25519 (private key ca secret `LICENSE_SIGNING_KEY`).
- Server function `revokeLicense(install_id)`.
- Server route public `/api/public/v1/license/heartbeat` (client-ul face POST cu `install_id + version`; primește înapoi ultima licență validă + latest_version).
- UI Platform Admin:
  - "Licenses" — listă instalări, modulele active, expiry, revoke.
  - "Issue license" — form: firmă + module bifate + expiry → generează token, buton copy.
  - "Add-on order" — vânzare modul nou pentru instalare existentă (extinde `modules[]`).

### Faza 2 — Feature gating în app (funcționează în ambele moduri)
- `src/lib/license.ts` — `useLicense()` hook + `hasModule(key)` — citește licența din:
  - Cloud/Edeka mode: hardcoded `["*"]` (toate modulele).
  - Self-hosted mode: din `licenses` table locală (tabel nou) sau din env `OPSQAI_LICENSE_JWT`.
- `<ModuleGate module="academy">` — wrapper care ascunde ruta / afișează "Upgrade to unlock".
- Aplicat pe: rutele `/app/academy/*`, `/app/admin/dashboard`, `/app/admin/audit`, `/app/analytics`, `/app/brand`, `/app/compliance`.
- Nav-ul (`app-shell`) filtrează item-urile după `hasModule`.

### Faza 3 — Self-Hosted Build (Docker)
Fișiere noi în repo:
- `Dockerfile` — multi-stage: Node build → runtime slim.
- `docker-compose.yml` — servicii: `app`, `postgres`, `minio` (S3-compat), `caddy` (reverse proxy + auto-TLS).
- `docker/entrypoint.sh` — verifică `LICENSE_JWT`, rulează migrări, pornește app.
- `docker/setup-wizard/` — rută `/setup` care rulează doar la prima pornire (când `licenses` e goală):
  1. Paste license token → verificare semnătură.
  2. Config Postgres URL, admin email/parolă.
  3. Config SMTP + AI provider (folosim `ai-provider.server.ts` deja creat — AZURE / OPENAI_COMPATIBLE / OLLAMA).
  4. Test conexiuni → salvează `.env` local → redirect `/app`.
- `README.SELFHOST.md` — instrucțiuni: `curl install.sh | sh` sau `docker compose up`.

### Faza 4 — Update Feed & Release Channel
- Server route pe License Server: `/api/public/v1/releases/latest` → `{ version, docker_image, checksum, release_notes_url, min_supported }`.
- În setup-wizard-ul clientului, "Update" button → pull imagine nouă + `docker compose up -d`.
- Optional: **Watchtower** container inclus în compose care face auto-pull pe canal (`stable` / `beta`).
- Tu faci release din Lovable: build imagine (GitHub Actions declanșat de tag `v1.2.0`) → push în GHCR sau Docker Hub → update record în `releases` table pe License Server → toți clienții primesc notificare "Update disponibil".

---

## Ce se schimbă în aplicația actuală (Cloud)

Aplicația ta actuală devine **License Server + demo public**:
- Rutele `/app/*` (workspace-ul operațional) rămân doar pentru **demo / Edeka evaluation**.
- Se adaugă zona nouă `/app/platform/licenses` (doar `platform_admin`).
- Pricing page reflectă noul model: "Basic license €X unic + module €Y fiecare, self-hosted".
- Marketing pages: adăugăm secțiune "Self-hosted, own your data" + link download.

**Ce NU strică**:
- Modulul `ai-provider.server.ts` deja există și e pregătit pentru Azure / self-hosted OpenAI-compat / Ollama. Perfect pentru clienți care rulează cu propriul LLM.
- `feature-catalog.ts` și `subscription-plans.ts` rămân — devin **surse pentru catalog de module vândabile**.

---

## Detalii tehnice cheie

**Semnare licențe (Ed25519, offline, fără dependență de rețea):**
```ts
// server: emitere
import { sign } from '@noble/ed25519';
const jwt = await signLicensePayload(payload, process.env.LICENSE_SIGNING_KEY_PRIVATE);

// client (self-hosted): verificare la fiecare pornire + la fiecare acces la modul
import { verify } from '@noble/ed25519';
const ok = await verifyLicenseJwt(token, PUBLIC_KEY_BUILT_IN);
```

**Heartbeat opțional** (soft-enforcement): app-ul face POST săptămânal către License Server cu `install_id + version + user_count`. Dacă lipsește 30 zile → warning banner, nu blocare. Dacă `revoked=true` la ultimul heartbeat → licența devine invalidă la următoarea verificare locală.

**Migrări DB pe self-host**: pornirea containerului rulează `bun run migrate` care aplică toate migrările Supabase pe Postgres-ul local. Migrările tale există deja — trebuie doar să nu depindă de `auth.*` schema Supabase → înlocuim cu tabel `users` propriu + hash bcrypt, sau folosim GoTrue open-source ca container separat (recomand GoTrue — 0 refactor pe auth).

**Storage**: MinIO local (S3-compatible) → codul folosește deja `supabase.storage` care merge peste orice S3-compat cu env-vars corecte.

---

## Ce NU e în acest plan (îl clarificăm după)
- Cum arată contractul comercial / EULA (Legal, nu tech).
- Suport SSO enterprise (SAML) în self-host — există deja `sso_configurations`, îl păstrăm.
- Multi-tenancy pe același self-host — presupun 1 firmă = 1 install. Confirmă dacă vrei multi-tenant.

---

## Estimare (ordin de mărime)
- Faza 1 (License Server + emitere/revoke + UI admin): ~4-6 iterații.
- Faza 2 (Feature gating în app): ~2-3 iterații.
- Faza 3 (Docker + wizard + GoTrue + MinIO): ~5-7 iterații.
- Faza 4 (Release feed + Watchtower): ~2 iterații.

Începem cu **Faza 1** (License Server + tabelele + emitere JWT + UI admin) — e independent și îl poți folosi imediat ca să emiți licențe pentru primii clienți self-hosted, chiar înainte ca partea de Docker să fie gata.

---

## Întrebări înainte să pornesc

1. **Auth în self-host**: OK cu GoTrue containerizat (open-source Supabase Auth, 0 refactor pe codul actual), sau vrei ceva simplu tip email+parolă intern?
2. **Multi-tenant per install**: 1 install = 1 firmă (simplu) sau 1 install = mai multe workspaces (ca acum)?
3. **Distribuția imaginii Docker**: GHCR public, Docker Hub public, sau private registry cu login (mai control)?
4. **Începem cu Faza 1 acum**? Confirmă și pornesc migrațiile + UI-ul de emitere licențe.
