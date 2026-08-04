# Self-Hosted: module complete, AI Chat, Mesaje și RBAC

## Obiectiv

Transformăm instalarea Self-Hosted într-o aplicație complet funcțională după autentificarea cu administratorul creat în installer:

- toate modulele Basic apar și se pot deschide;
- AI Audit este disponibil ca modul Basic;
- AI Chat folosește exclusiv baza locală și providerul AI configurat local;
- angajații au un modul separat „Mesaje” pentru conversații interne;
- superadminul poate crea utilizatori și roluri configurabile;
- nicio acțiune disponibilă în Self-Hosted nu mai poate ajunge accidental la un provider Cloud.

## 1. Stabilizare module și navigație

- Separăm explicit două verificări:
  - **entitlement/licență**: modul Basic sau modul licențiat;
  - **permisiune RBAC**: ce poate face utilizatorul în interiorul modulului.
- Modulele Basic vor fi mereu vizibile în Self-Hosted: Dashboard, AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Notifications și administrarea platformei unde rolul permite.
- Adăugăm „Mesaje” ca suprafață separată de AI Chat.
- Eliminăm situația în care lipsa unei permisiuni ascunde complet un modul Basic; pagina rămâne vizibilă, iar acțiunile administrative sunt controlate separat.
- Pentru fiecare link din sidebar verificăm că ruta există, se încarcă și nu importă direct cod Cloud.

## 2. RBAC configurabil local

- Adăugăm o migrare Self-Hosted pentru:
  - catalogul de permisiuni;
  - roluri configurabile per instalare;
  - relația rol–permisiune;
  - atribuirea unuia sau mai multor roluri unui utilizator.
- Migrăm rolurile locale existente (`admin`, `operator`, `member`) fără pierderea utilizatorilor existenți.
- Rolul administratorului creat de installer devine rol de sistem protejat, cu toate permisiunile locale și dreptul de administrare RBAC.
- Seed-uim permisiunile necesare pentru module, inclusiv `chat.use`, `messages.use`, `knowledge.manage`, `faq.*`, `academy.*`, `ai_audit.run`, `user.*`, `role.manage` și permisiunile de platformă.
- Înlocuim mapa fixă de permisiuni din providerul PostgreSQL cu citirea rolurilor și permisiunilor din baza locală.
- Aplicăm verificarea permisiunilor și server-side; ascunderea butoanelor în UI rămâne doar o măsură UX.

## 3. Administrarea utilizatorilor companiei

- Extindem ecranul Users astfel încât superadminul să poată:
  - crea un utilizator cu parolă temporară;
  - obliga schimbarea parolei la prima autentificare;
  - edita profilul și departamentul;
  - activa/dezactiva utilizatorul;
  - reseta parola și revoca sesiunile;
  - atribui sau elimina roluri;
  - șterge utilizatori, cu protecție pentru ultimul superadmin.
- Adăugăm în aceeași zonă administrarea rolurilor: creare, redenumire, selectare permisiuni și ștergere sigură.
- Păstrăm totul în PostgreSQL-ul local; nu se apelează autentificarea sau baza Cloud.

## 4. Repararea AI Chat Self-Hosted

- Refactorizăm endpointul de streaming AI astfel încât autentificarea, identificarea companiei, istoricul și configurarea AI să fie rezolvate prin providerii platformei, nu prin clientul Cloud.
- Folosim repository-urile locale pentru threads, messages, Knowledge Base și audit.
- Conectăm fluxul RAG local:
  - încărcare istoric complet al conversației;
  - embedding prin adaptorul AI configurat în instalare;
  - căutare pgvector în documentele locale;
  - răspuns stream-uit cu citări;
  - salvarea mesajului utilizatorului și a răspunsului AI în aceeași conversație.
- Dacă providerul AI nu este configurat sau nu este disponibil, afișăm o eroare operațională clară, fără crash și fără fallback implicit la Cloud.
- Verificăm creare conversație, trimitere, regenerare, feedback, atașamente și redeschiderea istoricului.

## 5. Modulul AI Audit

- Adăugăm schema/repository-ul local necesar pentru auditul completărilor AI.
- Înregistrăm pentru fiecare completare: utilizator, model, latență, tokeni, hash-uri input/output, documentele recuperate, status și eroare sigură.
- Refactorizăm pagina AI Audit să citească și să ruleze prin providerul local în Self-Hosted.
- Modulul apare în Basic, dar executarea și vizualizarea sunt controlate prin permisiuni distincte.
- Auditul nu stochează chei API sau alte secrete.

## 6. Modul separat „Mesaje”

- Adăugăm tabele locale pentru conversații directe, membri și mesaje, cu indexuri și integritate referențială.
- Implementăm repository comun Cloud/Self-Hosted, astfel încât UI-ul să nu cunoască backendul activ.
- Construim o rută separată „Mesaje” cu:
  - listă de conversații;
  - căutare colegi;
  - conversație 1-la-1;
  - mesaje necitite și marcarea ca citit;
  - trimitere optimistă și actualizare periodică sigură;
  - stări empty/error/offline fără blocarea aplicației.
- Conversațiile sunt limitate la utilizatorii aceleiași instalări/companii și sunt autorizate server-side.
- AI Chat rămâne separat și nu se amestecă cu mesajele dintre angajați.

## 7. Eliminarea completă a erorilor Cloud în Self-Hosted

- Audităm toate rutele și acțiunile vizibile după login, nu doar Chat.
- Orice acces direct la clientul Cloud dintr-un flux Self-Hosted este mutat într-un repository/provider sau eliminat din acel build.
- Funcțiile exclusiv Cloud rămân inaccesibile și neimportate în Self-Hosted.
- Adăugăm stări „feature unavailable/not configured” controlate pentru integrările opționale, în locul paginii globale „Something went wrong”.
- Păstrăm și extindem guardrail-urile existente; nu relaxăm verificarea bundle-ului.

## 8. Migrare, compatibilitate și verificare

- Adăugăm noile migrări numai în lanțul Self-Hosted și le includem în verificarea de hash/fingerprinting și în payload-ul installerului/updaterului.
- Migrările sunt idempotente și păstrează instalările și utilizatorii existenți.
- Actualizăm documentația pentru module, administratori, RBAC, AI provider, AI Audit și Mesaje.
- Testăm atât o instalare nouă, cât și upgrade-ul unei instalări existente.

## Verificare end-to-end

1. Instalare nouă și autentificare cu administratorul creat în wizard.
2. Toate modulele Basic apar și fiecare rută se deschide fără eroare Cloud.
3. Superadminul creează două roluri personalizate și doi utilizatori cu permisiuni diferite.
4. Utilizatorii se autentifică, iar permisiunile sunt aplicate atât în UI, cât și server-side.
5. Se încarcă un document în Knowledge Base și se obține un răspuns AI cu citare și istoric persistent.
6. Intrarea apare în AI Audit cu metadatele corecte.
7. Cei doi utilizatori schimbă mesaje, marchează conversația ca citită și regăsesc istoricul după restart.
8. Dezactivarea unui utilizator îi revocă sesiunile și blochează accesul.
9. Scanarea surselor, verificarea bundle-ului Self-Hosted și testele selective trec fără relaxarea guardrail-urilor.

## Detalii tehnice

- UI comun; implementări separate prin provider registry pentru Cloud și Self-Hosted.
- PostgreSQL local este sursa de adevăr pentru identitate, roluri, permisiuni, conversații, mesaje și audit în Self-Hosted.
- Endpointurile streaming folosesc autentificarea platformei și DTO-uri neutre, fără client Cloud în traseul Self-Hosted.
- Rolurile de sistem și protecția ultimului superadmin sunt reguli server-side și tranzacționale.
- Modificările de schemă Self-Hosted vor necesita un nou build/update de aplicație; publicarea site-ului Cloud singură nu poate actualiza o instalare Windows existentă.