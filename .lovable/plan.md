# Deblocarea înscrierii în KAI fără deschiderea accesului privat

## Problema confirmată
Pagina actuală `/kai` permite crearea unui cont prin email sau Google, dar regula activă de creare a conturilor respinge utilizatorii noi fără invitație. Redirecționarea vechii pagini `/prospect` către `/kai` nu rezolvă această restricție.

Nu este sigur să eliminăm doar mesajul de blocare: aceeași regulă atribuie compania și rolul din informații modificabile de utilizator și poate acorda rolul de proprietar primului cont.

## Rezultatul dorit
- Vizitatorii își pot crea un cont pentru KAI, prin email sau Google.
- Conturile publice nu primesc o companie, roluri privilegiate, acces la Customer Portal sau Management Center.
- Invitațiile și crearea conturilor de către administrator rămân funcționale.
- Confirmarea emailului, conversația începută și limitele de 2 întrebări fără cont / 30 de mesaje pe sesiune rămân neschimbate.
- Brandingul Google este o cerere separată și nu face parte din această corecție.

## Implementare
1. Înlocuim regula de înscriere Cloud printr-o modificare controlată, care creează profilul unui vizitator fără apartenență la companie și fără atribuirea unor roluri din datele furnizate de acesta.
2. Păstrăm atribuirea companiei și drepturilor numai prin invitații verificate sau operațiile deja autorizate ale administratorului. Verificăm ambele căi înainte de aplicare, inclusiv restaurarea proprietarului, fără a permite promovarea automată a unui vizitator.
3. Păstrăm separarea existentă între KAI, Portal și MC; nu modificăm înscrierea locală Self-Hosted, care rămâne administrată de companie.
4. Verificăm setările reale pentru înscriere, email și Google și activăm numai metodele deja cerute, dacă sunt dezactivate.

## Verificare
- Test durabil al regulii: înscrierea publică reușește și creează un profil fără companie și fără rol privilegiat.
- Test negativ: trimiterea unor valori de companie sau rol în datele de înscriere nu acordă drepturi.
- Test pozitiv: invitația validă și crearea autorizată de către administrator păstrează compania și drepturile corecte.
- Verificare a fluxului real din KAI: cont nou prin email, stare de confirmare și continuarea conversației după autentificare; verificăm că Portal și MC rămân inaccesibile acestui cont.
- Verificăm Google în limita unei autentificări interactive disponibile și raportăm explicit orice parte care necesită intervenția utilizatorului.
- Marcăm constatarea QA ca rezolvată numai după aplicarea și verificarea corecției.

## Detalii tehnice
- Modificarea vizează `public.handle_new_user()` și, numai dacă este necesar, căile autorizate de creare/invitare a conturilor; nu se editează istoricul migrărilor existente.
- Aplicăm schimbarea prin instrumentul de migrare Lovable Cloud, cu privilegiile funcției restricționate.
- Datele utilizatorului (`raw_user_meta_data`) pot furniza numele sau limba, nu autorizația pentru companie ori roluri. Folosim dovezi server-side verificate pentru orice atribuire de acces.
- Înregistrăm regula de arhitectură în `AGENTS.md` și păstrăm testele lângă cele existente.