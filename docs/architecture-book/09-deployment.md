# 9. Deployment

Docker is reference; bare metal is supported.

## Architecture Decisions

- **AD-020: `installer_version` decoupled from application version.** Rationale: installer contract changes (Compose file topology, migration policy) evolve slower than app releases. Consequence: manifests declare both.
- **AD-021: Docker Compose over Kubernetes for reference.** Alternative (Helm chart as reference) rejected for RC scope: increases the smallest-customer install cost. Helm chart is a v1.1 candidate.
