import type {
  ChatModelAdapter,
  ChatModelRunResult,
} from "@assistant-ui/react"
import type { ViewSpec } from "./schema"

type ContentPart = ChatModelRunResult["content"] extends
  | readonly (infer T)[]
  | undefined
  ? T
  : never

interface StreamEvent {
  type: "tool_call" | "thinking" | "done" | "error" | "result"
  message?: string
  sql?: string
  source?: "postgres" | "bigquery"
  queryIndex?: number
  spec?: ViewSpec
  sessionId?: string
  error?: string
  rawJson?: string
  hint?: string
}

interface TrackedQuery {
  sql: string
  source: "postgres" | "bigquery"
  isComplete: boolean
}

function buildQueryParts(queries: TrackedQuery[]): ContentPart[] {
  return queries.map((q, i) => ({
    type: "tool-call" as const,
    toolCallId: `query-${i + 1}`,
    toolName: q.source === "bigquery" ? "queryBigQuery" : "queryDatabase",
    argsText: q.sql ? JSON.stringify({ sql: q.sql }) : "{}",
    args: { sql: q.sql, source: q.source },
    result: q.isComplete ? `Query ${i + 1} complete` : undefined,
  }))
}

export function createCanvasAdapter(): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      const lastMessage = messages[messages.length - 1]
      if (!lastMessage || lastMessage.role !== "user") return

      const prompt = lastMessage.content
        .filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join("\n")

      const prevAssistant = messages
        .filter((m) => m.role === "assistant")
        .at(-1)
      const sessionId = (
        prevAssistant?.metadata?.custom as
          | Record<string, unknown>
          | undefined
      )?.sessionId as string | undefined

      const response = await fetch("/api/canvas/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, sessionId }),
        signal: abortSignal,
      })

      if (!response.ok || !response.body) {
        yield {
          content: [
            {
              type: "text" as const,
              text: "Failed to connect to the AI agent.",
            },
          ],
          status: {
            type: "incomplete" as const,
            reason: "error" as const,
            error: "Connection failed",
          },
          metadata: { custom: { prompt } },
        } satisfies ChatModelRunResult
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      const queries: TrackedQuery[] = []

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const chunks = buffer.split("\n\n")
          buffer = chunks.pop() ?? ""

          for (const chunk of chunks) {
            if (!chunk.startsWith("data: ")) continue

            let event: StreamEvent
            try {
              event = JSON.parse(chunk.slice(6))
            } catch {
              continue
            }

            if (event.type === "tool_call") {
              for (const q of queries) q.isComplete = true
              queries.push({
                sql: event.sql ?? "",
                source: event.source ?? "postgres",
                isComplete: false,
              })
              yield { content: buildQueryParts(queries) }
            } else if (event.type === "thinking") {
              for (const q of queries) q.isComplete = true
              const parts: ContentPart[] = buildQueryParts(queries)
              parts.push({
                type: "text" as const,
                text: event.message ?? "Analyzing...",
              })
              yield { content: parts }
            } else if (event.type === "result" && event.spec) {
              yield {
                content: [
                  {
                    type: "text" as const,
                    text: `**${event.spec.title}**\n\n${event.spec.description}`,
                  },
                ],
                status: { type: "complete" as const, reason: "stop" as const },
                metadata: {
                  custom: {
                    spec: event.spec,
                    sessionId: event.sessionId,
                    queryCount: queries.length,
                    prompt,
                  },
                },
              } satisfies ChatModelRunResult
              return
            } else if (event.type === "error") {
              yield {
                content: [
                  {
                    type: "text" as const,
                    text: `${event.error}${event.hint ? `\n\n${event.hint}` : ""}`,
                  },
                ],
                status: {
                  type: "incomplete" as const,
                  reason: "error" as const,
                  error: event.error ?? "Unknown error",
                },
                metadata: {
                  custom: { rawJson: event.rawJson, prompt },
                },
              } satisfies ChatModelRunResult
              return
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      yield {
        content: [
          {
            type: "text" as const,
            text: "Agent completed without producing a result. Try again.",
          },
        ],
        status: {
          type: "incomplete" as const,
          reason: "error" as const,
          error: "No result",
        },
        metadata: { custom: { prompt } },
      } satisfies ChatModelRunResult
    },
  }
}
