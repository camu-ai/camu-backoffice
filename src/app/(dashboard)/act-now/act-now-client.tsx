"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ListFilter, X } from "lucide-react"
import { KpiCard } from "@/components/charts"
import { ChartPanel } from "@/components/charts/chart-panel"
import { PanelErrorBoundary } from "@/components/panel-error-boundary"
import { PriorityBadge } from "@/components/badges/priority-badge"
import { SlaBadge } from "@/components/badges/sla-badge"
import { HandlerBadge } from "@/components/badges/handler-badge"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { IssueRow } from "@/components/tables"
import type { SlaStatus } from "@/lib/sla"

type KpiFilterKey = "waiting" | "breached" | "at_risk" | "p0p1"

export interface ActionIssue extends IssueRow {
  state: string
  slaStatusValue: SlaStatus
}

interface ActNowFiltersProps {
  waitingOnUsCount: number
  breachedCount: number
  atRiskCount: number
  p0p1Count: number
  actionQueue: ActionIssue[]
}

const KPI_LABELS: Record<KpiFilterKey, string> = {
  waiting: "Waiting on Us",
  breached: "SLA Breached",
  at_risk: "SLA At Risk",
  p0p1: "Open P0/P1",
}

function applyKpiFilter(issues: ActionIssue[], filter: KpiFilterKey | null): ActionIssue[] {
  if (!filter) return issues
  switch (filter) {
    case "waiting":
      return issues.filter((i) => i.state === "new" || i.state === "waiting_on_you")
    case "breached":
      return issues.filter((i) => i.slaStatusValue === "breached")
    case "at_risk":
      return issues.filter((i) => i.slaStatusValue === "at_risk")
    case "p0p1":
      return issues.filter((i) => i.priority === "urgent" || i.priority === "high")
  }
}

// --- Table filters ---

interface TableFilters {
  priority: string[]
  account: string[]
  handler: string[]
  sla: string[]
  assignee: string[]
}

const EMPTY_FILTERS: TableFilters = {
  priority: [],
  account: [],
  handler: [],
  sla: [],
  assignee: [],
}

function applyTableFilters(issues: ActionIssue[], filters: TableFilters): ActionIssue[] {
  return issues.filter((i) => {
    if (filters.priority.length > 0 && !filters.priority.includes(i.priority ?? "")) return false
    if (filters.account.length > 0 && !filters.account.includes(i.accountName ?? "")) return false
    if (filters.handler.length > 0 && !filters.handler.includes(i.handler ?? "")) return false
    if (filters.sla.length > 0 && !filters.sla.includes(i.slaStatusValue)) return false
    if (filters.assignee.length > 0 && !filters.assignee.includes(i.assigneeName ?? "")) return false
    return true
  })
}

function uniqueValues(issues: ActionIssue[], key: keyof ActionIssue): string[] {
  const set = new Set<string>()
  for (const issue of issues) {
    const val = issue[key]
    if (val != null && val !== "") set.add(String(val))
  }
  return Array.from(set).sort()
}

// --- Sorting ---

type SortField = "priority" | "accountName" | "handler" | "age" | "slaStatusValue" | "assigneeName"
type SortDir = "asc" | "desc"

interface SortState {
  field: SortField | null
  dir: SortDir
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const SLA_ORDER: Record<string, number> = { breached: 0, at_risk: 1, ok: 2 }

function parseAge(age: string): number {
  const match = age.match(/(\d+)/)
  if (!match) return 0
  const num = parseInt(match[1], 10)
  if (age.includes("mo")) return num * 30 * 24
  if (age.includes("w")) return num * 7 * 24
  if (age.includes("d")) return num * 24
  if (age.includes("h")) return num
  if (age.includes("m")) return num / 60
  return num
}

function sortIssues(issues: ActionIssue[], sort: SortState): ActionIssue[] {
  if (!sort.field) return issues
  const { field, dir } = sort
  const multiplier = dir === "asc" ? 1 : -1

  return [...issues].sort((a, b) => {
    let cmp = 0
    switch (field) {
      case "priority":
        cmp = (PRIORITY_ORDER[a.priority ?? ""] ?? 99) - (PRIORITY_ORDER[b.priority ?? ""] ?? 99)
        break
      case "slaStatusValue":
        cmp = (SLA_ORDER[a.slaStatusValue] ?? 99) - (SLA_ORDER[b.slaStatusValue] ?? 99)
        break
      case "age":
        cmp = parseAge(a.age) - parseAge(b.age)
        break
      default: {
        const av = (a[field] ?? "") as string
        const bv = (b[field] ?? "") as string
        cmp = av.localeCompare(bv)
      }
    }
    return cmp * multiplier
  })
}

// --- Components ---

function SortIcon({ field, sort }: { field: SortField; sort: SortState }) {
  if (sort.field !== field) return <ArrowUpDown className="size-3 opacity-40" />
  if (sort.dir === "asc") return <ArrowUp className="size-3" />
  return <ArrowDown className="size-3" />
}

interface ColumnFilterProps {
  selected: string[]
  options: string[]
  onChange: (values: string[]) => void
}

function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

function ColumnFilter({ selected, options, onChange }: ColumnFilterProps) {
  const mounted = useMounted()
  if (options.length === 0) return null

  const toggle = (opt: string) => {
    onChange(
      selected.includes(opt)
        ? selected.filter((v) => v !== opt)
        : [...selected, opt],
    )
  }

  const trigger = (
    <button className={cn(
      "inline-flex size-5 items-center justify-center rounded transition-colors hover:bg-accent",
      selected.length > 0 ? "text-foreground" : "text-muted-foreground/50",
    )}>
      <ListFilter className="size-3" />
    </button>
  )

  if (!mounted) return trigger

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-1" align="start">
        <div className="max-h-[240px] overflow-y-auto">
          {options.map((opt) => {
            const isSelected = selected.includes(opt)
            return (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <div className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                  isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30",
                )}>
                  {isSelected && <Check className="size-3" />}
                </div>
                <span className="truncate">{opt}</span>
              </button>
            )
          })}
        </div>
        {selected.length > 0 && (
          <div className="border-t p-1">
            <button
              onClick={() => onChange([])}
              className="w-full rounded-sm px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-accent"
            >
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function ActNowFilters({
  waitingOnUsCount,
  breachedCount,
  atRiskCount,
  p0p1Count,
  actionQueue,
}: ActNowFiltersProps) {
  const [kpiFilter, setKpiFilter] = useState<KpiFilterKey | null>(null)
  const [tableFilters, setTableFilters] = useState<TableFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortState>({ field: null, dir: "asc" })

  const toggleKpi = (key: KpiFilterKey) => {
    setKpiFilter((prev) => (prev === key ? null : key))
  }

  const setFilter = (key: keyof TableFilters, values: string[]) => {
    setTableFilters((prev) => ({ ...prev, [key]: values }))
  }

  const activeFilterCount = Object.values(tableFilters).reduce((sum, arr) => sum + arr.length, 0)

  const clearAllFilters = () => setTableFilters(EMPTY_FILTERS)

  const toggleSort = (field: SortField) => {
    setSort((prev) => {
      if (prev.field !== field) return { field, dir: "asc" }
      if (prev.dir === "asc") return { field, dir: "desc" }
      return { field: null, dir: "asc" }
    })
  }

  const afterKpi = applyKpiFilter(actionQueue, kpiFilter)
  const afterTableFilters = applyTableFilters(afterKpi, tableFilters)
  const sorted = sortIssues(afterTableFilters, sort)

  const priorityOpts = uniqueValues(afterKpi, "priority")
  const accountOpts = uniqueValues(afterKpi, "accountName")
  const handlerOpts = uniqueValues(afterKpi, "handler")
  const slaOpts = uniqueValues(afterKpi, "slaStatusValue")
  const assigneeOpts = uniqueValues(afterKpi, "assigneeName")

  const description = kpiFilter
    ? `Showing ${sorted.length} ticket${sorted.length !== 1 ? "s" : ""} — ${KPI_LABELS[kpiFilter]}`
    : `${sorted.length} ticket${sorted.length !== 1 ? "s" : ""} needing attention`

  return (
    <>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard title="Waiting on Us" value={waitingOnUsCount} active={kpiFilter === "waiting"} onClick={() => toggleKpi("waiting")} />
        <KpiCard title="SLA Breached" value={breachedCount} active={kpiFilter === "breached"} onClick={() => toggleKpi("breached")} />
        <KpiCard title="SLA At Risk" value={atRiskCount} active={kpiFilter === "at_risk"} onClick={() => toggleKpi("at_risk")} />
        <KpiCard title="Open P0/P1" value={p0p1Count} active={kpiFilter === "p0p1"} onClick={() => toggleKpi("p0p1")} />
      </div>

      <PanelErrorBoundary fallbackTitle="Action Queue">
        <ChartPanel title="Action Queue" description={description}>
          <div className="space-y-3">
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {(Object.entries(tableFilters) as [keyof TableFilters, string[]][]).flatMap(([key, values]) =>
                  values.map((value: string) => (
                    <Badge key={`${key}-${value}`} variant="secondary" className="gap-1 pr-1">
                      {value}
                      <button
                        onClick={() => setFilter(key, values.filter((v) => v !== value))}
                        className="rounded-sm hover:bg-accent"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  )),
                )}
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAllFilters}>
                  Clear all
                </Button>
              </div>
            )}

            <div className="border border-slate-300">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="bg-slate-50 border-r border-b border-slate-300 text-sm font-semibold text-foreground normal-case tracking-normal w-[90px]">
                      <div className="flex items-center gap-1">
                        <button className="flex items-center gap-1" onClick={() => toggleSort("priority")}>
                          Priority <SortIcon field="priority" sort={sort} />
                        </button>
                        <ColumnFilter selected={tableFilters.priority} options={priorityOpts} onChange={(v) => setFilter("priority", v)} />
                      </div>
                    </TableHead>
                    <TableHead className="bg-slate-50 border-r border-b border-slate-300 text-sm font-semibold text-foreground normal-case tracking-normal">
                      Title
                    </TableHead>
                    <TableHead className="bg-slate-50 border-r border-b border-slate-300 text-sm font-semibold text-foreground normal-case tracking-normal">
                      <div className="flex items-center gap-1">
                        <button className="flex items-center gap-1" onClick={() => toggleSort("accountName")}>
                          Account <SortIcon field="accountName" sort={sort} />
                        </button>
                        <ColumnFilter selected={tableFilters.account} options={accountOpts} onChange={(v) => setFilter("account", v)} />
                      </div>
                    </TableHead>
                    <TableHead className="bg-slate-50 border-r border-b border-slate-300 text-sm font-semibold text-foreground normal-case tracking-normal">
                      <div className="flex items-center gap-1">
                        <button className="flex items-center gap-1" onClick={() => toggleSort("handler")}>
                          Handler <SortIcon field="handler" sort={sort} />
                        </button>
                        <ColumnFilter selected={tableFilters.handler} options={handlerOpts} onChange={(v) => setFilter("handler", v)} />
                      </div>
                    </TableHead>
                    <TableHead className="bg-slate-50 border-r border-b border-slate-300 text-sm font-semibold text-foreground normal-case tracking-normal w-[70px]">
                      <button className="flex items-center gap-1" onClick={() => toggleSort("age")}>
                        Age <SortIcon field="age" sort={sort} />
                      </button>
                    </TableHead>
                    <TableHead className="bg-slate-50 border-r border-b border-slate-300 text-sm font-semibold text-foreground normal-case tracking-normal">
                      <div className="flex items-center gap-1">
                        <button className="flex items-center gap-1" onClick={() => toggleSort("slaStatusValue")}>
                          SLA <SortIcon field="slaStatusValue" sort={sort} />
                        </button>
                        <ColumnFilter selected={tableFilters.sla} options={slaOpts} onChange={(v) => setFilter("sla", v)} />
                      </div>
                    </TableHead>
                    <TableHead className="bg-slate-50 border-r border-b border-slate-300 text-sm font-semibold text-foreground normal-case tracking-normal">
                      Time to SLA
                    </TableHead>
                    <TableHead className="bg-slate-50 border-b border-slate-300 text-sm font-semibold text-foreground normal-case tracking-normal">
                      <div className="flex items-center gap-1">
                        <button className="flex items-center gap-1" onClick={() => toggleSort("assigneeName")}>
                          Assignee <SortIcon field="assigneeName" sort={sort} />
                        </button>
                        <ColumnFilter selected={tableFilters.assignee} options={assigneeOpts} onChange={(v) => setFilter("assignee", v)} />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No issues found.
                      </TableCell>
                    </TableRow>
                  )}
                  {sorted.map((issue) => (
                    <TableRow
                      key={issue.id}
                      className={cn(
                        "cursor-pointer h-10",
                        issue.slaStatusValue === "breached" && "bg-red-500/5",
                        issue.slaStatusValue === "at_risk" && "bg-yellow-500/5",
                      )}
                      onClick={() => issue.link && window.open(issue.link, "_blank")}
                    >
                      <TableCell className="border-r border-slate-300"><PriorityBadge priority={issue.priority} /></TableCell>
                      <TableCell className="border-r border-slate-300 max-w-[300px] truncate font-medium">{issue.title}</TableCell>
                      <TableCell className="border-r border-slate-300 text-muted-foreground">{issue.accountName ?? "—"}</TableCell>
                      <TableCell className="border-r border-slate-300">{issue.handler ? <HandlerBadge handler={issue.handler} /> : "—"}</TableCell>
                      <TableCell className="border-r border-slate-300 tabular-nums">{issue.age}</TableCell>
                      <TableCell className="border-r border-slate-300"><SlaBadge status={issue.slaStatus} /></TableCell>
                      <TableCell className="border-r border-slate-300 tabular-nums">{issue.timeToSla}</TableCell>
                      <TableCell className="text-muted-foreground">{issue.assigneeName ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </ChartPanel>
      </PanelErrorBoundary>
    </>
  )
}
