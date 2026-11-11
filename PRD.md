# PRD: Kompak

> Product Requirements Document. Describes **what** we are building and **why**.
> For **how to work in the codebase** (commands, conventions, rules), see [AGENTS.md](./AGENTS.md).
> Keep this file updated when scope or design decisions change.

## 1. Overview

Kompak is a simple, friendly, real-time collaboration web app for **university student group assignments**. A group creates a space, lists what needs to be done, assigns tasks to members, and sees everyone's progress live. It is Kanban-style (in the spirit of Trello) but deliberately simpler, mobile-first, and in Indonesian.

**Purpose of this project:** a portfolio project that demonstrates full-stack engineering practice: relational data modeling, authentication and authorization, real-time sync, a complex interactive UI, containerization, CI/CD, cloud deployment, and one practical AI feature. It also solves a real problem for a real audience (see below).

## 1.1 Problem and Context

Many students at a university campus in Indonesia still coordinate group assignments through WhatsApp and Instagram chats. In practice this leads to:

- Tasks and decisions buried in long chat threads.
- Unclear ownership: nobody knows exactly who does what.
- Missed or forgotten deadlines.
- Uneven contribution that is hard to see or discuss.

Tools like Trello exist, but most students never adopted them: they look complex, need setup, and are not designed around how students work. The opportunity is a tool that feels as easy as a chat app but gives the structure of a task board.

**Core insight:** adoption matters more than features. If the first minute is confusing, students go back to WhatsApp. Every design decision should favor simplicity, speed to first value, and a friendly feel.

The author is part of the target audience, which allows early feedback from real classmates (see M8).

## 2. Goals and Non-Goals

### Goals

- A working, publicly deployed app that a reviewer can try in under 2 minutes (demo account or quick sign-up).
- Clean, readable, tested code with clear architecture documentation.
- Real-time collaboration: two browsers on the same board stay in sync.
- One AI feature that solves a real problem inside the product (not a gimmick).
- **Usable without a tutorial:** a new user creates a group, adds a task, and invites teammates in under 2 minutes.
- **Easy to share:** joining a group works through a link that can be pasted into a WhatsApp group.
- **Friendly and encouraging:** the interface feels light and rewarding, not like enterprise software.
- **Real usage:** classmates use it on a real assignment (validation, not just a demo).

### Non-Goals (MVP)

- Mobile app, offline mode, file attachments, email notifications (transactional emails for verification and password reset are in scope) billing, SSO/OAuth, integrations.
- Enterprise features (audit export, SAML, granular custom roles).
- Becoming a full Trello/Jira clone. Features that add complexity for power users are intentionally left out.

## 3. Target Users

| Persona                                           | Need                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Student group member                              | Know what their tasks are and when they are due, update status in a few taps, mostly on a phone |
| Group leader (_ketua kelompok_)                   | Create the group, split tasks fairly, see overall progress and who is behind                    |
| Lecturer / teaching assistant (future, read-only) | See group progress without joining chats                                                        |
| Recruiter / reviewer                              | Quickly evaluate the project's quality (README, demo, code)                                     |

## 4. Functional Requirements

Priority: **P0** = MVP must-have, **P1** = should-have, **P2** = nice-to-have.

### 4.1 Authentication (P0)
- Register with an emailed 6-digit code: the user enters an email, receives a code, then submits the code with name and password. The account is created only after the email is proven.
- Login, logout with email and password.
- Forgot password: a 6-digit code is emailed; submitting it with a new password resets the password and revokes all sessions.
- Codes expire after 15 minutes, are single-use, limited to 5 wrong attempts, and stored only as HMAC hashes.
- Short-lived access token + rotating refresh token (httpOnly cookie).
- Passwords hashed with argon2.

### 4.2 Workspaces and Members (P0)
- A user can create multiple workspaces and is its `OWNER`.
- Roles: `OWNER`, `ADMIN`, `MEMBER`.
  - OWNER: everything, including deleting the workspace, changing member roles, and removing admins.
  - ADMIN: manage boards, rename the workspace, remove regular members, and regenerate the invite link.
  - MEMBER: see the workspace, its boards, and members; create and edit cards and comment (from M3); can leave the workspace.
- Invite by shareable link or short join code (P0). Every member can see and share the link (it can be pasted into WhatsApp); only OWNER and ADMIN can regenerate it, which invalidates the old one. Opening the link shows the workspace name, then prompts registration or login, then joins the user as `MEMBER`.
- A user who is not a member of a workspace gets 404 for it (its existence is not revealed). A member with an insufficient role gets 403.
- The member list shows names and roles only, not emails.
- Invite an existing user by email (P1).

> **UI vocabulary:** the interface avoids tool jargon. In Indonesian UI copy: Workspace = _Kelompok_, Board = _Proyek_, List = _Kolom_, Card = _Tugas_, `OWNER` = *Ketua*, `ADMIN` = *Pengelola*, `MEMBER` = *Anggota*. Code, database, and API keep the technical names.

### 4.3 Boards, Lists, Cards (P0)
- A workspace has many boards; a board has ordered lists; a list has ordered cards.
- A new board starts with three lists: Belum dikerjakan, Sedang dikerjakan, Selesai.
- Card fields: title, description (markdown), assignee (must be a workspace member), due date (a calendar date, no time), position. Labels move to M5 together with filters.
- Quick-add: a card needs only a title and is appended to the end of its list.
- Lists (columns) are managed by OWNER and ADMIN: create, rename, delete, reorder. Any member creates, edits, and moves cards. A card can be deleted by its creator, an ADMIN, or the OWNER.
- Drag and drop to reorder cards within a list and move across lists, and to reorder lists. Moves are anchor-based ("insert before card X, or at the end") so they stay correct when someone else changed the list in the meantime.
- Ordering persists with fractional positions. When the gap between two neighbours becomes too small, the list is renumbered inside the same transaction.

### 4.4 Real-Time Collaboration (P0)

- Changes (card created/updated/moved/deleted, comment added) appear on other viewers' screens within ~1 second without refresh.
- Presence: show who is currently viewing the board (P1).

### 4.5 Comments and Activity (P1)

- Threaded-free comments on cards (flat list), edit/delete own comment.
- Activity log per card and per board (who did what, when).

### 4.6 Search and Filters (P1)

- Filter board by assignee, label, due date.
- Text search across cards in a workspace.

### 4.7 AI Features (P1)

Implemented behind a small `AiService` so the provider can be swapped.

- **Generate subtasks:** from a task's title and description (for example, the text of an assignment brief), propose a checklist of subtasks (structured JSON output); the user reviews and accepts. Especially useful for students who do not know how to break a big assignment into steps.
- **Summarize discussion:** summarize a long comment thread into key points and decisions.
- (P2) **Semantic search:** embeddings stored in PostgreSQL with pgvector.

Constraints: API key stays on the server only; per-user rate limit; input length cap; AI output is always a suggestion the user confirms; graceful failure when the provider is down.

### 4.8 Student-Friendly Experience (P0 unless noted)

- **Default template:** a new project starts with three columns, _Belum dikerjakan_, _Sedang dikerjakan_, _Selesai_, so users never face an empty board.
- **Quick-add:** adding a task needs only a title; assignee and due date are optional.
- **Guided onboarding:** a short first-run guide (3 to 4 steps) and a sample project to explore; skippable.
- **Progress at a glance:** progress bar per project (done / total) and a "my tasks" view showing what is assigned to me and what is due soon.
- **Deadline visibility:** due dates with clear states (today, overdue, upcoming). In-app reminders (P1); email or WhatsApp reminders (P2).
- **Share to WhatsApp:** one-tap button that opens WhatsApp with the invite link prefilled (`https://wa.me/?text=...`).
- **Mobile-first, Indonesian UI:** all screens designed for a phone first; default language Indonesian, with copy kept in message files so English can be added later (P2).
- **Contribution summary (P1):** per project, show tasks completed per member so groups can discuss workload fairly.
- **Light delight (P1):** small celebratory feedback when a task is completed or a project reaches 100%; friendly empty states and microcopy.
- **Task templates (P2):** common student assignment structures (paper, presentation, final project) that pre-fill tasks.

## 5. Non-Functional Requirements

| Area               | Requirement                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance        | Board with 200 cards loads in under 1.5s on a normal connection; API p95 under 300ms for typical reads                                                                             |
| Security           | OWASP basics: input validation, parameterized queries (ORM), rate limiting on auth and AI endpoints, CORS allowlist, secure cookies, no secrets in repo                            |
| Reliability        | Database migrations are versioned; app starts cleanly with one command                                                                                                             |
| Accessibility      | Keyboard-operable drag and drop alternative, semantic HTML, visible focus                                                                                                          |
| Mobile and network | Mobile-first layout; usable at 360px width; touch targets at least 44px; acceptable on slow mobile connections; touch-friendly drag and drop with a non-drag "move to" alternative |
| Localization       | UI copy in Indonesian via message files (no hard-coded strings in components)                                                                                                      |
| Maintainability    | TypeScript strict mode, linting, formatting, CI must pass before merge                                                                                                             |
| Observability      | Structured logs, `/health` endpoint                                                                                                                                                |

## 6. Tech Stack

| Layer        | Choice                                                                                                    |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| Monorepo     | pnpm workspaces                                                                                           |
| Frontend     | Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, dnd-kit                            |
| Backend      | NestJS, TypeScript, Prisma ORM, Socket.IO (WebSocket gateway)                                             |
| Localization | next-intl with Indonesian message files                                                                   |
| Validation   | Zod schemas in a shared package (frontend and backend)                                                    |
| Database     | PostgreSQL (pgvector extension in P2)                                                                     |
| Auth         | JWT access token + refresh token cookie, argon2                                                           |
| Testing      | Jest (API unit + e2e), Vitest + Testing Library (web), Playwright (one happy-path e2e)                    |
| Containers   | Docker, Docker Compose                                                                                    |
| CI/CD        | GitHub Actions                                                                                            |
| Deployment   | AWS: ECR for images, App Runner (or EC2) for services, RDS PostgreSQL. Web may alternatively go on Vercel |
| AI           | LLM provider via server-side API (Anthropic Claude or equivalent), behind `AiService`                     |

## 7. Architecture

```
Browser (Next.js)
   │  REST (JSON)           WebSocket (Socket.IO)
   ▼                         ▼
NestJS API  ──────────►  Gateway (rooms per board)
   │   │
   │   └──► AiService ──► LLM provider
   ▼
PostgreSQL (Prisma)
```

Key design decisions:

- **REST for writes, WebSocket for fan-out.** Clients mutate via REST; after a successful write the server emits an event to room `board:{boardId}`. Clients update the TanStack Query cache from those events.
- **Optimistic UI for moves.** The client reorders immediately, then reconciles with the server response; on error it rolls back.
- **Ordering with fractional positions.** Each list and card has a `position` (double precision). Inserting between A and B uses the midpoint; a background rebalance runs when gaps get too small. This avoids rewriting every row on each move.
- **Authorization at the service layer.** A guard resolves the user's role in the workspace; every board/card/comment query is scoped through workspace membership.
- **Shared schemas.** Request/response shapes live in `packages/shared` so frontend and backend cannot drift.

## 8. Data Model

```
User(id, email, name, passwordHash, createdAt)
RefreshToken(id, userId, tokenHash, expiresAt, revokedAt)
EmailCode(id, email, purpose, codeHash, attempts, expiresAt, issuedAt)   -- unique (email, purpose)

Workspace(id, name, ownerId, inviteCode, createdAt)
WorkspaceMember(workspaceId, userId, role)           -- PK (workspaceId, userId)

Board(id, workspaceId, name, createdAt, archivedAt)
List(id, boardId, name, position, archivedAt)
Card(id, listId, boardId, title, description, assigneeId?, dueDate?, position,
     createdById, createdAt, updatedAt, archivedAt)
Label(id, boardId, name, color)          -- arrives in M5
CardLabel(cardId, labelId)               -- arrives in M5
Comment(id, cardId, authorId, body, createdAt, updatedAt)
Activity(id, boardId, cardId?, actorId, type, payload JSON, createdAt)
```

Indexes: `Card(listId, position)`, `List(boardId, position)`, `WorkspaceMember(userId)`, `Activity(boardId, createdAt)`.

## 9. API Surface (REST, prefix `/api/v1`)

| Area       | Endpoints                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth | `POST /auth/register/request-code`, `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password`, `POST /auth/reset-password`                                       |
| Workspaces | `GET/POST /workspaces`, `GET/PATCH/DELETE /workspaces/:id`, `GET /workspaces/:id/members`, `PATCH/DELETE /workspaces/:id/members/:userId`, `POST /workspaces/:id/invite/regenerate` |
| Invites | `GET /invites/:code` (public preview), `POST /invites/:code/join`                                                                             |
| Boards | `GET/POST /workspaces/:id/boards`, `GET/PATCH/DELETE /boards/:id` (GET returns lists + cards)                                                  |
| Lists | `POST /boards/:id/lists`, `PATCH/DELETE /lists/:id`, `PATCH /lists/:id/move` (body: `beforeListId`)                                             |
| Cards | `POST /lists/:id/cards`, `GET/PATCH/DELETE /cards/:id`, `PATCH /cards/:id/move` (body: `listId`, `beforeCardId`)                                |
| Comments   | `GET/POST /cards/:id/comments`, `PATCH/DELETE /comments/:id`                                                                               |
| AI         | `POST /cards/:id/ai/subtasks`, `POST /cards/:id/ai/summary`                                                                                |
| System     | `GET /health`                                                                                                                              |

### WebSocket events (server → client)

`card.created`, `card.updated`, `card.moved`, `card.deleted`, `list.created`, `list.updated`, `list.moved`, `comment.created`, `presence.updated`. Client joins with `board.join { boardId }` (authorized by membership).

## 10. Milestones

| #   | Milestone                                 | Done when                                                                                                                                                                |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M0  | Repo setup                                | Monorepo, Docker Compose (web, api, db), lint/format, CI skeleton, `/health` works                                                                                       |
| M1  | Auth                                      | Register/login/refresh/logout with tests; protected routes in web                                                                                                        |
| M2  | Groups (workspaces) and projects (boards) | CRUD with role guards; shareable invite link and join flow; member management                                                                                            |
| M3  | Columns and tasks + DnD                   | Default three-column template; quick-add; create/edit/move with persisted ordering, optimistic UI, touch-friendly. **Show it to 3 to 5 classmates after this milestone** |
| M4  | Real-time                                 | Two browsers stay in sync; reconnect handling                                                                                                                            |
| M5  | Comments, activity, filters               | Comment CRUD, activity feed, filter bar                                                                                                                                  |
| M6  | AI features                               | Subtask generation and summary with rate limit and error handling                                                                                                        |
| M7  | Ship                                      | Deployed publicly, seed/demo account, README with screenshots and architecture, e2e test in CI                                                                           |
| M8  | Pilot                                     | 5 to 10 classmates use it for a real assignment; collect feedback; fix top issues; summarize results in the README                                                       |

Suggested pace: 1 to 1.5 weeks per milestone alongside coursework; M0 to M4 is already a strong portfolio piece.

## 11. Success Criteria

- Public URL works and a demo account is documented.
- A first-time user completes "create group, add task, copy invite link" in under 2 minutes without help (tested with at least 5 classmates).
- At least one real group assignment is run on the app during the pilot, with feedback summarized in the README.
- `docker compose up` starts the full stack locally with no manual steps beyond copying `.env`.
- CI is green: lint, typecheck, unit tests, e2e, Docker build.
- Core logic has tests: auth, permission guards, card move/ordering, real-time broadcast.
- README explains architecture, trade-offs, and how to run, with screenshots or a short GIF.

## 12. Risks and Mitigations

| Risk                           | Mitigation                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Scope creep                    | Keep P2 items out until M7 is shipped                                                                 |
| Drag-and-drop ordering bugs    | Isolate ordering logic in one pure function with unit tests                                           |
| Real-time race conditions      | Server is source of truth; events carry `updatedAt`/version; client ignores stale events              |
| AI cost abuse on a public demo | Per-user rate limit, input caps, daily budget cap, feature flag                                       |
| Students do not adopt it       | Keep scope tiny, mobile-first, WhatsApp share, test with real classmates early (after M3) and iterate |
| Burnout / stalling             | Ship vertical slices; every milestone leaves the app working                                          |

## 13. Open Questions

- Branding: logo, color palette, and domain for Kompak.
- Hosting choice for the web app (App Runner vs Vercel).
- LLM provider and model for AI features (cost vs quality).
