"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PriorityBadge } from "@/components/badges/priority-badge"
import { SlaBadge } from "@/components/badges/sla-badge"
import { HandlerBadge } from "@/components/badges/handler-badge"
import { cn } from "@/lib/utils"
import type { SlaStatus } from "@/lib/sla"

export interface IssueRow {
  id: string
  title: string
  priority: string | null
  handler: string | null
  accountName: string | null
  assigneeName: string | null
  age: string
  slaStatus: SlaStatus
  timeToSla: string
  link: string | null
}

interface IssuesTableProps {
  issues: IssueRow[]
  highlightSla?: boolean
}

export function IssuesTable({ issues, highlightSla = false }: IssuesTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Priority</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Handler</TableHead>
            <TableHead className="w-[60px]">Age</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead>Time to SLA</TableHead>
            <TableHead>Assignee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No issues found.
              </TableCell>
            </TableRow>
          )}
          {issues.map((issue) => (
            <TableRow
              key={issue.id}
              className={cn(
                "cursor-pointer",
                highlightSla && issue.slaStatus === "breached" && "bg-red-500/5",
                highlightSla && issue.slaStatus === "at_risk" && "bg-yellow-500/5",
              )}
              onClick={() => issue.link && window.open(issue.link, "_blank")}
            >
              <TableCell>
                <PriorityBadge priority={issue.priority} />
              </TableCell>
              <TableCell className="max-w-[300px] truncate font-medium">
                {issue.title}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {issue.accountName ?? "—"}
              </TableCell>
              <TableCell>
                {issue.handler ? <HandlerBadge handler={issue.handler} /> : "—"}
              </TableCell>
              <TableCell className="tabular-nums">{issue.age}</TableCell>
              <TableCell>
                <SlaBadge status={issue.slaStatus} />
              </TableCell>
              <TableCell className="tabular-nums">{issue.timeToSla}</TableCell>
              <TableCell className="text-muted-foreground">
                {issue.assigneeName ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
