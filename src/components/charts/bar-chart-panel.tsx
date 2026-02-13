"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ChartPanel } from "./chart-panel"

interface BarChartPanelProps {
  title: string
  data: { label: string; count: number }[]
  config?: ChartConfig
  horizontal?: boolean
  className?: string
}

const defaultConfig: ChartConfig = {
  count: { label: "Count", color: "var(--chart-1)" },
}

export function BarChartPanel({
  title,
  data,
  config = defaultConfig,
  horizontal = false,
  className,
}: BarChartPanelProps) {
  if (horizontal) {
    return (
      <ChartPanel title={title} className={className}>
        <ChartContainer config={config} className="h-[250px] w-full">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid horizontal={false} strokeDasharray="none" stroke="#f1f5f9" />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={80}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "#f8fafc" }} />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[0, 6, 6, 0]}
              barSize={20}
              fillOpacity={0.85}
            />
          </BarChart>
        </ChartContainer>
      </ChartPanel>
    )
  }

  return (
    <ChartPanel title={title} className={className}>
      <ChartContainer config={config} className="h-[250px] w-full">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} strokeDasharray="none" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
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
          <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "#f8fafc" }} />
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[6, 6, 0, 0]}
            barSize={32}
            fillOpacity={0.85}
          />
        </BarChart>
      </ChartContainer>
    </ChartPanel>
  )
}
