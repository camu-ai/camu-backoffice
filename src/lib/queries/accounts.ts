import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"
import type { DateRange } from "./types"

interface AccountStat {
  accountId: string
  accountName: string
  totalTickets: number
  openTickets: number
  p0p1Tickets: number
  topCategory: string | null
  avgResponseHours: number
  avgResolutionHours: number
}

export async function getAccountStats(dateRange: DateRange): Promise<AccountStat[]> {
  return unstable_cache(
    async () => {
      const rows = await prisma.$queryRaw<
        {
          account_id: string
          account_name: string
          total_tickets: bigint
          open_tickets: bigint
          p0_p1_tickets: bigint
          top_category: string | null
          avg_response_seconds: number | null
          avg_resolution_hours: number | null
        }[]
      >`
        SELECT
          a.id as account_id,
          a.name as account_name,
          COUNT(*)::bigint as total_tickets,
          COUNT(*) FILTER (WHERE i.state != 'closed')::bigint as open_tickets,
          COUNT(*) FILTER (WHERE i.priority IN ('urgent', 'high'))::bigint as p0_p1_tickets,
          MODE() WITHIN GROUP (ORDER BY i.category) as top_category,
          AVG(i.business_hours_first_response_seconds) as avg_response_seconds,
          AVG(
            CASE WHEN i.closed_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (i.closed_at - i.created_at)) / 3600
            END
          ) as avg_resolution_hours
        FROM issues i
        JOIN accounts a ON i.account_id = a.id
        WHERE i.created_at >= ${dateRange.from}
          AND i.created_at <= ${dateRange.to}
        GROUP BY a.id, a.name
        ORDER BY total_tickets DESC
      `

      return rows.map((row) => ({
        accountId: row.account_id,
        accountName: row.account_name,
        totalTickets: Number(row.total_tickets),
        openTickets: Number(row.open_tickets),
        p0p1Tickets: Number(row.p0_p1_tickets),
        topCategory: row.top_category,
        avgResponseHours: row.avg_response_seconds ? row.avg_response_seconds / 3600 : 0,
        avgResolutionHours: row.avg_resolution_hours ?? 0,
      }))
    },
    ["getAccountStats", JSON.stringify(dateRange)],
    { revalidate: 300, tags: ["queries"] },
  )()
}
