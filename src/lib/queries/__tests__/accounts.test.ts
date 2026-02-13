import { describe, it, expect, vi, beforeEach } from "vitest"
import { getAccountStats } from "../accounts"
import type { DateRange } from "../types"

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}))

import { prisma } from "@/lib/db"

const mockedQueryRaw = vi.mocked(prisma.$queryRaw)

const dateRange: DateRange = {
  from: new Date("2026-02-01T00:00:00Z"),
  to: new Date("2026-02-28T23:59:59Z"),
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("getAccountStats", () => {
  it("returns per-account ticket stats", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      {
        account_id: "a1",
        account_name: "Tractian",
        total_tickets: 54n,
        open_tickets: 5n,
        p0_p1_tickets: 3n,
        top_category: "platform-bug",
        avg_response_seconds: 3600,
        avg_resolution_hours: 8.5,
      },
      {
        account_id: "a2",
        account_name: "Mkraft",
        total_tickets: 33n,
        open_tickets: 2n,
        p0_p1_tickets: 1n,
        top_category: "how-to-question",
        avg_response_seconds: 5400,
        avg_resolution_hours: 12.0,
      },
    ])

    const result = await getAccountStats(dateRange)

    expect(result).toEqual([
      {
        accountId: "a1",
        accountName: "Tractian",
        totalTickets: 54,
        openTickets: 5,
        p0p1Tickets: 3,
        topCategory: "platform-bug",
        avgResponseHours: 1,
        avgResolutionHours: 8.5,
      },
      {
        accountId: "a2",
        accountName: "Mkraft",
        totalTickets: 33,
        openTickets: 2,
        p0p1Tickets: 1,
        topCategory: "how-to-question",
        avgResponseHours: 1.5,
        avgResolutionHours: 12.0,
      },
    ])
  })

  it("handles empty result", async () => {
    mockedQueryRaw.mockResolvedValueOnce([])

    const result = await getAccountStats(dateRange)
    expect(result).toEqual([])
  })
})
