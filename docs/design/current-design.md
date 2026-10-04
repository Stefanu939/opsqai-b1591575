# OPSQAI — Current design: Midnight Command

Confirmed by the user on 2026-10-01 from a reference dashboard image. Applies to every scope (Self-Hosted, all workspaces incl. HR/Transport, Management Center, Portal, public site).

- Palette: deep midnight navy background (oklch 0.15 0.025 275), slightly lighter cards, violet primary (oklch 0.6 0.2 285), teal success, amber warning, red critical. Thin translucent borders, no heavy shadows.
- Type: Space Grotesk for headings/display, Inter for body. Small uppercase tracked violet eyebrow labels ("CENTRU DE COMANDĂ").
- Layout: dark sidebar with grouped sections (Spațiu de lucru / Aplicații / Administrare), every item with a Lucide icon at size 4; active item has a subtle violet-tinted fill and left accent. Top bar: context label, centered universal search (Ctrl/Cmd+K), local status dot on the right.
- Pages: greeting + one-line summary, priority list with colored left severity bars and "Deschide →" text actions, quick-action tiles, side status column with progress bars.
- Interaction: slide-over side panels for details, at most two clicks to any action.
- Tokens live only in `src/styles.css`: dark Midnight Command in `:root` (default), light neutral variant with the same violet accent in `html:not(.dark)`, switched by the theme toggle.
