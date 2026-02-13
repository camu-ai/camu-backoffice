import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[var(--button-ring)]/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--button-default-bg)] text-[var(--button-default-text)] hover:bg-[var(--button-default-hover-bg)] shadow-sm",
        destructive:
          "bg-[var(--button-destructive-bg)] text-[var(--button-destructive-text)] hover:bg-[var(--button-destructive-bg)]/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-[var(--button-outline-border)] bg-background shadow-xs hover:bg-[var(--button-outline-hover-bg)] hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-[var(--button-secondary-bg)] text-[var(--button-secondary-text)] hover:bg-[var(--button-secondary-bg)]/80",
        ghost:
          "hover:bg-[var(--button-ghost-hover-bg)] hover:text-[var(--button-ghost-hover-text)] dark:hover:bg-accent/50",
        link: "text-[var(--button-link-text)] underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-[var(--button-gradient-from)] to-[var(--button-gradient-to)] text-[var(--button-gradient-text)] shadow-sm hover:opacity-90",
        "outline-destructive":
          "bg-[var(--button-outline-destructive-bg)] text-[var(--button-outline-destructive-text)] border border-[var(--button-outline-destructive-border)] hover:bg-[var(--button-outline-destructive-hover-bg)]",
        social:
          "bg-[var(--button-social-bg)] text-[var(--button-social-text)] border border-[var(--button-social-border)] hover:bg-[var(--button-social-hover-bg)] shadow-xs",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
