## Da, înțeleg exact acum

Utilizatorul final NU trebuie să ajungă la login-ul de pe `opsqai.de` și NU trebuie să fie trimis la o pagină care îi spune să descarce iar aplicația.

După instalare, iconița Windows trebuie să deschidă aplicația locală Self-Hosted:

```text
Double-click OPSQAI icon
→ OPSQAI desktop window
→ local Self-Hosted login
→ email + parola admin creată în installer
→ /app
→ Chat, Knowledge Base, module licențiate etc.
```

Nu:

```text
Double-click OPSQAI icon
→ web/login marketing
→ Windows product message
→ download / windows-only page
→ loop infinit
```

## Ce s-a construit și unde e problema

Codul are deja bucăți corecte pentru Self-Hosted:

- desktop shell-ul Electron încarcă `https://localhost/auth?audience=company`
- există provider local de auth Self-Hosted care trimite login-ul la `/api/auth/signin`
- `/api/auth/signin` folosește providerul local de autentificare
- parola admin creată în installer ar trebui să fie validată local

Problema vizibilă este în UI-ul `/auth`: când `audience=company`, pagina afișează încă mesajul de website „OPSQAI is a Windows product” și butonul spre `/windows-only`, în loc să afișeze formularul local de login. De asta pare că aplicația instalată te trimite înapoi la website/download.

## Plan de corecție

1. **Fac `/auth` să aibă două comportamente complet separate**
   - Cloud / `opsqai.de`: păstrează Portal + MC + mesajul pentru company users.
   - Self-Hosted / Windows local: afișează direct formularul de login local cu email/parolă.
   - În Self-Hosted nu se mai afișează selector Portal / MC / Company.
   - În Self-Hosted nu se mai afișează `/windows-only`, Contact sales sau „download app”.

2. **Login-ul Self-Hosted va folosi userul creat în installer**
   - Formularul din desktop app va apela providerul local existent.
   - Providerul local va apela `/api/auth/signin`.
   - `/api/auth/signin` va valida în baza de date locală userul/parola create de installer.
   - După login: redirect direct la `/app`, nu la portal/cloud.

3. **Protejez `/app` ca aplicație Self-Hosted reală**
   - Dacă userul nu e logat în Self-Hosted: redirect la `/auth?audience=company&next=/app`.
   - Dacă userul e logat: vede dashboardul/modulele Self-Hosted.
   - Chat, KB, SOPs, Users etc. rămân în `/app/*`.

4. **Elimin loop-ul `/windows-only` din instalarea Windows**
   - `/windows-only` rămâne doar pentru website/cloud, unde explică utilizatorilor că nu se loghează pe opsqai.de.
   - În build-ul Self-Hosted, orice acces accidental la `/windows-only` va duce înapoi la login/app local.

5. **Desktop shell-ul va arăta ca program, nu browser**
   - Fără meniu clasic de browser inutil pentru client.
   - Fără „Open in Browser” ca acțiune principală.
   - Fereastra rămâne OPSQAI, local, orientată pe aplicație.

6. **Verific flow-ul final**
   - Deschidere iconiță Windows: apare login Self-Hosted real.
   - User/parolă admin din installer: intră în `/app`.
   - Se văd modulele Self-Hosted: Chat, KB etc.
   - Nu apare `opsqai.de`, `/windows-only`, „download app” sau flow cloud.

## Rezultatul dorit

Ce ai construit trebuie să devină clar:

- `opsqai.de` = website, Customer Portal, Management Center pentru OPSQAI.
- aplicația instalată Windows = produsul real Self-Hosted al clientului.

După acest fix, clientul nu mai simte că a instalat „un link spre web”, ci un program local care pornește OPSQAI și îl lasă să se logheze cu adminul creat în installer.