"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export const navItems = [
  { href: "/act-now", label: "CS Daily", icon: Zap },
  { href: "/this-week", label: "CS Weekly", icon: CalendarDays },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/canvas", label: "AI Canvas", icon: Sparkles },
]

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 space-y-1 p-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[240px]",
      )}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-3">
        {!collapsed && (
          <Link href="/act-now" className="flex items-center">
            <Image
              src="/camu-logo.svg"
              alt="Camu"
              width={100}
              height={23}
              className="dark:brightness-0 dark:invert"
              priority
            />
          </Link>
        )}
        {collapsed && (
          <Link href="/act-now" className="mx-auto flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.0003 18C12.0003 21.3137 9.31391 24 6.00013 24C2.68634 24 0 21.3137 0 18C0 14.6863 2.68634 12 6.00013 12C9.31391 12 12.0003 14.6863 12.0003 18Z" fill="#FE4C5C"/>
              <path d="M12.0003 6C12.0003 9.31371 9.31391 12 6.00013 12C2.68634 12 0 9.31371 0 6C0 2.68629 2.68634 0 6.00013 0C9.31391 0 12.0003 2.68629 12.0003 6Z" fill="#FE4C5C"/>
              <path d="M24 18C24 21.3137 21.3137 24 17.9999 24C14.6861 24 11.9998 21.3137 11.9998 18C11.9998 14.6863 14.6861 12 17.9999 12C21.3137 12 24 14.6863 24 18Z" fill="#FE4C5C"/>
              <path d="M24 6C24 9.31371 21.3137 12 17.9999 12C14.6861 12 11.9998 9.31371 11.9998 6C11.9998 2.68629 14.6861 0 17.9999 0C21.3137 0 24 2.68629 24 6Z" fill="#FE4C5C"/>
              <path d="M23.0001 6C20.2386 6 18 3.76142 18 1C18 3.76142 15.7614 6 12.9999 6C15.7614 6 18 8.23858 18 11C18 8.23858 20.2386 6 23.0001 6Z" fill="#97025E"/>
            </svg>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn("text-sidebar-foreground/70 hover:text-sidebar-foreground", collapsed ? "mx-auto" : "ml-auto")}
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }

            return link
          })}
        </TooltipProvider>
      </nav>
    </aside>
  )
}
