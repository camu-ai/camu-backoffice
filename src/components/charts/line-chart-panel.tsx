"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis, ReferenceLine } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ChartPanel } from "./chart-panel"

interface LineChartPanelProps {
  title: string
  data: Record<string, unknown>[]
  dataKeys: string[]
  xAxisKey?: string
  config: ChartConfig
  referenceLine?: { y: number; label: string }
  className?: string
}

export function LineChartPanel({
  title,
  data,
  dataKeys,
  xAxisKey = "date",
  config,
  referenceLine,
  className,
}: LineChartPanelProps) {
  return (
    <ChartPanel title={title} className={className}>
      <ChartContainer config={config} className="h-[250px] w-full">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} strokeDasharray="none" stroke="#f1f5f9" />
          <XAxis
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            width={40}
          />
          <ChartTooltip
            content={<ChartTooltipContent />}
            cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          {dataKeys.length > 1 && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {referenceLine && (
            <ReferenceLine
              y={referenceLine.y}
              stroke="#94a3b8"
              strokeDasharray="6 4"
              strokeWidth={1}
              label={{
                value: referenceLine.label,
                position: "right",
                fill: "#94a3b8",
                fontSize: 11,
              }}
            />
          )}
          {dataKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${key})`}
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 4,
                fill: `var(--color-${key})`,
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />
          ))}
        </LineChart>
      </ChartContainer>
    </ChartPanel>
  )
}
