import { calculateBusinessHours } from "./business-hours"
import { getSlaTarget, AT_RISK_THRESHOLD } from "./targets"
import type { SlaMetric, SlaStatus } from "./targets"

interface SlaInput {
  priority: string
  metric: SlaMetric
  createdAt: Date
}

export function calculateSlaStatus(input: SlaInput): SlaStatus {
  const targetHours = getSlaTarget(input.priority, input.metric)
  if (targetHours === Infinity) return "ok"

  const elapsedHours = calculateBusinessHours(input.createdAt, new Date())
  if (elapsedHours >= targetHours) return "breached"
  if (elapsedHours >= targetHours * AT_RISK_THRESHOLD) return "at_risk"
  return "ok"
}

export function calculateTimeToSla(input: SlaInput): number {
  const targetHours = getSlaTarget(input.priority, input.metric)
  if (targetHours === Infinity) return Infinity

  const elapsedHours = calculateBusinessHours(input.createdAt, new Date())
  return Math.round((targetHours - elapsedHours) * 100) / 100
}
