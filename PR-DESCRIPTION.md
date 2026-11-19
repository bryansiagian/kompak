## Summary

Prepare Kompak M7 for single-VPS production deployment using one HTTPS origin for Next.js, NestJS REST API, and Socket.IO.

## Changes

- Add a separate `compose.production.yml` with private PostgreSQL, web/API services, health checks, and Prisma migration on API startup.
- Add Caddy reverse proxy with automatic TLS and WebSocket forwarding.
- Add `.dockerignore` to prevent secrets and local build artifacts entering Docker images.
- Add `.env.production.example`, production configuration validation script, and Node built-in regression tests.
- Extend GitHub Actions CI with production configuration tests and API/web Docker image builds.
- Add live deployment smoke checks and an operational guide, including SMTP, backup, demo account, rollback and manual QA.

## Validation

- [x] `node --test scripts/check-production-env.test.mjs` (run during patch preparation)
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e`
- [ ] `pnpm build`
- [ ] Docker API/web builds in CI
- [ ] Actual VPS deployment + HTTPS + SMTP + Socket.IO + AI manual QA

## Notes

No production secrets or user data are included. This PR prepares deployment code and pipelines; public URL, real SMTP integration, screenshots, and pilot/demo verification remain operational steps requiring host credentials and infrastructure.
