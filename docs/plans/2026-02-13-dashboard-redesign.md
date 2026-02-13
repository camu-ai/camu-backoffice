# Dashboard Redesign: 5 Pages → 3

## Context

The original dashboard had 5 pages (Needs Attention, Overview, Performance, Accounts, Trends) with significant overlap. Overview and Trends were near-duplicates. Performance had a misplaced category chart. Self-servable analysis appeared twice. Source distribution and handler donuts weren't actionable.

Two people use the dashboard daily (Product Lead + SME), both doing hands-on CS work. Primary use is triage & react (multiple times/day), secondary use is weekly strategic sync.

## Decision

Consolidate to **3 pages**: Act Now, This Week, Canvas.

| Page | Purpose | Frequency |
|------|---------|-----------|
| Act Now | What needs a reply, what's breaching, what's aging | Multiple times/day |
| This Week | What came in, category/handler/self-servable distribution, top accounts | Weekly sync + ad-hoc |
| Canvas | On-demand deep dives via AI | As needed |

### Pages removed

- **Overview** — merged into This Week
- **Trends** — eliminated (duplicate of Overview with weekly buckets)
- **Performance** — SLA metrics split between Act Now (daily) and This Week (aggregate). No standalone page.
- **Accounts** — top accounts table moves to This Week. Deep dives go to Canvas.

---

## Page 1: Act Now

Route: `/(dashboard)/act-now`

### KPI Strip (4 cards)

| KPI | Query | Why |
|-----|-------|-----|
| Waiting on Us | `count where state in (new, waiting_on_you)` | Customers waiting for our reply |
| SLA Breached | Count of open tickets past SLA target | Already late |
| SLA At Risk | Count of open tickets >75% through SLA window | About to be late |
| Open P0/P1 | `count where state != closed AND priority in (urgent, high)` | High-severity volume |

### Panel 1: Action Queue (table)

All open tickets where the ball is in our court OR SLA is breaching/at-risk.

**Filter:** `state in (new, waiting_on_you)` OR `slaStatus in (breached, at_risk)` (regardless of state)

**Sort:** breached first, then at_risk, then by priority (urgent > high > medium > low), then by age (oldest first).

**Columns:** title, priority, account, assignee, age, SLA status, time remaining, link

### Panel 2: Aging Tickets (table)

Open tickets older than 7 days that are NOT in the Action Queue. These are silently rotting.

**Filter:** `state != closed` AND `createdAt < 7 days ago` AND NOT in Action Queue criteria

**Columns:** same as Action Queue

### Panel 3: Open Tickets Summary

Two small breakdowns side by side:
- **By State** — badge + count for each state
- **By Category (Top 5)** — label + count

---

## Page 2: This Week

Route: `/(dashboard)/this-week`

Time window: last 7 days (rolling). No comparison deltas.

### KPI Strip (4 cards)

| KPI | Query | Why |
|-----|-------|-----|
| Tickets This Week | `count where createdAt >= 7 days ago` | Raw volume |
| Median Response Time | Median `business_hours_first_response_seconds` | Speed check |
| SLA Compliance % | % of closed tickets meeting response SLA | Service health |
| Self-Servable % | % of tickets marked yes or partially | Deflection opportunity |

### Panel 1: Volume by Category (horizontal bar chart)

Issue count grouped by category, sorted descending. Last 7 days.

### Panel 2: Work Distribution (two charts side by side)

- **By Handler** (horizontal bar) — SME vs engineer vs unset
- **By Self-Servable** (horizontal bar) — yes / partially / no

### Panel 3: Top Accounts (table)

Accounts with most tickets this week.

**Columns:** account name, ticket count, open count, P0/P1 count, top category

**Sort:** ticket count descending. Show top 10.

### Panel 4: SLA & Response Summary (stat block)

Four numbers in a compact grid:
- Median Response (hours)
- Avg Response (hours)
- Median Resolution (hours)
- Avg Resolution (hours)

---

## Page 3: Canvas

Unchanged. AI-powered on-demand queries.

---

## Implementation Plan

1. Create Act Now page (`/(dashboard)/act-now/page.tsx`)
2. Create This Week page (`/(dashboard)/this-week/page.tsx`)
3. Update sidebar navigation (remove old pages, add new ones)
4. Update default redirect to /act-now
5. Delete old pages: needs-attention, overview, performance, accounts, trends
6. Clean up unused query functions if any
7. Verify build + tests
