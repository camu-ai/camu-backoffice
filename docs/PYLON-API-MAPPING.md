# Support Dashboard — Pylon API Mapping

> Exact API calls the sync job makes, response shapes, rate limiting, and field extraction.
> Status: IN PROGRESS

---

## Endpoints Used by Sync Job

The sync job only needs **3 read endpoints**. Everything else is handled by the Pylon UI.

| Endpoint | Purpose | Rate Limit | Strategy |
|----------|---------|------------|----------|
| `GET /issues` | Pull issues (with time range) | 10/min | Paginate with cursor, 30-day windows |
| `GET /issues/{id}/messages` | Pull messages per issue | 20/min | One call per updated issue |
| `GET /accounts/{id}` | Pull account details | 60/min | Only for new/unknown accounts |

We do **not** use `POST /issues/search` for the sync — `GET /issues` with `start_time`/`end_time` is simpler and matches the incremental watermark pattern.

---

## Endpoint 1: GET /issues

### Request

```
GET https://api.usepylon.com/issues?start_time={RFC3339}&end_time={RFC3339}&cursor={cursor}
Authorization: Bearer <PYLON_API_TOKEN>
```

**Constraints:**
- `start_time` and `end_time` are **required**
- Max span: 30 days
- Returns issues **updated** within the time range (not just created)
- Paginated: check `pagination.has_next_page` and pass `pagination.cursor`

### Response Shape

```json
{
  "request_id": "req_...",
  "data": [
    {
      "id": "issue-uuid",
      "number": 42,
      "title": "Cannot export XML for NFe 12345",
      "body_html": "<p>When I try to export...</p>",
      "state": "waiting_on_you",
      "type": "Conversation",
      "source": "slack",
      "link": "https://app.usepylon.com/issues/...",
      "created_at": "2025-04-10T14:30:00Z",
      "latest_message_time": "2025-04-11T09:15:00Z",
      "first_response_time": "2025-04-10T14:45:00Z",
      "first_response_seconds": 900,
      "business_hours_first_response_seconds": 900,
      "resolution_time": null,
      "resolution_seconds": null,
      "business_hours_resolution_seconds": null,
      "number_of_touches": 4,
      "tags": ["onboarding", "nfe"],
      "account": { "id": "account-uuid" },
      "assignee": { "id": "user-uuid", "email": "juliana@camu.ai" },
      "requester": { "id": "contact-uuid", "email": "user@customer.com" },
      "team": { "id": "team-uuid" },
      "custom_fields": {
        "category": { "value": "platform-bug" },
        "handler": { "value": "engineer" },
        "resolution-type": { "value": "investigation" },
        "self-servable": { "value": "no" },
        "priority": { "value": "high" }
      },
      "csat_responses": [],
      "external_issues": [],
      "attachment_urls": [],
      "slack": { "channel_id": "C...", "workspace_id": "T...", "message_ts": "..." }
    }
  ],
  "pagination": {
    "cursor": "next-page-cursor-string",
    "has_next_page": true
  }
}
```

### Field Extraction → Prisma Issue

```typescript
function mapIssue(apiIssue: PylonIssue): PrismaIssueUpsert {
  return {
    id:          apiIssue.id,
    title:       apiIssue.title,
    state:       apiIssue.state,
    source:      apiIssue.source ?? null,
    type:        apiIssue.type ?? null,
    link:        apiIssue.link ?? null,
    bodyHtml:    apiIssue.body_html ?? null,
    tags:        apiIssue.tags ?? [],

    // Nested objects — extract ID only
    accountId:   apiIssue.account?.id ?? null,
    assigneeId:  apiIssue.assignee?.id ?? null,

    // Timestamps
    createdAt:   new Date(apiIssue.created_at),
    closedAt:    apiIssue.resolution_time ? new Date(apiIssue.resolution_time) : null,

    // Pylon-calculated SLA fields
    firstResponseAt:                apiIssue.first_response_time ? new Date(apiIssue.first_response_time) : null,
    firstResponseSeconds:           apiIssue.first_response_seconds ?? null,
    businessHoursFirstResponseSec:  apiIssue.business_hours_first_response_seconds ?? null,
    resolutionTime:                 apiIssue.resolution_time ? new Date(apiIssue.resolution_time) : null,
    numberOfTouches:                apiIssue.number_of_touches ?? null,

    // Custom fields — flat object, access by slug
    priority:       apiIssue.custom_fields?.["priority"]?.value ?? null,
    category:       apiIssue.custom_fields?.["category"]?.value ?? null,
    handler:        apiIssue.custom_fields?.["handler"]?.value ?? null,
    resolutionType: apiIssue.custom_fields?.["resolution-type"]?.value ?? null,
    selfServable:   apiIssue.custom_fields?.["self-servable"]?.value ?? null,

    // Sync metadata
    syncedAt: new Date(),
  }
}
```

**Key gotchas:**
- `custom_fields` is a **flat object keyed by slug**, not an array. Access: `custom_fields["category"]?.value`
- `priority` is inside `custom_fields`, not a top-level field
- `account` and `assignee` are nested objects with just `{ id }` (and `email` for assignee)
- `resolution_time` serves as both the resolution timestamp and the indicator that the issue is resolved
- `tags` may be null — default to empty array

---

## Endpoint 2: GET /issues/{id}/messages

### Request

```
GET https://api.usepylon.com/issues/{issue_id}/messages
Authorization: Bearer <PYLON_API_TOKEN>
```

No pagination params documented — appears to return all messages for an issue.

### Response Shape

```json
{
  "request_id": "req_...",
  "data": [
    {
      "id": "message-uuid",
      "author": {
        "name": "Juliana",
        "avatar_url": "https://...",
        "contact": null,
        "user": { "id": "user-uuid" }
      },
      "message_html": "<p>Thanks for reaching out...</p>",
      "is_private": false,
      "source": "slack",
      "timestamp": "2025-04-10T14:45:00Z",
      "thread_id": "thread-uuid",
      "file_urls": []
    }
  ]
}
```

### Field Extraction → Prisma Message

```typescript
function mapMessage(apiMsg: PylonMessage, issueId: string): PrismaMessageUpsert {
  // Determine sender type from author object
  const senderType = apiMsg.author?.contact ? 'customer'
                   : apiMsg.author?.user    ? 'team'
                   : 'system'

  return {
    id:         apiMsg.id,
    issueId:    issueId,
    senderType: senderType,
    senderName: apiMsg.author?.name ?? null,
    bodyHtml:   apiMsg.message_html ?? null,
    bodyText:   stripHtml(apiMsg.message_html) ?? null, // We strip HTML for plain text
    createdAt:  new Date(apiMsg.timestamp),
    syncedAt:   new Date(),
  }
}
```

**Key gotchas:**
- The message field is `message_html` (not `body_html` like issues)
- The timestamp field is `timestamp` (not `created_at` like issues)
- `author` contains either a `contact` (customer) or `user` (team member) — use this to determine `senderType`
- Private messages (`is_private: true`) are internal notes — still sync them, they're useful for analysis
- We need to strip HTML to get `bodyText` for search/AI use — use a simple regex or library

---

## Endpoint 3: GET /accounts/{id}

### Request

```
GET https://api.usepylon.com/accounts/{account_id}
Authorization: Bearer <PYLON_API_TOKEN>
```

### Response Shape

```json
{
  "request_id": "req_...",
  "data": {
    "id": "account-uuid",
    "name": "Empresa XYZ Ltda",
    "domain": "empresaxyz.com.br",
    "custom_fields": { ... },
    "owner": { "id": "user-uuid" },
    "tags": []
  }
}
```

### Field Extraction → Prisma Account

```typescript
function mapAccount(apiAccount: PylonAccount): PrismaAccountUpsert {
  return {
    id:       apiAccount.id,
    name:     apiAccount.name,
    domain:   apiAccount.domain ?? null,
    syncedAt: new Date(),
  }
}
```

We only store id, name, domain. Custom fields and tags on accounts aren't needed for the dashboard.

---

## Assignee → Prisma User

Assignee data comes from the issue object, not a separate endpoint:

```typescript
function mapAssignee(apiIssue: PylonIssue): PrismaUserUpsert | null {
  if (!apiIssue.assignee?.id) return null

  return {
    id:       apiIssue.assignee.id,
    name:     apiIssue.assignee.email?.split('@')[0] ?? 'Unknown', // Best we have from issue
    email:    apiIssue.assignee.email ?? null,
    syncedAt: new Date(),
  }
}
```

**Note:** The issue object only gives us `{ id, email }` for the assignee. To get the full name, we'd need `GET /users/{id}`. We can do this once during initial backfill and cache it, since the team is small (~12 users).

To get proper names on initial backfill:

```
GET https://api.usepylon.com/users
```

Returns all users with id, name, email. Call once and upsert all.

---

## Sync Flow (Pseudocode)

```typescript
async function syncFromPylon() {
  const syncLog = await createSyncLog()

  try {
    // 1. Find watermark
    const lastSync = await getLastSuccessfulSync()
    const watermark = lastSync?.lastIssueUpdatedAt ?? new Date('2024-01-01')

    // 2. Build 30-day windows from watermark to now
    const windows = build30DayWindows(watermark, new Date())

    let issuesSynced = 0
    let accountsSynced = 0
    let messagesSynced = 0
    let latestUpdatedAt = watermark

    for (const { start, end } of windows) {
      // 3. Paginate through issues in this window
      let cursor: string | undefined
      do {
        await rateLimitDelay(500) // 500ms between calls

        const response = await pylonGet('/issues', {
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          cursor,
        })

        for (const issue of response.data) {
          // 3a. Upsert account
          if (issue.account?.id) {
            await upsertAccount(issue.account.id)
            accountsSynced++
          }

          // 3b. Upsert assignee
          if (issue.assignee?.id) {
            await upsertUser(issue.assignee)
          }

          // 3c. Upsert issue
          await upsertIssue(mapIssue(issue))
          issuesSynced++

          // 3d. Sync messages for this issue
          await rateLimitDelay(500)
          const messages = await pylonGet(`/issues/${issue.id}/messages`)
          for (const msg of messages.data) {
            await upsertMessage(mapMessage(msg, issue.id))
            messagesSynced++
          }

          // Track watermark
          const updatedAt = new Date(issue.latest_message_time || issue.created_at)
          if (updatedAt > latestUpdatedAt) {
            latestUpdatedAt = updatedAt
          }
        }

        cursor = response.pagination.has_next_page
          ? response.pagination.cursor
          : undefined
      } while (cursor)
    }

    // 4. Update sync log
    await completeSyncLog(syncLog.id, {
      issuesSynced,
      accountsSynced,
      messagesSynced,
      lastIssueUpdatedAt: latestUpdatedAt,
    })
  } catch (error) {
    await failSyncLog(syncLog.id, error)
    throw error
  }
}
```

---

## Rate Limiting Strategy

| Endpoint | Limit | Our Strategy |
|----------|-------|-------------|
| GET /issues | 10/min | 500ms delay between pages. Max 12 pages/min well within limit |
| GET /issues/{id}/messages | 20/min | 500ms delay. Called once per issue. If >20 issues updated, batching naturally stays under |
| GET /accounts/{id} | 60/min | Only called for unknown accounts. Cache in DB. |
| GET /users | varies | Called once during initial backfill |

### Backfill Estimate

Assuming ~130 existing issues with ~10 messages each:
- Issues: ~130 issues / 100 per page = 2 pages × ~5 windows = ~10 API calls
- Messages: 130 issues × 1 call each = 130 API calls at 500ms = ~65 seconds
- Accounts: ~30 unique accounts × 1 call each = 30 API calls

**Total initial backfill: ~170 API calls, ~2-3 minutes** (with rate limiting)

### Incremental Sync Estimate

Assuming ~5-10 issues updated per hour:
- Issues: 1 page per window (usually 1 window) = 1 call
- Messages: 5-10 calls
- Accounts: 0-1 calls (most already cached)

**Total per sync: ~10-15 API calls, ~5-10 seconds**

---

## Error Handling

### Retryable Errors
- **429 Too Many Requests**: Back off exponentially (1s, 2s, 4s), max 3 retries
- **500 Server Error**: Retry once after 2s, then skip and log
- **Network timeout**: Retry once after 5s

### Non-Retryable Errors
- **400 Bad Request**: Log error, skip this record, continue sync
- **404 Not Found**: Issue/account was deleted in Pylon. Skip silently.
- **401 Unauthorized**: Token expired. Fail the entire sync, alert team.

### Partial Failure
The sync job should be **resumable**. If it fails midway:
- Issues already upserted are fine (idempotent)
- The watermark only advances on successful completion
- Next sync picks up from the last watermark

---

## TypeScript Types (from API)

```typescript
interface PylonIssue {
  id: string
  number: number
  title: string
  body_html: string | null
  state: 'new' | 'waiting_on_you' | 'waiting_on_customer' | 'on_hold' | 'closed'
  type: 'Conversation' | 'Ticket' | null
  source: string | null
  link: string | null
  created_at: string // ISO 8601
  latest_message_time: string | null
  first_response_time: string | null
  first_response_seconds: number | null
  business_hours_first_response_seconds: number | null
  resolution_time: string | null
  resolution_seconds: number | null
  business_hours_resolution_seconds: number | null
  number_of_touches: number | null
  tags: string[] | null
  account: { id: string } | null
  assignee: { id: string; email: string } | null
  requester: { id: string; email: string } | null
  team: { id: string } | null
  custom_fields: Record<string, { value: string }> | null
  csat_responses: Array<{ score: number; comment: string | null }>
  external_issues: Array<{ external_id: string; source: string; link: string }>
  attachment_urls: string[]
}

interface PylonMessage {
  id: string
  author: {
    name: string | null
    avatar_url: string | null
    contact: { id: string } | null
    user: { id: string } | null
  }
  message_html: string | null
  is_private: boolean
  source: string | null
  timestamp: string // ISO 8601
  thread_id: string | null
  file_urls: string[]
}

interface PylonAccount {
  id: string
  name: string
  domain: string | null
}

interface PylonPagination {
  cursor: string | null
  has_next_page: boolean
}

interface PylonResponse<T> {
  request_id: string
  data: T
  pagination: PylonPagination
}
```

---

## Environment Variables

```env
PYLON_API_TOKEN=<bearer token from Pylon admin settings>
```

Single env var. Token is admin-scoped (read access to all data).

---

## Open Questions

- [ ] Does GET /issues/{id}/messages paginate, or always return all messages?
- [ ] What's the exact field for issue "updated_at"? Using `latest_message_time` as proxy.
- [ ] Should we sync CSAT responses? (Stored on the issue object already)
