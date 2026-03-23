---
paths:
  - ".github/workflows/**"
---
# CI/CD Rules

- GitHub Actions for CI — workflows in `.github/workflows/`
- Deploy on push/merge to master → S3 + CloudFront
- Pin action versions to SHA or major version tag
- AWS auth via secrets (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) — not OIDC
- CloudFront invalidation must include all routed paths (`/`, `/index.html`, `/status/board`, `/command`)
- `index.html` served with no-cache headers; hashed bundles with 1-year immutable cache
