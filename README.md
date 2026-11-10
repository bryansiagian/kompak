# Kompak

**Tugas kelompok jadi lebih kompak.**

Kompak is a simple, friendly, real-time collaboration web app for university student group assignments. Create a group, list what needs to be done, assign tasks, and see everyone's progress live, all from your phone and in Indonesian.

> 🚧 **Status: in development.** This README describes the planned product and how to run it. See the [roadmap](#roadmap) for progress.

- 🔗 **Live demo:** coming soon
- 📄 **Product spec:** [PRD.md](./PRD.md)
- 🤖 **Contributor and AI agent guide:** [AGENTS.md](./AGENTS.md)

---

## Tentang Kompak

Banyak mahasiswa masih mengerjakan tugas kelompok lewat WhatsApp atau Instagram. Akibatnya tugas tenggelam di chat, tidak jelas siapa mengerjakan apa, dan deadline terlewat. Alat seperti Trello sudah ada, tetapi terasa rumit dan jarang dipakai mahasiswa.

Kompak dibuat agar semudah aplikasi chat, tetapi dengan struktur papan tugas: buat kelompok, bagikan link ke grup WhatsApp, bagi tugas, dan pantau progres bersama.

## The Problem

Group assignments at many universities are coordinated through chat apps, which leads to:

- Tasks and decisions buried in long threads
- Unclear ownership of work
- Forgotten deadlines
- Uneven contribution that is hard to see

Existing tools are built for professional teams and feel too complex for students. Kompak keeps the board, drops the complexity.

## Features

**Core (MVP)**
- Registration confirmed with a 6-digit code sent to the user's email, so every account has a verified address
- Email and password login with refresh-token rotation
- Forgot password through a 6-digit reset code sent by email
- Groups (*Kelompok*) with roles: Ketua (owner) and Anggota (member)
- Join a group through a shareable link, with a one-tap "share to WhatsApp" button
- Projects (*Proyek*) with columns and tasks (*Tugas*), using a default *Belum dikerjakan / Sedang dikerjakan / Selesai* template
- Drag and drop to reorder and move tasks, with touch support and a non-drag alternative
- Real-time sync: changes appear on other members' screens within about a second
- Task details: description, assignee, due date, labels
- Mobile-first, Indonesian UI

**Planned**
- Comments and activity log
- "My tasks" view, progress bar, and deadline states
- Contribution summary per member
- AI helpers: break an assignment into subtasks, summarize long discussions
- Semantic search, task templates, deadline reminders

The full list with priorities is in [PRD.md](./PRD.md).

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, dnd-kit, next-intl |
| Backend | NestJS, TypeScript, Prisma, Socket.IO |
| Database | PostgreSQL |
| Shared | Zod schemas (`packages/shared`) used by both frontend and backend |
| Auth | JWT access token + httpOnly refresh cookie, argon2, emailed one-time codes |
| Email | Nodemailer over SMTP (Mailpit as the local inbox) |
| Testing | Jest, Vitest, Testing Library, Playwright |
| DevOps | Docker, Docker Compose, GitHub Actions |
| Cloud | AWS (ECR, App Runner, RDS) |
| AI | LLM provider accessed server-side through an `AiService` |

## Architecture

```
Browser (Next.js)
   │  REST (JSON)           WebSocket (Socket.IO)
   ▼                         ▼
NestJS API  ──────────►  Gateway (rooms per project)
   │   │   │
   │   │   └──► MailService ──► SMTP (Mailpit in local dev)
   │   └──► AiService ──► LLM provider
   ▼
PostgreSQL (Prisma)
```

Key decisions:

- **REST for writes, WebSocket for fan-out.** Clients mutate through REST. After a successful write, the server broadcasts an event to the project's room and clients update their query cache.
- **Optimistic UI.** Moving a task updates the screen immediately and rolls back if the server rejects it.
- **Fractional ordering.** Tasks and columns store a numeric `position`, so inserting between two items needs no mass update.
- **Authorization in the service layer.** Every query is scoped through group membership and role.
- **Shared schemas.** Request and response shapes live in one package so the two apps cannot drift apart.
- **Accounts are created after the email is proven.** Registration is two steps (request a code, then submit code, name, and password), so there is no unverified-account state to squat on. Codes are single-use, expire in 15 minutes, allow 5 wrong attempts, and are stored only as HMAC hashes.

More detail, including the data model and API surface, is in [PRD.md](./PRD.md).

## Getting Started

### Prerequisites

- Node.js (LTS)
- pnpm
- Docker and Docker Compose

### Run in development mode

```bash
git clone https://github.com/bryansiagian/kompak.git
cd kompak
pnpm install
cp .env.example .env                         # then fill in the secrets
docker compose up -d db mailpit              # PostgreSQL and the local mail inbox
pnpm --filter api migrate:dev                # apply migrations
pnpm dev                                     # web + api in watch mode
```

- Web app: `http://localhost:3000`
- API: `http://localhost:4000` (health check at `/health`)
- Mailpit inbox (verification and reset emails): `http://localhost:8025`
- PostgreSQL is exposed on host port `5433` to avoid clashing with a local installation.

Use `localhost` (not the network IP) in the browser, because the refresh cookie and CORS are tied to it.

If you do not want to run Mailpit, remove `SMTP_URL` from `.env`: in development the API then prints each email to its log. In production `SMTP_URL` is required.

### Run the full stack with Docker

```bash
cp .env.example .env                         # fill in the secrets
docker compose up -d db
pnpm install
pnpm --filter api migrate:deploy             # create the tables once
docker compose up --build
```

Then open the web app at `http://localhost:3000`. The API listens on `http://localhost:4000` and Mailpit on `http://localhost:8025`.

### Useful commands

| Task | Command |
|---|---|
| Generate the Prisma client | `pnpm generate` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Unit tests | `pnpm test` |
| API e2e tests (needs PostgreSQL) | `pnpm test:e2e` |
| New migration | `pnpm --filter api migrate:dev --name <short_name>` |
| Build | `pnpm build` |

### Environment variables

Copy `.env.example` to `.env`. Never commit your real `.env`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Token signing secrets |
| `EMAIL_CODE_SECRET` | Secret for hashing emailed verification and reset codes |
| `SMTP_URL`, `MAIL_FROM` | SMTP connection and sender for transactional email (Mailpit in local dev) |
| `COOKIE_DOMAIN`, `CORS_ORIGIN` | Cookie and CORS settings |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` | API and WebSocket URLs used by the browser |
| `AI_API_KEY`, `AI_MODEL`, `AI_DAILY_BUDGET` | AI provider settings (server-side only) |

Generate strong secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Project Structure

```
.
├── apps/
│   ├── web/        # Next.js frontend
│   └── api/        # NestJS backend (Prisma schema and migrations inside)
├── packages/
│   └── shared/     # Zod schemas and shared types
├── docker-compose.yml
├── .github/workflows/
├── PRD.md
├── AGENTS.md
└── README.md
```

## Roadmap

- [x] **M0** Repository setup: monorepo, Docker Compose, CI skeleton, health check
- [x] **M1** Authentication
- [ ] **M2** Groups and projects, invite link and join flow
- [ ] **M3** Columns and tasks with drag and drop *(first test with classmates)*
- [ ] **M4** Real-time collaboration
- [ ] **M5** Comments, activity log, filters
- [ ] **M6** AI features
- [ ] **M7** Public deployment, demo account, screenshots
- [ ] **M8** Pilot with real student groups, feedback summary

## Screenshots

Coming soon.

## Pilot Results

To be filled in after the pilot with real student groups.

## Contributing

Contributions and feedback are welcome. Please read [AGENTS.md](./AGENTS.md) for conventions, commands, and the definition of done. Use Conventional Commits (for example `feat(tasks): add move endpoint`) and make sure `pnpm lint && pnpm typecheck && pnpm test` passes before opening a pull request.

## License

MIT. Add a `LICENSE` file to the repository (change the license here if you prefer a different one).

## Author

Built by [@bryansiagian](https://github.com/bryansiagian) as a portfolio project, together with feedback from fellow students.