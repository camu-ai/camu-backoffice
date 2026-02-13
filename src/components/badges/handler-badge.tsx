import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const handlerVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      handler: {
        sme: "border-[var(--handler-sme)] text-[var(--handler-sme)]",
        engineer: "border-[var(--handler-engineer)] text-[var(--handler-engineer)]",
        product: "border-[var(--handler-product)] text-[var(--handler-product)]",
      },
    },
    defaultVariants: {
      handler: "sme",
    },
  },
)

const handlerLabels: Record<string, string> = {
  sme: "SME",
  engineer: "Engineer",
  product: "Product",
}

interface HandlerBadgeProps {
  handler: string | null | undefined
  className?: string
}

export function HandlerBadge({ handler, className }: HandlerBadgeProps) {
  const key = handler ?? "sme"
  const variant = key as "sme" | "engineer" | "product"

  return (
    <span className={cn(handlerVariants({ handler: variant }), className)}>
      {handlerLabels[key] ?? key}
    </span>
  )
}
