# Support Dashboard — Architecture

> Tech stack decisions and infrastructure design.
> Status: IN PROGRESS

---

## Stack Summary

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 15 (App Router) | Standard for React dashboards, matches team expertise |
| **UI** | ShadCN + Tailwind CSS | Already used in camu-frontend, MCP available for component scaffolding |
| **Charts** | Recharts | Most popular React charting lib, works well with ShadCN styling |
| **Data Tables** | ShadCN Data Table (TanStack Table) | Lighter than AG Grid for this use case, ShadCN-native |
| **Database** | Neon Postgres | Free tier, managed, Prisma-compatible, clean separation from prod |
| **ORM** | Prisma | Same as camu-camu, team knows it, type-safe queries |
| **Validation** | Zod | Same as camu-camu, runtime schema validation |
| **Auth** | Better Auth + Google OAuth | Free, open-source, Prisma-native, multi-tenant ready. Restrict to @camu.ai domain. |
| **Deploy** | Firebase App Hosting | Consistent with existing Firebase account, Cloud Run-based |
| **Sync** | Cloud Scheduler → Pylon API → Postgres | Daily pull, Pylon is source of truth, dashboard DB is read-optimized copy |
| **AI Canvas** | TBD | See AI-VIEWS.md |

---

## Architecture Diagram

```
┌─────────────┐      daily cron        ┌──────────────────┐
│  Pylon API  │ ◄──────────────────── │  Sync Job        │
│  (source of │      GET /issues       │  (Next.js API    │
│   truth)    │      GET /accounts     │   route, Cloud   │
└─────────────┘      GET /messages     │   Scheduler)     │
                                       └────────┬─────────┘
                                                │ writes
                                                ▼
                                       ┌──────────────────┐
                                       │ Neon Postgres     │
                                       │                   │
                                       │                   │
                                       │ tables:           │
                                       │  - issues         │
                                       │  - accounts       │
                                       │  - messages       │
                                       │  - sync_log       │
                                       └────────┬─────────┘
                                                │ reads
                                                ▼
                                       ┌──────────────────┐
                                       │ Next.js App       │
                                       │                   │
                                       │ Fixed pages:      │
                                       │  - Needs Attention│
                                       │  - Overview       │
                                       │  - Performance    │
                                       │  - Accounts       │
                                       │  - Trends         │
                                       │                   │
                                       │ AI Canvas:        │
                                       │  - Prompt input   │
                                       │  - View spec gen  │
                                       │  - Renderer       │
                                       └──────────────────┘
```

---

## Key Decisions

### Why Neon Postgres (not AWS RDS)

- camu-camu's Postgres is in a private AWS VPC — connecting from Firebase would require VPC peering or public exposure
- Dashboard data is a *copy* from Pylon, not production data — no need to co-locate
- Free tier (512MB) is more than sufficient for ticket metadata
- Prisma works identically — switching to AWS later is a one-line env var change
- Clean blast radius: dashboard issues can't affect production

### Why Next.js App Router (not Pages Router)

- Server Components for data-heavy pages (less client JS)
- Server Actions for the sync trigger
- Route Handlers for API endpoints
- Layout system for shared dashboard chrome (sidebar, header)
- This is the direction of the ecosystem — App Router is the standard for new projects

### Why ShadCN Data Table (not AG Grid)

- AG Grid Enterprise is used in camu-frontend for 100k+ row invoice tables with pivot mode
- Dashboard tables are small (hundreds of rows, not hundreds of thousands)
- ShadCN Data Table (TanStack Table) is lighter, more customizable, and free
- Matches the rest of the UI (all ShadCN) — no styling conflicts
- AG Grid MCP available if we need to reference patterns later

### Why Recharts (not other chart libs)

- Most popular React charting lib, large community
- Composable API that plays well with ShadCN styling
- Supports all chart types we need: bar, line, pie, area, stacked
- ShadCN has built-in chart components wrapping Recharts

---

## Sync Strategy

### How it works
1. Cloud Scheduler triggers the sync endpoint daily
2. Sync endpoint calls Pylon API with `start_time` / `end_time` (max 30-day window)
3. New/updated issues are upserted into Neon Postgres
4. `sync_log` table records each sync run (timestamp, records synced, errors)

### Initial backfill
- First run: pull all historical data in 30-day chunks
- Subsequent runs: pull only since last successful sync

### Rate limit awareness
- Pylon API: 10-60 req/min depending on endpoint
- GET /issues requires start_time + end_time, max 30 days
- Sync job includes delays between requests to stay within limits

### Cloud Scheduler
- Google Cloud Scheduler triggers `/api/sync` via HTTP POST with Bearer token auth
- Schedule: daily at 11:00 UTC (`0 11 * * *`)
- Manual "Sync Now" button in the dashboard for on-demand sync

---

## Migration Path

If this becomes a customer-facing product:
1. Move database to AWS RDS (or add `dashboard` schema to existing camu-camu Postgres)
2. Change `DATABASE_URL` environment variable
3. Run `prisma migrate deploy`
4. Add Firebase auth (same as camu-camu)
5. Optionally move hosting to AWS ECS (same Docker/CI patterns as camu-camu BFF)

No code changes needed for steps 1-3. Prisma abstracts the connection.

---

## Decided

- **Cron:** Cloud Scheduler (daily) + manual "Sync Now" button.
- **Messages:** Sync all messages for every ticket. Required for accurate first response time and SLA calculation. Incremental sync — only fetch messages for tickets updated since last sync.
- **Auth:** Better Auth with Google OAuth. Free, open-source (MIT), stores sessions in Neon Postgres via Prisma adapter. Restrict sign-in to `@camu.ai` Google domain. Also serves as an evaluation of Better Auth for future Camu products.

## Open Questions

- [ ] AI Canvas LLM choice: Claude API, OpenAI, or route through existing Langfuse setup?
