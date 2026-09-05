# Chat "Teams Workspace" pentru Management Center, Customer Portal și Self-Hosted

Chatul dintre oameni devine un spațiu de conversație mare, în stil Teams, cu o singură bulă per mesaj. Aceleași funcționalități există deja (mesaje, emoji, atașamente, imagini, reacții, citit) și se păstrează — se schimbă doar forma și mărimea.

## Cum va arăta

- Panoul se deschide mult mai mare pe desktop (aproximativ 1000x740, limitat la ecran), cu două coloane:
  - stânga: lista de conversații, căutare de persoane, indicator de mesaje necitite, ultimul mesaj;
  - dreapta: conversația activă cu antet (nume, rol, acțiuni) și zona de scris jos.
- Un mesaj = o singură bulă. În interiorul bulei: numele expeditorului (doar la primul mesaj din grup), textul/imaginea/fișierul, ora și starea de citire.
- Mesajele consecutive ale aceleiași persoane se grupează, cu avatar afișat o singură dată lângă grup.
- La trecerea cu mouse-ul peste o bulă apar acțiunile: reacție cu emoji, copiere, descărcare atașament.
- Ziua se separă cu o etichetă discretă (Azi / Ieri / data).
- Imaginile se afișează ca previzualizare în bulă, cu deschidere mărită la click.
- Pe telefon rămâne pe tot ecranul: întâi lista, apoi conversația, cu buton de întoarcere.
- Stil enterprise Graphite (aceleași culori pe light/dark), colțuri compacte, fără efecte de sticlă.

## Unde se aplică

- Management Center (echipa OPSQAI)
- Customer Portal (contacte client)
- Self-Hosted (colegii din companie)

Toate trei folosesc aceeași componentă de chat, deci arată identic; datele și permisiunile rămân separate ca acum.

## Ce NU se schimbă

- AI Chat (asistentul) rămâne exact cum e.
- Licențiere, roluri/permisiuni, module, stocarea mesajelor și atașamentelor, izolarea între clienți.

## Detalii tehnice

- Componente noi partajate în `src/components/support/chat/`: `chat-workspace.tsx` (layout două coloane), `conversation-list.tsx`, `message-thread.tsx`, `message-bubble.tsx` (bulă unică + grupare + hover actions), `day-divider.tsx`, `composer.tsx`.
- `src/components/support/chat-glider.tsx` și `src/components/support/support-widget.tsx` devin containere subțiri (trigger + dialog/panel dimensionat) care randează `ChatWorkspace`; logica de date existentă se mută neschimbată în hook-uri (`use-conversations`, `use-messages`).
- Server functions din `src/lib/chat.functions.ts` rămân neschimbate (`listMyConversations`, `listMessages`, `sendMessage`, `markConversationRead`, `createChatUploadUrl`, `signChatAttachment`, `searchChatContacts`).
- Se refolosesc `chat/emoji-picker.tsx` și `chat/message-reactions.tsx`.
- Dimensiuni: `w-[min(1000px,calc(100vw-2rem))] h-[min(740px,calc(100dvh-4rem))]`, sub `md` full-screen.
- Verificare: typecheck, build, plus check vizual în Playwright pe light/dark, desktop și mobil.
