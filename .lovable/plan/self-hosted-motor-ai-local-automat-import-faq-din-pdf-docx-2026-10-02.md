# Self-Hosted: motor AI local automat + import FAQ din PDF/DOCX

## Problema 1 — Motorul AI local (Organization › AI provider)
Pagina verifică doar Ollama (port 11434), deși installerul poate porni llama.cpp (port 11440). Rezultat: „Engine unavailable", modele lipsă, câmpuri editabile care nu au efect.

Ce facem (revenire la Ollama complet automat, cum ai cerut):
- Installerul folosește din nou **Ollama ca motor implicit**, instalat silențios din kit; modelele (chat + embedding) se descarcă automat la instalare, cu progres vizibil. Utilizatorul nu descarcă și nu setează nimic.
- llama.cpp rămâne doar opțiune avansată, ascunsă implicit.
- Pagina AI provider detectează automat motorul activ și arată starea reală (pornit, modele instalate).
- Câmpurile de configurare devin doar citire; rămâne un singur buton „Descarcă modelele lipsă" care repară automat o instalare incompletă (cazul tău actual: 0 modele).

## Problema 2 — Import FAQ din PDF/DOCX
Cauza (din cod): tot textul documentului (până la 30.000 caractere) e trimis dintr-o dată modelului local mic, cu instrucțiunea „extrage perechile întrebare/răspuns existente". Un SOP (ex. procedura BT) nu conține întrebări gata scrise, iar modelul local depășește memoria de context → răspuns trunchiat / fără JSON → eroarea „The AI response could not be read as JSON".

Ce facem:
- Documentul se împarte în bucăți mici (~5.000 caractere) procesate pe rând.
- Instrucțiunea devine: extrage întrebările existente **sau formulează** întrebări frecvente din procedură, cu răspunsuri strict din text (fără informații inventate), în limba documentului.
- Cerem răspuns în format JSON strict de la motor; o bucată eșuată se reîncearcă o dată, apoi se sare peste ea fără să oprească importul.
- Rezultatele se unesc și se elimină duplicatele; previzualizarea rămâne editabilă înainte de salvare.
- Mesaj clar dacă nu s-a extras nimic, plus afișarea progresului („Analizez secțiunea 3 din 8").

## Verificare
- Verificări statice/tipuri (fără teste runtime, conform regulii).
- Test real pe Windows după build: instalare curată → AI provider arată motorul pornit cu modele → import FAQ din `OPSQAI_SOP_Banca_Transilvania_Demo.pdf` produce întrebări cu răspunsuri.

## Detalii tehnice
- `ai-engine.functions.ts` + `local-ai-engine-card.tsx`: probă după `config.ai.provider` (ollama 11434 / llamacpp 11440 `/v1/models`), acțiune `pullMissingModels`.
- `init.js` / `wizard.js`: provider implicit `ollama`, text hint actualizat; `setupAiEngine` (ollama.cjs) rulează pull automat.
- `faq-import.functions.ts` `parseViaAi`: chunking, prompt nou, `providerOptions` JSON mode când e suportat, retry 1x, dedupe după întrebarea normalizată; testele existente `faq-import-json` rămân valide.
