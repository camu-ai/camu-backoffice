"use client"

import type { ViewSpec, Panel } from "./schema"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Legend } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { KpiCard } from "@/components/charts"
import { BarChartPanel } from "@/components/charts/bar-chart-panel"
import { AreaChartPanel } from "@/components/charts/area-chart-panel"
import { LineChartPanel } from "@/components/charts/line-chart-panel"
import { DonutChartPanel } from "@/components/charts/donut-chart-panel"
import { ChartPanel } from "@/components/charts/chart-panel"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChartConfig } from "@/components/ui/chart"
import { TrendingDown, TrendingUp } from "lucide-react"

const GRID_CLASSES: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
}

export function ViewRenderer({ spec }: { spec: ViewSpec }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{spec.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{spec.description}</p>
      </div>
      {spec.layout.map((row, i) => (
        <div key={i} className="grid grid-cols-12 gap-4">
          {row.row.map((panel, j) => (
            <div key={j} className={GRID_CLASSES[panel.width] ?? "col-span-12"}>
              <PanelRenderer panel={panel} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function PanelRenderer({ panel }: { panel: Panel }) {
  switch (panel.component) {
    case "kpi-card":
      return <KpiCardAdapter panel={panel} />
    case "bar-chart":
      return <BarChartAdapter panel={panel} />
    case "line-chart":
      return <LineChartAdapter panel={panel} />
    case "area-chart":
      return <AreaChartAdapter panel={panel} />
    case "donut-chart":
      return <DonutChartAdapter panel={panel} />
    case "data-table":
      return <DataTableAdapter panel={panel} />
    case "stat-row":
      return <StatRowAdapter panel={panel} />
    case "metric-comparison":
      return <MetricComparisonAdapter panel={panel} />
    case "stacked-bar-chart":
      return <StackedBarChartAdapter panel={panel} />
    default:
      return null
  }
}

function KpiCardAdapter({ panel }: { panel: Panel }) {
  const data = panel.data as { value: number; previousValue?: number }
  const { title, format, invertDelta } = panel.props

  let displayValue: string | number = data.value
  if (format === "percentage") {
    displayValue = `${data.value.toFixed(1)}%`
  } else if (format === "duration") {
    displayValue = `${data.value.toFixed(1)}h`
  }

  const delta =
    data.previousValue !== undefined
      ? {
          value: Math.round(
            ((data.value - data.previousValue) / (data.previousValue || 1)) * 100,
          ),
          label: "vs previous period",
          direction: (invertDelta ? "down-good" : "up-good") as
            | "up-good"
            | "down-good"
            | "neutral",
        }
      : undefined

  return <KpiCard title={title ?? ""} value={displayValue} delta={delta} />
}

function BarChartAdapter({ panel }: { panel: Panel }) {
  const data = panel.data as { items: { label: string; value: number }[] }
  const chartData = data.items.map((item) => ({
    label: item.label,
    count: item.value,
  }))

  return (
    <BarChartPanel
      title={panel.props.title ?? ""}
      data={chartData}
      horizontal={panel.props.orientation === "horizontal"}
    />
  )
}

function LineChartAdapter({ panel }: { panel: Panel }) {
  const data = panel.data as {
    series: { name: string; points: { date: string; value: number }[] }[]
  }

  const allDates = [
    ...new Set(data.series.flatMap((s) => s.points.map((p) => p.date))),
  ].sort()

  const chartData = allDates.map((date) => {
    const row: Record<string, unknown> = { date }
    for (const series of data.series) {
      const point = series.points.find((p) => p.date === date)
      row[series.name] = point?.value ?? 0
    }
    return row
  })

  const dataKeys = data.series.map((s) => s.name)
  const config: ChartConfig = Object.fromEntries(
    dataKeys.map((key, i) => [
      key,
      { label: key, color: SERIES_COLORS[i % SERIES_COLORS.length] },
    ]),
  )

  const referenceLine =
    panel.props.referenceLine !== undefined
      ? { y: panel.props.referenceLine, label: panel.props.referenceLabel ?? "" }
      : undefined

  return (
    <LineChartPanel
      title={panel.props.title ?? ""}
      data={chartData}
      dataKeys={dataKeys}
      config={config}
      referenceLine={referenceLine}
    />
  )
}

function AreaChartAdapter({ panel }: { panel: Panel }) {
  const data = panel.data as {
    series: { name: string; points: { date: string; value: number }[] }[]
  }

  if (data.series.length === 1) {
    const chartData = data.series[0].points.map((p) => ({
      date: p.date,
      count: p.value,
    }))
    return <AreaChartPanel title={panel.props.title ?? ""} data={chartData} />
  }

  const allDates = [
    ...new Set(data.series.flatMap((s) => s.points.map((p) => p.date))),
  ].sort()

  const chartData = allDates.map((date) => {
    const row: Record<string, unknown> = { date }
    let total = 0
    for (const series of data.series) {
      const point = series.points.find((p) => p.date === date)
      const val = point?.value ?? 0
      row[series.name] = val
      total += val
    }
    row.count = total
    return row as { date: string; count: number }
  })

  return <AreaChartPanel title={panel.props.title ?? ""} data={chartData} />
}

function DonutChartAdapter({ panel }: { panel: Panel }) {
  const data = panel.data as { items: { label: string; value: number }[] }
  const chartData = data.items.map((item) => ({
    label: item.label,
    count: item.value,
  }))

  return <DonutChartPanel title={panel.props.title ?? ""} data={chartData} />
}

function DataTableAdapter({ panel }: { panel: Panel }) {
  const data = panel.data as {
    columns: { key: string; label: string; format?: string }[]
    rows: Record<string, unknown>[]
  }

  return (
    <ChartPanel title={panel.props.title ?? ""}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {data.columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={data.columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No data available.
                </TableCell>
              </TableRow>
            )}
            {data.rows.map((row, i) => (
              <TableRow key={i}>
                {data.columns.map((col) => (
                  <TableCell key={col.key} className="tabular-nums">
                    {String(row[col.key] ?? "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ChartPanel>
  )
}

function StatRowAdapter({ panel }: { panel: Panel }) {
  const data = panel.data as {
    items: { label: string; value: number; format?: string }[]
  }

  return (
    <ChartPanel title={panel.props.title ?? "Summary"}>
      <div className="flex flex-wrap gap-6 py-2">
        {data.items.map((item) => {
          let displayValue: string = String(item.value)
          if (item.format === "percentage") {
            displayValue = `${item.value.toFixed(1)}%`
          } else if (item.format === "duration") {
            displayValue = `${item.value.toFixed(1)}h`
          }

          return (
            <div key={item.label} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-lg font-semibold tabular-nums">
                {displayValue}
              </span>
            </div>
          )
        })}
      </div>
    </ChartPanel>
  )
}

function MetricComparisonAdapter({ panel }: { panel: Panel }) {
  const data = panel.data as {
    metrics: { label: string; current: number; previous: number; format?: string }[]
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{panel.props.title ?? "Comparison"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.metrics.map((metric) => {
            const delta = metric.previous !== 0
              ? ((metric.current - metric.previous) / metric.previous) * 100
              : 0
            const isPositive = delta > 0
            const isNeutral = delta === 0

            let currentDisplay = String(metric.current)
            let previousDisplay = String(metric.previous)
            if (metric.format === "percentage") {
              currentDisplay = `${metric.current.toFixed(1)}%`
              previousDisplay = `${metric.previous.toFixed(1)}%`
            } else if (metric.format === "duration") {
              currentDisplay = `${metric.current.toFixed(1)}h`
              previousDisplay = `${metric.previous.toFixed(1)}h`
            }

            return (
              <div key={metric.label} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm text-muted-foreground">{metric.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground line-through tabular-nums">
                    {previousDisplay}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{currentDisplay}</span>
                  {!isNeutral && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                      {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {Math.abs(delta).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function StackedBarChartAdapter({ panel }: { panel: Panel }) {
  const data = panel.data as {
    categories: string[]
    series: { name: string; values: number[] }[]
  }

  const chartData = data.categories.map((cat, i) => {
    const row: Record<string, unknown> = { label: cat }
    for (const series of data.series) {
      row[series.name] = series.values[i] ?? 0
    }
    return row
  })

  const dataKeys = data.series.map((s) => s.name)
  const config: ChartConfig = Object.fromEntries(
    dataKeys.map((key, i) => [
      key,
      { label: key, color: SERIES_COLORS[i % SERIES_COLORS.length] },
    ]),
  )

  return (
    <ChartPanel title={panel.props.title ?? ""}>
      <StackedBarContent
        data={chartData}
        dataKeys={dataKeys}
        config={config}
        horizontal={panel.props.orientation === "horizontal"}
      />
    </ChartPanel>
  )
}

function StackedBarContent({
  data,
  dataKeys,
  config,
  horizontal,
}: {
  data: Record<string, unknown>[]
  dataKeys: string[]
  config: ChartConfig
  horizontal?: boolean
}) {
  if (horizontal) {
    return (
      <ChartContainer config={config} className="h-[250px] w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis type="category" dataKey="label" width={75} tick={{ fontSize: 12 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          {dataKeys.map((key) => (
            <Bar key={key} dataKey={key} stackId="stack" fill={config[key]?.color ?? "#888"} />
          ))}
        </BarChart>
      </ChartContainer>
    )
  }

  return (
    <ChartContainer config={config} className="h-[250px] w-full">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
        {dataKeys.map((key) => (
          <Bar key={key} dataKey={key} stackId="stack" fill={config[key]?.color ?? "#888"} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

const SERIES_COLORS = [
  "#2563eb",
  "#97025e",
  "#16a34a",
  "#fe4c5c",
  "#b9037a",
  "#d97706",
]
