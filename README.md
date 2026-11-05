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

- Email and password authentication with refresh-token rotation
- Groups (_Kelompok_) with roles: Ketua (owner) and Anggota (member)
- Join a group through a shareable link, with a one-tap "share to WhatsApp" button
- Projects (_Proyek_) with columns and tasks (_Tugas_), using a default _Belum dikerjakan / Sedang dikerjakan / Selesai_ template
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

| Layer    | Technology                                                                                |
| -------- | ----------------------------------------------------------------------------------------- |
| Monorepo | pnpm workspaces                                                                           |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, dnd-kit, next-intl |
| Backend  | NestJS, TypeScript, Prisma, Socket.IO                                                     |
| Database | PostgreSQL                                                                                |
| Shared   | Zod schemas (`packages/shared`) used by both frontend and backend                         |
| Auth     | JWT access token + httpOnly refresh cookie, argon2                                        |
| Testing  | Jest, Vitest, Testing Library, Playwright                                                 |
| DevOps   | Docker, Docker Compose, GitHub Actions                                                    |
| Cloud    | AWS (ECR, App Runner, RDS)                                                                |
| AI       | LLM provider accessed server-side through an `AiService`                                  |

## Architecture

```
Browser (Next.js)
   │  REST (JSON)           WebSocket (Socket.IO)
   ▼                         ▼
NestJS API  ──────────►  Gateway (rooms per project)
   │   │
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

More detail, including the data model and API surface, is in [PRD.md](./PRD.md).

## Getting Started

### Prerequisites

- Node.js (LTS)
- pnpm
- Docker and Docker Compose

### Run the full stack with Docker

```bash
git clone https://github.com/bryansiagian/kompak.git
cd kompak
cp .env.example .env        # fill in the values
docker compose up --build
```

Then open the web app at `http://localhost:3000`. The API listens on `http://localhost:4000`.

### Run in development mode

```bash
pnpm install
cp .env.example .env
docker compose up -d db                      # PostgreSQL only
pnpm --filter api prisma migrate dev         # apply migrations
pnpm --filter api prisma db seed             # demo data
pnpm dev                                     # web + api in watch mode
```

### Useful commands

| Task          | Command                      |
| ------------- | ---------------------------- |
| Lint          | `pnpm lint`                  |
| Typecheck     | `pnpm typecheck`             |
| Unit tests    | `pnpm test`                  |
| API e2e tests | `pnpm --filter api test:e2e` |
| Web e2e tests | `pnpm --filter web test:e2e` |
| Build         | `pnpm build`                 |

### Environment variables

Copy `.env.example` to `.env`. Never commit your real `.env`.

| Variable                                    | Purpose                                    |
| ------------------------------------------- | ------------------------------------------ |
| `DATABASE_URL`                              | PostgreSQL connection string               |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`   | Token signing secrets                      |
| `COOKIE_DOMAIN`, `CORS_ORIGIN`              | Cookie and CORS settings                   |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` | API and WebSocket URLs used by the browser |
| `AI_API_KEY`, `AI_MODEL`, `AI_DAILY_BUDGET` | AI provider settings (server-side only)    |

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

- [ ] **M0** Repository setup: monorepo, Docker Compose, CI skeleton, health check
- [ ] **M1** Authentication
- [ ] **M2** Groups and projects, invite link and join flow
- [ ] **M3** Columns and tasks with drag and drop _(first test with classmates)_
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
