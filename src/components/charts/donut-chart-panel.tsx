"use client"

import { Cell, Pie, PieChart, Label } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ChartPanel } from "./chart-panel"

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#8b5cf6",
]

interface DonutChartPanelProps {
  title: string
  data: { label: string; count: number }[]
  config?: ChartConfig
  centerLabel?: string
  className?: string
}

export function DonutChartPanel({ title, data, config, centerLabel, className }: DonutChartPanelProps) {
  const chartConfig: ChartConfig = config ?? Object.fromEntries(
    data.map((item, i) => [
      item.label,
      { label: item.label, color: COLORS[i % COLORS.length] },
    ]),
  )

  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <ChartPanel title={title} className={className}>
      <ChartContainer config={chartConfig} className="mx-auto h-[250px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
          <ChartLegend content={<ChartLegendContent nameKey="label" />} />
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={64}
            outerRadius={88}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={entry.label} fill={COLORS[i % COLORS.length]} />
            ))}
            {(centerLabel || total > 0) && (
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) - 6}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {centerLabel ?? total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 14}
                          className="fill-muted-foreground text-xs"
                        >
                          total
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            )}
          </Pie>
        </PieChart>
      </ChartContainer>
    </ChartPanel>
  )
}
