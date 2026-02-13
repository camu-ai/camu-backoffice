"use client"

import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string | number
  delta?: {
    value: number
    label: string
    direction?: "up-good" | "down-good" | "neutral"
  }
  sparklineData?: number[]
  active?: boolean
  onClick?: () => void
  className?: string
}

function getDeltaColor(delta: KpiCardProps["delta"]) {
  if (!delta || delta.direction === "neutral" || delta.value === 0) {
    return "bg-muted text-muted-foreground"
  }
  const isPositive = delta.value > 0
  const isGood =
    (isPositive && delta.direction !== "down-good") ||
    (!isPositive && delta.direction === "down-good")

  return isGood
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
}

export function KpiCard({ title, value, delta, sparklineData, active, onClick, className }: KpiCardProps) {
  const deltaColor = delta ? getDeltaColor(delta) : null

  const chartData = sparklineData?.map((v, i) => ({ v, i }))

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 py-5 shadow-none transition-colors",
        onClick && "cursor-pointer hover:border-primary/40",
        active && "ring-2 ring-primary border-primary/40",
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="px-5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground leading-tight">{title}</p>
          {delta && deltaColor && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                deltaColor,
              )}
            >
              {delta.value > 0 ? "+" : ""}
              {delta.value}%
            </span>
          )}
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <span className="text-3xl font-bold tabular-nums tracking-tight">{value}</span>
            {delta && (
              <p className="mt-1 text-xs text-muted-foreground/70">{delta.label}</p>
            )}
          </div>

          {chartData && chartData.length > 1 && (
            <div className="h-12 w-28 shrink-0" data-slot="sparkline">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#sparkGrad)"
                    dot={false}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
