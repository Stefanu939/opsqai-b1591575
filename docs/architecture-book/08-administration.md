# 8. Administration

Setup wizard, Doctor, Admin UI — see Admin Guide.

## Architecture Decisions

- **AD-018: Setup Wizard progress stored as step ids only.** Alternative (store partial config incl. secrets) rejected: leaks credentials into a table that survives resume.
- **AD-019: Doctor is both an in-app panel and a CLI.** Rationale: DR situations require CLI access when the UI is unreachable.
