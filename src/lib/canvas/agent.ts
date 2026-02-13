import path from "node:path"
import { query } from "@anthropic-ai/claude-agent-sdk"
import { z } from "zod"
import { ViewSpecSchema, type ViewSpec } from "./schema"
import { queryDatabaseServer } from "./query-tool"
import { queryBigQueryServer } from "./bigquery-tool"
import { startActiveObservation, propagateAttributes } from "@langfuse/tracing"

const CANVAS_SYSTEM_PROMPT = `You are a data analyst for Camu. You help the team understand their
support ticket data and product usage data by building dashboard views.

You have access to TWO data sources:

1. **Support Database** (Postgres) — via mcp__support-db__queryDatabase
   Use for: support tickets, SLA status, response times, categories, handlers, account ticket history.
   SQL dialect: Postgres (DATE_TRUNC, EXTRACT, etc.)

2. **Usage Data Warehouse** (BigQuery) — via mcp__usage-bq__queryBigQuery
   Use for: document processing volumes, document types (NFe, CTe, NFSe), processing statuses, tenant usage trends.
   SQL dialect: BigQuery SQL (TIMESTAMP_TRUNC, etc.)
   NOTE: BigQuery tables are being set up. If queries fail, fall back to the support database.

IMPORTANT RULES:
- You may ONLY use the mcp__support-db__queryDatabase and mcp__usage-bq__queryBigQuery tools. Do NOT use any other tools.
- Choose the right data source based on the question. You can use both in a single response if needed.
- After gathering data, your FINAL response must be ONLY a raw JSON object matching the ViewSpec schema below. No markdown, no explanation, no code fences — just the JSON object starting with { and ending with }.

When the user asks a question:
1. Think about what data you need and which data source has it
2. Use the appropriate tool(s) to run SQL queries and get real data
3. You may run multiple queries across both data sources
4. Return a single JSON object matching the ViewSpec schema with the data you collected

## ViewSpec Schema

Your final output must be a JSON object with this shape:
{
  "title": "string — dashboard title",
  "description": "string — one-line summary",
  "layout": [
    {
      "row": [
        {
          "component": "one of: kpi-card, bar-chart, line-chart, area-chart, donut-chart, data-table, stat-row, metric-comparison, stacked-bar-chart",
          "width": "number 1-12 (CSS grid columns)",
          "props": { ... component-specific props ... },
          "data": { ... component-specific data ... }
        }
      ]
    }
  ]
}

## Component Reference

### kpi-card
props: { title: string, format?: "number"|"percentage"|"duration", invertDelta?: boolean }
data: { value: number, previousValue?: number }

### bar-chart
props: { title: string, orientation?: "vertical"|"horizontal" }
data: { items: [{ label: string, value: number }] }

### line-chart
props: { title: string, referenceLine?: number, referenceLabel?: string }
data: { series: [{ name: string, points: [{ date: string, value: number }] }] }

### area-chart
props: { title: string, stacked?: boolean }
data: { series: [{ name: string, points: [{ date: string, value: number }] }] }

### donut-chart
props: { title: string }
data: { items: [{ label: string, value: number }] }

### data-table
props: { title: string, sortBy?: string, sortDir?: "asc"|"desc" }
data: { rows: object[], columns: [{ key: string, label: string, format?: string }] }

### stat-row
props: {}
data: { items: [{ label: string, value: number, format?: string }] }

### metric-comparison
props: { title: string }
data: { metrics: [{ label: string, current: number, previous: number, format?: "number"|"percentage"|"duration" }] }
Use for side-by-side period comparisons (e.g., this week vs last week).

### stacked-bar-chart
props: { title: string, orientation?: "vertical"|"horizontal" }
data: { categories: [string], series: [{ name: string, values: [number] }] }
Use for multi-series categorical data (e.g., priority breakdown by category). Each series.values[i] maps to categories[i].

## Layout Rules
- Each row's component widths must sum to 12 (CSS grid).
- KPI cards: width 3 (4 per row) or width 4 (3 per row)
- Charts: width 6 (two side by side) or width 12 (full)
- Tables: usually width 12 (full width)
- Pattern: KPIs on top, charts in middle, tables at bottom

## Style Guide
- Use concise titles
- Format durations as "Xh Ym" for hours, "Xd" for days
- Format percentages with 1 decimal place
- For comparisons, calculate the delta percentage

Remember: Your final message must be ONLY the raw JSON object. No other text.`

interface ExtractResult {
  json: unknown | null
  method: "code_block" | "brace_match" | "raw_parse" | "none"
}

function extractJson(text: string): ExtractResult {
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (codeBlockMatch) {
    try {
      return { json: JSON.parse(codeBlockMatch[1]), method: "code_block" }
    } catch { /* fall through */ }
  }

  const braceMatch = text.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try {
      return { json: JSON.parse(braceMatch[0]), method: "brace_match" }
    } catch { /* fall through */ }
  }

  try {
    return { json: JSON.parse(text), method: "raw_parse" }
  } catch {
    return { json: null, method: "none" }
  }
}

export interface CanvasResult {
  spec: ViewSpec
  sessionId: string
}

export interface CanvasError {
  message: string
  rawJson?: string
  hint?: string
}

export interface CanvasProgress {
  type: "tool_call" | "thinking" | "done" | "error"
  message: string
  sql?: string
  source?: "postgres" | "bigquery"
  queryIndex?: number
}

export async function runCanvasAgent(
  userPrompt: string,
  sessionId?: string,
  onProgress?: (progress: CanvasProgress) => void,
): Promise<CanvasResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your .env file to use the AI Canvas.",
    )
  }

  return startActiveObservation("canvas-agent", async (trace) => {
    trace.update({ input: { prompt: userPrompt, sessionId } })
    trace.updateTrace({
      tags: ["canvas"],
      metadata: { model: "claude-sonnet-4-5-20250929" },
    })

    return propagateAttributes(
      { traceName: "canvas-agent" },
      () => executeAgent(userPrompt, sessionId, onProgress, trace),
    )
  })
}

async function executeAgent(
  userPrompt: string,
  sessionId: string | undefined,
  onProgress: ((progress: CanvasProgress) => void) | undefined,
  trace: { update: (params: Record<string, unknown>) => void },
): Promise<CanvasResult> {
  const viewSpecJsonSchema = z.toJSONSchema(ViewSpecSchema)

  let capturedSessionId = sessionId ?? ""
  let queryCount = 0

  for await (const message of query({
    prompt: userPrompt,
    options: {
      systemPrompt: CANVAS_SYSTEM_PROMPT,
      model: "claude-sonnet-4-5-20250929",
      mcpServers: {
        "support-db": queryDatabaseServer,
        "usage-bq": queryBigQueryServer,
      },
      allowedTools: ["mcp__support-db__queryDatabase", "mcp__usage-bq__queryBigQuery"],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxTurns: 15,
      env: {
        ...process.env as Record<string, string>,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
        PATH: [path.dirname(process.execPath), process.env.PATH].filter(Boolean).join(path.delimiter),
      },
      outputFormat: {
        type: "json_schema",
        schema: viewSpecJsonSchema,
      },
      ...(sessionId ? { resume: sessionId } : {}),
    },
  })) {
    const subtype = "subtype" in message ? message.subtype : undefined
    console.log(`[canvas-agent] message: type=${message.type} subtype=${subtype}`)

    if (message.type === "system" && message.subtype === "init") {
      capturedSessionId = message.session_id
      console.log("[canvas-agent] init:", {
        model: message.model,
        tools: message.tools,
        mcpServers: message.mcp_servers,
      })
    }

    if (message.type === "assistant" && message.message?.content) {
      for (const block of message.message.content) {
        if ("text" in block && block.text) {
          onProgress?.({ type: "thinking", message: block.text })
        }
        if ("name" in block && (block.name?.includes("queryDatabase") || block.name?.includes("queryBigQuery"))) {
          queryCount++
          const source: "postgres" | "bigquery" = block.name?.includes("queryBigQuery") ? "bigquery" : "postgres"
          const input = "input" in block ? (block.input as Record<string, unknown>) : {}
          const sql = (input.sql ?? "") as string
          onProgress?.({
            type: "tool_call",
            message: `Running ${source === "bigquery" ? "BigQuery" : "Postgres"} query ${queryCount}...`,
            sql,
            source,
            queryIndex: queryCount,
          })
        }
      }
    }

    if (message.type === "result") {
      const resultMsg = message as Record<string, unknown>
      const resultMeta = {
        subtype: resultMsg.subtype,
        is_error: resultMsg.is_error,
        num_turns: resultMsg.num_turns,
        stop_reason: resultMsg.stop_reason,
        total_cost_usd: resultMsg.total_cost_usd,
        query_count: queryCount,
      }
      console.log("[canvas-agent] result:", resultMeta)

      if (message.subtype === "error_max_structured_output_retries") {
        trace.update({ output: { error: "max_structured_output_retries" }, metadata: resultMeta })
        const err = new Error("Agent could not produce a valid view after multiple attempts") as Error & { canvasError: CanvasError }
        err.canvasError = {
          message: err.message,
          hint: "Try rephrasing your question or asking for a simpler view.",
        }
        throw err
      }

      if (
        message.subtype === "error_during_execution" ||
        message.subtype === "error_max_turns" ||
        message.subtype === "error_max_budget_usd"
      ) {
        const errorMessages = "errors" in message ? (message.errors as string[]) : []
        trace.update({ output: { error: message.subtype, errors: errorMessages }, metadata: resultMeta })
        const err = new Error(
          `Agent error (${message.subtype}): ${errorMessages.join(", ") || "unknown"}`,
        ) as Error & { canvasError: CanvasError }
        err.canvasError = {
          message: err.message,
          hint: message.subtype === "error_max_turns"
            ? "The question required too many queries. Try a more specific question."
            : "An unexpected error occurred. Try again.",
        }
        throw err
      }

      if (message.subtype === "success") {
        if (message.structured_output) {
          const parsed = ViewSpecSchema.safeParse(message.structured_output)
          if (parsed.success) {
            onProgress?.({ type: "done", message: "View ready" })
            trace.update({
              output: { title: parsed.data.title, panelCount: parsed.data.layout.length },
              metadata: { ...resultMeta, extractionMethod: "structured_output" },
            })
            return { spec: parsed.data, sessionId: capturedSessionId }
          }
          console.error("[canvas-agent] structured_output failed Zod parse:", parsed.error.issues)
          trace.update({ output: { error: "zod_parse_failed", extractionMethod: "structured_output" }, metadata: resultMeta })
          const err = new Error("Agent returned invalid view spec") as Error & { canvasError: CanvasError }
          err.canvasError = {
            message: "The agent produced an invalid chart spec.",
            rawJson: JSON.stringify(message.structured_output, null, 2),
            hint: "Try rephrasing your question or asking for fewer charts.",
          }
          throw err
        }

        const resultText = (message as Record<string, unknown>).result as string | undefined
        if (resultText) {
          const { json, method } = extractJson(resultText)
          console.log(`[canvas-agent] JSON extraction method: ${method}`)
          trace.update({ metadata: { ...resultMeta, extractionMethod: method } })

          if (json) {
            const parsed = ViewSpecSchema.safeParse(json)
            if (parsed.success) {
              onProgress?.({ type: "done", message: "View ready" })
              trace.update({
                output: { title: parsed.data.title, panelCount: parsed.data.layout.length },
              })
              return { spec: parsed.data, sessionId: capturedSessionId }
            }
            console.error("[canvas-agent] extracted JSON failed Zod parse:", parsed.error.issues)
            const err = new Error("Agent returned invalid view spec") as Error & { canvasError: CanvasError }
            err.canvasError = {
              message: "The agent produced an invalid chart spec.",
              rawJson: JSON.stringify(json, null, 2),
              hint: "Try rephrasing your question or asking for fewer charts.",
            }
            throw err
          } else {
            console.error("[canvas-agent] could not extract JSON from result text")
          }
        }

        trace.update({ output: { error: "no_valid_view_spec", extractionMethod: "none" }, metadata: resultMeta })
        const err = new Error("Agent did not produce a valid view spec") as Error & { canvasError: CanvasError }
        err.canvasError = {
          message: "The agent completed but couldn't generate a dashboard view.",
          hint: "Try a different question, e.g. 'Show bug count by category this month'.",
        }
        throw err
      }
    }
  }

  trace.update({ output: { error: "no_result" } })
  throw new Error("Agent completed without producing a result")
}
