import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import { bigquery } from "@/lib/bigquery"

const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "GRANT",
  "MERGE",
] as const

const MAX_ROWS = 1000
const QUERY_TIMEOUT_MS = 30_000

type ValidationResult =
  | { valid: true }
  | { valid: false; error: string }

export function validateBigQuerySql(sql: string): ValidationResult {
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

export function enforceBigQueryLimit(sql: string): string {
  const normalized = sql.trim().toUpperCase()
  if (normalized.includes("LIMIT")) {
    return sql
  }
  return `${sql.trimEnd()} LIMIT ${MAX_ROWS}`
}

export async function executeSafeBigQuery(
  sql: string,
  _description: string,
): Promise<{ rows?: unknown[]; count?: number; error?: string; durationMs?: number }> {
  const validation = validateBigQuerySql(sql)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const limitedSql = enforceBigQueryLimit(sql)
  const start = performance.now()

  try {
    const response = await bigquery.query({
      query: limitedSql,
      jobTimeoutMs: QUERY_TIMEOUT_MS,
    })
    const rows = response[0] as Record<string, unknown>[]
    const durationMs = Math.round(performance.now() - start)
    return { rows, count: rows.length, durationMs }
  } catch (error) {
    const durationMs = Math.round(performance.now() - start)
    return { error: (error as Error).message, durationMs }
  }
}

const TOOL_DESCRIPTION = `Execute a read-only SQL query against the BigQuery data warehouse.
Returns JSON rows. Use this to fetch product usage data — document processing volumes, types, statuses.

Dataset: camu-warehouse.camu_br

TABLES AND COLUMNS:

1. customer_updates (108k rows) — main document processing table
   - id (STRING), tenant_id (STRING), company_id (STRING)
   - document_type (STRING) — values: nfe
   - validation_status (STRING) — values: captured, approved, errors, canceled, in_review, pending_approval
   - erp_status (STRING) — values: pending, purchase_invoice_posted_in_erp, no_purchase_order_required, purchase_invoice_partially_posted_in_erp, purchase_return_invoice_posted_in_erp, awaiting_purchase_invoice_posting_in_erp, purchase_invoice_posted_in_erp_with_errors
   - manifestation_status (STRING, nullable) — values: acknowledgement_of_issuance, confirmation_of_operation, operation_not_performed, operation_unknown, null
   - sped_status (STRING) — values: pending_submission, present, absent, not_applicable
   - numero_nota (STRING), serie (STRING), chave_de_acesso (STRING)
   - data_emissao (TIMESTAMP) — document issue date, use DATE(cu.data_emissao) for date filtering
   - valor_total (FLOAT) — document total value
   - nome_emitente (STRING), cnpj_emitente (STRING)
   - created_at (TIMESTAMP), updated_at (TIMESTAMP)

2. tenants (19 rows) — account/customer list
   - id (STRING), name (STRING)

3. dfe_documents (715k rows) — raw fiscal documents
4. dfe_document_relationships (411k rows) — document relationships
5. dfe_document_relationships_events (575k rows) — relationship events

COMMON FILTERS (exclude noise):
  AND cu.validation_status != 'canceled'
  AND cu.manifestation_status != 'operation_not_performed'

JOIN tenants: FROM customer_updates cu JOIN tenants t ON cu.tenant_id = t.id

RULES:
- Only SELECT queries allowed. No INSERT, UPDATE, DELETE, DROP, etc.
- LIMIT is enforced automatically (max ${MAX_ROWS} rows).
- Queries timeout after ${QUERY_TIMEOUT_MS / 1000}s.
- Use BigQuery SQL syntax (DATE_TRUNC, TIMESTAMP_TRUNC, SAFE_DIVIDE, COUNTIF, etc.)
- Always use backtick-quoted table names: \\\`camu-warehouse.camu_br.customer_updates\\\`
- Return concise result sets — aggregate when possible`

const queryBigQueryTool = tool(
  "queryBigQuery",
  TOOL_DESCRIPTION,
  {
    sql: z.string().describe("The SQL SELECT query to execute against BigQuery"),
    description: z
      .string()
      .describe("Brief description of what this query does (for debugging)"),
  },
  async (args) => {
    const result = await executeSafeBigQuery(args.sql, args.description)

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

export const queryBigQueryServer = createSdkMcpServer({
  name: "usage-bq",
  version: "1.0.0",
  tools: [queryBigQueryTool],
})
