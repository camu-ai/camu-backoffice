import { describe, it, expect } from "vitest"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"

describe("database connection", () => {
  it("connects to Postgres and queries sync_log table", async () => {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    })
    const prisma = new PrismaClient({ adapter })

    try {
      const syncLogs = await prisma.syncLog.findMany()
      expect(Array.isArray(syncLogs)).toBe(true)
    } finally {
      await prisma.$disconnect()
    }
  })
})
