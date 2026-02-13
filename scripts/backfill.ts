import "dotenv/config"
import { PylonClient } from "../src/lib/pylon/client"
import { mapIssue, mapMessage, mapAccount, mapAssignee } from "../src/lib/pylon/mapper"
import { build30DayWindows } from "../src/lib/pylon/sync"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

async function main() {
  const token = process.env.PYLON_API_TOKEN
  if (!token) {
    console.error("PYLON_API_TOKEN not set")
    process.exit(1)
  }

  console.log("Connecting to database...")
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  console.log("Creating sync log...")
  const syncLog = await prisma.syncLog.create({
    data: { startedAt: new Date(), status: "running" },
  })
  console.log("Sync log created:", syncLog.id)

  const client = new PylonClient(token, { rateLimitDelay: 200 })
  const watermark = new Date("2025-12-01T00:00:00Z")
  const now = new Date()
  const windows = build30DayWindows(watermark, now)

  console.log(`Watermark: ${watermark.toISOString()}`)
  console.log(`Now: ${now.toISOString()}`)
  console.log(`Windows: ${windows.length}`)

  let issuesSynced = 0
  let accountsSynced = 0
  let messagesSynced = 0
  let latestUpdatedAt = watermark
  const seenAccounts = new Set<string>()

  for (let w = 0; w < windows.length; w++) {
    const window = windows[w]
    console.log(`\n--- Window ${w + 1}/${windows.length}: ${window.start.toISOString()} → ${window.end.toISOString()} ---`)

    console.log("  Fetching issues...")
    const response = await client.getIssues(window.start, window.end)
    console.log(`  Got ${response.data.length} issues`)

    for (let i = 0; i < response.data.length; i++) {
      const issue = response.data[i]
      console.log(`  [${i + 1}/${response.data.length}] #${issue.number} "${issue.title.substring(0, 50)}..."`)

      if (issue.account?.id && !seenAccounts.has(issue.account.id)) {
        try {
          const account = await client.getAccount(issue.account.id)
          await prisma.account.upsert({
            where: { id: account.id },
            create: mapAccount(account),
            update: mapAccount(account),
          })
          seenAccounts.add(issue.account.id)
          accountsSynced++
          console.log(`    Account: ${account.name}`)
        } catch (err) {
          console.error(`    Account fetch failed:`, err)
        }
      }

      const assignee = mapAssignee(issue)
      if (assignee) {
        await prisma.user.upsert({
          where: { id: assignee.id },
          create: assignee,
          update: assignee,
        })
      }

      const mapped = mapIssue(issue)
      await prisma.issue.upsert({
        where: { id: mapped.id },
        create: mapped,
        update: mapped,
      })
      issuesSynced++

      try {
        const messages = await client.getMessages(issue.id)
        for (const msg of messages) {
          const mappedMsg = mapMessage(msg, issue.id)
          await prisma.message.upsert({
            where: { id: mappedMsg.id },
            create: mappedMsg,
            update: mappedMsg,
          })
          messagesSynced++
        }
        console.log(`    Messages: ${messages.length}`)
      } catch (err) {
        console.error(`    Messages fetch failed:`, err)
      }

      const updatedAt = new Date(issue.latest_message_time ?? issue.created_at)
      if (updatedAt > latestUpdatedAt) latestUpdatedAt = updatedAt
    }
  }

  await prisma.syncLog.update({
    where: { id: syncLog.id },
    data: {
      endedAt: new Date(),
      status: "completed",
      issuesSynced,
      accountsSynced,
      messagesSynced,
      lastIssueUpdatedAt: latestUpdatedAt,
    },
  })

  console.log(`\n=== Sync Complete ===`)
  console.log(`Issues: ${issuesSynced}`)
  console.log(`Accounts: ${accountsSynced}`)
  console.log(`Messages: ${messagesSynced}`)
  console.log(`Latest updated at: ${latestUpdatedAt.toISOString()}`)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
