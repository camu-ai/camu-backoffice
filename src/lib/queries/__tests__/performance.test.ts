import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  getResponseTimeStats,
  getResolutionTimeStats,
  getSlaComplianceRate,
  getAssigneeStats,
} from "../performance"
import type { DateRange } from "../types"

vi.mock("@/lib/db", () => ({
  prisma: {
    issue: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

import { prisma } from "@/lib/db"

const mockedFindMany = vi.mocked(prisma.issue.findMany)
const mockedQueryRaw = vi.mocked(prisma.$queryRaw)

const dateRange: DateRange = {
  from: new Date("2026-02-01T00:00:00Z"),
  to: new Date("2026-02-28T23:59:59Z"),
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("getResponseTimeStats", () => {
  it("calculates median and average response time in hours", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      {
        median_seconds: 3600, // 1h
        avg_seconds: 5400, // 1.5h
        count: 50n,
      },
    ])

    const result = await getResponseTimeStats(dateRange)

    expect(result).toEqual({
      medianHours: 1,
      avgHours: 1.5,
      count: 50,
    })
  })

  it("returns zeros when no issues have response times", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      { median_seconds: null, avg_seconds: null, count: 0n },
    ])

    const result = await getResponseTimeStats(dateRange)

    expect(result).toEqual({
      medianHours: 0,
      avgHours: 0,
      count: 0,
    })
  })
})

describe("getResolutionTimeStats", () => {
  it("calculates median and average resolution time from closed issues", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      {
        median_hours: 8.5,
        avg_hours: 12.3,
        count: 30n,
      },
    ])

    const result = await getResolutionTimeStats(dateRange)

    expect(result).toEqual({
      medianHours: 8.5,
      avgHours: 12.3,
      count: 30,
    })
  })
})

describe("getSlaComplianceRate", () => {
  it("calculates percentage of issues resolved within SLA", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      { total: 3n, compliant: 2n },
    ])

    const result = await getSlaComplianceRate(dateRange, "response")

    expect(result).toBeCloseTo(66.67, 1)
  })

  it("returns 100% when all issues are within SLA", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      { total: 1n, compliant: 1n },
    ])

    const result = await getSlaComplianceRate(dateRange, "response")
    expect(result).toBe(100)
  })

  it("returns 0 when no closed issues exist", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      { total: 0n, compliant: 0n },
    ])

    const result = await getSlaComplianceRate(dateRange, "response")
    expect(result).toBe(0)
  })

  it("calculates resolution compliance via SQL", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      { total: 4n, compliant: 3n },
    ])

    const result = await getSlaComplianceRate(dateRange, "resolution")
    expect(result).toBe(75)
  })
})

describe("getAssigneeStats", () => {
  it("aggregates stats per assignee", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      {
        assignee_id: "u1",
        assignee_name: "Juliana",
        ticket_count: 15n,
        avg_response_seconds: 3600,
        avg_resolution_hours: 10.5,
      },
      {
        assignee_id: "u2",
        assignee_name: "Pedro",
        ticket_count: 8n,
        avg_response_seconds: 7200,
        avg_resolution_hours: 15.2,
      },
    ])

    const result = await getAssigneeStats(dateRange)

    expect(result).toEqual([
      {
        assigneeId: "u1",
        assigneeName: "Juliana",
        ticketCount: 15,
        avgResponseHours: 1,
        avgResolutionHours: 10.5,
      },
      {
        assigneeId: "u2",
        assigneeName: "Pedro",
        ticketCount: 8,
        avgResponseHours: 2,
        avgResolutionHours: 15.2,
      },
    ])
  })

  it("handles empty result", async () => {
    mockedQueryRaw.mockResolvedValueOnce([])

    const result = await getAssigneeStats(dateRange)
    expect(result).toEqual([])
  })
})
