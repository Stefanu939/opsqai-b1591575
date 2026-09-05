# Restaurarea navigației din header

## Obiectiv
Păstrăm headerul principal complet și interactiv pe toate paginile publice, fără să readucem efectele hover eliminate din restul site-ului.

## Modificări
- Excludem headerul din regula globală care neutralizează hover-ul pe paginile publice non-blog.
- Restaurăm feedbackul vizual pentru:
  - logo-ul OPSQAI;
  - linkurile Product, Overview, Platform, Self-Hosted, Security, Pricing și Company;
  - selectorul EN / DE / RO;
  - butonul pentru tema light/dark;
  - Sign In și butonul de contact/propunere atunci când este vizibil.
- Păstrăm evidențierea paginii active și focusul vizibil pentru navigarea din tastatură.
- Nu schimbăm structura, culorile Aurora Noir, textele sau destinațiile linkurilor.
- Nu modificăm regula cerută anterior pentru restul paginilor: fără hover în afara headerului, cu blogul ca excepție.

## Verificare
- Verificăm headerul pe desktop și la lățimea curentă a preview-ului.
- Confirmăm că fiecare link și control funcționează și are feedback vizual.
- Confirmăm că hover-ul nu reapare pe carduri, secțiuni sau alte elemente publice.
- Rulăm verificarea de tipuri și build-ul final.
