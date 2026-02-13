import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import { prisma } from "@/lib/db"

const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "GRANT",
] as const

const MAX_ROWS = 1000
const STATEMENT_TIMEOUT_MS = 10_000

type ValidationResult =
  | { valid: true }
  | { valid: false; error: string }

export function validateSql(sql: string): ValidationResult {
  const normalized = sql.trim().toUpperCase()

  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    return { valid: false, error: "Only SELECT queries are allowed" }
  }

  for (const keyword of FORBIDDEN_KEYWORDS) {
    const pattern = new RegExp(`\\b${keyword}\\b`)
    if (pattern.test(normalized)) {
      return { valid: false, error: `Forbidden keyword: ${keyword}` }
    }
  }

  return { valid: true }
}

export function enforceLimitClause(sql: string): string {
  const normalized = sql.trim().toUpperCase()
  if (normalized.includes("LIMIT")) {
    return sql
  }
  return `${sql.trimEnd()} LIMIT ${MAX_ROWS}`
}

export async function executeSafeQuery(
  sql: string,
  _description: string,
): Promise<{ rows?: unknown[]; count?: number; error?: string; durationMs?: number }> {
  const validation = validateSql(sql)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const limitedSql = enforceLimitClause(sql)
  const start = performance.now()

  try {
    await prisma.$executeRawUnsafe(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT_MS}'`)
    const rows = await prisma.$queryRawUnsafe(limitedSql)
    const durationMs = Math.round(performance.now() - start)
    const resultRows = rows as unknown[]
    return { rows: resultRows, count: resultRows.length, durationMs }
  } catch (error) {
    const durationMs = Math.round(performance.now() - start)
    return { error: (error as Error).message, durationMs }
  }
}

const TOOL_DESCRIPTION = `Execute a read-only SQL query against the support dashboard database.
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
- LIMIT is enforced automatically (max ${MAX_ROWS} rows). If you need fewer rows, add your own LIMIT.
- Queries timeout after ${STATEMENT_TIMEOUT_MS / 1000}s.
- Use Postgres syntax (DATE_TRUNC, EXTRACT, etc.)
- Return concise result sets — aggregate when possible, limit large results
- Use snake_case for table/column names (Prisma @map names)`

const queryDatabaseTool = tool(
  "queryDatabase",
  TOOL_DESCRIPTION,
  {
    sql: z.string().describe("The SQL SELECT query to execute"),
    description: z
      .string()
      .describe("Brief description of what this query does (for debugging)"),
  },
  async (args) => {
    const result = await executeSafeQuery(args.sql, args.description)

    if (result.error) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: result.error, durationMs: result.durationMs }) }],
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ rows: result.rows, count: result.count, durationMs: result.durationMs }),
        },
      ],
    }
  },
)

export const queryDatabaseServer = createSdkMcpServer({
  name: "support-db",
  version: "1.0.0",
  tools: [queryDatabaseTool],
})
