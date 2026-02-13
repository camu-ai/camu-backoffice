import { prisma } from "@/lib/db"
import { getTenants } from "@/lib/queries/usage"
import { DashboardShell } from "@/components/layout"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [pylonAccounts, bqTenants] = await Promise.all([
    prisma.account.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getTenants().catch(() => []),
  ])

  return (
    <DashboardShell pylonAccounts={pylonAccounts} bqTenants={bqTenants}>
      {children}
    </DashboardShell>
  )
}
