# Support Dashboard — AI Canvas

> Spec for the prompt-driven view builder using Claude Agent SDK with database query tools.
> Status: IN PROGRESS

---

## Overview

The AI Canvas lets users type a question in natural language and get a dashboard view in response. It uses the **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`) with a custom `queryDatabase` tool — the agent can explore the schema, write SQL queries, get real data, and compose a structured **JSON view spec** that the renderer turns into ShadCN/Recharts UI.

```
User prompt → Claude Agent SDK
                  ↓
             Agent uses queryDatabase tool (read-only SQL)
             Agent gets real data back
             Agent composes view spec with data resolved
                  ↓
             Structured output (Zod-validated ViewSpec)
                  ↓
             Renderer → Dashboard UI
```

### Why Agent SDK + Database Tool

| Approach | Pros | Cons |
|----------|------|------|
| **Fixed data catalog** | Predictable, safe, simple renderer | Limited to pre-defined queries, can't answer unexpected questions |
| **Agent SDK + DB tool** | Can answer *any* question, writes its own queries, resolves data before rendering | More complex, needs query sandboxing |

We chose the Agent SDK approach because:
1. **Unlimited flexibility**: The agent writes SQL tailored to each question — no pre-defined catalog to maintain
2. **Data-resolved specs**: The view spec contains actual data, not query references — rendering is instant and deterministic
3. **Sessions**: Follow-up prompts ("now split by priority") maintain context via Agent SDK sessions
4. **Structured output**: Zod schema guarantees valid view spec JSON
5. **Observability**: Langfuse tracing via hooks for prompt debugging and iteration
6. **Promotable**: Saved specs include resolved data snapshots — pinned views load instantly

---

## Agent Configuration

### Installation

```bash
npm install @anthropic-ai/claude-agent-sdk
```

### Agent Setup

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"

// Define the ViewSpec schema with Zod (see full schema below)
const ViewSpecSchema = z.object({
  title: z.string(),
  description: z.string(),
  layout: z.array(RowSchema),
})

const viewSpecJsonSchema = z.toJSONSchema(ViewSpecSchema)

// Run the agent
for await (const message of query({
  prompt: userQuestion,
  options: {
    systemPrompt: CANVAS_SYSTEM_PROMPT,
    allowedTools: [],         // No built-in tools needed
    permissionMode: "bypassPermissions",
    customTools: [queryDatabaseTool],
    outputFormat: {
      type: "json_schema",
      schema: viewSpecJsonSchema,
    },
    // Resume previous session for follow-up prompts
    ...(sessionId ? { resume: sessionId } : {}),
  },
})) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id  // Capture for follow-ups
  }
  if (message.type === "result" && message.structured_output) {
    const spec = ViewSpecSchema.safeParse(message.structured_output)
    if (spec.success) {
      renderView(spec.data)
    }
  }
}
```

### Custom Tool: queryDatabase

The agent's single tool — executes read-only SQL against our Postgres database.

```typescript
const queryDatabaseTool = {
  name: "queryDatabase",
  description: `Execute a read-only SQL query against the support dashboard database.
    Returns JSON rows. Use this to fetch data for building dashboard views.

    Available tables:
    - issues (id, title, state, priority, source, category, handler,
              resolution_type, self_servable, account_id, assignee_id,
              created_at, closed_at, first_response_at, first_response_seconds,
              business_hours_first_response_seconds, resolution_time,
              number_of_touches, type, tags, link, synced_at)
    - accounts (id, name, domain, synced_at)
    - users (id, name, email, synced_at)
    - messages (id, issue_id, sender_type, sender_name, body_text, created_at, synced_at)

    Key relationships:
    - issues.account_id → accounts.id
    - issues.assignee_id → users.id
    - messages.issue_id → issues.id

    Field values:
    - state: 'new', 'waiting_on_you', 'waiting_on_customer', 'on_hold', 'closed'
    - priority: 'urgent', 'high', 'medium', 'low' (nullable)
    - category: 'how-to-question', 'platform-bug', 'escrituracao-issue', 'feature-request', etc.
    - handler: 'sme', 'engineer', 'product' (nullable)
    - resolution_type: 'manual-action', 'explanation', 'investigation', etc.
    - self_servable: 'yes', 'partially', 'no' (nullable)
    - sender_type: 'customer', 'team', 'system'

    Business hours: Mon-Fri 8:00-18:00 BRT (UTC-3). 10 hours per business day.
    SLA targets (business hours):
    - urgent: 1h response / 4h resolution
    - high: 4h response / 10h resolution
    - medium: 10h response / 30h resolution
    - low: 30h response / 50h resolution

    RULES:
    - Only SELECT queries allowed. No INSERT, UPDATE, DELETE, DROP, etc.
    - Use Postgres syntax (DATE_TRUNC, EXTRACT, etc.)
    - Return concise result sets — aggregate when possible, limit large results
    - Use snake_case for table/column names (Prisma @map names)`,
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "The SQL SELECT query to execute",
      },
      description: {
        type: "string",
        description: "Brief description of what this query does (for debugging)",
      },
    },
    required: ["sql", "description"],
  },
  execute: async (input: { sql: string; description: string }) => {
    // Validate: only SELECT allowed
    const normalized = input.sql.trim().toUpperCase()
    if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
      return { error: "Only SELECT queries are allowed" }
    }

    // Block dangerous keywords
    const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE", "GRANT"]
    for (const keyword of forbidden) {
      if (normalized.includes(keyword)) {
        return { error: `Forbidden keyword: ${keyword}` }
      }
    }

    try {
      const result = await prisma.$queryRawUnsafe(input.sql)
      return { rows: result, count: result.length }
    } catch (error) {
      return { error: error.message }
    }
  },
}
```

**Security notes:**
- Only SELECT/WITH queries allowed — enforced by keyword check before execution
- Dangerous SQL keywords are blocked
- The database is a **read-only copy** of Pylon data — worst case, the agent reads all support tickets (which the team already has access to)
- Prisma's `$queryRawUnsafe` is used because the agent writes dynamic SQL. This is acceptable because:
  1. The agent is server-side only (no user SQL injection path)
  2. The database contains no secrets — it's a sync copy of Pylon data
  3. The SQL is validated before execution

---

## System Prompt

```
You are a support data analyst for Camu. You help the team understand their
support ticket data by building dashboard views.

When the user asks a question:
1. Think about what data you need to answer it
2. Use the queryDatabase tool to run SQL queries and get real data
3. You may run multiple queries to gather different aspects of the answer
4. Compose a dashboard view spec with the data you collected

Your output will be rendered as a dashboard with charts, tables, and KPI cards.

## Available Components

Each component in the view spec needs a "data" field with the actual data
(not a query reference — you must resolve the data using queryDatabase first).

### kpi-card
Single large number with optional comparison delta.
data: { value: number, previousValue?: number }
Props: title, format (number|percentage|duration), invertDelta (bool)

### bar-chart
Vertical or horizontal bars for categorical data.
data: { items: [{ label: string, value: number }] }
Props: title, orientation (vertical|horizontal)

### line-chart
Time series with one or more lines.
data: { series: [{ name: string, points: [{ date: string, value: number }] }] }
Props: title, referenceLine (number), referenceLabel (string)

### area-chart
Stacked area for composition over time.
data: { series: [{ name: string, points: [{ date: string, value: number }] }] }
Props: title, stacked (bool)

### donut-chart
Proportional breakdown.
data: { items: [{ label: string, value: number }] }
Props: title

### data-table
Sortable table for detailed records.
data: { rows: object[], columns: [{ key: string, label: string, format?: string }] }
Props: title, sortBy, sortDir (asc|desc)

### stat-row
Compact row of labeled metrics.
data: { items: [{ label: string, value: number, format?: string }] }
Props: (none beyond data)

## Layout Rules
- Compose rows of components. Each row sums to width 12 (CSS grid).
- KPI cards: width 3 (4 per row) or width 4 (3 per row)
- Charts: width 6 (two side by side) or width 8+4, or width 12 (full)
- Tables: usually width 12 (full width)
- Pattern: KPIs on top, charts in middle, tables at bottom

## Style Guide
- Use concise titles
- Format durations as "Xh Ym" for hours, "Xd" for days
- Format percentages with 1 decimal place
- Use relative dates in tables ("2h ago", "3d ago")
- For comparisons, calculate the delta percentage
```

---

## View Spec Schema (Zod)

```typescript
import { z } from "zod"

// Component data schemas
const KpiData = z.object({
  value: z.number(),
  previousValue: z.number().optional(),
})

const CategoricalData = z.object({
  items: z.array(z.object({
    label: z.string(),
    value: z.number(),
  })),
})

const TimeSeriesData = z.object({
  series: z.array(z.object({
    name: z.string(),
    points: z.array(z.object({
      date: z.string(),
      value: z.number(),
    })),
  })),
})

const TableData = z.object({
  rows: z.array(z.record(z.unknown())),
  columns: z.array(z.object({
    key: z.string(),
    label: z.string(),
    format: z.string().optional(),
  })),
})

const StatRowData = z.object({
  items: z.array(z.object({
    label: z.string(),
    value: z.number(),
    format: z.string().optional(),
  })),
})

// Panel schema (a component in a row)
const PanelSchema = z.object({
  component: z.enum([
    "kpi-card", "bar-chart", "line-chart", "area-chart",
    "donut-chart", "data-table", "stat-row",
  ]),
  width: z.number().min(1).max(12),
  props: z.object({
    title: z.string().optional(),
    format: z.string().optional(),
    invertDelta: z.boolean().optional(),
    orientation: z.enum(["vertical", "horizontal"]).optional(),
    stacked: z.boolean().optional(),
    referenceLine: z.number().optional(),
    referenceLabel: z.string().optional(),
    sortBy: z.string().optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),
  }).passthrough(),
  data: z.union([KpiData, CategoricalData, TimeSeriesData, TableData, StatRowData]),
})

const RowSchema = z.object({
  row: z.array(PanelSchema),
})

// Top-level view spec
export const ViewSpecSchema = z.object({
  title: z.string(),
  description: z.string(),
  layout: z.array(RowSchema),
})

export type ViewSpec = z.infer<typeof ViewSpecSchema>
```

---

## Renderer

Since the agent resolves all data before outputting the spec, the renderer is pure and simple — no async data fetching, just mapping data to components.

```typescript
function ViewRenderer({ spec }: { spec: ViewSpec }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{spec.title}</h2>
        <p className="text-muted-foreground">{spec.description}</p>
      </div>
      {spec.layout.map((row, i) => (
        <div key={i} className="grid grid-cols-12 gap-4">
          {row.row.map((panel, j) => (
            <div key={j} className={`col-span-${panel.width}`}>
              <PanelRenderer panel={panel} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function PanelRenderer({ panel }: { panel: Panel }) {
  switch (panel.component) {
    case "kpi-card":
      return <KpiCard {...panel.props} data={panel.data} />
    case "bar-chart":
      return <BarChartPanel {...panel.props} data={panel.data} />
    case "line-chart":
      return <LineChartPanel {...panel.props} data={panel.data} />
    case "area-chart":
      return <AreaChartPanel {...panel.props} data={panel.data} />
    case "donut-chart":
      return <DonutChartPanel {...panel.props} data={panel.data} />
    case "data-table":
      return <DataTablePanel {...panel.props} data={panel.data} />
    case "stat-row":
      return <StatRow data={panel.data} />
    default:
      return null
  }
}
```

**Key difference from Architecture A**: No `executeQuery` step in the renderer. The agent already fetched the data — the renderer just maps it to React components. This makes rendering synchronous and instant.

---

## Sessions & Follow-up Prompts

The Agent SDK's session system maintains conversation context:

```typescript
// First question
const { sessionId, spec } = await runCanvasAgent("How many bugs this month?")

// Follow-up (agent remembers the previous question + data)
const { spec: updatedSpec } = await runCanvasAgent(
  "Now split that by priority",
  sessionId  // Resume the session
)
```

The agent receives the full conversation history, including previous queries and results. This lets it modify the existing view intelligently rather than starting from scratch.

---

## Langfuse Observability

Add a PostToolUse hook to log all agent interactions to Langfuse:

```typescript
import { Langfuse } from "langfuse"

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
})

const langfuseHook = async (input, toolUseId, context) => {
  if (input.tool_name === "queryDatabase") {
    langfuse.trace({
      name: "canvas-query",
      metadata: {
        sql: input.tool_input.sql,
        description: input.tool_input.description,
        rowCount: input.tool_result?.count,
      },
    })
  }
  return {}
}

// Add to agent options
options: {
  hooks: {
    PostToolUse: [{ matcher: "queryDatabase", hooks: [langfuseHook] }],
  },
}
```

This gives us:
- Full prompt/response history in Langfuse
- SQL query logging for debugging
- Latency tracking per query
- Cost tracking per canvas request

---

## Saved Views

Users can save AI-generated views for reuse. Since data is resolved in the spec, saved views render instantly.

```prisma
model SavedView {
  id        String   @id @default(cuid())
  title     String
  prompt    String   // Original user prompt
  spec      Json     // The view spec JSON (with resolved data)
  sessionId String?  @map("session_id") // Agent SDK session for follow-ups
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")
  isPinned  Boolean  @default(false) @map("is_pinned") // Show in sidebar

  @@map("saved_views")
}
```

**Pinned views** appear in the sidebar below the fixed pages. This is how popular AI views get "promoted" without code changes.

**Refresh button**: Saved views have a "Refresh Data" button that re-runs the agent with the original prompt + session to get fresh data.

---

## Canvas UI

```
┌─────────────────────────────────────────────────────┐
│  AI Canvas                                          │
│                                                     │
│  ┌─────────────────────────────────────────┐ [Send] │
│  │ Ask a question about your support data… │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  Suggested: [Bug trends] [SLA compliance] [Top accts]│
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │         Rendered View                       │    │
│  │         (KPIs, charts, tables)              │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌─────────────────────────────────────────┐ [Send] │
│  │ Follow up: "Split by priority..."       │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  [Save View] [Pin to Sidebar] [View JSON]           │
└─────────────────────────────────────────────────────┘
```

### Interaction Flow

1. User types a question
2. Submit → loading state with "Analyzing your data..." message
3. Agent streams tool calls (user sees "Running query 1/3..." progress)
4. Agent returns structured output → Zod validated → rendered
5. Follow-up input appears below the rendered view
6. User can save, pin, or inspect the raw JSON spec

---

## Dependencies

```json
{
  "@anthropic-ai/claude-agent-sdk": "latest",
  "zod": "^3.x",
  "langfuse": "^3.x"
}
```

### Environment Variables

```env
ANTHROPIC_API_KEY=<Claude API key>
LANGFUSE_PUBLIC_KEY=<optional, for observability>
LANGFUSE_SECRET_KEY=<optional, for observability>
```

---

## Open Questions

- [x] LLM choice → Claude Agent SDK with Sonnet model
- [x] Architecture → Agent with database query tool (Architecture B)
- [ ] Should the agent also have access to message body text for semantic search?
- [ ] Rate limiting: max queries per canvas request? (suggest 10)
- [ ] Should we cache agent sessions or let them expire?
- [ ] Gallery of example prompts — nice to have for onboarding
