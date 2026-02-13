"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ChartPanel } from "./chart-panel"

interface StackedBarChartPanelProps {
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  categoryKey: string
  dataKeys: string[]
  config: ChartConfig
  className?: string
}

export function StackedBarChartPanel({
  title,
  data,
  categoryKey,
  dataKeys,
  config,
  className,
}: StackedBarChartPanelProps) {
  return (
    <ChartPanel title={title} className={className}>
      <ChartContainer config={config} className="h-[280px] w-full">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} strokeDasharray="none" stroke="#f1f5f9" />
          <XAxis
            dataKey={categoryKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            width={50}
          />
          <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "#f8fafc" }} />
          <ChartLegend content={<ChartLegendContent />} />
          {dataKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              stackId="stack"
              radius={i === dataKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              fillOpacity={0.85}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartPanel>
  )
}
