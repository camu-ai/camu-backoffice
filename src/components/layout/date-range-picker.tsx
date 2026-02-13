"use client"

import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import { format, subDays } from "date-fns"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const presets = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  function handlePreset(days: number) {
    const to = new Date()
    const from = subDays(to, days)
    onChange({ from, to })
    setOpen(false)
  }

  const label = value?.from
    ? value.to
      ? `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`
      : format(value.from, "MMM d, yyyy")
    : "Pick a date range"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-start text-left font-normal", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="size-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto gap-2 p-2" align="start">
        <div className="flex flex-col gap-1">
          {presets.map((preset) => (
            <Button
              key={preset.days}
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => handlePreset(preset.days)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
