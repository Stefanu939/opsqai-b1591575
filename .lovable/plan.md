# Academy, Knowledge Gaps, Chat Surse, Drepturi pe Funcții, Update & Transport

Cererea acoperă 10 zone. Le livrez în 4 loturi, în ordinea de mai jos, fără să te opresc între ele.

## Lot 1 — Bug-uri blocante (Academy, Knowledge Gaps, Chat)

1. **Curs nou în Academy nu se salvează / nu ajunge la ceilalți**
   Verific salvarea completă (curs → capitole → lecții → publicare → atribuire) și repar pasul care pierde datele. După salvare, cursul devine vizibil pentru utilizatorii vizați (departament / rol), nu doar pentru autor.
2. **Knowledge Gaps dă eroare și nu mai vede întrebările din chat**
   Repar citirea listei și traseul prin care chatul înregistrează întrebările fără răspuns, inclusiv pe instalarea Windows.
3. **Chat: răspuns strict din datele departamentului + sursă afișată**
   Fiecare răspuns arată explicit sursa, ex. „Sursă: SOP-02 — Departament Logistică”. Dacă nu există sursă din departamentul utilizatorului, chatul refuză să răspundă.

## Lot 2 — Drepturi pe funcții, una câte una

4. **Management Center → Licenses**
   Pe lângă produsele acordate individual, pot activa sau anula fiecare funcție Core separat, per client. Licența emisă respectă exact selecția.
5. **Self-Hosted → drepturi per persoană**
   O matrice unică unde pot activa/dezactiva, pentru fiecare persoană, toate funcțiile Core plus funcțiile OPSQAI Transport și OPSQAI HR. Ce e dezactivat dispare complet din meniul și paginile persoanei, iar accesul direct este respins pe server.

## Lot 3 — Actualizări

6. **Check for updates**
   Bară de progres reală la descărcare (procent și dimensiune) și o a doua bară la instalare, plus confirmare că fișierul a fost efectiv descărcat și verificat înainte de instalare.

## Lot 4 — Transport

7. **Șoferul adăugat nu apare în listă** — repar lista de șoferi din planificator.
8. **Salvarea planului e foarte lentă** — reduc pașii lenți și dau feedback imediat la salvare.
9. **Harta arată traseul** — traseul planificat se desenează pe hartă cu opriri și pauze.
10. **Două hărți în UI** — rămâne o singură hartă, cu planificatorul lângă ea.
11. **CMR pe tură** — după ce generez și descarc un CMR, îl pot atașa unei ture existente și îl regăsesc acolo.

## Detalii tehnice

- Drepturile se bazează pe modelul existent `user_area_rights` / `area_permission_map`, extins cu funcțiile Core, Transport și HR; server-ul rămâne autoritatea, UI-ul doar ascunde.
- Funcțiile Core din licență devin claim-uri separate în JWT-ul licenței, verificate la Self-Hosted.
- Progresul descărcării folosește dimensiunea raportată de sursa de update; instalarea raportează etapele.
- Migrare aditivă nouă pentru Self-Hosted (drepturi extinse + legătura CMR–tură). Fără ștergeri de coloane.
