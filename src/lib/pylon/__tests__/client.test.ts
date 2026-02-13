import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { PylonClient } from "../client"
import { buildPylonIssue, buildPylonMessage } from "@/test/factories/pylon"
import type { PylonResponse, PylonIssue, PylonMessage } from "../types"

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch)
  mockFetch.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function jsonResponse<T>(data: T, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  )
}

describe("PylonClient", () => {
  const client = new PylonClient("test-api-token", {
    retryDelays: [0, 0, 0],
    rateLimitDelay: 0,
  })

  describe("getIssues", () => {
    it("calls GET /issues with start_time and end_time", async () => {
      const response: PylonResponse<PylonIssue[]> = {
        request_id: "req-1",
        data: [buildPylonIssue()],
        pagination: { cursor: null, has_next_page: false },
      }
      mockFetch.mockReturnValueOnce(jsonResponse(response))

      const start = new Date("2025-04-01T00:00:00Z")
      const end = new Date("2025-04-30T23:59:59Z")
      const result = await client.getIssues(start, end)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toContain("/issues")
      expect(url).toContain("start_time=")
      expect(url).toContain("end_time=")
      expect(options.headers["Authorization"]).toBe("Bearer test-api-token")
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe("issue-001")
    })

    it("handles empty response (no data field)", async () => {
      const response = { request_id: "req-1" }
      mockFetch.mockReturnValueOnce(jsonResponse(response))

      const start = new Date("2025-04-01T00:00:00Z")
      const end = new Date("2025-04-30T23:59:59Z")
      const result = await client.getIssues(start, end)

      expect(result.data).toHaveLength(0)
    })

    it("paginates through multiple pages", async () => {
      const page1: PylonResponse<PylonIssue[]> = {
        request_id: "req-1",
        data: [buildPylonIssue({ id: "issue-001" })],
        pagination: { cursor: "cursor-page-2", has_next_page: true },
      }
      const page2: PylonResponse<PylonIssue[]> = {
        request_id: "req-2",
        data: [buildPylonIssue({ id: "issue-002" })],
        pagination: { cursor: null, has_next_page: false },
      }
      mockFetch.mockReturnValueOnce(jsonResponse(page1))
      mockFetch.mockReturnValueOnce(jsonResponse(page2))

      const start = new Date("2025-04-01T00:00:00Z")
      const end = new Date("2025-04-30T23:59:59Z")
      const result = await client.getIssues(start, end)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].id).toBe("issue-001")
      expect(result.data[1].id).toBe("issue-002")

      const secondUrl = mockFetch.mock.calls[1][0] as string
      expect(secondUrl).toContain("cursor=cursor-page-2")
    })
  })

  describe("getMessages", () => {
    it("calls GET /issues/{id}/messages", async () => {
      const response: PylonResponse<PylonMessage[]> = {
        request_id: "req-1",
        data: [buildPylonMessage()],
        pagination: { cursor: null, has_next_page: false },
      }
      mockFetch.mockReturnValueOnce(jsonResponse(response))

      const result = await client.getMessages("issue-001")

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain("/issues/issue-001/messages")
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("msg-001")
    })
  })

  describe("getAccount", () => {
    it("calls GET /accounts/{id}", async () => {
      const response = {
        request_id: "req-1",
        data: { id: "account-001", name: "Empresa XYZ", domain: "xyz.com" },
      }
      mockFetch.mockReturnValueOnce(jsonResponse(response))

      const result = await client.getAccount("account-001")

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain("/accounts/account-001")
      expect(result.id).toBe("account-001")
      expect(result.name).toBe("Empresa XYZ")
    })
  })

  describe("error handling", () => {
    it("throws on 401 Unauthorized", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ error: "Unauthorized" }, 401),
      )

      await expect(
        client.getIssues(new Date(), new Date()),
      ).rejects.toThrow("Pylon API error: 401")
    })

    it("throws on 400 Bad Request", async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse({ error: "Bad Request" }, 400),
      )

      await expect(
        client.getIssues(new Date(), new Date()),
      ).rejects.toThrow("Pylon API error: 400")
    })

    it("retries on 429 Too Many Requests then succeeds", async () => {
      const successResponse: PylonResponse<PylonIssue[]> = {
        request_id: "req-1",
        data: [],
        pagination: { cursor: null, has_next_page: false },
      }
      mockFetch.mockReturnValueOnce(
        jsonResponse({ error: "Too Many Requests" }, 429),
      )
      mockFetch.mockReturnValueOnce(jsonResponse(successResponse))

      const result = await client.getIssues(new Date(), new Date())

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.data).toHaveLength(0)
    })

    it("retries on 500 Server Error then succeeds", async () => {
      const successResponse: PylonResponse<PylonIssue[]> = {
        request_id: "req-1",
        data: [buildPylonIssue()],
        pagination: { cursor: null, has_next_page: false },
      }
      mockFetch.mockReturnValueOnce(
        jsonResponse({ error: "Server Error" }, 500),
      )
      mockFetch.mockReturnValueOnce(jsonResponse(successResponse))

      const result = await client.getIssues(new Date(), new Date())

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.data).toHaveLength(1)
    })

    it("throws after max retries on persistent 429", async () => {
      mockFetch.mockReturnValue(
        jsonResponse({ error: "Too Many Requests" }, 429),
      )

      await expect(
        client.getIssues(new Date(), new Date()),
      ).rejects.toThrow()
    })
  })
})
