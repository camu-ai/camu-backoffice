import { KpiCard } from "@/components/charts"
import { BarChartPanel } from "@/components/charts/bar-chart-panel"
import { AreaChartPanel } from "@/components/charts/area-chart-panel"
import { StackedBarChartPanel } from "@/components/charts/stacked-bar-chart-panel"
import { PanelErrorBoundary } from "@/components/panel-error-boundary"
import {
  getUsageKpis,
  getDocumentVolumes,
  getIntegrationTrend,
  getDocumentsByType,
  getDocumentsByValidationStatus,
  getDocumentsByErpStatus,
  getDocumentsByManifestationStatus,
} from "@/lib/queries/usage"

interface UsagePageProps {
  searchParams: Promise<{
    tenant?: string
    from?: string
    to?: string
  }>
}

function getDefaultDateRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  }
}

const integrationTrendConfig = {
  escriturado: { label: "Escriturado", color: "var(--chart-2)" },
  nao_escriturado: { label: "Não Escriturado", color: "var(--chart-5)" },
}

export default async function UsagePage({ searchParams }: UsagePageProps) {
  const params = await searchParams
  const tenantId = params.tenant ?? null
  const defaults = getDefaultDateRange()
  const dateRange = {
    from: params.from ?? defaults.from,
    to: params.to ?? defaults.to,
  }

  if (!tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Usage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Document processing volumes and status by account
          </p>
        </div>
        <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            Select an account above to view usage data
          </p>
        </div>
      </div>
    )
  }

  const [kpis, volumes, integrationTrend, byType, byValidation, byErp, byManifestation] = await Promise.all([
    getUsageKpis(tenantId, dateRange),
    getDocumentVolumes(tenantId, dateRange),
    getIntegrationTrend(tenantId, dateRange),
    getDocumentsByType(tenantId, dateRange),
    getDocumentsByValidationStatus(tenantId, dateRange),
    getDocumentsByErpStatus(tenantId, dateRange),
    getDocumentsByManifestationStatus(tenantId, dateRange),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Usage</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Document processing volumes and status
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard title="Total Documents" value={kpis.totalDocuments.toLocaleString()} />
        <KpiCard title="Integration Rate" value={`${kpis.integrationRate}%`} />
        <KpiCard title="Escriturado" value={kpis.escriturado.toLocaleString()} />
        <KpiCard title="Não Escriturado" value={kpis.naoEscriturado.toLocaleString()} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PanelErrorBoundary fallbackTitle="Volume Over Time">
          <AreaChartPanel
            title="Document Volume Over Time"
            data={volumes}
            config={{ count: { label: "Documents", color: "var(--chart-1)" } }}
          />
        </PanelErrorBoundary>

        <PanelErrorBoundary fallbackTitle="Monthly Integration">
          <StackedBarChartPanel
            title="Monthly Integration — Escriturado vs Não Escriturado"
            data={integrationTrend}
            categoryKey="month"
            dataKeys={["escriturado", "nao_escriturado"]}
            config={integrationTrendConfig}
          />
        </PanelErrorBoundary>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PanelErrorBoundary fallbackTitle="By Document Type">
          <BarChartPanel title="By Document Type" data={byType} horizontal />
        </PanelErrorBoundary>

        <PanelErrorBoundary fallbackTitle="By Validation Status">
          <BarChartPanel title="By Validation Status" data={byValidation} horizontal />
        </PanelErrorBoundary>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PanelErrorBoundary fallbackTitle="By ERP Status">
          <BarChartPanel title="By ERP Status" data={byErp} horizontal />
        </PanelErrorBoundary>

        <PanelErrorBoundary fallbackTitle="By Manifestation Status">
          <BarChartPanel title="By Manifestation Status" data={byManifestation} horizontal />
        </PanelErrorBoundary>
      </div>
    </div>
  )
}
