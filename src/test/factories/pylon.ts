import type { PylonIssue, PylonMessage, PylonAccount } from "@/lib/pylon/types"

export function buildPylonIssue(overrides: Partial<PylonIssue> = {}): PylonIssue {
  return {
    id: "issue-001",
    number: 42,
    title: "Cannot export XML for NFe 12345",
    body_html: "<p>When I try to export...</p>",
    state: "waiting_on_you",
    type: "Conversation",
    source: "slack",
    link: "https://app.usepylon.com/issues/issue-001",
    created_at: "2025-04-10T14:30:00Z",
    latest_message_time: "2025-04-11T09:15:00Z",
    first_response_time: "2025-04-10T14:45:00Z",
    first_response_seconds: 900,
    business_hours_first_response_seconds: 900,
    resolution_time: null,
    resolution_seconds: null,
    business_hours_resolution_seconds: null,
    number_of_touches: 4,
    tags: ["onboarding", "nfe"],
    account: { id: "account-001" },
    assignee: { id: "user-001", email: "juliana@camu.ai" },
    requester: { id: "contact-001", email: "user@customer.com" },
    team: { id: "team-001" },
    custom_fields: {
      category: { value: "platform-bug" },
      handler: { value: "engineer" },
      "resolution-type": { value: "investigation" },
      "self-servable": { value: "no" },
      priority: { value: "high" },
    },
    csat_responses: [],
    external_issues: [],
    attachment_urls: [],
    ...overrides,
  }
}

export function buildPylonMessage(overrides: Partial<PylonMessage> = {}): PylonMessage {
  return {
    id: "msg-001",
    author: {
      name: "Juliana",
      avatar_url: "https://example.com/avatar.jpg",
      contact: null,
      user: { id: "user-001" },
    },
    message_html: "<p>Thanks for reaching out...</p>",
    is_private: false,
    source: "slack",
    timestamp: "2025-04-10T14:45:00Z",
    thread_id: "thread-001",
    file_urls: [],
    ...overrides,
  }
}

export function buildPylonAccount(overrides: Partial<PylonAccount> = {}): PylonAccount {
  return {
    id: "account-001",
    name: "Empresa XYZ Ltda",
    domain: "empresaxyz.com.br",
    ...overrides,
  }
}
