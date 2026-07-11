# 8. Pre-release checklist

Must all be green before tagging `v1.0.0` (or any subsequent GA).

## Build & test

- [ ] `bunx vitest run` — all tests pass.
- [ ] `bun run build:dev` — no errors, no warnings on route files.
- [ ] Typecheck clean.
- [ ] SEO findings — no critical.
- [ ] Security scan — no critical findings unresolved.

## Product

- [ ] `opsqai doctor` green on the reference install.
- [ ] Reference install: install → wizard → doctor green → issue Installation License + 2 Module Licenses → import via portal → all seven DR scenarios pass.
- [ ] Every doc renders in-app and exports as PDF.
- [ ] Every marketing page reachable, `/pricing` and `/product` reflect final module model.

## Release engineering

- [ ] `installer_version` bumped in seed migration and `package.json`.
- [ ] `CHANGELOG.md` + `RELEASE_NOTES.md` updated.
- [ ] Signed release manifest published.
- [ ] Cosign signatures on Docker images.
- [ ] `SECURITY.md` up to date; PGP key valid.
- [ ] SBOM (CycloneDX) generated and attached to the release.

## Compliance

- [ ] DPA + subprocessors list current.
- [ ] Responsible AI page reviewed.
- [ ] `/trust/*` pages current.
