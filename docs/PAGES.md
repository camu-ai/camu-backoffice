# Support Dashboard — Pages

> Detailed specs for each fixed page: layout, panels, data sources, and interactions.
> Status: IN PROGRESS

---

## Shared Layout

Every page shares the same chrome:

```
┌──────────────────────────────────────────────────────────────┐
│  [Camu Logo]  Support Dashboard          Last synced: 12m ago│
│                                          [Sync Now ↻]        │
├────────┬─────────────────────────────────────────────────────┤
│        │                                                     │
│  NAV   │  PAGE CONTENT                                       │
│        │                                                     │
│  ● Needs│  ┌─────────────────────────────────────────┐       │
│    Attn │  │  Page Title          [Date Range ▾]     │       │
│  ○ Over-│  │                      [Filters ▾]        │       │
│    view │  └─────────────────────────────────────────┘       │
│  ○ Perf │                                                     │
│  ○ Accts│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  ○ Trend│  │ KPI Card │ │ KPI Card │ │ KPI Card │           │
│         │  └──────────┘ └──────────┘ └──────────┘           │
│  ────── │                                                     │
│  ◇ AI   │  ┌─────────────────────────────────────────┐       │
│  Canvas │  │  Main Content (charts, tables, etc.)    │       │
│         │  │                                         │       │
│         │  └─────────────────────────────────────────┘       │
└────────┴─────────────────────────────────────────────────────┘
```

### Header
- **Logo + title**: "Support Dashboard" — links to Needs Attention
- **Sync status**: "Last synced: X minutes ago" with relative time
- **Sync Now button**: Triggers sync via Server Action, shows spinner while running

### Sidebar Navigation
- Fixed left sidebar (collapsible on smaller screens)
- Active page highlighted
- Separator before AI Canvas
- Collapse to icons on narrow viewports

### Page Controls
- **Date range picker**: Preset ranges (Today, This Week, Last 7 Days, Last 30 Days, This Month, Last Month, Custom)
- **Default**: Last 30 Days (except Needs Attention, which defaults to "All Open")
- Date range is a shared filter — changing it on any page persists when navigating

### Global Filters
Available on all pages (shown as filter chips/pills):
- **Priority**: P0, P1, P2, P3
- **Category**: All 13 categories
- **Handler**: SME, Engineer, Product
- **Source**: Slack, Email, Chat Widget, etc.
- **State**: Open states only (new, waiting_on_you, waiting_on_customer, on_hold) or include Closed
- Filters compose with AND logic
- Active filters shown as dismissible chips below the controls

---

## Page 1: Needs Attention

> **Primary question**: "What do I need to act on right now?"
> **Default view**: All currently open tickets, no date range filter.

### KPI Cards (top row)

| Card | Value | Source |
|------|-------|--------|
| Open P0/P1 | Count of open issues with priority in (urgent, high) | `WHERE state != 'closed' AND priority IN ('urgent', 'high')` |
| SLA Breached | Count of open issues past their SLA target | Calculated at read time (see DATA-MODEL.md) |
| SLA At Risk | Count of open issues at 75-99% of SLA target | Calculated at read time |
| Waiting on Us | Count of issues in state `waiting_on_you` or `new` | `WHERE state IN ('new', 'waiting_on_you')` |

### Panel 1: Priority Queue

**Component**: Data Table (ShadCN TanStack Table)
**Purpose**: All open P0/P1 issues sorted by urgency

| Column | Source | Notes |
|--------|--------|-------|
| Priority | `issue.priority` | Color-coded badge: red=urgent, orange=high |
| Title | `issue.title` | Truncated, links to Pylon |
| Account | `account.name` | |
| Handler | `issue.handler` | Badge: SME/Engineer/Product |
| Age | `now - issue.createdAt` | Human-readable: "2h", "1d", "3d" |
| SLA Status | Calculated | 🟢 OK / 🟡 At Risk / 🔴 Breached |
| Time to SLA | Calculated | Remaining business hours, or "breached by Xh" |
| Assignee | `user.name` | |

**Sorting**: Default sort by priority (P0 first), then by age (oldest first)
**Row click**: Opens Pylon issue link in new tab

### Panel 2: SLA Risk Board

**Component**: Data Table
**Purpose**: All open tickets approaching or breaching SLA, regardless of priority

Same columns as Priority Queue, but:
- **Filter**: Only shows issues where SLA status is `at_risk` or `breached`
- **Sorting**: Breached first, then by how far past SLA target (worst first)
- **Visual**: Row background tinted yellow (at_risk) or red (breached)

### Panel 3: Open Tickets Summary

**Component**: Grouped summary cards or mini-table
**Purpose**: Quick breakdown of all open tickets

```
By State:
  New: 5  |  Waiting on Us: 8  |  Waiting on Customer: 12  |  On Hold: 3

By Category (top 5):
  how-to-question: 10  |  platform-bug: 7  |  escrituracao: 5  | ...
```

### Data Queries

```prisma
// Priority queue
const priorityQueue = await prisma.issue.findMany({
  where: {
    state: { not: 'closed' },
    priority: { in: ['urgent', 'high'] }
  },
  include: { account: true, assignee: true },
  orderBy: [
    { priority: 'asc' }, // urgent before high
    { createdAt: 'asc' }  // oldest first
  ]
})

// All open issues (for SLA calculation at read time)
const openIssues = await prisma.issue.findMany({
  where: { state: { not: 'closed' } },
  include: { account: true, assignee: true }
})
```

SLA status calculated in a utility function at read time — not stored in DB.

---

## Page 2: Overview

> **Primary question**: "What does our support landscape look like?"
> **Default date range**: Last 30 Days

### KPI Cards (top row)

| Card | Value | Comparison |
|------|-------|------------|
| Total Tickets | Count of issues in date range | vs previous period (e.g., "↑ 12% vs last 30d") |
| Open Now | Count of currently open issues | — |
| Avg Resolution | Mean business_hours_first_response_seconds for closed issues | vs previous period |
| Self-Servable % | % of issues where selfServable = 'yes' or 'partially' | vs previous period |

### Panel 1: Volume Over Time

**Component**: Area Chart (Recharts)
**X-axis**: Date (daily or weekly buckets depending on range)
**Y-axis**: Issue count
**Series**: Stacked by state at time of creation or single line for total
**Interaction**: Hover shows tooltip with count per day

### Panel 2: Category Breakdown

**Component**: Horizontal Bar Chart or Donut Chart
**Data**: Group issues by `category`, count each
**Sorting**: Descending by count
**Interaction**: Click a category to filter the whole page

### Panel 3: Handler Split

**Component**: Donut Chart with legend
**Data**: Group issues by `handler` (SME, Engineer, Product, unset)
**Shows**: Count and percentage per handler
**Insight**: How much engineering time is spent on support vs dedicated CS

### Panel 4: Source Distribution

**Component**: Horizontal Bar Chart
**Data**: Group by `source` (slack, email, chat_widget, etc.)
**Purpose**: Which channels generate the most tickets

### Panel 5: Self-Servable Analysis

**Component**: Stacked Bar Chart or 3-segment horizontal bar
**Data**: Group by `selfServable` (yes, partially, no, unset)
**Purpose**: What percentage of tickets could be deflected with better docs/tooling
**Insight**: This directly feeds KB article creation priority

### Data Queries

```prisma
// Volume over time
const volumeByDay = await prisma.issue.groupBy({
  by: ['createdAt'], // needs date truncation in raw SQL
  where: { createdAt: { gte: startDate, lte: endDate } },
  _count: true
})

// Category breakdown
const byCategory = await prisma.issue.groupBy({
  by: ['category'],
  where: { createdAt: { gte: startDate, lte: endDate } },
  _count: true,
  orderBy: { _count: { id: 'desc' } }
})

// Handler split
const byHandler = await prisma.issue.groupBy({
  by: ['handler'],
  where: { createdAt: { gte: startDate, lte: endDate } },
  _count: true
})
```

Note: `groupBy` with date truncation requires `$queryRaw` for daily bucketing:

```sql
SELECT DATE_TRUNC('day', created_at) as day, COUNT(*) as count
FROM issues
WHERE created_at BETWEEN $1 AND $2
GROUP BY day
ORDER BY day
```

---

## Page 3: Performance

> **Primary question**: "How fast are we responding and resolving?"
> **Default date range**: Last 30 Days

### KPI Cards (top row)

| Card | Value | Target |
|------|-------|--------|
| Median First Response | Median of `businessHoursFirstResponseSec` | Compare vs SLA targets |
| Median Resolution Time | Median business hours from created → closed | Compare vs SLA targets |
| SLA Compliance % | % of closed issues resolved within SLA target | Target: 90% |
| Touches per Issue | Avg `numberOfTouches` | Lower is better |

### Panel 1: First Response Time Distribution

**Component**: Box Plot or Histogram (Recharts)
**Data**: Distribution of `businessHoursFirstResponseSec` for issues in date range
**Breakdown**: Separate series per priority level
**Reference lines**: SLA targets for each priority

Alternative: Bar chart showing avg first response time by week, with SLA target line overlay.

### Panel 2: Resolution Time Distribution

**Component**: Bar Chart (weekly averages) with SLA target reference line
**Data**: Business hours from `createdAt` to `closedAt` for closed issues
**Breakdown**: Per priority level
**Reference lines**: Resolution SLA targets

### Panel 3: SLA Compliance Over Time

**Component**: Line Chart
**X-axis**: Week
**Y-axis**: Compliance percentage (0-100%)
**Series**: One line per priority level + overall
**Reference line**: 90% target
**Purpose**: Are we getting better or worse at meeting SLAs?

### Panel 4: Response Time by Category

**Component**: Horizontal Bar Chart
**Data**: Average first response time grouped by category
**Purpose**: Which categories take longest to respond to? (e.g., platform-bug may need engineering triage)

### Panel 5: Assignee Performance

**Component**: Data Table
**Columns**: Assignee | Tickets Handled | Avg Response Time | Avg Resolution Time | SLA Compliance %
**Purpose**: Team workload and performance visibility
**Note**: Not for blame — for identifying where to add resources

### SLA Compliance Calculation (at read time)

```typescript
function getSlaTarget(priority: string, metric: 'response' | 'resolution'): number {
  const targets = {
    urgent:  { response: 1,  resolution: 4 },
    high:    { response: 4,  resolution: 10 },
    medium:  { response: 10, resolution: 30 },
    low:     { response: 30, resolution: 50 },
  }
  return targets[priority]?.[metric] ?? Infinity
}

function getSlaStatus(issue: Issue, metric: 'response' | 'resolution'): 'ok' | 'at_risk' | 'breached' {
  const targetHours = getSlaTarget(issue.priority, metric)
  const elapsedHours = getBusinessHoursElapsed(issue.createdAt, now)

  if (elapsedHours >= targetHours) return 'breached'
  if (elapsedHours >= targetHours * 0.75) return 'at_risk'
  return 'ok'
}
```

---

## Page 4: Accounts

> **Primary question**: "Which accounts need the most support?"
> **Default date range**: Last 30 Days

### KPI Cards (top row)

| Card | Value |
|------|-------|
| Total Accounts | Distinct accounts with tickets in period |
| Top Account | Account with most tickets + count |
| Avg Tickets/Account | Mean ticket count per account |
| Accounts with Open P0/P1 | Count of accounts with open urgent/high tickets |

### Panel 1: Ticket Volume by Account

**Component**: Horizontal Bar Chart (top 15 accounts)
**Data**: Issue count grouped by `account.name`, sorted descending
**Interaction**: Click account name to drill down to account detail view
**Color**: Optionally color-code bars by proportion of high-priority tickets

### Panel 2: Account Detail Table

**Component**: Data Table
**Columns**: Account | Total Tickets | Open | P0/P1 | Top Category | Avg Response Time | Avg Resolution Time
**Sorting**: Default by total tickets descending
**Search**: Filter by account name
**Row click**: Could expand to show that account's recent tickets inline

### Panel 3: Category Patterns by Account

**Component**: Stacked Bar Chart (top 10 accounts)
**Data**: For each top account, show ticket count broken down by category
**Purpose**: Does Account X mostly create how-to questions (→ needs onboarding) or platform bugs (→ needs engineering)?

### Panel 4: Account Trends

**Component**: Multi-line Chart
**Data**: Weekly ticket count for top 5 accounts over time
**Purpose**: Is a particular account's ticket volume growing? Could signal churn risk or onboarding issues.

### Data Queries

```prisma
// Tickets by account
const byAccount = await prisma.issue.groupBy({
  by: ['accountId'],
  where: { createdAt: { gte: startDate, lte: endDate } },
  _count: true,
  orderBy: { _count: { id: 'desc' } },
  take: 15
})

// Account detail with computed metrics
const accountDetail = await prisma.account.findMany({
  include: {
    issues: {
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: {
        priority: true,
        state: true,
        category: true,
        businessHoursFirstResponseSec: true,
        createdAt: true,
        closedAt: true
      }
    }
  }
})
```

---

## Page 5: Trends

> **Primary question**: "Are things getting better or worse?"
> **Default date range**: Last 90 Days (wider range to see trends)

### KPI Cards (top row)

| Card | Value |
|------|-------|
| This Week vs Last | Ticket count change: "↑ 15% (23 vs 20)" |
| This Month vs Last | Same but monthly |
| Bug Trend | Platform-bug count this month vs last: "↓ 30%" |
| Escrituração Trend | Escrituracao-issue count this month vs last |

### Panel 1: Weekly Volume Trend

**Component**: Line Chart with dual axis or comparison bars
**Data**: Weekly issue count, current period vs previous period
**Purpose**: Is support load increasing or decreasing?

### Panel 2: Category Trends Over Time

**Component**: Stacked Area Chart
**X-axis**: Week
**Series**: Each category as a stacked area
**Purpose**: Which categories are growing? Are bugs decreasing as we fix things?

### Panel 3: Resolution Efficiency Trend

**Component**: Dual-axis Line Chart
**Series 1**: Avg resolution time (business hours) per week
**Series 2**: Avg first response time per week
**Purpose**: Are we getting faster?

### Panel 4: Self-Servable Trend

**Component**: Stacked Bar Chart (weekly)
**Series**: yes / partially / no
**Purpose**: Are we reducing the tickets that shouldn't need human intervention?

### Panel 5: Handler Load Trend

**Component**: Stacked Area Chart (weekly)
**Series**: SME / Engineer / Product
**Purpose**: Is engineering load going up or down? Are SMEs handling more?

### Panel 6: Feature Request Tracker

**Component**: Data Table
**Filter**: category = 'feature-request'
**Columns**: Title | Account | Created | Priority | Tags
**Purpose**: What are customers asking for? Feeds into product roadmap.

---

## Cross-Page Interactions

### Drill-down Pattern
- **Chart → Table**: Clicking a bar/segment in any chart filters the page to show the underlying issues
- **Account → Detail**: Clicking an account name anywhere navigates to the Accounts page filtered to that account
- **Issue → Pylon**: Clicking an issue title opens the Pylon issue page in a new tab via `issue.link`

### URL State
- All filters and date ranges encoded in URL search params
- Enables bookmarking and sharing specific views
- Example: `/needs-attention?priority=urgent,high&state=new,waiting_on_you`

### Comparison Mode
- Date range picker supports comparison: "Last 30 Days vs Previous 30 Days"
- When comparison is active, KPI cards show delta (↑/↓ percentage)
- Charts show overlaid or side-by-side comparison

---

## Component Mapping

Summary of which ShadCN/Recharts components each panel uses:

| Component | Usage |
|-----------|-------|
| **Card** (ShadCN) | KPI cards on every page |
| **Data Table** (TanStack Table) | Priority queue, SLA risk board, account detail, feature requests, assignee perf |
| **Badge** (ShadCN) | Priority labels, SLA status, handler type |
| **Area Chart** (Recharts) | Volume over time, category trends, handler load |
| **Bar Chart** (Recharts) | Category breakdown, source distribution, account volume, response time by category |
| **Line Chart** (Recharts) | SLA compliance, weekly trends, resolution efficiency |
| **Donut/Pie Chart** (Recharts) | Handler split, self-servable analysis |
| **Tooltip** (Recharts) | All chart hover states |
| **DateRangePicker** (ShadCN) | Shared page control |
| **Select / MultiSelect** (ShadCN) | Filter dropdowns |
| **Tabs** (ShadCN) | Sub-sections within pages if needed |

---

## Route Structure

```
/                          → Redirect to /needs-attention
/needs-attention           → Page 1: Needs Attention
/overview                  → Page 2: Overview
/performance               → Page 3: Performance
/accounts                  → Page 4: Accounts
/trends                    → Page 5: Trends
/canvas                    → AI Canvas (see AI-VIEWS.md)
/api/sync                  → Sync trigger endpoint (POST)
/api/auth/*                → Better Auth routes
```

All page routes use Next.js App Router:
```
app/
  layout.tsx               → Root layout with sidebar + header
  (dashboard)/
    layout.tsx             → Dashboard layout with shared filters
    needs-attention/
      page.tsx
    overview/
      page.tsx
    performance/
      page.tsx
    accounts/
      page.tsx
    trends/
      page.tsx
  canvas/
    page.tsx
  api/
    sync/
      route.ts
    auth/
      [...all]/
        route.ts
```

---

## Decided

- [x] **Chart rendering**: Server Components fetch data via Prisma, pass as props to client-side Recharts (`"use client"` components).
- [x] **Ticket detail**: Link out to Pylon on click — no slide-over panel. Dashboard is analytics-only.

## Open Questions

- [ ] Should Trends page default to 90 days or match the global date range?
