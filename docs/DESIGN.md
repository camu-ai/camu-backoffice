# Support Dashboard — Design System

> Theme, layout, typography, color tokens, and component styling.
> Status: IN PROGRESS

---

## Design Philosophy

**Data-dense, power-user friendly.** This is an internal tool for a smart team that looks at this daily. Prioritize information density over whitespace. Every pixel should earn its place.

Principles:
1. **Scannable** — KPI cards at top, details below. Glanceable status colors.
2. **Consistent** — Same chart styles, same badge colors, same table patterns everywhere.
3. **Functional** — No decorative elements. Borders, backgrounds, and color all carry meaning.
4. **Dark-mode ready** — ShadCN supports dark mode out of the box. Ship both.

---

## Theme Configuration

### Color Palette

Using ShadCN's CSS variable system. Base theme: **Zinc** (neutral gray).

```css
/* Semantic colors for dashboard-specific meaning */

/* Priority badges */
--priority-urgent: hsl(0, 84%, 60%);      /* Red */
--priority-high: hsl(25, 95%, 53%);        /* Orange */
--priority-medium: hsl(48, 96%, 53%);      /* Yellow */
--priority-low: hsl(210, 40%, 60%);        /* Muted blue */

/* SLA status */
--sla-ok: hsl(142, 71%, 45%);             /* Green */
--sla-at-risk: hsl(48, 96%, 53%);         /* Yellow */
--sla-breached: hsl(0, 84%, 60%);         /* Red */

/* Handler type */
--handler-sme: hsl(262, 83%, 58%);        /* Purple */
--handler-engineer: hsl(210, 84%, 55%);   /* Blue */
--handler-product: hsl(142, 71%, 45%);    /* Green */

/* State indicators */
--state-new: hsl(210, 84%, 55%);          /* Blue */
--state-waiting-us: hsl(25, 95%, 53%);    /* Orange — needs action */
--state-waiting-customer: hsl(210, 40%, 60%); /* Muted */
--state-on-hold: hsl(210, 20%, 50%);      /* Gray */
--state-closed: hsl(210, 10%, 40%);       /* Dark gray */

/* Category (top 5 — for chart series) */
--cat-1: hsl(210, 84%, 55%);
--cat-2: hsl(262, 83%, 58%);
--cat-3: hsl(142, 71%, 45%);
--cat-4: hsl(25, 95%, 53%);
--cat-5: hsl(340, 82%, 52%);
```

### Typography

Using ShadCN defaults (system font stack). Override only if needed:

```
KPI value:     text-3xl font-bold tabular-nums
KPI label:     text-sm text-muted-foreground
Page title:    text-2xl font-semibold
Panel title:   text-lg font-medium
Table header:  text-xs font-medium uppercase tracking-wider text-muted-foreground
Table body:    text-sm
Badge:         text-xs font-medium
```

`tabular-nums` on all numeric values — digits should be monospaced so columns align.

---

## Layout Specs

### Sidebar
- Width: 240px (expanded), 60px (collapsed)
- Background: `card` color
- Border-right: 1px `border` color
- Nav items: 40px height, rounded-md, hover:bg-accent

### Header
- Height: 56px
- Sticky top
- Contains: logo, title, sync status, sync button
- Border-bottom: 1px `border` color

### Page Content
- Max width: 1400px (centered on wide screens)
- Padding: 24px
- Grid: 12-column CSS grid for responsive layout

### KPI Cards Row
- 4 cards in a row (3 on medium, 2 on small)
- Each card: border, rounded-lg, p-6
- Value: large number, label below
- Optional: delta indicator (↑12% in green, ↓8% in red)

### Chart Panels
- Card container with title bar
- Min height: 300px
- Responsive: 2-column grid on desktop, stack on tablet

### Data Tables
- Full width
- Sticky header
- Row hover: bg-accent/50
- Alternating row colors: off (clean look, rely on hover)
- Dense mode: smaller padding for more rows visible

---

## Component Styling Guide

### Badges

Used for priority, handler, SLA status, state.

```
Priority:  Filled badge, white text
  urgent  → bg-red-500 text-white
  high    → bg-orange-500 text-white
  medium  → bg-yellow-500 text-black
  low     → bg-blue-400/20 text-blue-600

SLA Status:  Subtle filled
  ok       → bg-green-500/15 text-green-600
  at_risk  → bg-yellow-500/15 text-yellow-600
  breached → bg-red-500/15 text-red-600

Handler:  Outline badge
  sme      → border-purple-500 text-purple-600
  engineer → border-blue-500 text-blue-600
  product  → border-green-500 text-green-600

State:  Muted
  new                → bg-blue-100 text-blue-700
  waiting_on_you     → bg-orange-100 text-orange-700 (draw attention)
  waiting_on_customer→ bg-gray-100 text-gray-600
  on_hold            → bg-gray-100 text-gray-500
  closed             → bg-gray-50 text-gray-400
```

### Charts (Recharts)

Consistent chart styling:

```typescript
const chartConfig = {
  // Use ShadCN chart component wrapper
  colors: [
    'hsl(210, 84%, 55%)',  // blue
    'hsl(262, 83%, 58%)',  // purple
    'hsl(142, 71%, 45%)',  // green
    'hsl(25, 95%, 53%)',   // orange
    'hsl(340, 82%, 52%)',  // pink
    'hsl(48, 96%, 53%)',   // yellow
  ],
  grid: {
    strokeDasharray: '3 3',
    stroke: 'hsl(var(--border))',
  },
  tooltip: {
    // Use ShadCN card styling
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
    }
  },
  axis: {
    fontSize: 12,
    fill: 'hsl(var(--muted-foreground))',
  }
}
```

### KPI Card with Delta

```
┌─────────────────────────┐
│  Total Tickets           │
│  127          ↑ 12%      │
│  last 30 days            │
└─────────────────────────┘
```

Delta arrow: green for improvement, red for regression. "Improvement" direction depends on the metric:
- Volume up = neutral (not inherently good or bad)
- Response time down = green (faster is better)
- SLA compliance up = green (more compliant is better)
- Self-servable up = green (more deflection is better)

---

## Dark Mode

ShadCN handles dark mode via a `class` on `<html>`. Toggle in the header.

Dashboard-specific considerations:
- Chart colors need good contrast in both modes
- Priority/SLA badge colors should be vibrant in dark mode (slightly higher saturation)
- Table row hover should be subtle in dark mode

Use `dark:` Tailwind variants where ShadCN defaults don't suffice.

---

## Responsive Breakpoints

This is desktop-first, but should be usable on tablets (team might check from iPad).

| Breakpoint | Layout |
|-----------|--------|
| >= 1280px (xl) | Full layout: sidebar + 2-column content grid |
| >= 768px (md) | Sidebar collapsed to icons, content fills width |
| < 768px (sm) | Sidebar hidden (hamburger menu), single column |

Charts and tables should be horizontally scrollable on smaller screens rather than squeezed.

---

## ShadCN Components to Install

```bash
# Core layout
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add button
npx shadcn@latest add separator
npx shadcn@latest add sheet          # mobile sidebar

# Navigation
npx shadcn@latest add navigation-menu
npx shadcn@latest add tooltip

# Data display
npx shadcn@latest add table
npx shadcn@latest add chart          # Recharts wrapper
npx shadcn@latest add skeleton       # loading states

# Inputs / filters
npx shadcn@latest add select
npx shadcn@latest add popover
npx shadcn@latest add calendar       # for date picker
npx shadcn@latest add command        # for search/filter combobox
npx shadcn@latest add dropdown-menu

# Feedback
npx shadcn@latest add sonner         # toast notifications (sync status)
npx shadcn@latest add dialog         # confirmations
```

### Shadcraft Registry

Add Shadcraft for pre-built dashboard layouts:

```json
// components.json — add to registries
{
  "registries": {
    "shadcraft": {
      "url": "https://shadcraft.com/r"
    }
  }
}
```

Browse for dashboard templates, sidebar layouts, and chart compositions.

---

## Loading States

Every data panel has a loading skeleton:
- KPI cards: skeleton pulse for the number
- Charts: skeleton rectangle matching chart dimensions
- Tables: skeleton rows (5-6 rows of varying width bars)

Use React Suspense + ShadCN Skeleton component. Server Components handle data fetching, so loading states are file-based (`loading.tsx`).

---

## Decided

- [x] **Theme**: Camu-branded — use Camu's color palette, logo, and visual identity from the start. Designed to become customer-facing.
- [x] **Color mode**: Light mode default. Dark mode available via toggle (next-themes). Both modes supported.
- [x] **Ticket detail**: Link out to Pylon on click (no slide-over panel). Dashboard stays focused on analytics.
- [x] **Chart rendering**: Server Components fetch data via Prisma, pass as props to client-side Recharts. ShadCN chart wrapper pattern.

## Open Questions

- [ ] Any Shadcraft templates worth starting from?
- [ ] Exact Camu brand colors to use (need hex values / design tokens)
