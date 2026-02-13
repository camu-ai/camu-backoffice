import { unstable_cache } from "next/cache"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/db"
import { SLA_TARGETS } from "@/lib/sla"
import type { SlaMetric } from "@/lib/sla"
import type { DateRange } from "./types"

function accountClause(accountId?: string) {
  return accountId
    ? Prisma.sql`AND account_id = ${accountId}`
    : Prisma.empty
}

interface TimeStats {
  medianHours: number
  avgHours: number
  count: number
}

export async function getResponseTimeStats(dateRange: DateRange, accountId?: string): Promise<TimeStats> {
  return unstable_cache(
    async () => {
      const rows = await prisma.$queryRaw<
        { median_seconds: number | null; avg_seconds: number | null; count: bigint }[]
      >`
        SELECT
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY business_hours_first_response_seconds) as median_seconds,
          AVG(business_hours_first_response_seconds) as avg_seconds,
          COUNT(*)::bigint as count
        FROM issues
        WHERE business_hours_first_response_seconds IS NOT NULL
          AND created_at >= ${dateRange.from}
          AND created_at <= ${dateRange.to}
          ${accountClause(accountId)}
      `

      const row = rows[0]
      return {
        medianHours: row.median_seconds ? row.median_seconds / 3600 : 0,
        avgHours: row.avg_seconds ? row.avg_seconds / 3600 : 0,
        count: Number(row.count),
      }
    },
    ["getResponseTimeStats", JSON.stringify(dateRange), accountId ?? ""],
    { revalidate: 300, tags: ["queries"] },
  )()
}

export async function getResolutionTimeStats(dateRange: DateRange, accountId?: string): Promise<TimeStats> {
  return unstable_cache(
    async () => {
      const rows = await prisma.$queryRaw<
        { median_hours: number | null; avg_hours: number | null; count: bigint }[]
      >`
        SELECT
          PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600
          ) as median_hours,
          AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 3600) as avg_hours,
          COUNT(*)::bigint as count
        FROM issues
        WHERE closed_at IS NOT NULL
          AND created_at >= ${dateRange.from}
          AND created_at <= ${dateRange.to}
          ${accountClause(accountId)}
      `

      const row = rows[0]
      return {
        medianHours: row.median_hours ?? 0,
        avgHours: row.avg_hours ?? 0,
        count: Number(row.count),
      }
    },
    ["getResolutionTimeStats", JSON.stringify(dateRange), accountId ?? ""],
    { revalidate: 300, tags: ["queries"] },
  )()
}

export async function getSlaComplianceRate(
  dateRange: DateRange,
  metric: SlaMetric,
  accountId?: string,
): Promise<number> {
  return unstable_cache(
    async () => {
      const responseTargets = {
        urgent: SLA_TARGETS.urgent.response * 3600,
        high: SLA_TARGETS.high.response * 3600,
        medium: SLA_TARGETS.medium.response * 3600,
        low: SLA_TARGETS.low.response * 3600,
      }
      const resolutionTargets = {
        urgent: SLA_TARGETS.urgent.resolution * 3600,
        high: SLA_TARGETS.high.resolution * 3600,
        medium: SLA_TARGETS.medium.resolution * 3600,
        low: SLA_TARGETS.low.resolution * 3600,
      }

      const targets = metric === "response" ? responseTargets : resolutionTargets

      if (metric === "response") {
        const rows = await prisma.$queryRaw<{ total: bigint; compliant: bigint }[]>`
          SELECT
            COUNT(*) FILTER (WHERE priority IS NOT NULL)::bigint as total,
            COUNT(*) FILTER (WHERE
              priority IS NOT NULL AND (
                (priority = 'urgent' AND business_hours_first_response_seconds <= ${targets.urgent}) OR
                (priority = 'high' AND business_hours_first_response_seconds <= ${targets.high}) OR
                (priority = 'medium' AND business_hours_first_response_seconds <= ${targets.medium}) OR
                (priority = 'low' AND business_hours_first_response_seconds <= ${targets.low}) OR
                priority NOT IN ('urgent', 'high', 'medium', 'low') OR
                business_hours_first_response_seconds IS NULL
              )
            )::bigint as compliant
          FROM issues
          WHERE closed_at IS NOT NULL
            AND created_at >= ${dateRange.from}
            AND created_at <= ${dateRange.to}
            ${accountClause(accountId)}
        `

        const row = rows[0]
        const total = Number(row.total)
        if (total === 0) return 0
        return Math.round((Number(row.compliant) / total) * 10000) / 100
      }

      const rows = await prisma.$queryRaw<{ total: bigint; compliant: bigint }[]>`
        SELECT
          COUNT(*) FILTER (WHERE priority IS NOT NULL)::bigint as total,
          COUNT(*) FILTER (WHERE
            priority IS NOT NULL AND (
              (priority = 'urgent' AND EXTRACT(EPOCH FROM (closed_at - created_at)) <= ${targets.urgent}) OR
              (priority = 'high' AND EXTRACT(EPOCH FROM (closed_at - created_at)) <= ${targets.high}) OR
              (priority = 'medium' AND EXTRACT(EPOCH FROM (closed_at - created_at)) <= ${targets.medium}) OR
              (priority = 'low' AND EXTRACT(EPOCH FROM (closed_at - created_at)) <= ${targets.low}) OR
              priority NOT IN ('urgent', 'high', 'medium', 'low')
            )
          )::bigint as compliant
        FROM issues
        WHERE closed_at IS NOT NULL
          AND created_at >= ${dateRange.from}
          AND created_at <= ${dateRange.to}
          ${accountClause(accountId)}
      `

      const row = rows[0]
      const total = Number(row.total)
      if (total === 0) return 0
      return Math.round((Number(row.compliant) / total) * 10000) / 100
    },
    ["getSlaComplianceRate", JSON.stringify(dateRange), metric, accountId ?? ""],
    { revalidate: 300, tags: ["queries"] },
  )()
}

interface AssigneeStat {
  assigneeId: string
  assigneeName: string
  ticketCount: number
  avgResponseHours: number
  avgResolutionHours: number
}

export async function getAssigneeStats(dateRange: DateRange, accountId?: string): Promise<AssigneeStat[]> {
  return unstable_cache(
    async () => {
      const rows = await prisma.$queryRaw<
        {
          assignee_id: string
          assignee_name: string
          ticket_count: bigint
          avg_response_seconds: number | null
          avg_resolution_hours: number | null
        }[]
      >`
        SELECT
          u.id as assignee_id,
          u.name as assignee_name,
          COUNT(*)::bigint as ticket_count,
          AVG(i.business_hours_first_response_seconds) as avg_response_seconds,
          AVG(EXTRACT(EPOCH FROM (i.closed_at - i.created_at)) / 3600) as avg_resolution_hours
        FROM issues i
        JOIN users u ON i.assignee_id = u.id
        WHERE i.created_at >= ${dateRange.from}
          AND i.created_at <= ${dateRange.to}
          ${accountClause(accountId)}
        GROUP BY u.id, u.name
        ORDER BY ticket_count DESC
      `

      return rows.map((row) => ({
        assigneeId: row.assignee_id,
        assigneeName: row.assignee_name,
        ticketCount: Number(row.ticket_count),
        avgResponseHours: row.avg_response_seconds ? row.avg_response_seconds / 3600 : 0,
        avgResolutionHours: row.avg_resolution_hours ?? 0,
      }))
    },
    ["getAssigneeStats", JSON.stringify(dateRange), accountId ?? ""],
    { revalidate: 300, tags: ["queries"] },
  )()
}
