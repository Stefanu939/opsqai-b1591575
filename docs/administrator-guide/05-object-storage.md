# 5. Object storage

OPSQAI stores originals of ingested documents, generated exports, and workspace artifacts in an S3-compatible object store. Any of the following works: MinIO, AWS S3, Backblaze B2, Cloudflare R2, Wasabi.

## Buckets

- `opsqai-documents` — uploaded originals (private).
- `opsqai-artifacts` — generated exports / workspace artifacts (private, short-lived).
- `opsqai-brand` — brand assets (private, served through signed URLs).

## Encryption

Enable server-side encryption at the bucket level. OPSQAI never uploads unencrypted objects; the bucket policy MUST enforce SSE.

## Lifecycle

`opsqai-artifacts` should have a 30-day expiry rule.
