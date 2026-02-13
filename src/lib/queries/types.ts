export interface DateRange {
  from: Date
  to: Date
}

export interface IssueFilters {
  priorities?: string[]
  categories?: string[]
  handlers?: string[]
  sources?: string[]
  states?: string[]
  accountId?: string
}

export interface CountResult {
  label: string
  count: number
}

export interface TimeSeriesPoint {
  date: string
  count: number
}
