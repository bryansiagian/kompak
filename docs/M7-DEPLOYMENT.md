# Kompak — M7: production deployment (single VPS)

This is a **production-ready deployment configuration**, not proof of a live deployment. A domain, a VPS with a public IP and Docker Compose, real SMTP credentials, and production secrets are required to ship publicly.

## Architecture

```text
Internet / HTTPS
       |
     Caddy (automatic TLS on ports 80/443)
       |\
       | \--- /, /login, /groups/* ------> Next.js web:3000
       +----- /api/*, /health -----------> NestJS API:4000
       +----- /socket.io/* (WebSocket) --> NestJS API:4000
                                             |
                                       PostgreSQL:5432
                                             |
                                        private network
```

One public domain serves frontend, API, WebSocket and refresh cookie. Neither Postgres nor the API is exposed directly to the internet. Caddy provisions HTTPS after DNS resolves and ports 80/443 are reachable. The API retains the pre-existing `api/v1` prefix.

## Prerequisites

- VPS (Linux) with Docker Engine + Docker Compose plugin; enough memory for builds (consider 4 GB+ and swap, depending on host).
- A real domain; DNS A record pointing to the VPS, and AAAA only if IPv6 works. Allow inbound 80 and 443 TCP, optionally 443 UDP (HTTP/3), outbound TLS and SMTP.
- A real SMTP service allowing email verification/reset. **Mailpit is for development only.**
- SSH access, backups, and a secure place for environment secrets. Never commit `.env.production`.

## Deploy

From the repository root on the VPS:

```bash
cp .env.production.example .env.production
# Edit .env.production with actual domain, email, DB creds, secrets and SMTP provider.
# Generate three DIFFERENT secrets, e.g. openssl rand -hex 32
node scripts/check-production-env.mjs .env.production
# Only proceed after this check passes.
docker compose --env-file .env.production -f compose.production.yml config --quiet
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml ps
```

`DATABASE_URL` points to the Docker-internal `db` hostname, not localhost. `POSTGRES_PASSWORD` and the password encoded in `DATABASE_URL` must match. If your password has reserved URL characters, percent-encode them in `DATABASE_URL`. Avoid `$` in `.env.production` passwords unless you understand Compose substitution/escaping. The preflight script validates most of this.

Open `https://YOUR_DOMAIN`, then check:

```bash
node scripts/smoke-production.mjs https://YOUR_DOMAIN
curl -fsS https://YOUR_DOMAIN/health
# See logs without posting secret values publicly:
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 api web proxy
```

**On startup:** the API container waits for PostgreSQL and runs `prisma migrate deploy` before starting NestJS. Startup fails rather than silently serving against an unmigrated database. Do not run multiple migration processes simultaneously. `prisma migrate deploy` does **not** insert demo data or reset the DB.

## Manual acceptance tests after deploying

1. Register using a REAL mailbox, receive verification code, finish registration and log in.
2. Refresh the page, confirm session remains valid. Log out, confirm protected routes redirect. Try reset-password email.
3. Create group and project; add list/card; assign member and apply label; verify reload retains changes.
4. Open board in two browsers and confirm Socket.IO presence and card synchronization; verify no duplicated lists/cards.
5. Test group invite link on a second account and non-member access denial.
6. Generate AI subtasks, select subset and save without duplicates; summarize a discussion. `AI_API_KEY` and `AI_MODEL` must be set to enable AI.
7. Verify HTTP redirects to HTTPS and no mixed-content/browser CORS/cookie errors.
8. Run lint/typecheck/unit/E2E/Docker CI; take screenshots for README and record real demo URL.

## Demo account

A reviewer can use normal sign-up, or an explicitly created **non-admin demo account** using a mailbox you control. Do not store its password, email verification codes, or tokens in Git, README or images. Make a clearly labeled demo board with fictional data, reset it periodically, and avoid using the owner's account as a shared demo account. If you choose to publish demo credentials in a portfolio, use an isolated, non-sensitive environment with reset/abuse protections; otherwise provide access on request.

## Updates and operations

```bash
# After merging, pull changes on VPS:
git pull --ff-only origin main
node scripts/check-production-env.mjs .env.production
docker compose --env-file .env.production -f compose.production.yml up -d --build
node scripts/smoke-production.mjs https://YOUR_DOMAIN
```

- **Backup:** schedule encrypted `pg_dump` to storage **outside** this VPS, and test restoration. The Docker volume persists through `down` but is deleted by `down -v`.
- **Rollback:** retain old image tags/commits and take a database backup before schema changes. Never assume downgrading code automatically reverts a migration.
- **Monitoring:** watch `/health`, service logs, disk, CPU/RAM, DB size, TLS renewal and AI quotas. `/health` currently tests the API process only, not DB/SMTP reachability.
- **Scale:** the Compose configuration is a single-instance baseline. For multi-instance API, review Socket.IO message distribution, migrations and rate-limit consistency before scaling.
- **Security:** use a non-root deploy user, firewall, OS updates, SSH keys, private secrets, and SMTP/TLS protections. For strict production hardening consider a limited Docker build user and a dedicated migration job; existing Dockerfiles still retain build tooling at runtime.

## Troubleshooting

| Symptom | First check |
|---|---|
| HTTPS certificate pending | DNS A/AAAA, public inbound TCP 80/443, proxy logs |
| API 502 | `api` logs; migration success and database health |
| Login does not persist | HTTPS, host-only cookie, browser DevTools `/api/v1/auth/refresh` |
| Socket.IO disconnected | `/socket.io/` routed to API by Caddy; WebSocket and authentication |
| Verification email missing | Real SMTP_URL, MAIL_FROM, provider logs and outbound SMTP firewall |
| AI 503 | `AI_API_KEY`, `AI_MODEL`, AI provider service or output format |
| Docker build fails | Disk/RAM, Node/pnpm versions, lockfile, Docker build job logs |

## Scope and limitations

Included: production Compose, HTTPS Caddy proxy, private PostgreSQL, Prisma startup migrations, production env example and preflight check, live smoke script, CI Docker builds, and documentation. **Not included**: obtaining a domain/VPS/SMTP account, running a deployment, production credentials, managed backups/monitoring service, a live screenshot, or a real demo-account password. Those depend on infrastructure owned by the project maintainer.
