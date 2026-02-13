import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const stateVariants = cva("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", {
  variants: {
    state: {
      new: "bg-[var(--state-new)]/15 text-[var(--state-new)]",
      waiting_on_you: "bg-[var(--state-waiting-us)]/15 text-[var(--state-waiting-us)]",
      waiting_on_customer: "bg-[var(--state-waiting-customer)]/15 text-[var(--state-waiting-customer)]",
      on_hold: "bg-[var(--state-on-hold)]/15 text-[var(--state-on-hold)]",
      closed: "bg-[var(--state-closed)]/10 text-[var(--state-closed)]",
    },
  },
  defaultVariants: {
    state: "new",
  },
})

const stateLabels: Record<string, string> = {
  new: "New",
  waiting_on_you: "Waiting on Us",
  waiting_on_customer: "Waiting on Customer",
  on_hold: "On Hold",
  closed: "Closed",
}

interface StateBadgeProps {
  state: string
  className?: string
}

export function StateBadge({ state, className }: StateBadgeProps) {
  const variant = state as "new" | "waiting_on_you" | "waiting_on_customer" | "on_hold" | "closed"

  return (
    <span className={cn(stateVariants({ state: variant }), className)}>
      {stateLabels[state] ?? state}
    </span>
  )
}
