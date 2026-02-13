import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  countByField,
  getIssueCount,
  getOpenIssuesWithRelations,
  volumeOverTime,
} from "../issues"
import type { DateRange, IssueFilters } from "../types"

vi.mock("@/lib/db", () => ({
  prisma: {
    issue: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

import { prisma } from "@/lib/db"

const mockedGroupBy = vi.mocked(prisma.issue.groupBy)
const mockedCount = vi.mocked(prisma.issue.count)
const mockedFindMany = vi.mocked(prisma.issue.findMany)
const mockedQueryRaw = vi.mocked(prisma.$queryRaw)

const dateRange: DateRange = {
  from: new Date("2026-02-01T00:00:00Z"),
  to: new Date("2026-02-28T23:59:59Z"),
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("countByField", () => {
  it("groups by category with date range", async () => {
    mockedGroupBy.mockResolvedValueOnce([
      { category: "platform-bug", _count: { _all: 15 } },
      { category: "how-to-question", _count: { _all: 10 } },
      { category: "escrituracao", _count: { _all: 5 } },
    ] as never)

    const result = await countByField("category", dateRange)

    expect(mockedGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["category"],
        where: expect.objectContaining({
          createdAt: { gte: dateRange.from, lte: dateRange.to },
        }),
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
      }),
    )
    expect(result).toEqual([
      { label: "platform-bug", count: 15 },
      { label: "how-to-question", count: 10 },
      { label: "escrituracao", count: 5 },
    ])
  })

  it("groups by handler with additional filters", async () => {
    mockedGroupBy.mockResolvedValueOnce([
      { handler: "sme", _count: { _all: 20 } },
      { handler: "engineer", _count: { _all: 8 } },
    ] as never)

    const filters: IssueFilters = { priorities: ["urgent", "high"] }
    const result = await countByField("handler", dateRange, filters)

    expect(mockedGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["handler"],
        where: expect.objectContaining({
          priority: { in: ["urgent", "high"] },
        }),
      }),
    )
    expect(result).toEqual([
      { label: "sme", count: 20 },
      { label: "engineer", count: 8 },
    ])
  })

  it("treats null labels as 'unset'", async () => {
    mockedGroupBy.mockResolvedValueOnce([
      { source: "slack", _count: { _all: 30 } },
      { source: null, _count: { _all: 5 } },
    ] as never)

    const result = await countByField("source", dateRange)

    expect(result).toEqual([
      { label: "slack", count: 30 },
      { label: "unset", count: 5 },
    ])
  })

  it("applies multiple filters with AND logic", async () => {
    mockedGroupBy.mockResolvedValueOnce([] as never)

    const filters: IssueFilters = {
      priorities: ["urgent"],
      categories: ["platform-bug"],
      handlers: ["engineer"],
    }
    await countByField("state", dateRange, filters)

    expect(mockedGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          priority: { in: ["urgent"] },
          category: { in: ["platform-bug"] },
          handler: { in: ["engineer"] },
        }),
      }),
    )
  })
})

describe("getIssueCount", () => {
  it("counts issues in date range", async () => {
    mockedCount.mockResolvedValueOnce(42)

    const result = await getIssueCount(dateRange)

    expect(mockedCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: dateRange.from, lte: dateRange.to },
        }),
      }),
    )
    expect(result).toBe(42)
  })

  it("counts with state filter", async () => {
    mockedCount.mockResolvedValueOnce(10)

    const filters: IssueFilters = { states: ["new", "waiting_on_you"] }
    const result = await getIssueCount(dateRange, filters)

    expect(mockedCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          state: { in: ["new", "waiting_on_you"] },
        }),
      }),
    )
    expect(result).toBe(10)
  })

  it("counts without date range (all issues)", async () => {
    mockedCount.mockResolvedValueOnce(100)

    const result = await getIssueCount()

    expect(mockedCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      }),
    )
    expect(result).toBe(100)
  })
})

describe("getOpenIssuesWithRelations", () => {
  it("fetches open issues with account and assignee", async () => {
    const mockIssues = [
      {
        id: "i1",
        title: "Test Issue",
        state: "waiting_on_you",
        priority: "urgent",
        createdAt: new Date("2026-02-10T13:00:00Z"),
        account: { id: "a1", name: "Tractian" },
        assignee: { id: "u1", name: "Juliana" },
      },
    ]
    mockedFindMany.mockResolvedValueOnce(mockIssues as never)

    const result = await getOpenIssuesWithRelations()

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { state: { not: "closed" } },
        include: { account: true, assignee: true },
        orderBy: expect.any(Array),
      }),
    )
    expect(result).toEqual(mockIssues)
  })

  it("filters by priority for P0/P1 queue", async () => {
    mockedFindMany.mockResolvedValueOnce([] as never)

    await getOpenIssuesWithRelations({ priorities: ["urgent", "high"] })

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          priority: { in: ["urgent", "high"] },
        }),
      }),
    )
  })
})

describe("volumeOverTime", () => {
  it("returns daily counts within date range", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      { day: new Date("2026-02-01"), count: 5n },
      { day: new Date("2026-02-02"), count: 3n },
      { day: new Date("2026-02-03"), count: 8n },
    ])

    const result = await volumeOverTime(dateRange)

    expect(result).toEqual([
      { date: "2026-02-01", count: 5 },
      { date: "2026-02-02", count: 3 },
      { date: "2026-02-03", count: 8 },
    ])
  })

  it("returns weekly counts when bucket is week", async () => {
    mockedQueryRaw.mockResolvedValueOnce([
      { day: new Date("2026-02-03"), count: 20n },
      { day: new Date("2026-02-10"), count: 15n },
    ])

    const result = await volumeOverTime(dateRange, "week")

    expect(result).toEqual([
      { date: "2026-02-03", count: 20 },
      { date: "2026-02-10", count: 15 },
    ])
  })

  it("handles empty result", async () => {
    mockedQueryRaw.mockResolvedValueOnce([])

    const result = await volumeOverTime(dateRange)

    expect(result).toEqual([])
  })
})
