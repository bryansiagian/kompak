# Kompak M7 — deployment patch

This ZIP is an **overlay**, not a complete repository. Its files are authored against `bryansiagian/kompak` **main** as inspected 19 November 2026 (main SHA `6c5d607b523f2358fe3044f70bff6e5bfbb1ab0f`). Apply on a clean feature branch created from the latest `main`.

## Windows PowerShell (recommended)

1. `git status` — ensure no uncommitted work.
2. `git switch main`
3. `git pull --ff-only origin main`
4. `git switch -c feat/m7-production-deployment`
5. Extract the ZIP, **copy the ZIP contents into the repository root, preserving paths** (do not copy this entire directory as a nested folder).
6. `node --test scripts/check-production-env.test.mjs`
7. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
8. If Docker is available: `docker build -f apps/api/Dockerfile -t kompak-api:local .` and `docker build --build-arg NEXT_PUBLIC_API_URL=https://kompak.example.com --build-arg NEXT_PUBLIC_WS_URL=https://kompak.example.com -f apps/web/Dockerfile -t kompak-web:local .`.
9. Review `git diff` and stage only the intended files (do not commit `.env.production`).
10. Commit, push, create PR. Follow `docs/M7-DEPLOYMENT.md` when you have a real domain, VPS and SMTP service.

## Files included

- `.dockerignore` — stops `.env` and local artifacts from entering Docker build context.
- `.env.production.example` — production configuration template without real secrets.
- `compose.production.yml` — PostgreSQL, API (runs migrations), web, Caddy proxy.
- `deploy/Caddyfile` — single-domain HTTPS reverse proxy including Socket.IO.
- `.github/workflows/ci.yml` — existing CI plus production config tests and Docker image builds.
- `scripts/check-production-env.mjs` + test — pre-deployment configuration checks.
- `scripts/smoke-production.mjs` — checks public web, login and health endpoints.
- `docs/M7-DEPLOYMENT.md` — deployment and operations guide.

## Commit and PR

Commit: `feat(deploy): add production Compose, HTTPS proxy and release checks`

PR title: `feat(deploy): prepare M7 public deployment with Docker and HTTPS`

Suggested PR description is provided in `PR-DESCRIPTION.md`.

## What this ZIP does not do

This cannot provision a paid/owned domain, SMTP credentials, or VPS. It does not deploy a public website automatically; that must be verified with the real host using the documented smoke/acceptance tests. CI Docker builds will provide a second validation gate after opening the PR.
