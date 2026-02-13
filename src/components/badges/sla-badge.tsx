import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"
import type { SlaStatus } from "@/lib/sla"

const slaVariants = cva("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", {
  variants: {
    status: {
      ok: "bg-[var(--sla-ok)]/15 text-[var(--sla-ok)]",
      at_risk: "bg-[var(--sla-at-risk)]/15 text-[var(--sla-at-risk)]",
      breached: "bg-[var(--sla-breached)]/15 text-[var(--sla-breached)]",
    },
  },
  defaultVariants: {
    status: "ok",
  },
})

const slaLabels: Record<SlaStatus, string> = {
  ok: "OK",
  at_risk: "At Risk",
  breached: "Breached",
}

interface SlaBadgeProps {
  status: SlaStatus
  className?: string
}

export function SlaBadge({ status, className }: SlaBadgeProps) {
  return (
    <span className={cn(slaVariants({ status }), className)}>
      {slaLabels[status]}
    </span>
  )
}
