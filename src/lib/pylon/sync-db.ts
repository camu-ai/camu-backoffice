import { prisma } from "@/lib/db"
import type { SyncDb } from "./sync"
import type { MappedIssue, MappedMessage, MappedAccount, MappedUser } from "./mapper"

export const syncDb: SyncDb = {
  async createSyncLog() {
    return prisma.syncLog.create({
      data: {
        startedAt: new Date(),
        status: "running",
      },
    })
  },

  async completeSyncLog(id, data) {
    await prisma.syncLog.update({
      where: { id },
      data: {
        endedAt: new Date(),
        status: "completed",
        issuesSynced: data.issuesSynced,
        accountsSynced: data.accountsSynced,
        messagesSynced: data.messagesSynced,
        lastIssueUpdatedAt: data.lastIssueUpdatedAt,
      },
    })
  },

  async failSyncLog(id, error) {
    await prisma.syncLog.update({
      where: { id },
      data: {
        endedAt: new Date(),
        status: "failed",
        errors: JSON.stringify([error.message]),
      },
    })
  },

  async getLastSuccessfulSync() {
    return prisma.syncLog.findFirst({
      where: { status: "completed" },
      orderBy: { startedAt: "desc" },
      select: { lastIssueUpdatedAt: true },
    })
  },

  async upsertIssue(data: MappedIssue) {
    await prisma.issue.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  },

  async upsertAccount(data: MappedAccount) {
    await prisma.account.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  },

  async upsertUser(data: MappedUser) {
    await prisma.user.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  },

  async upsertMessage(data: MappedMessage) {
    await prisma.message.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
  },
}
