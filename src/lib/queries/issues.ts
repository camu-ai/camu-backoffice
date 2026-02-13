import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"
import type { DateRange, IssueFilters, CountResult, TimeSeriesPoint } from "./types"

type IssueField = "category" | "handler" | "source" | "state" | "priority" | "selfServable"

function buildWhereClause(dateRange?: DateRange, filters?: IssueFilters) {
  const where: Record<string, unknown> = {}

  if (dateRange) {
    where.createdAt = { gte: dateRange.from, lte: dateRange.to }
  }

  if (filters?.priorities?.length) where.priority = { in: filters.priorities }
  if (filters?.categories?.length) where.category = { in: filters.categories }
  if (filters?.handlers?.length) where.handler = { in: filters.handlers }
  if (filters?.sources?.length) where.source = { in: filters.sources }
  if (filters?.states?.length) where.state = { in: filters.states }
  if (filters?.accountId) where.accountId = filters.accountId

  return where
}

function serializeArgs(...args: unknown[]): string[] {
  return args.map((a) => JSON.stringify(a) ?? "undefined")
}

export async function countByField(
  field: IssueField,
  dateRange?: DateRange,
  filters?: IssueFilters,
): Promise<CountResult[]> {
  return unstable_cache(
    async () => {
      const where = buildWhereClause(dateRange, filters)
      const results = await prisma.issue.groupBy({
        by: [field],
        where,
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
      })

      return results.map((row) => ({
        label: (row[field] as string | null) ?? "unset",
        count: row._count._all,
      }))
    },
    ["countByField", ...serializeArgs(field, dateRange, filters)],
    { revalidate: 300, tags: ["queries"] },
  )()
}

export async function getIssueCount(
  dateRange?: DateRange,
  filters?: IssueFilters,
): Promise<number> {
  return unstable_cache(
    async () => {
      const where = buildWhereClause(dateRange, filters)
      return prisma.issue.count({ where })
    },
    ["getIssueCount", ...serializeArgs(dateRange, filters)],
    { revalidate: 300, tags: ["queries"] },
  )()
}

export async function getOpenIssuesWithRelations(filters?: IssueFilters) {
  return unstable_cache(
    async () => {
      const where: Record<string, unknown> = { state: { not: "closed" } }

      if (filters?.priorities?.length) where.priority = { in: filters.priorities }
      if (filters?.categories?.length) where.category = { in: filters.categories }
      if (filters?.handlers?.length) where.handler = { in: filters.handlers }

      return prisma.issue.findMany({
        where,
        include: { account: true, assignee: true },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      })
    },
    ["getOpenIssuesWithRelations", ...serializeArgs(filters)],
    { revalidate: 300, tags: ["queries"] },
  )()
}

export async function volumeOverTime(
  dateRange: DateRange,
  bucket: "day" | "week" = "day",
): Promise<TimeSeriesPoint[]> {
  return unstable_cache(
    async () => {
      const truncUnit = bucket === "week" ? "week" : "day"

      const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT DATE_TRUNC(${truncUnit}, created_at) as day, COUNT(*)::bigint as count
        FROM issues
        WHERE created_at >= ${dateRange.from} AND created_at <= ${dateRange.to}
        GROUP BY day
        ORDER BY day
      `

      return rows.map((row) => ({
        date: row.day.toISOString().split("T")[0],
        count: Number(row.count),
      }))
    },
    ["volumeOverTime", ...serializeArgs(dateRange, bucket)],
    { revalidate: 300, tags: ["queries"] },
  )()
}
