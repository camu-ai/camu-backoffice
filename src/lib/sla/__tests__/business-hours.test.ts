import { describe, it, expect } from "vitest"
import { calculateBusinessHours } from "../business-hours"

// Business hours: Mon-Fri 08:00-18:00 BRT (UTC-3)
// All dates in these tests are in UTC. BRT = UTC-3.
// So 08:00 BRT = 11:00 UTC, 18:00 BRT = 21:00 UTC.

describe("calculateBusinessHours", () => {
  describe("same business day", () => {
    it("calculates hours within a single business day", () => {
      // Wednesday 10:00 BRT → Wednesday 14:00 BRT = 4 hours
      const start = new Date("2026-02-11T13:00:00Z") // 10:00 BRT
      const end = new Date("2026-02-11T17:00:00Z") // 14:00 BRT
      expect(calculateBusinessHours(start, end)).toBe(4)
    })

    it("returns 0 when start equals end", () => {
      const d = new Date("2026-02-11T14:00:00Z")
      expect(calculateBusinessHours(d, d)).toBe(0)
    })

    it("handles fractional hours", () => {
      // Wednesday 10:00 BRT → Wednesday 10:30 BRT = 0.5 hours
      const start = new Date("2026-02-11T13:00:00Z")
      const end = new Date("2026-02-11T13:30:00Z")
      expect(calculateBusinessHours(start, end)).toBe(0.5)
    })
  })

  describe("outside business hours", () => {
    it("returns 0 for entirely outside business hours (evening)", () => {
      // Wednesday 19:00 BRT → Wednesday 22:00 BRT = 0 hours
      const start = new Date("2026-02-11T22:00:00Z") // 19:00 BRT
      const end = new Date("2026-02-12T01:00:00Z") // 22:00 BRT
      expect(calculateBusinessHours(start, end)).toBe(0)
    })

    it("returns 0 for entirely on a weekend (Saturday)", () => {
      // Saturday 10:00 BRT → Saturday 14:00 BRT = 0 hours
      const start = new Date("2026-02-14T13:00:00Z")
      const end = new Date("2026-02-14T17:00:00Z")
      expect(calculateBusinessHours(start, end)).toBe(0)
    })

    it("returns 0 for entirely on a Sunday", () => {
      const start = new Date("2026-02-15T13:00:00Z")
      const end = new Date("2026-02-15T17:00:00Z")
      expect(calculateBusinessHours(start, end)).toBe(0)
    })
  })

  describe("overnight span", () => {
    it("counts only business hours when spanning overnight", () => {
      // Wednesday 16:00 BRT → Thursday 10:00 BRT
      // Wed: 16:00-18:00 = 2h, Thu: 08:00-10:00 = 2h → total 4h
      const start = new Date("2026-02-11T19:00:00Z") // 16:00 BRT
      const end = new Date("2026-02-12T13:00:00Z") // 10:00 BRT
      expect(calculateBusinessHours(start, end)).toBe(4)
    })
  })

  describe("weekend skip", () => {
    it("skips weekend days entirely", () => {
      // Friday 16:00 BRT → Monday 10:00 BRT
      // Fri: 16:00-18:00 = 2h, Sat/Sun: 0h, Mon: 08:00-10:00 = 2h → total 4h
      const start = new Date("2026-02-13T19:00:00Z") // Friday 16:00 BRT
      const end = new Date("2026-02-16T13:00:00Z") // Monday 10:00 BRT
      expect(calculateBusinessHours(start, end)).toBe(4)
    })
  })

  describe("multi-day spans", () => {
    it("calculates across multiple full business days", () => {
      // Monday 08:00 BRT → Wednesday 18:00 BRT = 3 full days = 30 hours
      const start = new Date("2026-02-09T11:00:00Z") // Monday 08:00 BRT
      const end = new Date("2026-02-11T21:00:00Z") // Wednesday 18:00 BRT
      expect(calculateBusinessHours(start, end)).toBe(30)
    })

    it("calculates a full business week (Mon-Fri)", () => {
      // Monday 08:00 BRT → Friday 18:00 BRT = 5 × 10h = 50 hours
      const start = new Date("2026-02-09T11:00:00Z") // Monday 08:00 BRT
      const end = new Date("2026-02-13T21:00:00Z") // Friday 18:00 BRT
      expect(calculateBusinessHours(start, end)).toBe(50)
    })
  })

  describe("boundary conditions", () => {
    it("clips start time before business hours to 08:00", () => {
      // Wednesday 06:00 BRT → Wednesday 10:00 BRT
      // Effective: 08:00-10:00 = 2h
      const start = new Date("2026-02-11T09:00:00Z") // 06:00 BRT
      const end = new Date("2026-02-11T13:00:00Z") // 10:00 BRT
      expect(calculateBusinessHours(start, end)).toBe(2)
    })

    it("clips end time after business hours to 18:00", () => {
      // Wednesday 16:00 BRT → Wednesday 20:00 BRT
      // Effective: 16:00-18:00 = 2h
      const start = new Date("2026-02-11T19:00:00Z") // 16:00 BRT
      const end = new Date("2026-02-11T23:00:00Z") // 20:00 BRT
      expect(calculateBusinessHours(start, end)).toBe(2)
    })

    it("start on Saturday evening → Monday morning = just Monday hours", () => {
      // Saturday 20:00 BRT → Monday 12:00 BRT
      // Effective: Mon 08:00-12:00 = 4h
      const start = new Date("2026-02-14T23:00:00Z") // Sat 20:00 BRT
      const end = new Date("2026-02-16T15:00:00Z") // Mon 12:00 BRT
      expect(calculateBusinessHours(start, end)).toBe(4)
    })
  })
})
