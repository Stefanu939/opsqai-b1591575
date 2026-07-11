# 7. Storage adapters

- Interface: `src/lib/storage/adapter.ts`.
- Implementations: `s3` (works for AWS, MinIO, R2, B2, Wasabi).
- Config lives in `platform_config` (endpoint, region, bucket names). Keys live in host env vars, never in DB.
- Signed URLs are generated server-side with a default TTL of 5 minutes.
