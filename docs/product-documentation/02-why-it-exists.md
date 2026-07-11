# 2. Why OPSQAI exists

Enterprises with high compliance overhead (manufacturing, energy, healthcare, regulated services) share a repeating problem:

1. Operational knowledge is spread across shared drives, wikis, ticketing systems and people's heads.
2. New joiners take months to become productive.
3. Auditors ask "how do you know the current SOP was followed?" and no one can answer without a scavenger hunt.
4. Public LLMs cannot be pointed at that knowledge because the data can never leave the customer's boundary.

OPSQAI addresses this by keeping the entire pipeline — ingestion, embeddings, retrieval, generation, audit — inside the customer's own install, with a governance surface (roles, audit log, SOP acknowledgements, retraining events) baked in.

## Problems it solves

- **Knowledge retrieval** — natural-language search over the customer's own procedures.
- **SOP lifecycle** — versioned SOPs with acknowledgement tracking.
- **Onboarding** — Academy module with lessons, quizzes, certificates.
- **Support deflection** — FAQ and internal-request modules.
- **Governance evidence** — audit log covering ingestion, retrieval, chat, admin actions.

## What OPSQAI deliberately does NOT solve

- Not a document management system (bring your own DMS).
- Not a ticketing system replacement (integrates, does not replace).
- Not a general-purpose LLM playground.
