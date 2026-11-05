# AGENTS.md

Guidance for AI coding agents and human contributors working in this repository.
Read [PRD.md](./PRD.md) first for **what** we are building and **why**. This file covers **how to work here**.

> Commands and paths below describe the intended layout. If reality diverges, fix the code or update this file in the same change.

## Project summary

Kompak: a simple, friendly, real-time collaboration web app for student group assignments (groups, projects, tasks, comments, live sync, AI helpers). Target users are university students who currently coordinate through WhatsApp and have not adopted tools like Trello, so simplicity and ease of use are the top priorities.
Stack: Next.js + React + TypeScript (web), NestJS + Prisma + PostgreSQL + Socket.IO (api), pnpm monorepo, Docker.

## Product and UX principles

These matter as much as code quality. When in doubt, choose the simpler option.

- **Simplicity first.** A new user must reach value (create group, add task, invite teammates) in under 2 minutes with no tutorial. Do not add options, settings, or screens that power users would want but students would not.
- **Mobile-first.** Design and test at 360px width first; touch targets at least 44px; drag and drop must work with touch and have a non-drag alternative (for example a "move to" menu).
- **Indonesian UI.** All user-facing text is Indonesian: friendly, polite, no jargon. Strings live in message files (`apps/web/src/messages/id.json`), never hard-coded in components.
- **Vocabulary mapping.** UI says *Kelompok* (workspace), *Proyek* (board), *Kolom* (list), *Tugas* (card), *Ketua* (OWNER), *Anggota* (MEMBER). Code, database, and API keep the technical names.
- **Friendly feel.** Clear empty states, helpful microcopy, small celebratory feedback on completion. Keep animations light and respect `prefers-reduced-motion`.
- **Share-friendly.** Joining a group happens through a link that works well when pasted into WhatsApp.
- **Safe defaults.** New projects start with a default three-column template (*Belum dikerjakan*, *Sedang dikerjakan*, *Selesai*) so no one faces an empty screen.

## Repository layout

```
.
├── apps/
│   ├── web/                # Next.js app (App Router)
│   │   └── src/
│   │       ├── app/        # routes, layouts
│   │       ├── components/ # UI components
│   │       ├── features/   # feature folders (boards, cards, auth, ...)
│   │       ├── lib/        # api client, socket client, utils
│   │       ├── hooks/
│   │       └── messages/   # UI copy (id.json)
│   └── api/                # NestJS app
│       ├── prisma/         # schema.prisma, migrations, seed.ts
│       └── src/
│           ├── modules/    # auth, users, workspaces, boards, lists, cards, comments, ai, realtime
│           ├── common/     # guards, decorators, filters, interceptors
│           └── config/
├── packages/
│   └── shared/             # Zod schemas + TS types shared by web and api
├── docker-compose.yml
├── .github/workflows/      # CI
├── PRD.md
└── AGENTS.md
```

## Setup and commands

Requirements: Node.js LTS, pnpm, Docker.

```bash
pnpm install
cp .env.example .env                              # then fill values
docker compose up -d db                           # start PostgreSQL only
pnpm --filter api prisma migrate dev              # apply migrations
pnpm --filter api prisma db seed                  # demo data
pnpm dev                                          # run web + api in watch mode
```

| Task | Command |
|---|---|
| Run everything in containers | `docker compose up --build` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Unit tests | `pnpm test` |
| API e2e tests | `pnpm --filter api test:e2e` |
| Web e2e (Playwright) | `pnpm --filter web test:e2e` |
| Format | `pnpm format` |
| New migration | `pnpm --filter api prisma migrate dev --name <short_name>` |
| Build all | `pnpm build` |

Before finishing any task, run: `pnpm lint && pnpm typecheck && pnpm test`.

## Environment variables

Defined in `.env.example` (never commit real `.env`). Expected keys:
`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_DOMAIN`, `CORS_ORIGIN`,
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_DAILY_BUDGET`.
Variables without the `NEXT_PUBLIC_` prefix must never be read in browser code.

## Coding conventions

### General
- TypeScript `strict` everywhere. No `any` unless justified with a comment. No `// @ts-ignore`.
- Prefer small, pure functions. Isolate business logic from framework glue so it is unit-testable (e.g. card ordering in `cards/ordering.ts`).
- Naming: `camelCase` for variables/functions, `PascalCase` for types/classes/components, `kebab-case` for file names, `SCREAMING_SNAKE_CASE` for env vars.
- No dead code, no commented-out code, no leftover `console.log`.
- Comments explain **why**, not what.

### Backend (apps/api)
- One NestJS module per domain. Controllers are thin: parse input, call a service, return a result.
- All request bodies and params are validated with the Zod schemas from `packages/shared` (via a validation pipe).
- Every route is authenticated by default. Public routes must be explicitly marked (e.g. `@Public()`).
- Authorization is mandatory: resolve the caller's workspace role with the membership guard, and scope every query through workspace membership. Never fetch a board/card/comment by ID alone.
- Use Prisma only (no raw SQL unless unavoidable; if so, parameterized).
- Wrap multi-step writes in `prisma.$transaction`.
- After a successful mutation, emit the matching real-time event through `RealtimeGateway`. Events go to room `board:{boardId}`.
- Return consistent error shapes via the global exception filter. Do not leak stack traces or internals.
- Log with the Nest `Logger` (structured). Never log secrets, tokens, or full request bodies of auth routes.

### Frontend (apps/web)
- Server data lives in TanStack Query. Do not duplicate it in local state.
- Real-time events update the Query cache (`setQueryData`), they do not trigger full refetches unless necessary.
- Card/list moves are optimistic with rollback on error.
- Forms validate with the shared Zod schemas.
- Use semantic HTML, keep focus styles visible, and keep drag and drop keyboard-accessible.
- Style with Tailwind utility classes; extract components rather than long class strings repeated.
- Never call the AI provider from the browser. Always go through the API.
- All user-facing strings come from message files (Indonesian by default); no hard-coded text in components.
- Follow the "Product and UX principles" section above.

### Database
- Schema changes only through Prisma migrations. Never edit an applied migration; add a new one.
- Ordering uses fractional `position` (double). Use the shared ordering helper; do not hand-roll midpoint math in controllers.
- Add an index for any new frequent filter or sort.

## Testing rules

- New logic ships with tests in the same change.
- Must-have coverage: auth flows, permission guards, card/list move and ordering, real-time broadcast on mutation, AI endpoint rate limit and error handling.
- API e2e tests run against a real PostgreSQL (Docker), not mocks of Prisma.
- Mock only external services (the AI provider).
- Keep Playwright to a few happy-path journeys (register, create board, add and move card, see live update).

## Git workflow

- Branches: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
- Commits follow Conventional Commits: `feat(cards): add move endpoint`.
- Small, focused pull requests. CI must be green before merge.
- Do not commit generated files, `.env`, or build output.

## Security rules (non-negotiable)

- Never commit secrets. Never print them in logs or responses.
- Hash passwords with argon2. Store only hashed refresh tokens.
- Rate-limit auth and AI endpoints.
- Validate and cap all input sizes (including AI prompts).
- Treat AI output as untrusted text: validate against a schema, never execute or render it as raw HTML.
- CORS uses an explicit allowlist from env.

## AI feature rules

- All AI calls go through `AiService`. It handles the provider client, timeouts, retries, structured-output parsing, and per-user rate limits.
- Prompts live in `apps/api/src/modules/ai/prompts/` as versioned constants, not inline strings.
- AI results are suggestions: the UI must require user confirmation before changing data.
- On provider failure, return a clear error; the rest of the app must keep working.

## How to add a typical feature (checklist)

1. Update or add the Zod schema in `packages/shared`.
2. Update `schema.prisma` and create a migration if data changes.
3. Add or extend the service, controller, and guards in the relevant API module.
4. Emit the real-time event if the change affects a board.
5. Add API tests (unit + e2e).
6. Build the UI in `apps/web/src/features/<feature>`, wiring TanStack Query and the socket handler.
7. Add web tests for non-trivial UI logic.
8. Update `PRD.md` (if scope or design changed) and the README/API docs.
9. Run `pnpm lint && pnpm typecheck && pnpm test`.

## Definition of done

- Works locally via `docker compose up` and in dev mode.
- Lint, typecheck, and tests pass.
- No new warnings, no unused code or dependencies.
- Permissions verified for each role (OWNER, ADMIN, MEMBER).
- Checked on a 360px-wide viewport, with Indonesian copy coming from message files.
- Docs updated when behavior or setup changed.

## Do not

- Do not add new major dependencies without a short justification in the PR.
- Do not bypass the membership guard "temporarily".
- Do not store server state in global client state.
- Do not change the public API shape without updating `packages/shared` and the PRD.
- Do not expand scope beyond the current milestone in `PRD.md`.
- Do not add features that increase complexity for the typical student user without checking the priorities in `PRD.md`.
