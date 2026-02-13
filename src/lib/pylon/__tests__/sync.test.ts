import { describe, it, expect, vi, beforeEach } from "vitest"
import { build30DayWindows, syncFromPylon } from "../sync"
import { buildPylonIssue, buildPylonMessage } from "@/test/factories/pylon"
import type { PylonClient } from "../client"

describe("build30DayWindows", () => {
  it("returns a single window for a span under 30 days", () => {
    const start = new Date("2025-04-01T00:00:00Z")
    const end = new Date("2025-04-15T00:00:00Z")
    const windows = build30DayWindows(start, end)

    expect(windows).toHaveLength(1)
    expect(windows[0].start).toEqual(start)
    expect(windows[0].end).toEqual(end)
  })

  it("splits a 60-day span into two windows", () => {
    const start = new Date("2025-03-01T00:00:00Z")
    const end = new Date("2025-04-30T00:00:00Z")
    const windows = build30DayWindows(start, end)

    expect(windows).toHaveLength(2)
    expect(windows[0].start).toEqual(start)
    expect(windows[1].end).toEqual(end)
  })

  it("splits a 90-day span into three windows", () => {
    const start = new Date("2025-01-01T00:00:00Z")
    const end = new Date("2025-04-01T00:00:00Z")
    const windows = build30DayWindows(start, end)

    expect(windows).toHaveLength(3)
  })

  it("windows are contiguous (no gaps)", () => {
    const start = new Date("2025-01-01T00:00:00Z")
    const end = new Date("2025-04-01T00:00:00Z")
    const windows = build30DayWindows(start, end)

    for (let i = 1; i < windows.length; i++) {
      expect(windows[i].start).toEqual(windows[i - 1].end)
    }
  })

  it("last window ends at the specified end date", () => {
    const start = new Date("2025-01-01T00:00:00Z")
    const end = new Date("2025-04-01T00:00:00Z")
    const windows = build30DayWindows(start, end)

    expect(windows[windows.length - 1].end).toEqual(end)
  })
})

describe("syncFromPylon", () => {
  const mockPylonClient: PylonClient = {
    getIssues: vi.fn(),
    getMessages: vi.fn(),
    getAccount: vi.fn(),
  } as unknown as PylonClient

  const mockDb = {
    upsertIssue: vi.fn(),
    upsertAccount: vi.fn(),
    upsertUser: vi.fn(),
    upsertMessage: vi.fn(),
    createSyncLog: vi.fn(),
    completeSyncLog: vi.fn(),
    failSyncLog: vi.fn(),
    getLastSuccessfulSync: vi.fn(),
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-15T12:00:00Z"))
    vi.mocked(mockPylonClient.getIssues).mockReset()
    vi.mocked(mockPylonClient.getMessages).mockReset()
    vi.mocked(mockPylonClient.getAccount).mockReset()
    Object.values(mockDb).forEach((fn) => fn.mockReset())
    mockDb.createSyncLog.mockResolvedValue({ id: "sync-001" })
    mockDb.getLastSuccessfulSync.mockResolvedValue(null)
  })

  it("creates a SyncLog entry at the start", async () => {
    vi.mocked(mockPylonClient.getIssues).mockResolvedValue({ data: [] })

    await syncFromPylon(mockPylonClient, mockDb)

    expect(mockDb.createSyncLog).toHaveBeenCalledTimes(1)
  })

  it("uses watermark from last successful sync", async () => {
    mockDb.getLastSuccessfulSync.mockResolvedValue({
      lastIssueUpdatedAt: new Date("2026-02-10T00:00:00Z"),
    })
    vi.mocked(mockPylonClient.getIssues).mockResolvedValue({ data: [] })

    await syncFromPylon(mockPylonClient, mockDb)

    const [startTime] = vi.mocked(mockPylonClient.getIssues).mock.calls[0]
    expect(startTime).toEqual(new Date("2026-02-10T00:00:00Z"))
  })

  it("uses default watermark when no previous sync exists", async () => {
    mockDb.getLastSuccessfulSync.mockResolvedValue(null)
    vi.mocked(mockPylonClient.getIssues).mockResolvedValue({ data: [] })

    await syncFromPylon(mockPylonClient, mockDb)

    const [startTime] = vi.mocked(mockPylonClient.getIssues).mock.calls[0]
    expect(startTime).toEqual(new Date("2025-12-01T00:00:00Z"))
  })

  it("upserts issues, accounts, users, and messages", async () => {
    mockDb.getLastSuccessfulSync.mockResolvedValue({
      lastIssueUpdatedAt: new Date("2026-02-14T00:00:00Z"),
    })
    const issue = buildPylonIssue({
      account: { id: "account-001" },
      assignee: { id: "user-001", email: "juliana@camu.ai" },
    })
    const messages = [buildPylonMessage()]

    vi.mocked(mockPylonClient.getIssues).mockResolvedValue({
      data: [issue],
    })
    vi.mocked(mockPylonClient.getMessages).mockResolvedValue(messages)
    vi.mocked(mockPylonClient.getAccount).mockResolvedValue({
      id: "account-001",
      name: "Empresa XYZ",
      domain: "xyz.com",
    })

    await syncFromPylon(mockPylonClient, mockDb)

    expect(mockDb.upsertIssue).toHaveBeenCalledTimes(1)
    expect(mockDb.upsertAccount).toHaveBeenCalledTimes(1)
    expect(mockDb.upsertUser).toHaveBeenCalledTimes(1)
    expect(mockDb.upsertMessage).toHaveBeenCalledTimes(1)
  })

  it("skips account upsert when issue has no account", async () => {
    mockDb.getLastSuccessfulSync.mockResolvedValue({
      lastIssueUpdatedAt: new Date("2026-02-14T00:00:00Z"),
    })
    const issue = buildPylonIssue({ account: null })
    vi.mocked(mockPylonClient.getIssues).mockResolvedValue({
      data: [issue],
    })
    vi.mocked(mockPylonClient.getMessages).mockResolvedValue([])

    await syncFromPylon(mockPylonClient, mockDb)

    expect(mockDb.upsertAccount).not.toHaveBeenCalled()
  })

  it("completes the SyncLog with counts on success", async () => {
    mockDb.getLastSuccessfulSync.mockResolvedValue({
      lastIssueUpdatedAt: new Date("2026-02-14T00:00:00Z"),
    })
    const issue = buildPylonIssue()
    const messages = [buildPylonMessage(), buildPylonMessage({ id: "msg-002" })]

    vi.mocked(mockPylonClient.getIssues).mockResolvedValue({
      data: [issue],
    })
    vi.mocked(mockPylonClient.getMessages).mockResolvedValue(messages)
    vi.mocked(mockPylonClient.getAccount).mockResolvedValue({
      id: "account-001",
      name: "Empresa XYZ",
      domain: "xyz.com",
    })

    await syncFromPylon(mockPylonClient, mockDb)

    expect(mockDb.completeSyncLog).toHaveBeenCalledWith(
      "sync-001",
      expect.objectContaining({
        issuesSynced: 1,
        messagesSynced: 2,
      }),
    )
  })

  it("marks SyncLog as failed on error", async () => {
    vi.mocked(mockPylonClient.getIssues).mockRejectedValue(
      new Error("API down"),
    )

    await expect(syncFromPylon(mockPylonClient, mockDb)).rejects.toThrow(
      "API down",
    )

    expect(mockDb.failSyncLog).toHaveBeenCalledWith(
      "sync-001",
      expect.any(Error),
    )
  })
})
