import { runCanvasAgent, type CanvasError } from "@/lib/canvas/agent"

export async function POST(req: Request) {
  const { prompt, sessionId } = await req.json()

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const result = await runCanvasAgent(prompt, sessionId, (progress) => {
          send(progress)
        })
        send({ type: "result", spec: result.spec, sessionId: result.sessionId })
      } catch (error) {
        const err = error as Error & { canvasError?: CanvasError }
        send({
          type: "error",
          error: err.canvasError?.message ?? err.message,
          rawJson: err.canvasError?.rawJson,
          hint: err.canvasError?.hint,
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
