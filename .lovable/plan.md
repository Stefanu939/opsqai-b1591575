## Goal

În Customer Portal → `/portal/downloads`, când super-adminul activează un modul și emite o licență pentru un install, clientul trebuie să vadă, alături de _Installation package_ și _Activation bundle_, câte un buton dedicat pentru descărcarea fiecărei licențe de modul emise pentru el.

## Ce vede clientul (UX)

Pentru fiecare card de installation, sub cele două butoane existente, apare o secțiune "Module licenses" cu câte un rând per modul activ:

```text
┌──────────────────────────────────────────────────────────────┐
│  [ico]  INSTALL-ID                    Acme Manufacturing GmbH│
│                                                              │
│  [ Installation package ]  [ Activation bundle ]             │
│                                                              │
│  Module licenses                                             │
│  ─────────────────────────────────────────────────────────   │
│  ● academy          expiră 2026-11-01     [ Download .lic ] │
│  ● qms              expiră 2027-04-30     [ Download .lic ] │
│  ● audit  (suspended)                     [ Download .lic ]*│
└──────────────────────────────────────────────────────────────┘
```

- Se listează doar licențele de modul cu `revoked=false` (revoked = nu apare).
- Dacă `suspended=true` sau expirată, butonul rămâne disponibil dar cu badge de status.
- Fiecare buton descarcă un fișier JSON `opsqai-module-<module_key>-<install_id>.json` — mini-bundle valid pentru importul offline al unei singure licențe de modul.

## Ce se schimbă tehnic

1. **`src/lib/license-activation-core.server.ts`** – adaugă `buildModuleLicenseBundle(install_id, module_key)`. Returnează același envelope ca `ActivationBundle`, dar cu:
   - `install_token` = signed_token al licenței `kind='install'` (necesar pentru validare offline),
   - `module_tokens` = doar `[{ module_key, signed_token }]` pentru modulul cerut,
   - `public_key_pem`, `key_id`, `crl_token` – identice cu bundle-ul complet.
   Aruncă dacă modulul lipsește / este revocat.

2. **`src/lib/portal.functions.ts`** – adaugă `downloadMyModuleLicense` (server fn, `POST`, `requireSupabaseAuth`). Validator: `{ install_id, module_key }`. Verifică ownership pe `licenses` (`contact_email = claims.email`, `install_id`, `kind='module'`, `module_key`, `revoked=false`); apoi delegă la `buildModuleLicenseBundle`.

3. **`src/routes/_authenticated/portal.downloads.tsx`** – sub cele două butoane existente, dacă `inst.module_licenses.length > 0`, randează un sub-panel cu un rând per modul: iconiță `Package`, `module_key` (mono), `expires_at` scurt (dacă există), badge `suspended`/`expired` când e cazul, și `Button` "Download license". Handler-ul apelează `downloadMyModuleLicense` și descarcă rezultatul ca JSON prin același pattern cu Activation bundle. Cheie de fișier: `opsqai-module-<module_key>-<install_id>.json`.

## Ce NU se schimbă

- Nu se atinge schema (`licenses` are deja `signed_token`, `module_key`, `contact_email`).
- Nu se schimbă fluxul din MC (adminul continuă să emită module license cu funcțiile existente).
- Nu se modifică Activation bundle complet — rămâne intact ca "toate în unul".
- Fără Storage bucket nou; totul se generează just-in-time și se streamuiește prin RPC.

## Verificare

- Manual: cu un user portal ce are 2 module active pe același install, apar 2 butoane; JSON-ul descărcat conține un singur `module_tokens[]`, `install_token` corect, `key_id` egal cu cel din activation bundle.
- Modul revocat → nu apare în listă; încercare de descărcare cu `module_key` inventat → 403/"Not authorized".
- Ownership: user cu alt `contact_email` nu poate descărca (server fn respinge).
- `bun run build` verde; test suite (`bunx vitest run`) neafectat.
