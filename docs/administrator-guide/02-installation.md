# 2. Installation

## Docker (recommended)

```bash
# 1. Pull the pinned installer package for your installer_version
mkdir -p /opt/opsqai && cd /opt/opsqai
curl -fsSL https://opsqai.de/releases/1.0.0/opsqai-1.0.0.tar.gz | tar xz

# 2. Configure
cp docker/.env.example docker/.env
# edit docker/.env — set POSTGRES_URL, S3_ENDPOINT, PUBLIC_URL, etc.

# 3. Start
cd docker && docker compose up -d

# 4. Verify
docker compose exec app opsqai doctor
```

## Bare metal

Bare-metal installation is supported but requires the customer to provide their own Node.js 20+ runtime and a supervised process manager. See `docs/technical-documentation/09-deployment.md`.

## Verify the image checksum

Every release manifest contains the SHA-256 of the tarball and the Docker image digest. Compare before starting.
