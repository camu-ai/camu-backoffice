# Support Dashboard — Overview

> This document captures the goals, scope, and key decisions for the Camu Support Dashboard.
> Status: IN PROGRESS — being written collaboratively.

---

## What We're Building

A dashboard that connects to the Pylon API, syncs support ticket data, and presents it through:
1. **Fixed views** — pre-built pages for metrics we check daily
2. **AI canvas** — a prompt-driven view builder where an LLM composes charts and tables on demand

Both modes share the same component library and renderer — the only difference is who composed the layout (us at build time, or the LLM at runtime).

---

## Why

Pylon's built-in analytics require an enterprise plan. We have all the data via API — we just need a way to visualize it. Additionally, this dashboard serves as a prototype for a future customer-facing analytics product.

---

## Goals

1. **Operational awareness** — "What needs attention right now?" Priority-based urgency (open P0/P1s) and SLA risk (tickets approaching or breaching response/resolution targets).
2. **Performance tracking** — Volume trends, category breakdown, handler split, response/resolution times, self-servable %, all over time.
3. **Account visibility** — Which accounts create the most tickets? What types?
4. **AI-powered exploration** — Ask ad-hoc questions about the data and get instant visualizations.
5. **Customer-facing ready** — Architecture and design quality should support evolving this into a product feature.

---

## Non-Goals (for v1)

- Role-based views or permissions (uniform dashboard for all team members)
- Real-time streaming (hourly sync is fine)
- Pylon write operations (this is read-only — no ticket management from the dashboard)
- Mobile responsiveness (desktop-first, team uses laptops)

---

## Target Users

The whole Camu team, but primarily:
- **Mossa** (CS lead) — operational triage, performance tracking
- **Juliana** (CS) — daily ticket awareness, SLA monitoring
- **Pedro** (Engineering) — bug/escrituração trends, engineering workload

Uniform view for all. No role-specific pages. Data-dense, power-user friendly.

---

## SLA Targets

Measured in **business hours** (Mon–Fri, 8:00–18:00 BRT). Starting targets — will adjust based on measured baseline.

| Priority | First Response | Resolution | Compliance Target |
|----------|---------------|------------|-------------------|
| P0 — Critical | 1 biz hour | 4 biz hours | 90% |
| P1 — High | 4 biz hours | 1 biz day (10h) | 90% |
| P2 — Medium | 1 biz day (10h) | 3 biz days (30h) | 90% |
| P3 — Low | 3 biz days (30h) | 5 biz days (50h) | 90% |

90% compliance to start. Tighten once we have a measured baseline.

---

## Key Metrics

### Check every day
- Open P0/P1 tickets with account, handler, age
- Tickets at SLA risk (approaching or breaching first response / resolution)
- Ticket volume this week vs last week
- Self-servable % (what % of tickets shouldn't need us)
- Category breakdown (how-to, bug, escrituração, etc.)
- What's still open right now

### Check weekly / occasionally
- Handler split (SME vs Engineer vs Product)
- Which accounts are creating the most tickets
- Bug/escrituração trends over time
- Feature request demand
- Response time and resolution time averages
- SLA compliance rate

---

## Dashboard Structure

### Fixed Pages (pre-built)

1. **Needs Attention** — the Monday morning view
   - Panel 1: Open P0/P1 by priority, sorted by age
   - Panel 2: SLA risk — approaching/breaching tickets, yellow at 75%, red at 90%

2. **Overview** — the big picture
   - Volume over time, category breakdown, handler split, self-servable %

3. **Performance** — how fast are we
   - Response time, resolution time, SLA compliance %, trends

4. **Accounts** — who needs the most help
   - Ticket volume by account, category patterns per account

5. **Trends** — are things getting better or worse
   - Week-over-week, month-over-month comparisons
   - Bug/escrituração trends, feature request demand

### AI Canvas
- Prompt input → LLM generates view spec → renderer displays charts/tables
- Uses same component library as fixed pages
- Can promote popular AI views to permanent pages

---

## Toolkit

### MCPs (installed)
- **ShadCN** (`shadcn@latest mcp`) — component browsing, installation, examples. Can connect to Shadcraft registry for dashboard templates.
- **AG Grid** — docs reference for data tables
- **PostHog** — product analytics (potential integration)
- **Langfuse** — LLM observability for AI canvas
- **BrowserMCP** — testing the dashboard in browser
- **Todoist** — task tracking
- **Figma** — design-to-code if needed

### MCPs to consider adding
- **Shadcraft Pro** — registry of pre-built ShadCN page templates (dashboards, layouts). Works with our existing ShadCN MCP.
- **shadcn/studio** — visual theme editor

### Skills
- `frontend-design` — production-grade UI implementation
- `vercel-react-best-practices` — React/Next.js optimization
- `figma:implement-design` — Figma to code
- `camu-context` — product context
- `playground` — rapid prototyping

---

## Open Questions

- [ ] Architecture decisions → see ARCHITECTURE.md
- [ ] Data model and sync strategy → see DATA-MODEL.md
- [ ] Page layouts and wireframes → see PAGES.md
- [ ] Pylon API field mapping → see PYLON-API-MAPPING.md
- [ ] Design system and styling → see DESIGN.md
- [ ] AI canvas spec → see AI-VIEWS.md
