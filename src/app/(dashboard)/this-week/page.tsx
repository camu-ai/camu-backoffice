import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db"
import { KpiCard } from "@/components/charts"
import { BarChartPanel } from "@/components/charts/bar-chart-panel"
import { ChartPanel } from "@/components/charts/chart-panel"
import { PanelErrorBoundary } from "@/components/panel-error-boundary"
import { countByField, getIssueCount } from "@/lib/queries"
import { getResponseTimeStats, getResolutionTimeStats, getSlaComplianceRate } from "@/lib/queries"
import type { DateRange } from "@/lib/queries"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function getDefaultDateRange(): DateRange {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 7)
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

interface ThisWeekPageProps {
  searchParams: Promise<{ account?: string; from?: string; to?: string }>
}

export default async function ThisWeekPage({ searchParams }: ThisWeekPageProps) {
  const params = await searchParams
  const accountId = params.account

  const dateRange: DateRange = params.from && params.to
    ? { from: new Date(params.from), to: new Date(params.to) }
    : getDefaultDateRange()

  const filters = accountId ? { accountId } : undefined

  const accountClause = accountId
    ? Prisma.sql`AND i.account_id = ${accountId}`
    : Prisma.empty

  const [
    ticketCount,
    responseStats,
    resolutionStats,
    slaCompliance,
    categoryCounts,
    handlerCounts,
    selfServableCounts,
    topAccountRows,
  ] = await Promise.all([
    getIssueCount(dateRange, filters),

    getResponseTimeStats(dateRange, accountId),

    getResolutionTimeStats(dateRange, accountId),

    getSlaComplianceRate(dateRange, "response", accountId),

    countByField("category", dateRange, filters),

    countByField("handler", dateRange, filters),

    countByField("selfServable", dateRange, filters),

    prisma.$queryRaw<
      {
        account_id: string
        account_name: string
        total: bigint
        open: bigint
        p0_p1: bigint
        top_category: string | null
      }[]
    >`
      SELECT
        a.id as account_id,
        a.name as account_name,
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE i.state != 'closed')::bigint as open,
        COUNT(*) FILTER (WHERE i.priority IN ('urgent', 'high'))::bigint as p0_p1,
        MODE() WITHIN GROUP (ORDER BY i.category) as top_category
      FROM issues i
      JOIN accounts a ON i.account_id = a.id
      WHERE i.created_at >= ${dateRange.from}
        AND i.created_at <= ${dateRange.to}
        ${accountClause}
      GROUP BY a.id, a.name
      ORDER BY total DESC
      LIMIT 10
    `,
  ])

  const selfServableTotal = selfServableCounts.reduce((sum, r) => sum + r.count, 0)
  const selfServableYes = selfServableCounts
    .filter((r) => r.label === "yes" || r.label === "partially")
    .reduce((sum, r) => sum + r.count, 0)
  const selfServablePct = selfServableTotal > 0
    ? Math.round((selfServableYes / selfServableTotal) * 100)
    : 0

  const topAccounts = topAccountRows.map((row) => ({
    accountId: row.account_id,
    accountName: row.account_name,
    total: Number(row.total),
    open: Number(row.open),
    p0p1: Number(row.p0_p1),
    topCategory: row.top_category,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">CS Weekly</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What came in, how we performed, where to focus
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard title="Tickets" value={ticketCount} />
        <KpiCard
          title="Median Response"
          value={responseStats.medianHours < 1
            ? `${Math.round(responseStats.medianHours * 60)}m`
            : `${responseStats.medianHours.toFixed(1)}h`}
        />
        <KpiCard title="SLA Compliance" value={`${slaCompliance}%`} />
        <KpiCard title="Self-Servable" value={`${selfServablePct}%`} />
      </div>

      <PanelErrorBoundary fallbackTitle="Volume by Category">
        <BarChartPanel
          title="Volume by Category"
          data={categoryCounts}
          horizontal
        />
      </PanelErrorBoundary>

      <div className="grid gap-4 md:grid-cols-2">
        <PanelErrorBoundary fallbackTitle="By Handler">
          <BarChartPanel title="By Handler" data={handlerCounts} horizontal />
        </PanelErrorBoundary>

        <PanelErrorBoundary fallbackTitle="By Self-Servable">
          <BarChartPanel title="By Self-Servable" data={selfServableCounts} horizontal />
        </PanelErrorBoundary>
      </div>

      <PanelErrorBoundary fallbackTitle="Top Accounts">
        <ChartPanel title="Top Accounts">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">P0/P1</TableHead>
                  <TableHead>Top Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No account data for this period.
                    </TableCell>
                  </TableRow>
                )}
                {topAccounts.map((account) => (
                  <TableRow key={account.accountId}>
                    <TableCell className="font-medium">{account.accountName}</TableCell>
                    <TableCell className="text-right tabular-nums">{account.total}</TableCell>
                    <TableCell className="text-right tabular-nums">{account.open}</TableCell>
                    <TableCell className="text-right tabular-nums">{account.p0p1}</TableCell>
                    <TableCell className="text-muted-foreground">{account.topCategory ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ChartPanel>
      </PanelErrorBoundary>

      <PanelErrorBoundary fallbackTitle="SLA & Response Summary">
        <ChartPanel title="SLA & Response Summary" className="min-h-0">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Median Response</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {responseStats.medianHours < 1
                  ? `${Math.round(responseStats.medianHours * 60)}m`
                  : `${responseStats.medianHours.toFixed(1)}h`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {responseStats.avgHours < 1
                  ? `${Math.round(responseStats.avgHours * 60)}m`
                  : `${responseStats.avgHours.toFixed(1)}h`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Median Resolution</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {resolutionStats.medianHours < 1
                  ? `${Math.round(resolutionStats.medianHours * 60)}m`
                  : `${resolutionStats.medianHours.toFixed(1)}h`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Resolution</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {resolutionStats.avgHours < 1
                  ? `${Math.round(resolutionStats.avgHours * 60)}m`
                  : `${resolutionStats.avgHours.toFixed(1)}h`}
              </p>
            </div>
          </div>
        </ChartPanel>
      </PanelErrorBoundary>
    </div>
  )
}
