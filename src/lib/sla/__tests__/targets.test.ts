import { describe, it, expect } from "vitest"
import { getSlaTarget, SLA_TARGETS } from "../targets"

describe("getSlaTarget", () => {
  it("returns correct targets for urgent (P0)", () => {
    expect(getSlaTarget("urgent", "response")).toBe(1)
    expect(getSlaTarget("urgent", "resolution")).toBe(4)
  })

  it("returns correct targets for high (P1)", () => {
    expect(getSlaTarget("high", "response")).toBe(4)
    expect(getSlaTarget("high", "resolution")).toBe(10)
  })

  it("returns correct targets for medium (P2)", () => {
    expect(getSlaTarget("medium", "response")).toBe(10)
    expect(getSlaTarget("medium", "resolution")).toBe(30)
  })

  it("returns correct targets for low (P3)", () => {
    expect(getSlaTarget("low", "response")).toBe(30)
    expect(getSlaTarget("low", "resolution")).toBe(50)
  })

  it("returns Infinity for unknown priority", () => {
    expect(getSlaTarget("critical", "response")).toBe(Infinity)
    expect(getSlaTarget("", "resolution")).toBe(Infinity)
  })
})

describe("SLA_TARGETS", () => {
  it("has all four priority levels", () => {
    expect(Object.keys(SLA_TARGETS)).toEqual(["urgent", "high", "medium", "low"])
  })

  it("targets increase with lower priority", () => {
    const priorities = ["urgent", "high", "medium", "low"] as const
    for (let i = 0; i < priorities.length - 1; i++) {
      expect(SLA_TARGETS[priorities[i]].response).toBeLessThan(
        SLA_TARGETS[priorities[i + 1]].response,
      )
      expect(SLA_TARGETS[priorities[i]].resolution).toBeLessThan(
        SLA_TARGETS[priorities[i + 1]].resolution,
      )
    }
  })
})
