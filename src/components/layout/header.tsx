import type { ReactNode } from "react"
import { SyncButton } from "./sync-button"
import { ThemeToggle } from "./theme-toggle"

interface HeaderProps {
  mobileMenuButton?: ReactNode
}

export function Header({ mobileMenuButton }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        {mobileMenuButton}
        <h1 className="text-lg font-semibold">Support Dashboard</h1>
      </div>
      <div className="flex items-center gap-3">
        <SyncButton />
        <ThemeToggle />
      </div>
    </header>
  )
}
