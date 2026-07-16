
# Tab „Admin" in Kundenportal

Un singur tab nou in Kundenportal, vizibil **doar pentru `platform_owner` si `platform_admin`**. In interior, doua sectiuni:

1. **News** — postari stil blog (titlu, imagine cover, corp markdown, pinned, publicat/draft)
2. **Downloads** — module suplimentare descarcabile de client (titlu, descriere, fisier, versiune, categorie)

Clientii obisnuiti (customer_admin / customer_user) **doar vad** continutul pe paginile publice ale portalului (Overview + Downloads), fara sa poata edita.

---

## 1. Baza de date (migrare noua)

### `portal_announcements` (news / blog)
- `id uuid PK`, `title text not null`, `slug text unique not null`
- `body_md text not null` (markdown)
- `cover_image_url text` (poza cover, opțional)
- `status text` — `draft` / `published`
- `pinned boolean default false`
- `published_at timestamptz`, `expires_at timestamptz` (optional)
- `author_id uuid`, `created_at`, `updated_at`

### `portal_download_modules` (module suplimentare)
- `id uuid PK`, `title text not null`, `description text`
- `category text` — ex. „plugin", „template", „document", „tool"
- `version text`, `file_url text not null`, `file_size_bytes bigint`, `checksum text`
- `icon_name text` (icon lucide), `status text` (`draft`/`published`)
- `published_at`, `created_at`, `updated_at`, `author_id`

### RLS + GRANT
- `GRANT SELECT` catre `authenticated` (toti userii autentificati citesc doar randurile `published`).
- Politici SELECT: `authenticated` vad doar `status = 'published'`.
- Politici INSERT/UPDATE/DELETE: doar `has_role(auth.uid(), 'platform_owner')` sau `platform_admin`.
- `GRANT ALL ... TO service_role`.

### Storage buckets
- `portal-news-images` — public (poze cover articole).
- `portal-download-modules` — public (fisierele modulelor).
- Politici pe `storage.objects`: SELECT public; INSERT/UPDATE/DELETE doar pentru owner/admin platforma.

---

## 2. Server functions (`src/lib/portal-admin.functions.ts`)

Toate cu `.middleware([requireSupabaseAuth])` + verificare rol platform_owner/platform_admin prin `has_role` inainte de scriere.

**News:**
- `listAnnouncementsAdmin` — toate (inclusiv draft) pentru admin
- `listAnnouncementsPublic` — doar `published`, ordonate cu pinned primele
- `getAnnouncement({ id | slug })`
- `upsertAnnouncement({ id?, title, body_md, cover_image_url?, status, pinned, published_at? })`
- `deleteAnnouncement({ id })`

**Downloads:**
- `listDownloadModulesAdmin`
- `listDownloadModulesPublic` (deja folosit in `/portal/downloads` extins)
- `upsertDownloadModule({...})`
- `deleteDownloadModule({ id })`

**Upload:**
- Upload cover-uri si fisiere direct din browser cu `supabase.storage.from(...).upload(...)` (client-side), URL-ul se salveaza prin `upsertAnnouncement`/`upsertDownloadModule`.

---

## 3. Rute noi

Adaugat in `NAV`-ul din `src/routes/_authenticated/portal.tsx`:
```
{ to: "/portal/admin", label: "Admin", icon: Shield, staffOnly: true }
```
Item-ul se afiseaza doar daca `useAuth()` returneaza rol `platform_owner` sau `platform_admin` (folosim helperul de rol deja existent — hook `useUserRole`/`user_roles` in cod). Pentru client obisnuit tab-ul e ascuns complet.

**Rute noi:**
- `src/routes/_authenticated/portal.admin.tsx` — layout cu sub-tabs (`News` / `Downloads`) + guard care redirecteaza non-staff la `/portal`.
- `src/routes/_authenticated/portal.admin.news.tsx` — lista + buton „New post" + editor inline (dialog): titlu, upload cover, textarea markdown cu preview, toggle pinned, status draft/published.
- `src/routes/_authenticated/portal.admin.downloads.tsx` — lista module + form „Add module" (titlu, descriere, categorie, versiune, upload fisier, publish/draft).

---

## 4. Vizibilitate pentru clienti

**Overview (`portal.index.tsx`):**
- Sectiune noua „What's new" — primele 3 anunturi `published` (pinned primele), fiecare afisat ca un card stil blog (cover + titlu + excerpt + data).
- Link „See all news" → `/portal/news`.

**Ruta noua `portal.news.tsx`** (lista publica) si `portal.news.$slug.tsx` (detaliu articol cu markdown randat, cover mare, data, autor).

**Downloads (`portal.downloads.tsx`):**
- Adaugam a doua sectiune „Extra modules" — cardurile din `portal_download_modules` publicate, grupate pe categorie, cu buton „Download".
- Sectiunea existenta cu installer releases ramane neatinsa.

Clientii doar citesc — niciun buton de editare vizibil.

---

## 5. Randare markdown + UI

- Folosim libraria `react-markdown` (o adaug daca nu exista) + `remark-gfm` pentru markdown safe.
- Editor: `Textarea` shadcn + tab „Preview" cu render live.
- Upload imagini: buton „Upload cover" care apeleaza `supabase.storage.upload` si populeaza `cover_image_url`.
- Design: aliniat cu tokenii portalului (nu MC Noir/Gold — portalul are alt look).

---

## Detalii tehnice

- Fara noi dependinte in afara de `react-markdown` + `remark-gfm` (fallback: keep-it-simple `<div dangerouslySetInnerHTML>` cu `DOMPurify` daca preferam sa nu adaugam). Recomand `react-markdown`.
- Buckets create prin tool-ul de storage; RLS pe `storage.objects` prin migrare.
- Slug generat automat din titlu la upsert daca lipseste.
- Toate mutatiile invalideaza `queryClient` pe `["portal-announcements"]` / `["portal-download-modules"]`.
- Guard pe `/portal/admin*`: in `beforeLoad` chemam un server fn `assertPlatformStaff()` care arunca `redirect({ to: "/portal" })` daca userul nu are rolul necesar.

---

## Ce ramane la fel

- `/management/releases` si `/management/portal` raman intacte (installer releases oficiale).
- Sesiunea si autentificarea nu se schimba — tabul apare doar dupa ce te loghezi pe `/portal` cu cont staff (fix-ul deja aplicat in `auth.tsx`).
