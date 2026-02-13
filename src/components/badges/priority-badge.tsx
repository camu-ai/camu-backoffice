import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const priorityVariants = cva("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", {
  variants: {
    priority: {
      urgent: "bg-[var(--priority-urgent)] text-white",
      high: "bg-[var(--priority-high)] text-white",
      medium: "bg-[var(--priority-medium)] text-black",
      low: "bg-[var(--priority-low)]/20 text-[var(--priority-low)]",
    },
  },
  defaultVariants: {
    priority: "low",
  },
})

const priorityLabels: Record<string, string> = {
  urgent: "P0",
  high: "P1",
  medium: "P2",
  low: "P3",
}

interface PriorityBadgeProps {
  priority: string | null | undefined
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const key = priority ?? "low"
  const variant = key as "urgent" | "high" | "medium" | "low"

  return (
    <span className={cn(priorityVariants({ priority: variant }), className)}>
      {priorityLabels[key] ?? key}
    </span>
  )
}
