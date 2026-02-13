"use client"

import { useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Check, ChevronsUpDown, X, CalendarIcon } from "lucide-react"
import { format, subDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Account {
  id: string
  name: string
}

interface DashboardFiltersProps {
  pylonAccounts: Account[]
  bqTenants: Account[]
}

const PYLON_PAGES = ["/act-now", "/this-week"]
const BQ_PAGES = ["/usage"]

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const

export function DashboardFilters({ pylonAccounts, bqTenants }: DashboardFiltersProps) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isPylonPage = PYLON_PAGES.includes(pathname)
  const isBqPage = BQ_PAGES.includes(pathname)
  const showAccountSelector = isPylonPage || isBqPage

  const accounts = isBqPage ? bqTenants : pylonAccounts
  const paramKey = isBqPage ? "tenant" : "account"
  const selectedId = searchParams.get(paramKey)
  const selectedAccount = accounts.find((a) => a.id === selectedId)

  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")
  const dateRange: DateRange | undefined =
    fromParam && toParam
      ? { from: new Date(fromParam), to: new Date(toParam) }
      : undefined

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function handleAccountSelect(accountId: string) {
    updateParams({ [paramKey]: accountId })
    setAccountOpen(false)
  }

  function handleAccountClear() {
    updateParams({ [paramKey]: null })
  }

  function handleDateChange(range: DateRange | undefined) {
    if (!range?.from) return
    updateParams({
      from: range.from.toISOString().split("T")[0],
      to: range.to ? range.to.toISOString().split("T")[0] : null,
    })
  }

  function handleDatePreset(days: number) {
    const to = new Date()
    const from = subDays(to, days)
    updateParams({
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    })
    setDateOpen(false)
  }

  function handleDateClear() {
    updateParams({ from: null, to: null })
  }

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`
      : format(dateRange.from, "MMM d, yyyy")
    : "All time"

  if (!showAccountSelector) return null

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2 md:px-6">
      <Popover open={accountOpen} onOpenChange={setAccountOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={accountOpen}
            size="sm"
            className="w-[260px] justify-between"
          >
            <span className="truncate">
              {selectedAccount ? selectedAccount.name : "All accounts"}
            </span>
            <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0">
          <Command>
            <CommandInput placeholder="Search accounts..." />
            <CommandList>
              <CommandEmpty>No accounts found.</CommandEmpty>
              <CommandGroup>
                {accounts.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={account.name}
                    onSelect={() => handleAccountSelect(account.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        selectedId === account.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {account.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedAccount && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleAccountClear}
        >
          <X className="size-3.5" />
        </Button>
      )}

      <div className="mx-1 h-5 w-px bg-border" />

      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-3.5" />
            {dateLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="flex w-auto gap-2 p-2" align="start">
          <div className="flex flex-col gap-1">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.days}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handleDatePreset(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {dateRange && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDateClear}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}
