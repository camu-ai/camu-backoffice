export interface PylonIssue {
  id: string
  number: number
  title: string
  body_html: string | null
  state: "new" | "waiting_on_you" | "waiting_on_customer" | "on_hold" | "closed"
  type: "Conversation" | "Ticket" | null
  source: string | null
  link: string | null
  created_at: string
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
  assignee: { id: string; email?: string } | null
  requester: { id: string; email?: string } | null
  team: { id: string } | null
  custom_fields: Record<string, { value: string }> | null
  csat_responses: Array<{ score: number; comment: string | null }>
  external_issues: Array<{ external_id: string; source: string; link: string }>
  attachment_urls: string[]
}

export interface PylonMessage {
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
  timestamp: string
  thread_id: string | null
  file_urls: string[]
}

export interface PylonAccount {
  id: string
  name: string
  domain: string | null
}

export interface PylonPagination {
  cursor: string | null
  has_next_page: boolean
}

export interface PylonResponse<T> {
  request_id: string
  data?: T
  pagination?: PylonPagination
}
