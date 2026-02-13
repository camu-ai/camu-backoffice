# Camu Backoffice — CLAUDE.md

> Project instructions and execution plan for the Camu Backoffice.
> Read this file before writing any code.

---

## Project Overview

Internal analytics dashboard that syncs data from the Pylon support API and visualizes it through fixed pages + an AI-powered canvas. Built with Next.js 15 (App Router), ShadCN, Recharts, Prisma, and Neon Postgres.

**Docs:** See `/docs/` for architecture, data model, pages, API mapping, design, and AI canvas specs.

**Repo:** Standalone Next.js app at `/Users/mossa/Camu/camu-backoffice/`. Not part of camu-camu or camu-frontend monorepos.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| UI | ShadCN + Tailwind CSS |
| Charts | Recharts (via ShadCN chart wrapper) |
| Tables | ShadCN Data Table (TanStack Table) |
| Database | Neon Postgres |
| ORM | Prisma |
| Validation | Zod |
| Auth | Better Auth + Google OAuth (@camu.ai only) |
| AI Canvas | Claude Agent SDK + structured output |
| Observability | Langfuse |
| Testing | Vitest + Testing Library + Playwright |
| Deploy | Firebase App Hosting |

---

## Coding Standards

### General

- **TypeScript strict mode** — `strict: true`, `noUnusedLocals`, `noUnusedParameters`
- **No explanatory comments** — code should be self-documenting. Use clear variable and function names.
- **Baby steps** — build incrementally. Small commits, small PRs.
- **Path alias** — `@/` maps to `src/` (or app root depending on Next.js config)
- **Barrel exports** — each module folder has an `index.ts` that re-exports public API
- **Naming**: files `kebab-case.ts`, components `kebab-case.tsx` (Next.js convention), types `PascalCase`

### Components

- **Presentational (dumb)**: Props only, no hooks or data fetching. Used for all UI components.
- **Container (smart)**: Handle data fetching and business logic. Used for page-level Server Components.
- **CVA** (class-variance-authority) for all component variants (badges, buttons, status indicators)
- **CSS variables** for theme colors — never hardcode hex values in components
- **Radix UI primitives** via ShadCN — accessible by default
- **Icons**: `lucide-react`
- **forwardRef** on components that accept refs

### Styling

- Tailwind utilities only — no inline styles, no CSS modules
- Theme colors via CSS variables: `var(--priority-urgent)`, `var(--sla-breached)`, etc.
- Component variants via CVA (see `docs/DESIGN.md` for color tokens)
- Dark mode via `next-themes` with class strategy
- `tabular-nums` on all numeric displays

### Data Fetching

- **Server Components** fetch data via Prisma directly — no API routes for page data
- **Client Components** (`"use client"`) only for interactive elements (charts, filters, date pickers)
- Pass server-fetched data as props to client components
- No `useEffect` for data fetching — use Server Components or Server Actions

### Error Handling

- Zod validation at all boundaries (API responses, form inputs, view specs)
- Prisma errors caught and logged with context
- User-facing errors shown via `sonner` toasts
- Sync job errors logged to `SyncLog` table with error details

---

## Testing — TDD is the Gold Standard

Every feature follows the TDD cycle: **write failing test → implement → refactor → verify**.

### Test Structure

```
GIVEN [initial context / setup]
WHEN [action is performed]
THEN [expected outcome]
```

### Test Layers

| Layer | Tool | What | Location |
|-------|------|------|----------|
| **Unit** | Vitest | SLA calculations, field mappers, date/business-hours utilities, data aggregations | `__tests__/` next to source |
| **Integration** | Vitest + Prisma (test DB) | Sync upserts, query functions, API route handlers | `__tests__/integration/` |
| **Component** | Vitest + Testing Library | Chart rendering, table columns, badge variants, filter behavior | `__tests__/` next to component |
| **E2E** | Playwright | Full page loads, filter interactions, sync button, AI Canvas flow | `e2e/` |

### Testing Rules

- Write tests BEFORE implementation code
- Test user-visible behavior, not implementation details
- Mock external services (Pylon API, Claude Agent SDK) — never call real APIs in tests
- Use factories for test data, not inline objects
- Vitest config: `globals: true`, `environment: 'jsdom'`, `pool: 'forks'`
- Every PR must have tests. No exceptions.

### Priority Tests (highest value first)

1. **SLA calculations** — business hours, elapsed time, status (ok/at_risk/breached)
2. **Field mapping** — Pylon API response → Prisma model (custom fields extraction)
3. **Sync orchestrator** — watermark logic, pagination, error recovery
4. **Data aggregation** — groupBy, timeSeries, counts with filters
5. **SQL sandboxing** — queryDatabase tool blocks INSERT/DELETE/DROP
6. **ViewSpec validation** — Zod schema rejects invalid specs
7. **Component rendering** — charts render with data, tables show correct columns

---

## Skills & Tools — When to Invoke

### During Development

| Skill | When to Use |
|-------|-------------|
| `superpowers:test-driven-development` | Before implementing ANY feature — sets up TDD workflow |
| `superpowers:systematic-debugging` | When a test fails or something breaks unexpectedly |
| `superpowers:verification-before-completion` | Before claiming any task is done — run tests, verify output |
| `vercel-react-best-practices` | When writing Server Components, data fetching, or client components |
| `frontend-design` | When building UI components and page layouts |
| `pylon` | When working on the sync job or Pylon API client |

### For Quality Gates

| Skill | When to Use |
|-------|-------------|
| `superpowers:requesting-code-review` | After completing each phase |
| `pr-review-toolkit:code-reviewer` | Before merging any PR |
| `pr-review-toolkit:silent-failure-hunter` | After implementing error handling or catch blocks |
| `code-simplifier` | After a feature is complete — clean up before moving on |

### MCPs

| MCP | When to Use |
|-----|-------------|
| **ShadCN** (`shadcn`) | Installing components, browsing examples, checking API |
| **Langfuse** (`langfuse-data`) | Setting up AI Canvas observability, checking traces |
| **PostHog** (`posthog`) | Adding analytics events to the dashboard |

---

## File Structure

```
camu-backoffice/
├── CLAUDE.md                    # THIS FILE — project instructions
├── docs/                        # Planning docs (architecture, data model, etc.)
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── .env.local                   # Local env vars (not committed)
├── .env.example                 # Template for env vars
├── apphosting.yaml              # Firebase App Hosting config
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (auth check, providers)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx       # Dashboard chrome (sidebar, header, filters)
│   │   │   ├── needs-attention/
│   │   │   │   └── page.tsx
│   │   │   ├── overview/
│   │   │   │   └── page.tsx
│   │   │   ├── performance/
│   │   │   │   └── page.tsx
│   │   │   ├── accounts/
│   │   │   │   └── page.tsx
│   │   │   └── trends/
│   │   │       └── page.tsx
│   │   ├── canvas/
│   │   │   └── page.tsx         # AI Canvas
│   │   └── api/
│   │       ├── sync/
│   │       │   └── route.ts     # Sync trigger endpoint
│   │       └── auth/
│   │           └── [...all]/
│   │               └── route.ts # Better Auth routes
│   ├── lib/
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── auth.ts              # Better Auth config
│   │   ├── pylon/
│   │   │   ├── client.ts        # Pylon API client
│   │   │   ├── mapper.ts        # API response → Prisma model mappers
│   │   │   ├── sync.ts          # Sync orchestrator
│   │   │   └── types.ts         # Pylon API TypeScript types
│   │   ├── sla/
│   │   │   ├── business-hours.ts # Business hours calculations
│   │   │   ├── targets.ts       # SLA target definitions
│   │   │   └── status.ts        # SLA status calculator (ok/at_risk/breached)
│   │   ├── queries/
│   │   │   ├── issues.ts        # Issue query functions (groupBy, timeSeries, etc.)
│   │   │   ├── accounts.ts      # Account query functions
│   │   │   └── performance.ts   # Performance metric queries
│   │   ├── canvas/
│   │   │   ├── agent.ts         # Claude Agent SDK setup
│   │   │   ├── query-tool.ts    # queryDatabase custom tool
│   │   │   ├── schema.ts        # ViewSpec Zod schema
│   │   │   └── renderer.tsx     # ViewSpec → React renderer
│   │   └── utils.ts             # Shared utilities (formatters, date helpers)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── sync-button.tsx
│   │   │   └── date-range-picker.tsx
│   │   ├── charts/
│   │   │   ├── bar-chart-panel.tsx
│   │   │   ├── line-chart-panel.tsx
│   │   │   ├── area-chart-panel.tsx
│   │   │   ├── donut-chart-panel.tsx
│   │   │   └── kpi-card.tsx
│   │   ├── tables/
│   │   │   ├── issues-table.tsx
│   │   │   ├── accounts-table.tsx
│   │   │   └── columns.tsx      # Shared column definitions
│   │   ├── badges/
│   │   │   ├── priority-badge.tsx
│   │   │   ├── sla-badge.tsx
│   │   │   ├── handler-badge.tsx
│   │   │   └── state-badge.tsx
│   │   └── ui/                  # ShadCN primitives (installed via CLI)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       └── ...
│   └── test/
│       ├── setup.ts             # Vitest global setup
│       ├── factories/           # Test data factories
│       │   ├── issue.ts
│       │   ├── account.ts
│       │   └── message.ts
│       └── mocks/
│           ├── pylon.ts         # Mock Pylon API responses
│           └── prisma.ts        # Mock Prisma client
├── e2e/
│   ├── needs-attention.spec.ts
│   ├── overview.spec.ts
│   └── canvas.spec.ts
└── public/
    └── camu-logo.svg
```

---

## Environment Variables

```env
# Database (Neon Postgres)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."          # Neon requires this for migrations

# Pylon API
PYLON_API_TOKEN="..."

# Auth (Better Auth + Google OAuth)
BETTER_AUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000" # Production: Firebase App Hosting URL

# AI Canvas (Claude Agent SDK)
ANTHROPIC_API_KEY="..."

# Cron auth (Cloud Scheduler → /api/sync)
CRON_SECRET="..."

# Observability (optional)
LANGFUSE_PUBLIC_KEY="..."
LANGFUSE_SECRET_KEY="..."
LANGFUSE_BASE_URL="https://cloud.langfuse.com"

# PostHog (optional)
NEXT_PUBLIC_POSTHOG_KEY="..."
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
```

---

## Execution Plan

Each phase has a checklist. Mark items as done (`[x]`) as you complete them.
Every implementation step follows TDD: write test → implement → verify.

### Phase 1: Foundation + Scaffold

```
[ ] 1.1  Create Next.js 15 app (TypeScript, Tailwind, ESLint, App Router)
         Command: npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
[ ] 1.2  Install core dependencies
         pnpm add prisma @prisma/client zod recharts date-fns
         pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
         pnpm add -D @vitejs/plugin-react
[ ] 1.3  Configure Vitest (vitest.config.ts, test setup file)
[ ] 1.4  Configure TypeScript strict mode + path aliases
[ ] 1.5  Install ShadCN CLI + base components
         npx shadcn@latest init
         npx shadcn@latest add card badge button separator table chart skeleton
         npx shadcn@latest add select popover calendar command dropdown-menu
         npx shadcn@latest add sonner dialog sheet tooltip navigation-menu
[ ] 1.6  Set up Prisma schema (from docs/DATA-MODEL.md)
[ ] 1.7  Set up Neon Postgres + run initial migration
         npx prisma migrate dev --name init
[ ] 1.8  Create .env.example with all required variables
[ ] 1.9  Create Prisma client singleton (src/lib/db.ts)
[ ] 1.10 Verify: app runs locally, Prisma connects to DB, tests pass
```

**Invoke:** `vercel-react-best-practices` for project setup patterns.

### Phase 2: Pylon Sync (TDD)

```
[ ] 2.1  Create Pylon API TypeScript types (src/lib/pylon/types.ts)
         Source: docs/PYLON-API-MAPPING.md
[ ] 2.2  Write tests for field mapping functions (issue, message, account)
[ ] 2.3  Implement field mappers (src/lib/pylon/mapper.ts)
[ ] 2.4  Write tests for Pylon API client (mock HTTP responses)
[ ] 2.5  Implement Pylon API client with pagination + rate limiting
[ ] 2.6  Write tests for sync orchestrator (watermark, 30-day windows, error handling)
[ ] 2.7  Implement sync orchestrator (src/lib/pylon/sync.ts)
[ ] 2.8  Create /api/sync route (POST handler + auth check)
[ ] 2.9  Set up Cloud Scheduler cron job for /api/sync
[ ] 2.10 Run initial backfill against real Pylon data
[ ] 2.11 Verify: data in DB matches Pylon, SyncLog entry created
```

**Invoke:** `pylon` skill for API reference. `superpowers:test-driven-development` for TDD workflow.

### Phase 3: Auth

```
[ ] 3.1  Install Better Auth + Prisma adapter
         pnpm add better-auth @better-auth/prisma
[ ] 3.2  Add auth tables to Prisma schema + migrate
[ ] 3.3  Configure Better Auth (src/lib/auth.ts)
         - Google OAuth provider
         - Restrict to @camu.ai domain
         - Session stored in Neon Postgres
[ ] 3.4  Create /api/auth/[...all]/route.ts
[ ] 3.5  Add auth middleware to protect dashboard routes
[ ] 3.6  Create sign-in page
[ ] 3.7  Test: sign in with @camu.ai works, non-camu.ai rejected
```

### Phase 4: Shared Layout + Utilities (TDD)

```
[ ] 4.1  Write tests for business hours calculation
[ ] 4.2  Implement business hours utilities (src/lib/sla/business-hours.ts)
[ ] 4.3  Write tests for SLA status calculation (ok/at_risk/breached)
[ ] 4.4  Implement SLA status calculator (src/lib/sla/status.ts)
[ ] 4.5  Write tests for data query functions (groupBy, timeSeries, counts)
[ ] 4.6  Implement data query layer (src/lib/queries/)
[ ] 4.7  Build dashboard layout — sidebar + header + sync button
[ ] 4.8  Build date range picker component
[ ] 4.9  Build filter components (priority, category, handler, source, state)
[ ] 4.10 Build badge components (priority, SLA, handler, state)
[ ] 4.11 Build KPI card component
[ ] 4.12 Build chart wrapper components (bar, line, area, donut)
[ ] 4.13 Verify: layout renders, filters work, charts render with mock data
```

**Invoke:** `frontend-design` for component aesthetics. `vercel-react-best-practices` for Server Component patterns.

### Phase 5: Fixed Pages (TDD per page)

```
[ ] 5.1  Needs Attention page
         - Priority Queue table (open P0/P1, sorted by age)
         - SLA Risk Board (at_risk + breached tickets)
         - Open Tickets Summary (by state, by category)
         - KPI cards (open P0/P1, breached, at risk, waiting on us)
[ ] 5.2  Overview page
         - Volume over time (area chart)
         - Category breakdown (bar chart)
         - Handler split (donut chart)
         - Source distribution (bar chart)
         - Self-servable analysis (stacked bar)
         - KPI cards (total, open, avg resolution, self-servable %)
[ ] 5.3  Performance page
         - First response time distribution
         - Resolution time distribution
         - SLA compliance over time (line chart)
         - Response time by category (bar chart)
         - Assignee performance table
         - KPI cards (median response, median resolution, SLA %, touches)
[ ] 5.4  Accounts page
         - Ticket volume by account (horizontal bar)
         - Account detail table
         - Category patterns by account (stacked bar)
         - Account trends over time (multi-line)
         - KPI cards (total accounts, top account, avg tickets, P0/P1 accounts)
[ ] 5.5  Trends page
         - Weekly volume trend (line chart + comparison)
         - Category trends over time (stacked area)
         - Resolution efficiency trend (dual-axis line)
         - Self-servable trend (stacked bar)
         - Handler load trend (stacked area)
         - Feature request table
         - KPI cards (week vs week, month vs month, bug trend, escrituração trend)
[ ] 5.6  Code review checkpoint — invoke superpowers:requesting-code-review
```

**Invoke:** `frontend-design` for each page. `vercel-react-best-practices` for data fetching patterns.

### Phase 6: AI Canvas (TDD)

```
[ ] 6.1  Install Claude Agent SDK
         pnpm add @anthropic-ai/claude-agent-sdk
[ ] 6.2  Write tests for SQL sandboxing (queryDatabase tool validation)
[ ] 6.3  Implement queryDatabase custom tool (src/lib/canvas/query-tool.ts)
[ ] 6.4  Write tests for ViewSpec Zod schema validation
[ ] 6.5  Implement ViewSpec schema (src/lib/canvas/schema.ts)
[ ] 6.6  Implement Agent SDK integration (src/lib/canvas/agent.ts)
         - System prompt with schema description + component catalog
         - Structured output with ViewSpec Zod schema
         - Session management for follow-up prompts
[ ] 6.7  Build ViewSpec renderer (src/lib/canvas/renderer.tsx)
[ ] 6.8  Build Canvas page UI
         - Prompt input
         - Loading state with query progress
         - Rendered view area
         - Follow-up prompt input
         - Save / Pin / View JSON buttons
[ ] 6.9  Add Langfuse observability hooks
[ ] 6.10 Add SavedView model to Prisma schema + migrate
[ ] 6.11 Implement save/pin/refresh functionality
[ ] 6.12 Test: end-to-end canvas flow with real agent
[ ] 6.13 Final code review — invoke superpowers:requesting-code-review
```

### Phase 7: Polish + Deploy

```
[ ] 7.1  Camu branding — logo, color palette, theme tokens
[ ] 7.2  Dark mode toggle
[ ] 7.3  Loading states (skeletons for all panels)
[ ] 7.4  Error boundaries per panel (one chart failing doesn't break the page)
[ ] 7.5  Responsive layout (collapsible sidebar, stacked charts)
[ ] 7.6  PostHog analytics events (page views, sync triggers, canvas prompts)
[ ] 7.7  E2E tests with Playwright
[ ] 7.8  Performance audit — invoke vercel-react-best-practices
[ ] 7.9  Deploy to Firebase App Hosting
[ ] 7.10 Configure production secrets in Google Cloud Secret Manager
[ ] 7.11 Run production backfill
[ ] 7.12 Set up Cloud Scheduler for daily sync
```

---

## Quick Reference

### Run locally
```bash
pnpm dev          # Start dev server
pnpm test         # Run Vitest
pnpm test:watch   # Run Vitest in watch mode
pnpm test:e2e     # Run Playwright E2E tests
pnpm prisma:push  # Push schema changes to DB
pnpm prisma:seed  # Seed test data
pnpm sync         # Trigger manual sync (calls /api/sync)
```

### Key decisions (see docs/ for rationale)
- **Data**: Pylon is source of truth. Dashboard DB is a read-only copy.
- **SLA**: Calculated at read time, not stored. Business hours Mon-Fri 8:00-18:00 BRT.
- **Ticket clicks**: Link to Pylon (no slide-over panel).
- **Charts**: Server Components fetch data, pass to client-side Recharts.
- **AI Canvas**: Claude Agent SDK + queryDatabase tool + structured output (Zod ViewSpec).
- **Theme**: Camu-branded, light mode default, dark mode via toggle.
