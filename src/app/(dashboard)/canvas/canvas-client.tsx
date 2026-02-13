"use client"

import { useMemo, useState, useCallback } from "react"
import {
  Send,
  Save,
  Pin,
  PinOff,
  Code,
  Database,
  Loader2,
  Sparkles,
  Trash2,
  PanelRightOpen,
  PanelRightClose,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  RotateCw,
} from "lucide-react"
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useMessage,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react"
import type { ToolCallMessagePartProps } from "@assistant-ui/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ViewRenderer } from "@/lib/canvas/renderer"
import type { ViewSpec } from "@/lib/canvas/schema"
import { createCanvasAdapter } from "@/lib/canvas/adapter"
import { saveView, togglePin, loadSavedView, deleteView } from "./actions"
import { toast } from "sonner"

const SUGGESTED_PROMPTS = [
  "Show SLA compliance by priority",
  "Top 10 accounts by ticket volume",
  "Category breakdown over the last 30 days",
  "Integration rate by tenant this month",
  "Document volume trend by type",
  "Escriturado vs Não Escriturado monthly breakdown",
]

interface SavedViewItem {
  id: string
  title: string
  isPinned: boolean
}

interface CanvasClientProps {
  initialSavedViews: SavedViewItem[]
}

export function CanvasClient({ initialSavedViews }: CanvasClientProps) {
  const adapter = useMemo(() => createCanvasAdapter(), [])
  const runtime = useLocalRuntime(adapter)
  const [savedViews, setSavedViews] = useState(initialSavedViews)
  const [panelOpen, setPanelOpen] = useState(initialSavedViews.length > 0)
  const [loadedSpec, setLoadedSpec] = useState<ViewSpec | null>(null)

  const onViewSaved = useCallback((view: SavedViewItem) => {
    setSavedViews((prev) => [view, ...prev])
  }, [])

  const handleLoad = useCallback(async (viewId: string) => {
    const result = await loadSavedView(viewId)
    if (result.error) {
      toast.error(result.error)
    } else if (result.spec) {
      setLoadedSpec(result.spec)
    }
  }, [])

  const handleDelete = useCallback(async (viewId: string) => {
    const result = await deleteView(viewId)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      setSavedViews((prev) => prev.filter((v) => v.id !== viewId))
      if (loadedSpec) setLoadedSpec(null)
      toast.success("View deleted")
    }
  }, [loadedSpec])

  const handleTogglePin = useCallback(async (viewId: string) => {
    const result = await togglePin(viewId)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      setSavedViews((prev) =>
        prev.map((v) =>
          v.id === viewId ? { ...v, isPinned: result.isPinned } : v,
        ),
      )
    }
  }, [])

  const pinnedViews = savedViews.filter((v) => v.isPinned)
  const recentViews = savedViews.filter((v) => !v.isPinned)

  return (
    <SavedViewContext.Provider value={onViewSaved}>
      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex h-[calc(100vh-8rem)] gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">AI Canvas</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask about support tickets or document processing and get a
                  dashboard view
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPanelOpen(!panelOpen)}
                title={panelOpen ? "Hide saved views" : "Show saved views"}
              >
                {panelOpen ? (
                  <PanelRightClose className="size-4" />
                ) : (
                  <PanelRightOpen className="size-4" />
                )}
              </Button>
            </div>

            {loadedSpec ? (
              <div className="flex flex-1 flex-col overflow-y-auto">
                <ViewRenderer spec={loadedSpec} />
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLoadedSpec(null)}
                  >
                    Back to chat
                  </Button>
                </div>
              </div>
            ) : (
              <ThreadPrimitive.Root className="flex flex-1 flex-col overflow-hidden">
                <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto pb-4">
                  <ThreadPrimitive.Empty>
                    <EmptyState />
                  </ThreadPrimitive.Empty>
                  <ThreadPrimitive.Messages
                    components={{
                      UserMessage: CanvasUserMessage,
                      AssistantMessage: CanvasAssistantMessage,
                    }}
                  />
                </ThreadPrimitive.Viewport>

                <div className="border-t bg-background pt-4">
                  <CanvasComposer />
                </div>
              </ThreadPrimitive.Root>
            )}
          </div>

          {panelOpen && (
            <SavedViewsPanel
              pinnedViews={pinnedViews}
              recentViews={recentViews}
              onLoad={handleLoad}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          )}
        </div>
      </AssistantRuntimeProvider>
    </SavedViewContext.Provider>
  )
}

import { createContext, useContext } from "react"

const SavedViewContext = createContext<
  ((view: SavedViewItem) => void) | null
>(null)

function SavedViewsPanel({
  pinnedViews,
  recentViews,
  onLoad,
  onDelete,
  onTogglePin,
}: {
  pinnedViews: SavedViewItem[]
  recentViews: SavedViewItem[]
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
}) {
  return (
    <div className="w-64 shrink-0 rounded-lg border bg-card">
      <div className="px-4 py-3">
        <h3 className="text-sm font-semibold">Saved Views</h3>
      </div>
      <Separator />
      <ScrollArea className="h-[calc(100%-3rem)]">
        <div className="p-2">
          {pinnedViews.length > 0 && (
            <>
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Pinned
              </p>
              {pinnedViews.map((view) => (
                <SavedViewRow
                  key={view.id}
                  view={view}
                  onLoad={onLoad}
                  onDelete={onDelete}
                  onTogglePin={onTogglePin}
                />
              ))}
            </>
          )}

          {pinnedViews.length > 0 && recentViews.length > 0 && (
            <Separator className="my-2" />
          )}

          {recentViews.length > 0 && (
            <>
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Recent
              </p>
              {recentViews.map((view) => (
                <SavedViewRow
                  key={view.id}
                  view={view}
                  onLoad={onLoad}
                  onDelete={onDelete}
                  onTogglePin={onTogglePin}
                />
              ))}
            </>
          )}

          {pinnedViews.length === 0 && recentViews.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No saved views yet. Generate a view and click Save to keep it.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function SavedViewRow({
  view,
  onLoad,
  onDelete,
  onTogglePin,
}: {
  view: SavedViewItem
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string) => void
}) {
  return (
    <div className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <button
        onClick={() => onLoad(view.id)}
        className="min-w-0 flex-1 truncate text-left text-xs"
        title={view.title}
      >
        {view.title}
      </button>
      <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onTogglePin(view.id)}
          className="rounded p-0.5 hover:bg-muted"
          title={view.isPinned ? "Unpin" : "Pin"}
        >
          {view.isPinned ? (
            <PinOff className="size-3 text-muted-foreground" />
          ) : (
            <Pin className="size-3 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={() => onDelete(view.id)}
          className="rounded p-0.5 hover:bg-muted"
          title="Delete"
        >
          <Trash2 className="size-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-lg text-center">
        <Sparkles className="mx-auto mb-4 size-10 text-muted-foreground/50" />
        <h3 className="text-lg font-medium">
          Ask anything about your data
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Query support tickets (Postgres) or document processing data
          (BigQuery) and get a dashboard view.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <ThreadPrimitive.Suggestion
              key={p}
              prompt={p}
              autoSend
              className="cursor-pointer rounded-full border bg-muted/50 px-3 py-1.5 text-xs transition-colors hover:bg-muted"
            >
              {p}
            </ThreadPrimitive.Suggestion>
          ))}
        </div>
      </div>
    </div>
  )
}

function CanvasComposer() {
  return (
    <ComposerPrimitive.Root className="flex gap-2">
      <ComposerPrimitive.Input
        autoFocus
        placeholder="Ask about support tickets or document processing..."
        className="min-h-[48px] flex-1 resize-none rounded-md border bg-background px-3 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        rows={1}
      />
      <ComposerPrimitive.Send asChild>
        <Button size="icon" className="size-12 shrink-0 self-end">
          <Send className="size-4" />
        </Button>
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  )
}

function CanvasUserMessage() {
  return (
    <MessagePrimitive.Root className="mb-4">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <MessagePrimitive.Content />
        </div>
      </div>
    </MessagePrimitive.Root>
  )
}

function CanvasAssistantMessage() {
  const message = useMessage()
  const custom = message.metadata?.custom as
    | Record<string, unknown>
    | undefined
  const spec = custom?.spec as ViewSpec | undefined
  const sessionId = custom?.sessionId as string | undefined
  const prompt = custom?.prompt as string | undefined
  const isRunning = message.status?.type === "running"
  const isError = message.status?.type === "incomplete"

  return (
    <MessagePrimitive.Root className="mb-6">
      <div className="space-y-3">
        <MessagePrimitive.Content
          components={{
            Text: AssistantText,
            Empty: AssistantLoading,
            tools: {
              Fallback: QueryToolDisplay,
            },
          }}
        />

        {spec && !isRunning && (
          <div className="mt-4">
            <ViewRenderer spec={spec} />
            <ViewActions spec={spec} sessionId={sessionId} prompt={prompt} />
          </div>
        )}

        {isError && !spec && prompt && (
          <div className="flex items-center gap-2 pt-1">
            <ThreadPrimitive.Suggestion prompt={prompt} autoSend asChild>
              <Button variant="outline" size="sm">
                <RotateCw className="mr-2 size-3.5" />
                Try Again
              </Button>
            </ThreadPrimitive.Suggestion>
          </div>
        )}

        {isRunning && !message.content.length && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span>Analyzing your data...</span>
          </div>
        )}
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return null

  const isThinking = text.length > 150 && !text.startsWith("**")

  if (isThinking && !expanded) {
    const preview = text.slice(0, 80).replace(/\s+\S*$/, "")
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className="size-3 shrink-0" />
        <span className="truncate italic">{preview}...</span>
      </button>
    )
  }

  if (isThinking && expanded) {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2">
        <button
          onClick={() => setExpanded(false)}
          className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"
        >
          <ChevronDown className="size-3" />
          <span>Agent thinking</span>
        </button>
        <div className="text-xs leading-relaxed text-muted-foreground">
          {renderText(text)}
        </div>
      </div>
    )
  }

  return (
    <div className="text-sm leading-relaxed">
      {renderText(text)}
    </div>
  )
}

function renderText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.includes("\n")) {
      return (
        <span key={i}>
          {part.split("\n").map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {line}
            </span>
          ))}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function AssistantLoading() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span>Starting analysis...</span>
    </div>
  )
}

function QueryToolDisplay(props: ToolCallMessagePartProps) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = props.status.type === "running"
  const args = props.args as { sql?: string; source?: string } | undefined
  const source = args?.source ?? (props.toolName === "queryBigQuery" ? "bigquery" : "postgres")
  const sql = args?.sql

  return (
    <div className="rounded-md border bg-muted/30">
      <button
        onClick={() => sql && setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs"
      >
        <Database
          className={`size-3.5 shrink-0 ${isRunning ? "animate-pulse text-primary" : "text-muted-foreground"}`}
        />
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
            source === "bigquery"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          }`}
        >
          {source === "bigquery" ? "BigQuery" : "Postgres"}
        </span>
        <span className="text-muted-foreground">
          {isRunning
            ? "Running..."
            : typeof props.result === "string"
              ? props.result
              : "Complete"}
        </span>
        {sql && (
          <ChevronDown
            className={`ml-auto size-3 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </button>
      {expanded && sql && (
        <div className="border-t px-3 py-2">
          <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
            {sql}
          </pre>
        </div>
      )}
    </div>
  )
}

function ViewActions({
  spec,
  sessionId,
  prompt,
}: {
  spec: ViewSpec
  sessionId?: string
  prompt?: string
}) {
  const [savedViewId, setSavedViewId] = useState<string | null>(null)
  const [showJson, setShowJson] = useState(false)
  const onViewSaved = useContext(SavedViewContext)

  const handleSave = useCallback(async () => {
    if (!sessionId) return
    const result = await saveView(spec.title, spec.description, spec, sessionId)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      setSavedViewId(result.id)
      onViewSaved?.({ id: result.id, title: spec.title, isPinned: false })
      toast.success("View saved")
    }
  }, [spec, sessionId, onViewSaved])

  const handlePin = useCallback(async () => {
    if (!savedViewId) {
      toast.error("Save the view first")
      return
    }
    const result = await togglePin(savedViewId)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success(result.isPinned ? "Pinned to sidebar" : "Unpinned")
    }
  }, [savedViewId])

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {prompt && (
          <ThreadPrimitive.Suggestion prompt={prompt} autoSend asChild>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 size-3.5" />
              Refresh
            </Button>
          </ThreadPrimitive.Suggestion>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={!sessionId || !!savedViewId}
        >
          <Save className="mr-2 size-3.5" />
          {savedViewId ? "Saved" : "Save View"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePin}
          disabled={!savedViewId}
        >
          <Pin className="mr-2 size-3.5" />
          Pin
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowJson(!showJson)}
        >
          <Code className="mr-2 size-3.5" />
          {showJson ? "Hide JSON" : "JSON"}
        </Button>
      </div>

      {showJson && (
        <Card>
          <CardContent className="pt-4">
            <pre className="max-h-[400px] overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(spec, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
