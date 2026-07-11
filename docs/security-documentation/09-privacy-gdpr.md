# 9. Privacy & GDPR

## Data controller / processor

- **Customer** is the data controller for all operational data inside their install.
- **OPSQAI** is a data processor **only** for the metadata that lives on opsqai.de (customer registry, licenses, portal accounts, support tickets).
- The customer's own infrastructure is **not** a subprocessor of OPSQAI.

## Subprocessors (Management Center only)

- Lovable (application platform + hosting).
- Supabase (auth + database for the MC).
- Email delivery provider (as configured on the MC).

An up-to-date subprocessor list is at `/legal/dpa` on the marketing site.

## Data subject rights

- Access / export / delete: handled inside the customer's install by their admin. The MC has no operational data to hand out.
- Portal account deletion: available in the Portal profile page (soft-delete + 30-day purge).

## Cross-border transfers

Customer chooses where to host their install. The Management Center is hosted in the EU by default; other regions available on request.
