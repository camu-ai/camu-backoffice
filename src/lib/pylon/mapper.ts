import type { PylonIssue, PylonMessage, PylonAccount } from "./types"

export interface MappedIssue {
  id: string
  title: string
  state: string
  source: string | null
  type: string | null
  link: string | null
  bodyHtml: string | null
  tags: string[]
  accountId: string | null
  assigneeId: string | null
  createdAt: Date
  closedAt: Date | null
  firstResponseAt: Date | null
  firstResponseSeconds: number | null
  businessHoursFirstResponseSec: number | null
  resolutionTime: Date | null
  numberOfTouches: number | null
  priority: string | null
  category: string | null
  handler: string | null
  resolutionType: string | null
  selfServable: string | null
  syncedAt: Date
}

export interface MappedMessage {
  id: string
  issueId: string
  senderType: string
  senderName: string | null
  bodyHtml: string | null
  bodyText: string | null
  createdAt: Date
  syncedAt: Date
}

export interface MappedAccount {
  id: string
  name: string
  domain: string | null
  syncedAt: Date
}

export interface MappedUser {
  id: string
  name: string
  email: string | null
  syncedAt: Date
}

export function mapIssue(apiIssue: PylonIssue): MappedIssue {
  return {
    id: apiIssue.id,
    title: apiIssue.title,
    state: apiIssue.state,
    source: apiIssue.source ?? null,
    type: apiIssue.type ?? null,
    link: apiIssue.link ?? null,
    bodyHtml: apiIssue.body_html ?? null,
    tags: apiIssue.tags ?? [],

    accountId: apiIssue.account?.id ?? null,
    assigneeId: apiIssue.assignee?.id ?? null,

    createdAt: new Date(apiIssue.created_at),
    closedAt: apiIssue.resolution_time
      ? new Date(apiIssue.resolution_time)
      : null,

    firstResponseAt: apiIssue.first_response_time
      ? new Date(apiIssue.first_response_time)
      : null,
    firstResponseSeconds: apiIssue.first_response_seconds ?? null,
    businessHoursFirstResponseSec:
      apiIssue.business_hours_first_response_seconds ?? null,
    resolutionTime: apiIssue.resolution_time
      ? new Date(apiIssue.resolution_time)
      : null,
    numberOfTouches: apiIssue.number_of_touches ?? null,

    priority: apiIssue.custom_fields?.["priority"]?.value ?? null,
    category: apiIssue.custom_fields?.["category"]?.value ?? null,
    handler: apiIssue.custom_fields?.["handler"]?.value ?? null,
    resolutionType:
      apiIssue.custom_fields?.["resolution-type"]?.value ?? null,
    selfServable: apiIssue.custom_fields?.["self-servable"]?.value ?? null,

    syncedAt: new Date(),
  }
}

export function mapMessage(
  apiMsg: PylonMessage,
  issueId: string,
): MappedMessage {
  const senderType = apiMsg.author?.contact
    ? "customer"
    : apiMsg.author?.user
      ? "team"
      : "system"

  return {
    id: apiMsg.id,
    issueId,
    senderType,
    senderName: apiMsg.author?.name ?? null,
    bodyHtml: apiMsg.message_html ?? null,
    bodyText: apiMsg.message_html ? stripHtml(apiMsg.message_html) : null,
    createdAt: new Date(apiMsg.timestamp),
    syncedAt: new Date(),
  }
}

export function mapAccount(apiAccount: PylonAccount): MappedAccount {
  return {
    id: apiAccount.id,
    name: apiAccount.name,
    domain: apiAccount.domain ?? null,
    syncedAt: new Date(),
  }
}

export function mapAssignee(apiIssue: PylonIssue): MappedUser | null {
  if (!apiIssue.assignee?.id) return null

  return {
    id: apiIssue.assignee.id,
    name: apiIssue.assignee.email?.split("@")[0] ?? "Unknown",
    email: apiIssue.assignee.email ?? null,
    syncedAt: new Date(),
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "")
}
