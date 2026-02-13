export type Priority = "urgent" | "high" | "medium" | "low"
export type SlaMetric = "response" | "resolution"
export type SlaStatus = "ok" | "at_risk" | "breached"

export interface SlaTarget {
  response: number
  resolution: number
}

export const SLA_TARGETS: Record<Priority, SlaTarget> = {
  urgent: { response: 1, resolution: 4 },
  high: { response: 4, resolution: 10 },
  medium: { response: 10, resolution: 30 },
  low: { response: 30, resolution: 50 },
}

export const AT_RISK_THRESHOLD = 0.75

export function getSlaTarget(priority: string, metric: SlaMetric): number {
  const target = SLA_TARGETS[priority as Priority]
  if (!target) return Infinity
  return target[metric]
}
