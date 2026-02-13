import { z } from "zod"

const KpiData = z.object({
  value: z.number(),
  previousValue: z.number().optional(),
})

const CategoricalData = z.object({
  items: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
    }),
  ),
})

const TimeSeriesData = z.object({
  series: z.array(
    z.object({
      name: z.string(),
      points: z.array(
        z.object({
          date: z.string(),
          value: z.number(),
        }),
      ),
    }),
  ),
})

const TableData = z.object({
  columns: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      format: z.string().optional(),
    }),
  ),
  rows: z.array(z.record(z.string(), z.unknown())),
})

const StatRowData = z.object({
  items: z.array(
    z.object({
      label: z.string(),
      value: z.number(),
      format: z.string().optional(),
    }),
  ),
})

const MetricComparisonData = z.object({
  metrics: z.array(
    z.object({
      label: z.string(),
      current: z.number(),
      previous: z.number(),
      format: z.string().optional(),
    }),
  ),
})

const StackedCategoricalData = z.object({
  categories: z.array(z.string()),
  series: z.array(
    z.object({
      name: z.string(),
      values: z.array(z.number()),
    }),
  ),
})

const ComponentType = z.enum([
  "kpi-card",
  "bar-chart",
  "line-chart",
  "area-chart",
  "donut-chart",
  "data-table",
  "stat-row",
  "metric-comparison",
  "stacked-bar-chart",
])

const PanelProps = z
  .object({
    title: z.string().optional(),
    format: z.string().optional(),
    invertDelta: z.boolean().optional(),
    orientation: z.enum(["vertical", "horizontal"]).optional(),
    stacked: z.boolean().optional(),
    referenceLine: z.number().optional(),
    referenceLabel: z.string().optional(),
    sortBy: z.string().optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),
  })
  .passthrough()

const PanelData = z.union([
  KpiData,
  CategoricalData,
  TimeSeriesData,
  TableData,
  StatRowData,
  MetricComparisonData,
  StackedCategoricalData,
])

const PanelSchema = z.object({
  component: ComponentType,
  width: z.number().min(1).max(12),
  props: PanelProps,
  data: PanelData,
})

const RowSchema = z.object({
  row: z.array(PanelSchema),
})

export const ViewSpecSchema = z.object({
  title: z.string(),
  description: z.string(),
  layout: z.array(RowSchema),
})

export type ViewSpec = z.infer<typeof ViewSpecSchema>
export type Panel = z.infer<typeof PanelSchema>
export type PanelComponentType = z.infer<typeof ComponentType>
