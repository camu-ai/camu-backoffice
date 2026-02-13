# Camu Backoffice

Internal operations dashboard for [Camu](https://camu.ai)'s customer success team. Syncs support ticket data from Pylon, product usage data from BigQuery, and presents it across fixed analytical pages and an AI-powered canvas for ad-hoc queries.

## What this does

Camu is a Brazilian B2B SaaS platform that automates fiscal document management (NFe, CTe, NFSe). This dashboard helps the CS team stay on top of their support operations: what needs attention right now, how the week went, how customers are using the product, and anything else they want to explore via natural language.

## Pages

### CS Daily (`/act-now`)

The triage page. Shows what needs action right now.

- **KPI cards**: Waiting on Us, SLA Breached, SLA At Risk, Open P0/P1 — each clickable to filter the table below
- **Action Queue table**: All open tickets that are either waiting on us or P0/P1, sorted by SLA urgency. Columns: Priority, Title, Account, Handler, Age, SLA status, Time to SLA, Assignee. Each column header has inline sort + filter controls.
- **Aging Tickets table**: Open tickets older than 7 days that aren't in the action queue
- **Open by State / Category**: Summary cards showing ticket distribution

### CS Weekly (`/this-week`)

The weekly review page. Shows what came in and how we performed over a date range (defaults to last 7 days).

- **KPI cards**: Ticket count, Median Response Time, SLA Compliance %, Self-Servable %
- **Charts**: Volume by Category, By Handler, By Self-Servable (bar charts)
- **Top Accounts table**: Ranked by ticket volume with open count, P0/P1 count, top category
- **SLA & Response Summary**: Median and average for both response and resolution times

### Usage (`/usage`)

Product usage data pulled from BigQuery. Requires selecting an account.

- **KPI cards**: Total Documents, Integration Rate, Escriturado, Nao Escriturado
- **Charts**: Document Volume Over Time (area), Monthly Integration trend (stacked bar), By Document Type, By Validation Status, By ERP Status, By Manifestation Status

### AI Canvas (`/canvas`)

Natural language interface to explore data. Ask a question, get a dashboard.

- Uses the Claude Agent SDK to run SQL queries against both Postgres (support data) and BigQuery (usage data)
- Returns structured output (ViewSpec) that renders as KPI cards, bar/line/area/donut charts, tables, etc.
- Supports follow-up prompts within the same session
- Views can be saved and pinned

## Architecture

```
Pylon API ──sync──▶ Neon Postgres ◀──queries── Next.js Server Components ──props──▶ Client Components (Recharts)
                                   ◀──SQL───── Claude Agent SDK (AI Canvas)
BigQuery ◀──queries── Usage page
         ◀──SQL───── Claude Agent SDK (AI Canvas)
```

**Data flow**: A daily cron job (Cloud Scheduler → `POST /api/sync`) pulls issues, messages, accounts, and users from the Pylon API, maps custom fields (priority, category, handler, state), and upserts everything to Postgres. The sync uses 30-day windows with watermark-based pagination. Dashboard pages read directly from Postgres via Prisma — no API layer between pages and the database.

**SLA calculations** happen at read time based on business hours (Mon-Fri 8:00-18:00 BRT). They are not stored.

**Auth**: Google OAuth via Better Auth, restricted to `@camu.ai` domain.

## Data model

| Model | Description |
|-------|-------------|
| `Issue` | Support ticket. Has priority, state, category, handler, SLA timing fields, linked to Account and User (assignee). |
| `Account` | Customer account from Pylon. |
| `User` | Pylon team member (assignee). |
| `Message` | Individual message on a ticket, with sender type and timestamp. |
| `SyncLog` | Audit trail for each sync run — counts, errors, watermark. |
| `SavedView` | Persisted AI Canvas views (prompt, JSON spec, pinned state). |
| `Auth*` | Better Auth tables (AuthUser, AuthSession, AuthAccount, AuthVerification). |

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, Server Components) |
| Language | TypeScript (strict mode) |
| UI | Tailwind CSS + ShadCN (Radix primitives) |
| Charts | Recharts via ShadCN chart wrapper |
| Database | Neon Postgres |
| ORM | Prisma |
| Usage data | BigQuery |
| Auth | Better Auth + Google OAuth |
| AI Canvas | Claude Agent SDK + structured output |
| Observability | Langfuse |
| Testing | Vitest (141 tests) + Testing Library |
| Deploy | Firebase App Hosting |

## Getting started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, PYLON_API_TOKEN, auth secrets, etc.

# Generate Prisma client + push schema
pnpm prisma generate
pnpm prisma db push

# Run dev server
pnpm dev
```

## Scripts

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Production build
pnpm test         # Run Vitest (141 tests across 13 files)
pnpm test:watch   # Vitest in watch mode
pnpm lint         # ESLint
```

## Environment variables

See [`.env.example`](.env.example) for the full list. The critical ones:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `PYLON_API_TOKEN` | Pylon API authentication |
| `BETTER_AUTH_SECRET` | Session signing secret |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `ANTHROPIC_API_KEY` | Claude API for AI Canvas |
| `CRON_SECRET` | Authenticates the daily sync cron job |
| `GCP_PROJECT_ID` | BigQuery project for usage data |

## Deployment

Deployed to Firebase App Hosting. Config in [`apphosting.yaml`](apphosting.yaml) — Node.js 22 runtime, secrets from Google Cloud Secret Manager.

## Project structure

```
src/
├── app/
│   ├── (dashboard)/          # Authenticated dashboard pages
│   │   ├── act-now/          # CS Daily — triage page
│   │   ├── this-week/        # CS Weekly — review page
│   │   ├── usage/            # Product usage (BigQuery)
│   │   └── canvas/           # AI Canvas
│   ├── api/
│   │   ├── sync/             # Pylon sync endpoint (POST, cron-triggered)
│   │   ├── canvas/           # Canvas streaming endpoint
│   │   └── auth/             # Better Auth routes
│   └── sign-in/              # Login page
├── lib/
│   ├── pylon/                # Pylon API client, field mapper, sync orchestrator
│   ├── sla/                  # Business hours calc, SLA targets, status (ok/at_risk/breached)
│   ├── queries/              # Prisma query functions (issues, performance, accounts, usage)
│   ├── canvas/               # Claude Agent SDK setup, SQL sandbox tool, ViewSpec schema, renderer
│   └── db.ts                 # Prisma client singleton
├── components/
│   ├── charts/               # KPI cards, bar/line/area/donut/stacked-bar chart panels
│   ├── tables/               # Issues table, shared column defs
│   ├── badges/               # Priority, SLA, Handler, State badges (CVA)
│   ├── layout/               # Sidebar, header, account filter, date picker, sync button
│   └── ui/                   # ShadCN primitives
└── test/                     # Vitest setup, factories, mocks
```
