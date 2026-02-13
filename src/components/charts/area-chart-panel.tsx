"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ChartPanel } from "./chart-panel"

interface AreaChartPanelProps {
  title: string
  data: { date: string; count: number }[]
  config?: ChartConfig
  className?: string
}

const defaultConfig: ChartConfig = {
  count: { label: "Issues", color: "var(--chart-1)" },
}

export function AreaChartPanel({
  title,
  data,
  config = defaultConfig,
  className,
}: AreaChartPanelProps) {
  return (
    <ChartPanel title={title} className={className}>
      <ChartContainer config={config} className="h-[250px] w-full">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="none" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
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
            cursor={{ stroke: "var(--color-count)", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="count"
            fill="url(#areaGrad)"
            stroke="var(--color-count)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--color-count)",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ChartContainer>
    </ChartPanel>
  )
}
