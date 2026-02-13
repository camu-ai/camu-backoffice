import { prisma } from "@/lib/db"
import { calculateSlaStatus, calculateTimeToSla } from "@/lib/sla"
import { formatAge, formatHours } from "@/lib/utils"
import { ChartPanel } from "@/components/charts/chart-panel"
import { IssuesTable, type IssueRow } from "@/components/tables"
import { StateBadge } from "@/components/badges"
import type { SlaStatus } from "@/lib/sla"
import { PanelErrorBoundary } from "@/components/panel-error-boundary"
import { ActNowFilters, type ActionIssue } from "./act-now-client"

interface IssueWithRelations {
  id: string
  title: string
  state: string
  priority: string | null
  category: string | null
  handler: string | null
  link: string | null
  createdAt: Date
  account: { id: string; name: string } | null
  assignee: { id: string; name: string } | null
}

function enrichIssue(issue: IssueWithRelations): ActionIssue {
  const slaStatus = issue.priority
    ? calculateSlaStatus({
        priority: issue.priority,
        metric: "resolution",
        createdAt: issue.createdAt,
      })
    : ("ok" as const)

  const timeToSla = issue.priority
    ? calculateTimeToSla({
        priority: issue.priority,
        metric: "resolution",
        createdAt: issue.createdAt,
      })
    : Infinity

  const timeToSlaLabel =
    timeToSla === Infinity
      ? "—"
      : timeToSla <= 0
        ? `breached by ${formatHours(Math.abs(timeToSla))}`
        : `${formatHours(timeToSla)} left`

  return {
    id: issue.id,
    title: issue.title,
    state: issue.state,
    priority: issue.priority,
    handler: issue.handler,
    accountName: issue.account?.name ?? null,
    assigneeName: issue.assignee?.name ?? null,
    age: formatAge(issue.createdAt),
    slaStatus,
    slaStatusValue: slaStatus,
    timeToSla: timeToSlaLabel,
    link: issue.link,
  }
}

interface ActNowPageProps {
  searchParams: Promise<{ account?: string; from?: string; to?: string }>
}

export default async function ActNowPage({ searchParams }: ActNowPageProps) {
  const { account: accountId } = await searchParams
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const accountWhere = accountId ? { accountId } : {}

  const [
    waitingOnUsCount,
    p0p1Count,
    actionQueueRaw,
    agingRaw,
    stateCounts,
    categoryCounts,
  ] = await Promise.all([
    prisma.issue.count({
      where: { state: { in: ["new", "waiting_on_you"] }, ...accountWhere },
    }),

    prisma.issue.count({
      where: { state: { not: "closed" }, priority: { in: ["urgent", "high"] }, ...accountWhere },
    }),

    prisma.issue.findMany({
      where: {
        state: { not: "closed" },
        OR: [
          { state: { in: ["new", "waiting_on_you"] } },
          { priority: { in: ["urgent", "high"] } },
        ],
        ...accountWhere,
      },
      include: { account: true, assignee: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),

    prisma.issue.findMany({
      where: {
        state: { notIn: ["closed", "new", "waiting_on_you"] },
        priority: { notIn: ["urgent", "high"] },
        createdAt: { lt: sevenDaysAgo },
        ...accountWhere,
      },
      include: { account: true, assignee: true },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),

    prisma.issue.groupBy({
      by: ["state"],
      where: { state: { not: "closed" }, ...accountWhere },
      _count: { _all: true },
    }),

    prisma.issue.groupBy({
      by: ["category"],
      where: { state: { not: "closed" }, ...accountWhere },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ])

  const actionEnriched = actionQueueRaw.map(enrichIssue)

  const breachedCount = actionEnriched.filter((i) => i.slaStatusValue === "breached").length
  const atRiskCount = actionEnriched.filter((i) => i.slaStatusValue === "at_risk").length

  const actionQueue = actionEnriched.sort((a, b) => {
    const statusOrder: Record<SlaStatus, number> = { breached: 0, at_risk: 1, ok: 2 }
    return statusOrder[a.slaStatusValue] - statusOrder[b.slaStatusValue]
  })

  const agingEnriched: IssueRow[] = agingRaw.map((issue) => {
    const enriched = enrichIssue(issue)
    return {
      id: enriched.id,
      title: enriched.title,
      priority: enriched.priority,
      handler: enriched.handler,
      accountName: enriched.accountName,
      assigneeName: enriched.assigneeName,
      age: enriched.age,
      slaStatus: enriched.slaStatus,
      timeToSla: enriched.timeToSla,
      link: enriched.link,
    }
  })

  const stateCountMap = Object.fromEntries(
    stateCounts.map((row) => [row.state, row._count._all]),
  )

  const topCategories = categoryCounts.map(
    (row) => [row.category ?? "unset", row._count._all] as const,
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">CS Daily</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Open tickets that need your attention right now
        </p>
      </div>

      <ActNowFilters
        waitingOnUsCount={waitingOnUsCount}
        breachedCount={breachedCount}
        atRiskCount={atRiskCount}
        p0p1Count={p0p1Count}
        actionQueue={actionQueue}
      />

      {agingEnriched.length > 0 && (
        <PanelErrorBoundary fallbackTitle="Aging Tickets">
          <ChartPanel
            title="Aging Tickets"
            description="Open tickets older than 7 days not in the action queue"
          >
            <IssuesTable issues={agingEnriched} />
          </ChartPanel>
        </PanelErrorBoundary>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <PanelErrorBoundary fallbackTitle="Open by State">
          <ChartPanel title="Open by State" className="min-h-0">
            <div className="flex flex-wrap gap-3">
              {Object.entries(stateCountMap).map(([state, count]) => (
                <div key={state} className="flex items-center gap-2">
                  <StateBadge state={state} />
                  <span className="text-sm font-medium tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </ChartPanel>
        </PanelErrorBoundary>

        <PanelErrorBoundary fallbackTitle="Open by Category">
          <ChartPanel title="Open by Category (Top 5)" className="min-h-0">
            <div className="space-y-2">
              {topCategories.map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm">{category}</span>
                  <span className="text-sm font-medium tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          </ChartPanel>
        </PanelErrorBoundary>
      </div>
    </div>
  )
}
