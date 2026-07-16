
# Chat lateral stil WhatsApp — plan

## 1. Glider lateral (bula ascunsă)

- Nou wrapper `SupportGlider` care înlocuiește FAB-ul rotund actual.
- Pe margine dreaptă jos apare un **tab îngust vertical** (36×88 px), 70% ascuns în afara ecranului, cu iconiță chat + badge de mesaje necitite.
- Hover / click → slide-in dinspre dreapta: panou 380×640 px pe desktop, full-screen pe mobil.
- Închis prin buton × sau click în afara panoului. Se ține minte starea (deschis/închis) în `localStorage`.
- Vizibil pe orice pagină autentificată (păstrăm montarea din `__root.tsx`).

## 2. Layout WhatsApp în panou

Două view-uri într-un singur panou:

**A. Listă conversații** (view principal la deschidere):
- Header: „Chat" + buton „New" (creion) + input căutare.
- Sub-tabs: `All` · `Team` (colegii tăi) · `OPSQAI` (ticketele existente cu suportul).
- Fiecare rând: avatar (inițiale colorate), nume, ultimul mesaj (preview 1 linie), timp relativ (`12:34` sau `Yesterday`), badge necitite.
- La click pe rând → intri în view-ul conversației.

**B. View conversație** (după selecție):
- Header WhatsApp: back arrow, avatar, nume + status („online" / „last seen"), buton info.
- Bule verzi (mine, aliniate dreapta, culoare `--primary`) și gri (celălalt, aliniate stânga).
- Grupare mesaje consecutive de la același user, timestamp discret sub bulă.
- „Ticks" simple: ✓ trimis, ✓✓ citit (bazat pe `read_at`).
- Compose bar jos: attach (📎 → imagine sau fișier), input text auto-grow, emoji picker, buton send.
- Auto-scroll la mesaj nou, indicator „typing…" opțional (later).

## 3. Căutare cu recomandare

- Buton „New chat" → deschide un search modal / view.
- Input text; la ≥ 2 caractere, apel debounced (300 ms) la server function `searchContacts({ q })`.
- Sursă rezultate = **doar utilizatori din aceeași companie ca tine + staff OPSQAI (`platform_owner`/`platform_admin`)**; niciodată userii altor firme.
- Match pe `full_name` (ilike `%q%`) sau `email` (ilike `%q%`).
- Ordonare: colegi întâi, staff OPSQAI la coadă cu tag „OPSQAI Team".
- Click pe un rezultat → găsește/creează conversația 1:1, deschide direct view-ul B.

## 4. Suport OPSQAI

- Sistemul existent (`support_conversations` / `support_messages`) rămâne intact — devine un „canal special" în listă, marcat cu badge „OPSQAI Support".
- În view-ul conversației arată la fel ca WhatsApp; când răspunde staff, apare cu numele + tag OPSQAI.

## 5. Atașamente (text + imagini + fișiere)

- Bucket **privat** nou `chat-attachments` (max 25 MB / fișier), acces prin signed URL.
- Path: `{conversation_id}/{message_id}/{filename}`.
- Preview inline pentru imagini (thumbnail 240 px), card cu iconiță + nume + mărime pentru alte tipuri.
- MIME acceptate: `image/*`, `application/pdf`, `application/zip`, `text/*`, docs Office.

## 6. Model de date (nou)

```text
direct_conversations
  id, created_at, last_message_at, is_support (bool)
  → dacă is_support = true, e ticket OPSQAI (folosim tabela existentă
     support_conversations în paralel — nu-l dublăm)

direct_conversation_members
  conversation_id, user_id, joined_at, last_read_at
  UNIQUE (conversation_id, user_id)
  → conversație 1:1 = exact 2 rânduri

direct_messages
  id, conversation_id, sender_id, body (text), attachments (jsonb[]),
  created_at, edited_at, deleted_at

direct_message_reads (opțional pentru „✓✓")
  message_id, user_id, read_at
```

- **RLS**: doar userii din `direct_conversation_members` pot citi/scrie în conversație.
- Funcție `find_or_create_direct_conversation(target_user_id)` (SECURITY DEFINER) care verifică că `target_user_id` e coleg sau staff OPSQAI înainte de creare.
- Realtime activat pe `direct_messages` și `direct_conversation_members` prin `alter publication supabase_realtime add table …`.

## 7. Server functions (`src/lib/chat.functions.ts`)

- `listMyConversations()` — join cu ultimul mesaj + necitite.
- `searchContacts({ q })` — colegi + staff OPSQAI, doar câmpuri publice (id, full_name, email, avatar).
- `startDirectConversation({ target_user_id })` — apelează funcția SECURITY DEFINER.
- `listMessages({ conversation_id, before?, limit })` — paginare invers cronologică.
- `sendMessage({ conversation_id, body?, attachments? })` — validează membership, inserează, atinge `last_message_at`.
- `markConversationRead({ conversation_id })` — update `last_read_at`.
- `signChatAttachment({ path })` — signed URL 1h pentru download.
- `uploadChatAttachment({ conversation_id, file })` — upload via storage helper server-side.

## 8. Client (`src/components/support/chat-glider.tsx`)

- Înlocuiește `support-widget.tsx` (păstrăm fișierul vechi doar cât timp migrăm apoi îl ștergem).
- Hooks:
  - `useMyConversations()` — query + subscribe la `direct_messages` insert pe conversațiile mele → invalidate.
  - `useConversationMessages(id)` — query paginat + subscribe realtime pe `conversation_id = eq id`.
  - `useContactSearch(q)` — `useQuery` debounced.
- Componente:
  - `<GliderTab />` — tab îngust cu badge.
  - `<GliderPanel />` — container animat (Framer/CSS transforms).
  - `<ConversationList />`, `<ConversationRow />`
  - `<ConversationView />` cu `<MessageBubble />`, `<Composer />`, `<AttachmentPreview />`.
  - `<ContactSearchSheet />` cu recomandări live.
- Design tokens WhatsApp-like adaptați paletei aplicației (verde primary + gri surface — fără hex-uri hardcodate, folosim tokens existenți).

## 9. Aspecte de securitate

- **Nu expunem emailuri între firme**: `searchContacts` returnează doar `same company OR OPSQAI staff`.
- Chiar dacă cineva ghicește email-ul unui outsider, `find_or_create_direct_conversation` respinge (SECURITY DEFINER cu check explicit).
- Attachments: bucket privat, signed URL 1h, path derivat din `conversation_id` (RLS pe `storage.objects` verifică membership).
- Rate limit: max 30 mesaje / minut / user (trigger simplu).

## 10. Ce nu facem în această iterație

- Grupuri > 2 persoane (doar 1:1 acum).
- Voice notes / video call.
- „Typing indicator" live (mai târziu, prin Presence).
- Reacții emoji la mesaj (mai târziu).
- Editare / ștergere mesaj după trimitere (mai târziu — coloanele există în schemă).

## Ordinea implementării

1. Migrare DB + storage bucket + RLS + funcția SECURITY DEFINER + realtime publication.
2. `chat.functions.ts` (toate server functions + Zod validators).
3. `chat-glider.tsx` cu tab + panou + listă conversații (fără compose încă).
4. `ConversationView` + compose text.
5. Search contacte + start conversație.
6. Atașamente (upload + signed URL + preview).
7. Integrare cu ticketele OPSQAI existente ca sub-canal.
8. Migrare montare: scoatem `SupportWidget` din `__root.tsx`, punem `SupportGlider`, ștergem fișierul vechi.
