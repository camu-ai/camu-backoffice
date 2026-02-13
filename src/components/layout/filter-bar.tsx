"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { IssueFilters } from "@/lib/queries/types"

const FILTER_OPTIONS = {
  priorities: [
    { value: "urgent", label: "P0 Urgent" },
    { value: "high", label: "P1 High" },
    { value: "medium", label: "P2 Medium" },
    { value: "low", label: "P3 Low" },
  ],
  categories: [
    { value: "platform-bug", label: "Platform Bug" },
    { value: "how-to-question", label: "How-to Question" },
    { value: "escrituracao", label: "Escrituração" },
    { value: "feature-request", label: "Feature Request" },
    { value: "data-import", label: "Data Import" },
    { value: "integration", label: "Integration" },
    { value: "billing", label: "Billing" },
    { value: "performance", label: "Performance" },
    { value: "access-permissions", label: "Access/Permissions" },
    { value: "onboarding", label: "Onboarding" },
    { value: "api", label: "API" },
    { value: "documentation", label: "Documentation" },
    { value: "other", label: "Other" },
  ],
  handlers: [
    { value: "sme", label: "SME" },
    { value: "engineer", label: "Engineer" },
    { value: "product", label: "Product" },
  ],
  sources: [
    { value: "slack", label: "Slack" },
    { value: "email", label: "Email" },
    { value: "chat_widget", label: "Chat Widget" },
    { value: "manual", label: "Manual" },
    { value: "ms_teams", label: "MS Teams" },
    { value: "whatsapp", label: "WhatsApp" },
    { value: "discord", label: "Discord" },
  ],
  states: [
    { value: "new", label: "New" },
    { value: "waiting_on_you", label: "Waiting on Us" },
    { value: "waiting_on_customer", label: "Waiting on Customer" },
    { value: "on_hold", label: "On Hold" },
    { value: "closed", label: "Closed" },
  ],
} as const

type FilterKey = keyof typeof FILTER_OPTIONS

interface FilterBarProps {
  filters: IssueFilters
  onChange: (filters: IssueFilters) => void
  visibleFilters?: FilterKey[]
}

export function FilterBar({
  filters,
  onChange,
  visibleFilters = ["priorities", "categories", "handlers", "sources"],
}: FilterBarProps) {
  function addFilter(key: FilterKey, value: string) {
    const current = filters[key] ?? []
    if (!current.includes(value)) {
      onChange({ ...filters, [key]: [...current, value] })
    }
  }

  function removeFilter(key: FilterKey, value: string) {
    const current = filters[key] ?? []
    const next = current.filter((v) => v !== value)
    onChange({ ...filters, [key]: next.length > 0 ? next : undefined })
  }

  function clearAll() {
    onChange({})
  }

  const activeFilters = visibleFilters.flatMap((key) =>
    (filters[key] ?? []).map((value) => ({
      key,
      value,
      label: FILTER_OPTIONS[key].find((o) => o.value === value)?.label ?? value,
    })),
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleFilters.map((key) => (
        <Select key={key} onValueChange={(v) => addFilter(key, v)}>
          <SelectTrigger size="sm" className="h-7 text-xs capitalize">
            <SelectValue placeholder={key.replace(/s$/, "")} />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS[key].map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {activeFilters.map((f) => (
        <Badge key={`${f.key}-${f.value}`} variant="secondary" className="gap-1 pr-1">
          {f.label}
          <button
            onClick={() => removeFilter(f.key, f.value)}
            className="rounded-sm hover:bg-accent"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}

      {activeFilters.length > 0 && (
        <Button variant="ghost" size="xs" onClick={clearAll}>
          Clear all
        </Button>
      )}
    </div>
  )
}
