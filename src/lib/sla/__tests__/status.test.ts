import { describe, it, expect, vi, afterEach } from "vitest"
import { calculateSlaStatus, calculateTimeToSla } from "../status"

// Business hours: Mon-Fri 08:00-18:00 BRT (UTC-3)
// 08:00 BRT = 11:00 UTC, 18:00 BRT = 21:00 UTC

describe("calculateSlaStatus", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe("response SLA", () => {
    it("returns ok when elapsed is under 75% of target", () => {
      // P0 urgent: response target = 1h. 75% = 0.75h = 45min
      // Created at Wed 10:00 BRT, now Wed 10:30 BRT → 0.5h elapsed (50%)
      vi.setSystemTime(new Date("2026-02-11T13:30:00Z")) // Wed 10:30 BRT
      const result = calculateSlaStatus({
        priority: "urgent",
        metric: "response",
        createdAt: new Date("2026-02-11T13:00:00Z"), // Wed 10:00 BRT
      })
      expect(result).toBe("ok")
    })

    it("returns at_risk when elapsed is between 75% and 100% of target", () => {
      // P0 urgent: response target = 1h. 75% = 0.75h = 45min
      // Created at Wed 10:00 BRT, now Wed 10:50 BRT → 0.83h elapsed (83%)
      vi.setSystemTime(new Date("2026-02-11T13:50:00Z")) // Wed 10:50 BRT
      const result = calculateSlaStatus({
        priority: "urgent",
        metric: "response",
        createdAt: new Date("2026-02-11T13:00:00Z"), // Wed 10:00 BRT
      })
      expect(result).toBe("at_risk")
    })

    it("returns breached when elapsed equals target exactly", () => {
      // P0 urgent: response target = 1h
      // Created at Wed 10:00 BRT, now Wed 11:00 BRT → 1h elapsed (100%)
      vi.setSystemTime(new Date("2026-02-11T14:00:00Z")) // Wed 11:00 BRT
      const result = calculateSlaStatus({
        priority: "urgent",
        metric: "response",
        createdAt: new Date("2026-02-11T13:00:00Z"), // Wed 10:00 BRT
      })
      expect(result).toBe("breached")
    })

    it("returns breached when elapsed exceeds target", () => {
      // P0 urgent: response target = 1h
      // Created at Wed 10:00 BRT, now Wed 13:00 BRT → 3h elapsed (300%)
      vi.setSystemTime(new Date("2026-02-11T16:00:00Z")) // Wed 13:00 BRT
      const result = calculateSlaStatus({
        priority: "urgent",
        metric: "response",
        createdAt: new Date("2026-02-11T13:00:00Z"), // Wed 10:00 BRT
      })
      expect(result).toBe("breached")
    })
  })

  describe("resolution SLA", () => {
    it("returns ok for P1 high with 5h elapsed (target 10h, 50%)", () => {
      // Created Wed 10:00 BRT, now Wed 15:00 BRT → 5h elapsed (50%)
      vi.setSystemTime(new Date("2026-02-11T18:00:00Z")) // Wed 15:00 BRT
      const result = calculateSlaStatus({
        priority: "high",
        metric: "resolution",
        createdAt: new Date("2026-02-11T13:00:00Z"), // Wed 10:00 BRT
      })
      expect(result).toBe("ok")
    })

    it("returns at_risk for P1 high with 8h elapsed (target 10h, 80%)", () => {
      // Created Wed 10:00 BRT, now Wed 18:00 BRT = 8h elapsed (80%)
      vi.setSystemTime(new Date("2026-02-11T21:00:00Z")) // Wed 18:00 BRT
      const result = calculateSlaStatus({
        priority: "high",
        metric: "resolution",
        createdAt: new Date("2026-02-11T13:00:00Z"), // Wed 10:00 BRT
      })
      expect(result).toBe("at_risk")
    })

    it("returns breached for P1 high with 12h elapsed (target 10h, 120%)", () => {
      // Created Wed 10:00 BRT, now Thu 12:00 BRT
      // Wed: 10:00-18:00 = 8h, Thu: 08:00-12:00 = 4h → 12h (120%)
      vi.setSystemTime(new Date("2026-02-12T15:00:00Z")) // Thu 12:00 BRT
      const result = calculateSlaStatus({
        priority: "high",
        metric: "resolution",
        createdAt: new Date("2026-02-11T13:00:00Z"), // Wed 10:00 BRT
      })
      expect(result).toBe("breached")
    })
  })

  describe("multi-day with weekends", () => {
    it("skips weekends when calculating SLA for P2 medium", () => {
      // P2 medium: response target = 10h
      // Created Fri 14:00 BRT, "now" is Mon 10:00 BRT
      // Fri: 14:00-18:00 = 4h, Sat/Sun: 0h, Mon: 08:00-10:00 = 2h → 6h (60%)
      vi.setSystemTime(new Date("2026-02-16T13:00:00Z")) // Mon 10:00 BRT
      const result = calculateSlaStatus({
        priority: "medium",
        metric: "response",
        createdAt: new Date("2026-02-13T17:00:00Z"), // Fri 14:00 BRT
      })
      expect(result).toBe("ok")
    })

    it("breaches after weekend for P0 urgent resolution", () => {
      // P0 urgent: resolution target = 4h
      // Created Fri 16:00 BRT, "now" is Mon 12:00 BRT
      // Fri: 16:00-18:00 = 2h, Mon: 08:00-12:00 = 4h → 6h (150%)
      vi.setSystemTime(new Date("2026-02-16T15:00:00Z")) // Mon 12:00 BRT
      const result = calculateSlaStatus({
        priority: "urgent",
        metric: "resolution",
        createdAt: new Date("2026-02-13T19:00:00Z"), // Fri 16:00 BRT
      })
      expect(result).toBe("breached")
    })
  })

  describe("edge cases", () => {
    it("returns ok for unknown priority (Infinity target)", () => {
      vi.setSystemTime(new Date("2026-02-11T21:00:00Z"))
      const result = calculateSlaStatus({
        priority: "custom_priority",
        metric: "response",
        createdAt: new Date("2026-02-11T13:00:00Z"),
      })
      expect(result).toBe("ok")
    })

    it("returns ok when created just now (0 hours elapsed)", () => {
      const now = new Date("2026-02-11T13:00:00Z")
      vi.setSystemTime(now)
      const result = calculateSlaStatus({
        priority: "urgent",
        metric: "response",
        createdAt: now,
      })
      expect(result).toBe("ok")
    })

    it("handles P3 low with long timeline correctly", () => {
      // P3 low: response target = 30h. 75% = 22.5h
      // Created Mon 08:00 BRT. 22.5h of business time = 2 full days (20h) + 2.5h
      // Mon 8-18 = 10h, Tue 8-18 = 10h, Wed 8-10:30 = 2.5h → 22.5h (75%)
      vi.setSystemTime(new Date("2026-02-11T13:30:00Z")) // Wed 10:30 BRT
      const result = calculateSlaStatus({
        priority: "low",
        metric: "response",
        createdAt: new Date("2026-02-09T11:00:00Z"), // Mon 08:00 BRT
      })
      expect(result).toBe("at_risk")
    })
  })
})

describe("calculateTimeToSla", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns positive hours remaining when under target", () => {
    // P0 urgent response: target 1h. Elapsed 0.5h → remaining 0.5h
    vi.setSystemTime(new Date("2026-02-11T13:30:00Z")) // Wed 10:30 BRT
    const result = calculateTimeToSla({
      priority: "urgent",
      metric: "response",
      createdAt: new Date("2026-02-11T13:00:00Z"), // Wed 10:00 BRT
    })
    expect(result).toBe(0.5)
  })

  it("returns 0 when exactly at target", () => {
    // P0 urgent response: target 1h. Elapsed 1h → remaining 0h
    vi.setSystemTime(new Date("2026-02-11T14:00:00Z")) // Wed 11:00 BRT
    const result = calculateTimeToSla({
      priority: "urgent",
      metric: "response",
      createdAt: new Date("2026-02-11T13:00:00Z"), // Wed 10:00 BRT
    })
    expect(result).toBe(0)
  })

  it("returns negative hours when breached", () => {
    // P0 urgent response: target 1h. Elapsed 3h → remaining -2h
    vi.setSystemTime(new Date("2026-02-11T16:00:00Z")) // Wed 13:00 BRT
    const result = calculateTimeToSla({
      priority: "urgent",
      metric: "response",
      createdAt: new Date("2026-02-11T13:00:00Z"), // Wed 10:00 BRT
    })
    expect(result).toBe(-2)
  })

  it("returns Infinity for unknown priority", () => {
    vi.setSystemTime(new Date("2026-02-11T16:00:00Z"))
    const result = calculateTimeToSla({
      priority: "unknown",
      metric: "response",
      createdAt: new Date("2026-02-11T13:00:00Z"),
    })
    expect(result).toBe(Infinity)
  })
})
