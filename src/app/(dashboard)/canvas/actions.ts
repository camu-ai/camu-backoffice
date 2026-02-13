"use server"

import { runCanvasAgent, type CanvasError } from "@/lib/canvas/agent"
import { ViewSpecSchema, type ViewSpec } from "@/lib/canvas/schema"

interface CanvasActionResult {
  spec?: ViewSpec
  sessionId?: string
  error?: string
  rawJson?: string
  hint?: string
}

export async function generateView(
  prompt: string,
  sessionId?: string,
): Promise<CanvasActionResult> {
  try {
    const result = await runCanvasAgent(prompt, sessionId)
    return { spec: result.spec, sessionId: result.sessionId }
  } catch (error) {
    const canvasError = (error as Error & { canvasError?: CanvasError }).canvasError
    if (canvasError) {
      return {
        error: canvasError.message,
        rawJson: canvasError.rawJson,
        hint: canvasError.hint,
      }
    }
    return { error: (error as Error).message }
  }
}

export async function saveView(
  title: string,
  prompt: string,
  spec: ViewSpec,
  sessionId: string,
): Promise<{ id: string } | { error: string }> {
  const { prisma } = await import("@/lib/db")

  const validation = ViewSpecSchema.safeParse(spec)
  if (!validation.success) {
    return { error: "Invalid view spec" }
  }

  const saved = await prisma.savedView.create({
    data: {
      title,
      prompt,
      spec: JSON.parse(JSON.stringify(spec)),
      sessionId,
      createdBy: "system",
    },
  })

  return { id: saved.id }
}

export async function togglePin(viewId: string): Promise<{ isPinned: boolean } | { error: string }> {
  const { prisma } = await import("@/lib/db")

  const view = await prisma.savedView.findUnique({ where: { id: viewId } })
  if (!view) {
    return { error: "View not found" }
  }

  const updated = await prisma.savedView.update({
    where: { id: viewId },
    data: { isPinned: !view.isPinned },
  })

  return { isPinned: updated.isPinned }
}

export async function getSavedViews(): Promise<{ id: string; title: string; isPinned: boolean }[]> {
  const { prisma } = await import("@/lib/db")

  return prisma.savedView.findMany({
    select: { id: true, title: true, isPinned: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function deleteView(viewId: string): Promise<{ ok: true } | { error: string }> {
  const { prisma } = await import("@/lib/db")

  try {
    await prisma.savedView.delete({ where: { id: viewId } })
    return { ok: true }
  } catch {
    return { error: "Failed to delete view" }
  }
}

export async function loadSavedView(viewId: string): Promise<CanvasActionResult> {
  const { prisma } = await import("@/lib/db")

  const view = await prisma.savedView.findUnique({ where: { id: viewId } })
  if (!view) {
    return { error: "View not found" }
  }

  const parsed = ViewSpecSchema.safeParse(view.spec)
  if (!parsed.success) {
    return { error: "Saved view has invalid spec" }
  }

  return {
    spec: parsed.data,
    sessionId: view.sessionId ?? undefined,
  }
}
