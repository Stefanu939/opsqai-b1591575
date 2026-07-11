# 11. Maintenance

`maintenance_expires_at` gates updates and vendor support. `expires_at` gates module availability. These are separate axes.

## Architecture Decisions

- **AD-024: Maintenance and availability are separate axes.** Alternative (single "expires" field) rejected: customers frequently want to stop paying for updates while keeping current data accessible.
