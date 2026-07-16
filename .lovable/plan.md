## Ce face butonul Open azi

În `src/routes/_authenticated/management.companies.tsx` (linia 182), butonul face două lucruri:

1. `setActiveCompanyId(c.id)` — fixează workspace-ul MC pe compania respectivă, astfel ca celelalte pagini din Management Center (Licenses, Analytics, Audit etc.) să filtreze automat pentru ea.
2. `navigate({ to: "/management/companies/$id", params: { id: c.id } })` — deschide pagina de detaliu a companiei (`management.companies.$id.tsx`) cu tab-urile Overview / Installations / Licenses / Download package / Activity.

Este redundant, pentru că coloana **Name** este deja un `<Link>` către exact aceeași rută. Ai deja o linie de dovadă: URL-ul curent (`/management/companies/65a0a3cc-…`) arată că navigarea funcționează — dar dacă ai apăsat Open din listă, `setActiveCompanyId` schimbă contextul înainte de navigate, iar re-render-ul poate pierde click-ul pe unele browsere (ai raportat că "URL-ul nu se schimbă").

## Planul

1. **Elimină butonul Open** din coloana de acțiuni — este duplicat cu link-ul din Name.
2. **Fă rândul întreg clickable** prin `onRowClick` (deja suportat de `DataTable`), care apelează `setActiveCompanyId(c.id)` apoi `navigate(...)`. Butoanele Suspend / Delete rămân în coloana actions și folosesc `e.stopPropagation()` ca să nu declanșeze rândul.
3. **Cursor + hover** vor apărea automat pentru că `DataTable` aplică `cursor-pointer hover:bg-surface-1` când există `onRowClick`.
4. Coloana Name rămâne `<Link>` (accesibilitate: keyboard, middle-click, "open in new tab").

## Fișiere afectate

- `src/routes/_authenticated/management.companies.tsx` — șterge blocul Open (liniile ~182-191), pasează `onRowClick` la `DataTable`, adaugă `e.stopPropagation()` pe Suspend și Delete.

Rezultat: un singur mod evident de a deschide compania (click pe rând sau pe nume), iar acțiunile secundare rămân accesibile fără să dubleze navigarea.
