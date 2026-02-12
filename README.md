# BADS - Blumb Automated Development System

A multi-agent system that automates software development. Takes an initiative document from Notion, runs it through AI agents (Planner, Task Decomposer, Developer, QA), and produces pull requests on your GitHub repo — with human approval before every merge.

## How It Works

```
Notion Doc ──► Planner Agent ──► Task Decomposer ──► Developer Agent ──► QA Agent
                   │                    │                   │                │
              Creates plan        Breaks feature       Writes code      Reviews diff
              with features       into atomic tasks    via GitHub API    against checklist
                                                                            │
                                                            ┌───────────────┤
                                                            │               │
                                                          PASS            FAIL
                                                            │          (retry ≤ 2)
                                                       Creates PR          │
                                                            │         Back to Dev
                                                     ⏸️ Human Review        Agent
                                                       on GitHub
                                                            │
                                                    ┌───────┴───────┐
                                                 Approve         Reject
                                                    │          (with feedback)
                                              Squash merge    Back to Dev Agent
                                                    │
                                              Next feature
                                              or Complete
```

### Pipeline Steps

1. **POST /api/initiatives** — You provide a Notion page ID and target GitHub repo
2. **PLAN_INITIATIVE** — Fetches the Notion doc, Planner Agent creates an ordered feature list
3. **DECOMPOSE_FEATURE** — Task Decomposer breaks each feature into atomic tasks, creates a git branch
4. **DEVELOP_FEATURE** — Developer Agent implements each task using tool_use (read_file, write_file, list_directory, search_codebase) via the GitHub API — fully stateless, no local clone
5. **QA_REVIEW** — QA Agent reviews the diff against acceptance criteria, no-gos, and an 8-point checklist (security, error handling, tests, performance, etc.). Fails trigger up to 2 automatic retries
6. **NOTIFY_HUMAN** — Logs that the feature is ready for review. Pipeline pauses
7. **Human approves/rejects** via API endpoints. Approve triggers squash merge; reject sends feedback to Developer Agent
8. **COMPLETE_INITIATIVE** — After all features are merged, extracts learned patterns to memory

### What It Produces

- **GitHub PRs** — One merged PR per feature, with AI-generated code committed to your repo
- **Audit trail in Supabase** — Full history: plans, features, tasks, agent outputs, token usage, durations
- **Learned patterns** — Stored in `memory_entries` table and used as context in future initiatives

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ES2022) + TypeScript |
| API | Express |
| Database | Supabase (PostgreSQL) |
| Job Queue | BullMQ + Redis |
| AI | Anthropic Claude (tool_use) |
| VCS | GitHub API (Octokit) — stateless, no local clone |
| Init Docs | Notion API |
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
│   │   ├── supabase/migrations/    # SQL migration
│   │   └── tests/
│   └── web/                        # Frontend (React + Vite)
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Prerequisites

- Node.js >= 18
- pnpm
- Redis (for BullMQ)
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
| `NOTION_API_KEY` | For pipeline | Notion integration API key |
| `GITHUB_TOKEN` | For pipeline | GitHub personal access token (repo scope) |

### 3. Run the database migration

Run the SQL in `apps/api/supabase/migrations/001_bads_schema.sql` against your Supabase project. This creates:

- 6 tables: `initiatives`, `plans`, `features`, `tasks`, `agent_executions`, `memory_entries`
- Custom enums for status tracking
- GIN index on tags for memory search
- Auto-updating `updated_at` triggers
- Row Level Security enabled

### 4. Start Redis

```bash
# macOS
brew services start redis

# Docker
docker run -d -p 6379:6379 redis

# Windows
# Use WSL or Docker
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

### Initiatives

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/initiatives` | Yes | Create initiative and start the pipeline |
| `GET` | `/api/initiatives` | Yes | List initiatives (paginated, filterable by status) |
| `GET` | `/api/initiatives/:id` | Yes | Full detail: plan, features with tasks, metrics |

#### Create Initiative

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

Returns:
```json
{
  "status": "ok",
  "timestamp": "2026-02-11T...",
  "version": "0.1.0",
  "uptime": 3600,
  "components": {
    "supabase": { "status": "ok", "latencyMs": 45 },
    "redis": { "status": "ok", "latencyMs": 2 },
    "queue": { "status": "ok", "waiting": 0, "active": 1, "completed": 12, "failed": 0 }
  }
}
```

## Status Tracking

### Initiative Statuses

`pending` → `planning` → `planned` → `in_progress` → `completed`

Can also transition to `failed` or `cancelled`.

### Feature Statuses

`pending` → `decomposing` → `developing` → `qa_review` → `human_review` → `approved` → `merging` → `merged`

Can also be `rejected` (goes back to developing) or `failed`.

### Task Statuses

`to_do` → `doing` → `review` → `done` (or `failed`)

## Agents

All agents use Anthropic Claude and track token usage/duration in `agent_executions`.

| Agent | Model | Purpose |
|-------|-------|---------|
| **Planner** | claude-sonnet-4 | Analyzes Notion doc → ordered feature list |
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

## Notion Document Template

The Planner Agent expects these sections in the Notion page:

- **Problema** — What problem this solves
- **Solution Sketch** — Proposed approach
- **No-Gos** — Things to explicitly avoid
- **Riesgos** — Known risks
- **Responsable** — Owner
- **Soporte** — Supporting team members

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

- **GitHub API over local clone** — Makes the system stateless and deployable in any environment. Tradeoff is more API calls, but acceptable for the expected volume per task.
- **Explicit job chaining over BullMQ Flows** — Simpler to debug, naturally supports the pause at human review.
- **Sequential features** — Features within an initiative process one at a time to avoid conflicts.
- **Mixed memory layer** — Supabase for structured state/metrics, CLAUDE.md files in repos for developer-facing context.

## License

Private
