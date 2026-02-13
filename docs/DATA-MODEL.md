# Support Dashboard — Data Model

> Prisma schema, sync strategy, and field mappings from Pylon API.
> Status: IN PROGRESS

---

## Overview

The dashboard database is a **read-optimized copy** of Pylon data. Pylon remains the source of truth. The sync job pulls data via API and upserts into Neon Postgres.

Data flow: `Pylon API → Sync Job → Neon Postgres → Dashboard`

---

## Prisma Schema (Draft)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Neon requires this for migrations
}

// ─── Core Tables ────────────────────────────────────────

model Issue {
  id        String   @id // Pylon issue ID
  title     String
  state     String   // new, waiting_on_you, waiting_on_customer, on_hold, closed
  priority  String?  // urgent, high, medium, low
  source    String?  // slack, email, chat_widget, form, manual, etc.

  // Pylon custom fields
  category       String? // how-to-question, platform-bug, escrituracao-issue, etc.
  handler        String? // sme, engineer, product
  resolutionType String? @map("resolution_type") // manual-action, explanation, investigation, etc.
  selfServable   String? @map("self_servable")    // yes, partially, no

  // Relationships
  accountId  String?  @map("account_id")
  account    Account? @relation(fields: [accountId], references: [id])
  assigneeId String?  @map("assignee_id")
  assignee   User?    @relation(fields: [assigneeId], references: [id])
  messages   Message[]

  // Timestamps
  createdAt DateTime  @map("created_at")
  closedAt  DateTime? @map("closed_at")

  // Pylon-computed SLA fields (provided by API — no need to calculate ourselves)
  firstResponseAt                DateTime? @map("first_response_at")
  firstResponseSeconds           Int?      @map("first_response_seconds")
  businessHoursFirstResponseSec  Int?      @map("business_hours_first_response_seconds")
  resolutionTime                 DateTime? @map("resolution_time")

  // Extra metadata from Pylon
  bodyHtml        String? @map("body_html")       // First message body (issue description)
  numberOfTouches Int?    @map("number_of_touches") // Back-and-forth count
  link            String?                           // Pylon issue URL
  type            String?                           // Conversation or Ticket
  tags            String[] @default([])              // Pylon tags

  // Sync metadata
  syncedAt DateTime @map("synced_at")        // When we last synced this record

  @@map("issues")
}

model Account {
  id     String  @id // Pylon account ID
  name   String
  domain String?

  issues Issue[]

  syncedAt DateTime @map("synced_at")

  @@map("accounts")
}

model User {
  id    String  @id // Pylon user ID
  name  String
  email String?

  issues Issue[]

  syncedAt DateTime @map("synced_at")

  @@map("users")
}

model Message {
  id         String  @id // Pylon message ID
  issueId    String  @map("issue_id")
  issue      Issue   @relation(fields: [issueId], references: [id])
  senderType String  @map("sender_type") // customer, team, system
  senderName String? @map("sender_name")
  bodyText   String? @map("body_text")   // Plain text content
  bodyHtml   String? @map("body_html")   // HTML content (for rich display)

  createdAt DateTime @map("created_at")

  syncedAt DateTime @map("synced_at")

  @@index([issueId])
  @@index([issueId, senderType, createdAt]) // For first response time queries
  @@map("messages")
}

// ─── Sync Infrastructure ────────────────────────────────

model SyncLog {
  id        String   @id @default(cuid())
  startedAt DateTime @map("started_at")
  endedAt   DateTime? @map("ended_at")
  status    String   // running, completed, failed

  // What was synced
  issuesSynced   Int @default(0) @map("issues_synced")
  accountsSynced Int @default(0) @map("accounts_synced")
  messagesSynced Int @default(0) @map("messages_synced")

  // Error tracking
  errors String? // JSON array of error messages

  // Watermarks — where to resume from
  lastIssueUpdatedAt DateTime? @map("last_issue_updated_at")

  @@map("sync_log")
}
```

---

## Field Mapping: Pylon API → Prisma

### Issues

| Pylon API field | Prisma field | Notes |
|---|---|---|
| `id` | `id` | Primary key |
| `title` | `title` | |
| `state` | `state` | Enum: new, waiting_on_you, waiting_on_customer, on_hold, closed |
| `source` | `source` | slack, email, chat_widget, etc. |
| `type` | `type` | Conversation or Ticket |
| `link` | `link` | Pylon issue URL |
| `body_html` | `bodyHtml` | First message body / issue description |
| `account.id` | `accountId` | FK to accounts (nested object, extract `.id`) |
| `assignee.id` | `assigneeId` | FK to users (nested object, extract `.id`) |
| `tags` | `tags` | String array, may be null |
| `created_at` | `createdAt` | ISO timestamp |
| `closed_at` | `closedAt` | ISO timestamp, null if open |
| `first_response_time` | `firstResponseAt` | ISO timestamp, Pylon-calculated |
| `first_response_seconds` | `firstResponseSeconds` | Total seconds to first response |
| `business_hours_first_response_seconds` | `businessHoursFirstResponseSec` | Business hours version, Pylon-calculated |
| `resolution_time` | `resolutionTime` | ISO timestamp when resolved |
| `number_of_touches` | `numberOfTouches` | Back-and-forth message count |
| `custom_fields.priority.value` | `priority` | urgent, high, medium, low |
| `custom_fields.category.value` | `category` | Our 13 categories |
| `custom_fields.handler.value` | `handler` | sme, engineer, product |
| `custom_fields.resolution-type.value` | `resolutionType` | Our 7 resolution types |
| `custom_fields.self-servable.value` | `selfServable` | yes, partially, no |

**Important:** Custom fields are a flat object keyed by slug (not an array). Access pattern: `issue.custom_fields["category"]?.value`

### Accounts

| Pylon API field | Prisma field |
|---|---|
| `id` | `id` |
| `name` | `name` |
| `domain` | `domain` |

### Messages

| Pylon API field | Prisma field | Notes |
|---|---|---|
| `id` | `id` | |
| `issue_id` | `issueId` | FK to issues |
| `sender.type` | `senderType` | customer, team, system |
| `sender.name` | `senderName` | |
| `body_text` | `bodyText` | Plain text for search/AI |
| `body_html` | `bodyHtml` | HTML for rich display |
| `created_at` | `createdAt` | |

### Custom Field Extraction

Pylon returns custom fields as an array on each issue:
```json
{
  "custom_fields": [
    { "slug": "category", "value": "platform-bug" },
    { "slug": "handler", "value": "engineer" },
    { "slug": "resolution-type", "value": "investigation" },
    { "slug": "self-servable", "value": "no" }
  ]
}
```

The sync job extracts these by slug and maps them to flat columns on the Issue model. This denormalization makes queries fast — no joins needed to filter by category or handler.

---

## Computed Fields

### First Response Time

Calculated during sync for each issue:

1. Find the first message where `senderType = 'team'` ordered by `createdAt`
2. `firstResponseAt` = that message's `createdAt`
3. `firstResponseHours` = business hours between `issue.createdAt` and `firstResponseAt`

**Business hours calculation:**
- Mon–Fri, 08:00–18:00 BRT (10 hours per business day)
- Weekends and hours outside 08:00–18:00 don't count
- Example: ticket created Friday 17:00, first response Monday 09:00 = 2 business hours (1h Friday + 1h Monday)

### Resolution Time

Calculated during sync for each closed issue:

1. `resolutionHours` = business hours between `issue.createdAt` and `issue.closedAt`
2. Same business hours logic as above

### SLA Status (calculated at read time, not stored)

Not stored in the database — calculated in the dashboard queries based on current time vs SLA targets. This avoids needing to re-sync when time passes.

```
If elapsed business hours < 75% of SLA target → "ok" (green)
If elapsed business hours >= 75% and < 100% → "at_risk" (yellow)
If elapsed business hours >= 100% → "breached" (red)
```

---

## Sync Strategy

### Incremental Sync (hourly / on-demand)

1. Read `lastIssueUpdatedAt` from the most recent successful `SyncLog`
2. Pull issues from Pylon where `updated_at > lastIssueUpdatedAt` (in 30-day chunks if needed)
3. For each issue:
   a. Upsert the issue record
   b. Upsert the account if `account_id` is present
   c. Upsert the assignee if `assignee_id` is present
   d. Pull all messages for this issue and upsert them
   e. Calculate `firstResponseAt` and `firstResponseHours`
   f. If closed, calculate `resolutionHours`
4. Write a `SyncLog` entry with counts and watermark

### Initial Backfill

First run has no watermark, so:
1. Pull all issues in 30-day chunks going back to the earliest ticket
2. Process each chunk through the same upsert logic
3. Rate limit: 500ms delay between API calls to stay within Pylon's limits

### Sync Button

Dashboard includes a "Sync Now" button that:
1. Triggers the sync endpoint via a Server Action
2. Shows a spinner while running
3. Displays "Last synced: X minutes ago" in the header

---

## Indexes

Key indexes for dashboard query performance:

```
issues.issue_id (PK)
issues.state — filter open tickets
issues.priority — filter by urgency
issues.category — filter/group by category
issues.handler — filter/group by handler
issues.account_id — join to accounts, group by account
issues.created_at — time-series queries
issues.closed_at — resolution time queries

messages.issue_id — join to issues
messages.issue_id + sender_type + created_at — first response time
```

Most of these are covered by the Prisma schema above. Additional composite indexes can be added based on actual query patterns.

---

## Storage Estimate

| Table | Est. rows (current) | Est. rows (1 year) | Avg row size | Total |
|---|---|---|---|---|
| Issues | 130 | ~1,500 | 500 bytes | ~750 KB |
| Accounts | 30 | ~100 | 200 bytes | ~20 KB |
| Users | 12 | ~20 | 200 bytes | ~4 KB |
| Messages | ~1,300 | ~15,000 | 2 KB (with body) | ~30 MB |
| SyncLog | 365 | 730 | 500 bytes | ~365 KB |

**Total estimated: ~31 MB after 1 year.** Well within Neon Postgres free tier (512 MB).

---

## Open Questions

- [ ] Does Pylon API return custom field values on the issue object directly, or do we need a separate call?
- [ ] What's the exact format of message sender info? (need to test with real API response)
- [ ] Should we store tags from Pylon issues too?
