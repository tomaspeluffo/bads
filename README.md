# BADS - Blumb Automated Development System

A multi-agent system that automates software development. Takes an initiative pitch (via direct upload or Notion), runs it through AI agents (Planner, Task Decomposer, Developer, QA), and produces pull requests on your GitHub repo — with human approval before every merge.

## How It Works

```
                         ┌─────────────────────┐
                         │   Upload Pitch JSON  │
                         │    or Notion Doc     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │  Planner Agent   │
                          │  (Phase 1)       │
                          │  Analyze pitch   │
                          └────────┬────────┘
                                   │
                        ┌──────────┴──────────┐
                        │                     │
                  Pitch complete?        Missing info?
                        │                     │
                        ▼                     ▼
                  ┌───────────┐       ┌──────────────┐
                  │  Phase 2  │       │ needs_info   │
                  │  Create   │       │ Returns      │
                  │  plan     │       │ questions    │◄──── User answers
                  └─────┬─────┘       └──────────────┘      via /replan
                        │
                        ▼
              ┌─────────────────┐
              │ Task Decomposer │──► Developer Agent ──► QA Agent
              │ Break feature   │    Writes code via     Reviews diff
              │ into tasks      │    GitHub API           against checklist
              └─────────────────┘                              │
                                                    ┌──────────┴──────────┐
                                                  PASS                  FAIL
                                                    │               (retry ≤ 2)
                                               Creates PR                │
                                                    │             Back to Dev
                                             ⏸️ Human Review
                                                    │
                                            ┌───────┴───────┐
                                         Approve         Reject
                                            │          (with feedback)
                                      Squash merge    Back to Dev Agent
                                            │
                                      Next feature
                                      or Complete
```

## Pitch-to-Plan Workflow (Two-Phase Planner)

The planner agent does NOT blindly generate a plan. It works in two phases:

### Phase 1 — Pitch Analysis

The planner critically evaluates the pitch for completeness across 10 dimensions:

1. Problem clarity
2. Architecture & deployment model
3. Technology stack
4. Input/output specifics (samples, mockups, templates)
5. Success criteria (measurable KPIs)
6. Integration points
7. User workflow
8. Data model
9. Scope boundaries
10. Dependencies & blockers

If **any** critical information is missing, the planner returns `"needs_info"` with specific questions explaining **what** is missing and **why** it blocks planning.

### Phase 2 — Plan Creation

Only when the pitch is complete does the planner create a granular implementation plan where each feature is:

- A single PR (1-3 days of work)
- Self-contained and independently deployable
- Ordered by dependency
- Anchored to the pitch's success metrics
- Specific about technology (names libraries and tools)

### Full Workflow Example

```bash
# 1. Upload the pitch
curl -X POST http://localhost:3001/api/initiatives/upload \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AutoCat DOCX",
    "problem": "Need to convert PDF product sheets to Word catalogs...",
    "solutionSketch": "Pipeline: PDF parsing → extraction → Word generation...",
    "noGos": ["No perfect extraction without human review"],
    "risks": ["PDFs are very heterogeneous"],
    "targetRepo": "owner/repo"
  }'

# Response: { "id": "235b4031-...", "status": "pending", ... }

# 2. The planner runs automatically. Check the questions:
curl http://localhost:3001/api/initiatives/235b4031-.../questions \
  -H "Authorization: Bearer <token>"

# Response:
# {
#   "initiativeId": "235b4031-...",
#   "status": "needs_info",
#   "analysis": "The pitch provides excellent problem definition but lacks...",
#   "questions": [
#     {
#       "category": "architecture",
#       "question": "What type of system should this be? Web app, CLI, API?",
#       "why": "This determines the entire technical architecture..."
#     },
#     ...
#   ]
# }

# 3. Answer the questions and re-trigger planning:
curl -X POST http://localhost:3001/api/initiatives/235b4031-.../replan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "additionalContext": "1. It is a web app with a simple upload UI. 2. Stack: Python (FastAPI backend). 3. Here are the sample PDFs: [descriptions]. ..."
  }'

# Response: { "message": "Re-planning initiated", "initiativeId": "235b4031-..." }

# 4. Check again — either more questions or a full plan:
curl http://localhost:3001/api/initiatives/235b4031-.../questions \
  -H "Authorization: Bearer <token>"

# If status is "planned" or "in_progress", the plan was created.
# Use GET /api/initiatives/:id to see the full plan and features.
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ES2022) + TypeScript |
| API | Express |
| Database | Supabase (PostgreSQL) |
| Job Queue | BullMQ + Redis |
| AI | Anthropic Claude (tool_use) |
| VCS | GitHub API (Octokit) — stateless, no local clone |
| Init Docs | Notion API or Direct Upload |
| Frontend | React 19 + Vite + Tailwind CSS |

## Monorepo Structure

```
bads/
├── apps/
│   ├── api/                        # Backend (Express + BullMQ)
│   │   ├── src/
│   │   │   ├── agents/             # AI agents (planner, decomposer, developer, qa)
│   │   │   ├── api/                # Route handlers
│   │   │   ├── config/             # Env validation, constants
│   │   │   ├── lib/                # Service clients (anthropic, supabase, redis, etc.)
│   │   │   ├── middleware/         # Auth, validation, error handling, request IDs
│   │   │   ├── models/             # Zod schemas for all entities
│   │   │   ├── queues/             # BullMQ queue, worker, job handlers
│   │   │   ├── services/           # Business logic (CRUD, GitHub, Notion, memory)
│   │   │   └── types/              # TypeScript types
│   │   ├── supabase/migrations/    # SQL migrations
│   │   └── tests/
│   └── web/                        # Frontend (React + Vite)
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Prerequisites

- Node.js >= 18
- pnpm
- Redis (for BullMQ) — local, Docker, or cloud (e.g. Redis Cloud, Upstash)
- Supabase project
- Anthropic API key

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` with your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `REDIS_URL` | Yes | Redis connection URL (default: `redis://localhost:6379`) |
| `NOTION_API_KEY` | Optional | Notion integration API key (only for Notion-based flow) |
| `GITHUB_TOKEN` | For pipeline | GitHub personal access token (repo scope) |

### 3. Run the database migrations

Run the SQL files in order against your Supabase project (SQL Editor):

1. `apps/api/supabase/migrations/001_bads_schema.sql` — Creates all tables, enums, indices, RLS
2. `apps/api/supabase/migrations/002_rename_task_statuses.sql` — Run in **two steps** (see file comments — Postgres requires enum values to be committed before use)
3. `apps/api/supabase/migrations/003_add_needs_info_status.sql` — Adds `needs_info` to initiative statuses

### 4. Start Redis

```bash
# Docker
docker run -d -p 6379:6379 redis

# macOS
brew services start redis

# Cloud (Redis Cloud / Upstash) — just set REDIS_URL in .env
```

### 5. Start development

```bash
# Both API and web
pnpm dev

# API only
pnpm dev:api

# Web only
pnpm dev:web
```

The API runs on `http://localhost:3001`.

## API Endpoints

### Initiatives — Create & Upload

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/initiatives` | Yes | Create from Notion page ID and start pipeline |
| `POST` | `/api/initiatives/upload` | Yes | Create from direct pitch JSON (no Notion) |

#### Create from Notion

```bash
curl -X POST http://localhost:3001/api/initiatives \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "notionPageId": "your-notion-page-id",
    "targetRepo": "owner/repo",
    "baseBranch": "main"
  }'
```

#### Upload Pitch Directly

```bash
curl -X POST http://localhost:3001/api/initiatives/upload \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Initiative name",
    "problem": "What problem this solves",
    "solutionSketch": "Proposed approach and architecture",
    "noGos": ["Things to avoid"],
    "risks": ["Known risks"],
    "responsable": "Owner name",
    "soporte": "Supporting team",
    "targetRepo": "owner/repo",
    "baseBranch": "main"
  }'
```

**Required fields**: `title`, `problem`, `solutionSketch`, `targetRepo`

**Optional fields**: `noGos` (default `[]`), `risks` (default `[]`), `responsable` (default `""`), `soporte` (default `""`), `baseBranch` (default `"main"`)

### Initiatives — Planner Feedback Loop

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/initiatives/:id/questions` | Yes | Get planner's questions (when status is `needs_info`) |
| `POST` | `/api/initiatives/:id/replan` | Yes | Provide answers and re-trigger planning |

#### Get Planner Questions

```bash
curl http://localhost:3001/api/initiatives/<id>/questions \
  -H "Authorization: Bearer <token>"
```

Response when planner needs info:
```json
{
  "initiativeId": "235b4031-...",
  "status": "needs_info",
  "analysis": "The pitch provides excellent problem definition but lacks critical technical specifics...",
  "questions": [
    {
      "category": "architecture",
      "question": "What type of system should this be? Web app, CLI, API service?",
      "why": "This determines the entire technical architecture and deployment strategy"
    },
    {
      "category": "technology",
      "question": "Are there technology stack constraints? Language, cloud, existing systems?",
      "why": "Technology choices affect library selection and development timeline"
    },
    {
      "category": "input_output",
      "question": "Can you provide sample PDFs or describe the format variability in detail?",
      "why": "Without seeing actual inputs, we cannot plan the parsing approach"
    }
  ]
}
```

Response when no questions (plan already created):
```json
{
  "initiativeId": "235b4031-...",
  "status": "planned",
  "analysis": null,
  "questions": []
}
```

#### Answer Questions and Re-plan

```bash
curl -X POST http://localhost:3001/api/initiatives/<id>/replan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "additionalContext": "1. Web app with upload UI (React frontend, Python FastAPI backend). 2. No cloud constraints, will deploy on AWS. 3. Sample PDFs attached show: product name in header, SKU in sidebar, image centered..."
  }'
```

Only works when status is `needs_info` or `failed`. The planner re-evaluates with the original pitch + your answers. If still missing info, it asks again. If complete, it creates the plan.

Multiple replan calls accumulate context — answers are appended, not replaced.

### Initiatives — Read

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/initiatives` | Yes | List initiatives (paginated, filterable by status) |
| `GET` | `/api/initiatives/:id` | Yes | Full detail: plan, features with tasks, metrics |

#### List Initiatives

```bash
curl "http://localhost:3001/api/initiatives?status=needs_info&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

#### Get Initiative Detail

```bash
curl http://localhost:3001/api/initiatives/<id> \
  -H "Authorization: Bearer <token>"
```

Returns the initiative with its active plan, all features (with tasks), and execution metrics (tokens, duration).

### Feature Review (Human-in-the-Loop)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/initiatives/:id/features/:fid/approve` | Yes | Approve feature, triggers merge |
| `POST` | `/api/initiatives/:id/features/:fid/reject` | Yes | Reject with feedback (min 10 chars) |

```bash
# Approve
curl -X POST http://localhost:3001/api/initiatives/<id>/features/<fid>/approve \
  -H "Authorization: Bearer <token>"

# Reject
curl -X POST http://localhost:3001/api/initiatives/<id>/features/<fid>/reject \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"feedback": "Missing error handling in the auth middleware"}'
```

### Memory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/memory/patterns` | Yes | Search patterns by category, type, tags |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | System health: Supabase, Redis, queue stats |

## Status Tracking

### Initiative Statuses

```
pending → planning → needs_info → (replan) → planning → planned → in_progress → completed
                  └──────────────────────────→ planned → in_progress → completed
```

Can also transition to `failed` or `cancelled` from any state.

| Status | Meaning |
|--------|---------|
| `pending` | Created, waiting for planner to start |
| `planning` | Planner agent is analyzing the pitch |
| `needs_info` | Planner found missing info — check `/questions` endpoint |
| `planned` | Plan created with features, ready to execute |
| `in_progress` | Features are being developed |
| `completed` | All features merged |
| `failed` | An error occurred (can replan) |
| `cancelled` | Manually cancelled |

### Feature Statuses

`pending` → `decomposing` → `developing` → `qa_review` → `human_review` → `approved` → `merging` → `merged`

Can also be `rejected` (goes back to developing) or `failed`.

### Task Statuses

`to_do` → `doing` → `review` → `done` (or `failed`)

## Agents

All agents use Anthropic Claude and track token usage/duration in `agent_executions`.

| Agent | Model | Purpose |
|-------|-------|---------|
| **Planner** | claude-sonnet-4 | Two-phase: analyzes pitch completeness, then creates granular feature plan |
| **Task Decomposer** | claude-sonnet-4 | Feature → atomic tasks with file paths |
| **Developer** | claude-sonnet-4 | Implements tasks using tool_use loop (read/write files via GitHub API) |
| **QA** | claude-sonnet-4 | Reviews diff against 8-point checklist |

### Developer Agent Tools

The Developer Agent operates in a tool_use loop with these tools:

- `read_file` — Read file content from the repo (checks pending writes first)
- `write_file` — Create or update a file (buffered until commit)
- `list_directory` — List directory contents
- `search_codebase` — Search for code patterns

All operations go through the GitHub API — the system is fully stateless and deployable anywhere.

## Pitch Template

The planner agent accepts these fields (via `/api/initiatives/upload` or Notion):

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Initiative name |
| `problem` | Yes | What problem this solves, for whom |
| `solutionSketch` | Yes | Proposed approach, architecture, technology |
| `noGos` | No | Things to explicitly avoid |
| `risks` | No | Known risks and mitigations |
| `responsable` | No | Technical owner |
| `soporte` | No | Supporting team members / stakeholders |
| `targetRepo` | Yes | GitHub repo (owner/repo format) |
| `baseBranch` | No | Base branch (default: main) |

**Tip**: The more complete your pitch, the fewer questions the planner will ask. Include architecture decisions, technology choices, sample inputs/outputs, and measurable success criteria to get a plan on the first pass.

## Development

```bash
# Type check
pnpm lint

# Run tests
pnpm --filter api test

# Build
pnpm build
```

## Architecture Decisions

- **Two-phase planner** — The planner validates pitch completeness before planning. This prevents vague, generic plans and forces the pitch to contain actionable information.
- **GitHub API over local clone** — Makes the system stateless and deployable in any environment. Tradeoff is more API calls, but acceptable for the expected volume per task.
- **Explicit job chaining over BullMQ Flows** — Simpler to debug, naturally supports the pause at human review.
- **Sequential features** — Features within an initiative process one at a time to avoid conflicts.
- **Mixed memory layer** — Supabase for structured state/metrics, CLAUDE.md files in repos for developer-facing context.
- **Direct upload as primary flow** — Notion integration is optional. Direct JSON upload is the simplest way to feed pitches into the system.

## License

Private
