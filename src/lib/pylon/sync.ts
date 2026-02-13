import type { PylonClient } from "./client"
import type { MappedIssue, MappedMessage, MappedAccount, MappedUser } from "./mapper"
import { mapIssue, mapMessage, mapAccount, mapAssignee } from "./mapper"

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const DEFAULT_WATERMARK = new Date("2025-12-01T00:00:00Z")

export interface SyncDb {
  createSyncLog: () => Promise<{ id: string }>
  completeSyncLog: (
    id: string,
    data: {
      issuesSynced: number
      accountsSynced: number
      messagesSynced: number
      lastIssueUpdatedAt: Date
    },
  ) => Promise<void>
  failSyncLog: (id: string, error: Error) => Promise<void>
  getLastSuccessfulSync: () => Promise<{
    lastIssueUpdatedAt: Date | null
  } | null>
  upsertIssue: (data: MappedIssue) => Promise<void>
  upsertAccount: (data: MappedAccount) => Promise<void>
  upsertUser: (data: MappedUser) => Promise<void>
  upsertMessage: (data: MappedMessage) => Promise<void>
}

export function build30DayWindows(
  start: Date,
  end: Date,
): Array<{ start: Date; end: Date }> {
  const windows: Array<{ start: Date; end: Date }> = []
  let windowStart = start

  while (windowStart < end) {
    const windowEnd = new Date(
      Math.min(windowStart.getTime() + THIRTY_DAYS_MS, end.getTime()),
    )
    windows.push({ start: windowStart, end: windowEnd })
    windowStart = windowEnd
  }

  return windows
}

export async function syncFromPylon(
  pylonClient: PylonClient,
  db: SyncDb,
): Promise<void> {
  const syncLog = await db.createSyncLog()

  try {
    const lastSync = await db.getLastSuccessfulSync()
    const watermark = lastSync?.lastIssueUpdatedAt ?? DEFAULT_WATERMARK

    const windows = build30DayWindows(watermark, new Date())

    let issuesSynced = 0
    let accountsSynced = 0
    let messagesSynced = 0
    let latestUpdatedAt = watermark

    for (const window of windows) {
      const response = await pylonClient.getIssues(window.start, window.end)

      for (const issue of response.data) {
        if (issue.account?.id) {
          const account = await pylonClient.getAccount(issue.account.id)
          await db.upsertAccount(mapAccount(account))
          accountsSynced++
        }

        const assignee = mapAssignee(issue)
        if (assignee) {
          await db.upsertUser(assignee)
        }

        await db.upsertIssue(mapIssue(issue))
        issuesSynced++

        const messages = await pylonClient.getMessages(issue.id)
        for (const msg of messages) {
          await db.upsertMessage(mapMessage(msg, issue.id))
          messagesSynced++
        }

        const updatedAt = new Date(
          issue.latest_message_time ?? issue.created_at,
        )
        if (updatedAt > latestUpdatedAt) {
          latestUpdatedAt = updatedAt
        }
      }
    }

    await db.completeSyncLog(syncLog.id, {
      issuesSynced,
      accountsSynced,
      messagesSynced,
      lastIssueUpdatedAt: latestUpdatedAt,
    })
  } catch (error) {
    await db.failSyncLog(syncLog.id, error as Error)
    throw error
  }
}
