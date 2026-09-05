# Separarea bulelor: mesaje vs. ticketing

Acum ambele bule flotante (mesaje între colegi și ticketing/suport) apar peste tot unde ești logat, inclusiv în Management Center și în Customer Portal. Le separăm clar.

## Cum va arăta

- **Customer Portal** — doar bula de **ticketing** (suport). Bula de mesaje dispare complet.
- **Management Center** — doar bula de **mesaje**. Ticketing-ul dispare din colț și e înlocuit de un buton clar „Support inbox” în bara de sus, care duce la pagina de suport existentă (cu contor de necitite dacă există deja).
- **Self-Hosted** — rămâne doar bula de mesaje, ca acum (ticketing-ul oricum nu există local).
- **Paginile publice** (home, pricing, blog etc.) — nicio bulă, nici măcar pentru un utilizator logat.

## Detalii tehnice

- `src/routes/__root.tsx`: bulele nu se mai montează necondiționat. Se introduce o mică regulă de afișare pe baza rutei curente:
  - `/portal/*` → doar `SupportWidget`
  - `/management/*` și `/app/*` → doar `ChatGlider`
  - orice altă rută (public) → niciuna
- `src/components/support/support-widget.tsx`: se păstrează gating-ul existent (cloud activ, permisiune, ascuns pe `/management/support`), plus noua restricție de rută; nu se schimbă logica de tichete, upload-uri sau permisiuni.
- `src/components/support/chat-glider.tsx`: neschimbat funcțional, doar nu mai e montat pe portal/public.
- `src/components/mc/mc-shell.tsx`: se adaugă în header, lângă notificări, un buton „Support inbox” (icon Inbox) cu link către `/management/support`, marcat activ când ești deja pe acea pagină.

Nu se modifică licențierea, permisiunile, RLS, datele de suport sau designul Graphite; doar unde apar bulele și un buton nou în header.

## Verificare

- Typecheck + build.
- Verificare manuală/programatică a rutelor: `/portal` (o singură bulă, ticketing), `/management` (o singură bulă, mesaje + buton inbox), `/app` (mesaje), `/` (nicio bulă).
