import type {
  PylonAccount,
  PylonIssue,
  PylonMessage,
  PylonResponse,
} from "./types"

const BASE_URL = "https://api.usepylon.com"
const RETRY_DELAYS = [1000, 2000, 4000]
const RATE_LIMIT_DELAY = 500

export interface PylonClientOptions {
  retryDelays?: number[]
  rateLimitDelay?: number
}

export class PylonClient {
  private token: string
  private retryDelays: number[]
  private rateLimitDelay: number

  constructor(token: string, options: PylonClientOptions = {}) {
    this.token = token
    this.retryDelays = options.retryDelays ?? RETRY_DELAYS
    this.rateLimitDelay = options.rateLimitDelay ?? RATE_LIMIT_DELAY
  }

  async getIssues(
    startTime: Date,
    endTime: Date,
  ): Promise<{ data: PylonIssue[] }> {
    const allIssues: PylonIssue[] = []
    let cursor: string | undefined

    do {
      const params = new URLSearchParams({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      })
      if (cursor) params.set("cursor", cursor)

      const response = await this.request<PylonResponse<PylonIssue[]>>(
        `/issues?${params}`,
      )

      if (!response.data) break

      allIssues.push(...response.data)

      cursor = response.pagination?.has_next_page
        ? (response.pagination.cursor ?? undefined)
        : undefined

      if (cursor) await delay(this.rateLimitDelay)
    } while (cursor)

    return { data: allIssues }
  }

  async getMessages(issueId: string): Promise<PylonMessage[]> {
    const response = await this.request<PylonResponse<PylonMessage[]>>(
      `/issues/${issueId}/messages`,
    )
    return response.data ?? []
  }

  async getAccount(accountId: string): Promise<PylonAccount> {
    const response = await this.request<{ data: PylonAccount }>(
      `/accounts/${accountId}`,
    )
    return response.data
  }

  private async request<T>(path: string): Promise<T> {
    let lastError: Error | null = null

    const maxRetries = this.retryDelays.length
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        return response.json() as Promise<T>
      }

      const isRetryable = response.status === 429 || response.status >= 500
      lastError = new Error(`Pylon API error: ${response.status}`)

      if (!isRetryable || attempt === maxRetries) {
        throw lastError
      }

      await delay(this.retryDelays[attempt] ?? this.retryDelays[this.retryDelays.length - 1])
    }

    throw lastError
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
