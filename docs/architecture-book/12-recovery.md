# 12. Recovery

Seven scenarios, two independent paths — see Security Documentation chapter 12.

## Architecture Decisions

- **AD-025: DR anchor is `install_id`, not `customer_id`.** Rationale: a single customer may operate multiple installs. Consequence: bundle + token + break-glass all bind `install_id`.
- **AD-026: Two independent recovery paths (break-glass + bootstrap token).** Rationale: single-path DR fails when the assumed channel (MC availability or offline secret custody) is exactly what was lost.
- **AD-027: Recovery Mode is an explicit state, not a heuristic.** Set + exited via audited functions. UI clearly indicates it.
