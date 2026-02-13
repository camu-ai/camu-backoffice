"use client"

import { Suspense, useState } from "react"
import { Menu } from "lucide-react"
import { Sidebar, SidebarNav } from "./sidebar"
import { Header } from "./header"
import { DashboardFilters } from "./dashboard-filters"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface Account {
  id: string
  name: string
}

interface DashboardShellProps {
  children: React.ReactNode
  pylonAccounts: Account[]
  bqTenants: Account[]
}

export function DashboardShell({ children, pylonAccounts, bqTenants }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] bg-sidebar p-0">
          <SheetHeader className="border-b border-sidebar-border px-4 py-3">
            <SheetTitle className="text-sm font-semibold text-sidebar-foreground">
              Camu Support
            </SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          mobileMenuButton={
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          }
        />
        <Suspense>
          <DashboardFilters pylonAccounts={pylonAccounts} bqTenants={bqTenants} />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
