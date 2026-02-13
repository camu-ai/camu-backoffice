import { describe, it, expect, beforeEach, vi } from "vitest"
import { mapIssue, mapMessage, mapAccount, mapAssignee } from "../mapper"
import {
  buildPylonIssue,
  buildPylonMessage,
  buildPylonAccount,
} from "@/test/factories/pylon"

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2025-04-11T12:00:00Z"))
})

describe("mapIssue", () => {
  it("maps all top-level fields", () => {
    const pylonIssue = buildPylonIssue()
    const result = mapIssue(pylonIssue)

    expect(result.id).toBe("issue-001")
    expect(result.title).toBe("Cannot export XML for NFe 12345")
    expect(result.state).toBe("waiting_on_you")
    expect(result.source).toBe("slack")
    expect(result.type).toBe("Conversation")
    expect(result.link).toBe("https://app.usepylon.com/issues/issue-001")
    expect(result.bodyHtml).toBe("<p>When I try to export...</p>")
    expect(result.tags).toEqual(["onboarding", "nfe"])
    expect(result.numberOfTouches).toBe(4)
  })

  it("extracts nested account and assignee IDs", () => {
    const pylonIssue = buildPylonIssue()
    const result = mapIssue(pylonIssue)

    expect(result.accountId).toBe("account-001")
    expect(result.assigneeId).toBe("user-001")
  })

  it("parses timestamps into Date objects", () => {
    const pylonIssue = buildPylonIssue()
    const result = mapIssue(pylonIssue)

    expect(result.createdAt).toEqual(new Date("2025-04-10T14:30:00Z"))
    expect(result.firstResponseAt).toEqual(new Date("2025-04-10T14:45:00Z"))
    expect(result.closedAt).toBeNull()
    expect(result.resolutionTime).toBeNull()
  })

  it("maps closedAt from resolution_time when present", () => {
    const pylonIssue = buildPylonIssue({
      resolution_time: "2025-04-11T10:00:00Z",
    })
    const result = mapIssue(pylonIssue)

    expect(result.closedAt).toEqual(new Date("2025-04-11T10:00:00Z"))
    expect(result.resolutionTime).toEqual(new Date("2025-04-11T10:00:00Z"))
  })

  it("extracts custom fields by slug", () => {
    const pylonIssue = buildPylonIssue()
    const result = mapIssue(pylonIssue)

    expect(result.priority).toBe("high")
    expect(result.category).toBe("platform-bug")
    expect(result.handler).toBe("engineer")
    expect(result.resolutionType).toBe("investigation")
    expect(result.selfServable).toBe("no")
  })

  it("handles null custom_fields gracefully", () => {
    const pylonIssue = buildPylonIssue({ custom_fields: null })
    const result = mapIssue(pylonIssue)

    expect(result.priority).toBeNull()
    expect(result.category).toBeNull()
    expect(result.handler).toBeNull()
    expect(result.resolutionType).toBeNull()
    expect(result.selfServable).toBeNull()
  })

  it("handles missing custom field slugs", () => {
    const pylonIssue = buildPylonIssue({
      custom_fields: { category: { value: "how-to-question" } },
    })
    const result = mapIssue(pylonIssue)

    expect(result.category).toBe("how-to-question")
    expect(result.priority).toBeNull()
    expect(result.handler).toBeNull()
  })

  it("handles null account and assignee", () => {
    const pylonIssue = buildPylonIssue({ account: null, assignee: null })
    const result = mapIssue(pylonIssue)

    expect(result.accountId).toBeNull()
    expect(result.assigneeId).toBeNull()
  })

  it("handles null tags by defaulting to empty array", () => {
    const pylonIssue = buildPylonIssue({ tags: null })
    const result = mapIssue(pylonIssue)

    expect(result.tags).toEqual([])
  })

  it("maps Pylon SLA fields", () => {
    const pylonIssue = buildPylonIssue()
    const result = mapIssue(pylonIssue)

    expect(result.firstResponseSeconds).toBe(900)
    expect(result.businessHoursFirstResponseSec).toBe(900)
  })

  it("sets syncedAt to current time", () => {
    const result = mapIssue(buildPylonIssue())

    expect(result.syncedAt).toEqual(new Date("2025-04-11T12:00:00Z"))
  })
})

describe("mapMessage", () => {
  it("maps message fields with team sender", () => {
    const pylonMsg = buildPylonMessage()
    const result = mapMessage(pylonMsg, "issue-001")

    expect(result.id).toBe("msg-001")
    expect(result.issueId).toBe("issue-001")
    expect(result.senderType).toBe("team")
    expect(result.senderName).toBe("Juliana")
    expect(result.bodyHtml).toBe("<p>Thanks for reaching out...</p>")
    expect(result.createdAt).toEqual(new Date("2025-04-10T14:45:00Z"))
  })

  it("detects customer sender from contact field", () => {
    const pylonMsg = buildPylonMessage({
      author: {
        name: "Customer User",
        avatar_url: null,
        contact: { id: "contact-001" },
        user: null,
      },
    })
    const result = mapMessage(pylonMsg, "issue-001")

    expect(result.senderType).toBe("customer")
    expect(result.senderName).toBe("Customer User")
  })

  it("detects system sender when no contact or user", () => {
    const pylonMsg = buildPylonMessage({
      author: {
        name: "System",
        avatar_url: null,
        contact: null,
        user: null,
      },
    })
    const result = mapMessage(pylonMsg, "issue-001")

    expect(result.senderType).toBe("system")
  })

  it("strips HTML to produce bodyText", () => {
    const pylonMsg = buildPylonMessage({
      message_html: "<p>Hello <strong>world</strong></p>",
    })
    const result = mapMessage(pylonMsg, "issue-001")

    expect(result.bodyText).toBe("Hello world")
  })

  it("handles null message_html", () => {
    const pylonMsg = buildPylonMessage({ message_html: null })
    const result = mapMessage(pylonMsg, "issue-001")

    expect(result.bodyHtml).toBeNull()
    expect(result.bodyText).toBeNull()
  })

  it("sets syncedAt to current time", () => {
    const result = mapMessage(buildPylonMessage(), "issue-001")

    expect(result.syncedAt).toEqual(new Date("2025-04-11T12:00:00Z"))
  })
})

describe("mapAccount", () => {
  it("maps account fields", () => {
    const pylonAccount = buildPylonAccount()
    const result = mapAccount(pylonAccount)

    expect(result.id).toBe("account-001")
    expect(result.name).toBe("Empresa XYZ Ltda")
    expect(result.domain).toBe("empresaxyz.com.br")
  })

  it("handles null domain", () => {
    const pylonAccount = buildPylonAccount({ domain: null })
    const result = mapAccount(pylonAccount)

    expect(result.domain).toBeNull()
  })

  it("sets syncedAt to current time", () => {
    const result = mapAccount(buildPylonAccount())

    expect(result.syncedAt).toEqual(new Date("2025-04-11T12:00:00Z"))
  })
})

describe("mapAssignee", () => {
  it("extracts user from issue assignee", () => {
    const pylonIssue = buildPylonIssue()
    const result = mapAssignee(pylonIssue)

    expect(result).not.toBeNull()
    expect(result!.id).toBe("user-001")
    expect(result!.email).toBe("juliana@camu.ai")
    expect(result!.name).toBe("juliana")
  })

  it("returns null when assignee is null", () => {
    const pylonIssue = buildPylonIssue({ assignee: null })
    const result = mapAssignee(pylonIssue)

    expect(result).toBeNull()
  })

  it("derives name from email prefix", () => {
    const pylonIssue = buildPylonIssue({
      assignee: { id: "user-002", email: "pedro@camu.ai" },
    })
    const result = mapAssignee(pylonIssue)

    expect(result!.name).toBe("pedro")
  })

  it("uses 'Unknown' when email is missing", () => {
    const pylonIssue = buildPylonIssue({
      assignee: { id: "user-003", email: undefined as unknown as string },
    })
    const result = mapAssignee(pylonIssue)

    expect(result!.name).toBe("Unknown")
    expect(result!.email).toBeNull()
  })
})
