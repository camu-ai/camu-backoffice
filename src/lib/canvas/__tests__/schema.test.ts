import { describe, it, expect } from "vitest"
import { ViewSpecSchema, type ViewSpec } from "../schema"

describe("ViewSpecSchema", () => {
  it("validates a minimal valid spec", () => {
    const spec: ViewSpec = {
      title: "Test View",
      description: "A test view",
      layout: [],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("validates a spec with KPI cards", () => {
    const spec = {
      title: "KPI View",
      description: "Shows key metrics",
      layout: [
        {
          row: [
            {
              component: "kpi-card",
              width: 3,
              props: { title: "Total Tickets", format: "number" },
              data: { value: 42 },
            },
            {
              component: "kpi-card",
              width: 3,
              props: { title: "Growth", format: "percentage", invertDelta: true },
              data: { value: 15, previousValue: 12 },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("validates a spec with bar chart", () => {
    const spec = {
      title: "Category View",
      description: "Shows categories",
      layout: [
        {
          row: [
            {
              component: "bar-chart",
              width: 6,
              props: { title: "By Category", orientation: "horizontal" },
              data: {
                items: [
                  { label: "bugs", value: 10 },
                  { label: "features", value: 5 },
                ],
              },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("validates a spec with line chart", () => {
    const spec = {
      title: "Trend",
      description: "Time series",
      layout: [
        {
          row: [
            {
              component: "line-chart",
              width: 12,
              props: { title: "Volume", referenceLine: 50, referenceLabel: "Target" },
              data: {
                series: [
                  {
                    name: "tickets",
                    points: [
                      { date: "2025-01-01", value: 10 },
                      { date: "2025-01-02", value: 15 },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("validates a spec with area chart", () => {
    const spec = {
      title: "Area",
      description: "Stacked area",
      layout: [
        {
          row: [
            {
              component: "area-chart",
              width: 12,
              props: { title: "Volume by Category", stacked: true },
              data: {
                series: [
                  {
                    name: "bugs",
                    points: [{ date: "2025-01-01", value: 5 }],
                  },
                ],
              },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("validates a spec with donut chart", () => {
    const spec = {
      title: "Donut",
      description: "Proportional",
      layout: [
        {
          row: [
            {
              component: "donut-chart",
              width: 6,
              props: { title: "Handler Split" },
              data: {
                items: [
                  { label: "sme", value: 20 },
                  { label: "engineer", value: 15 },
                ],
              },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("validates a spec with data table", () => {
    const spec = {
      title: "Table",
      description: "Detailed records",
      layout: [
        {
          row: [
            {
              component: "data-table",
              width: 12,
              props: { title: "Issues", sortBy: "created_at", sortDir: "desc" },
              data: {
                columns: [
                  { key: "title", label: "Title" },
                  { key: "priority", label: "Priority" },
                  { key: "age", label: "Age", format: "duration" },
                ],
                rows: [
                  { title: "Bug #1", priority: "urgent", age: "2h" },
                  { title: "Bug #2", priority: "high", age: "5d" },
                ],
              },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("validates a spec with stat row", () => {
    const spec = {
      title: "Stats",
      description: "Compact metrics",
      layout: [
        {
          row: [
            {
              component: "stat-row",
              width: 12,
              props: {},
              data: {
                items: [
                  { label: "Median Response", value: 4.5, format: "duration" },
                  { label: "Avg Resolution", value: 24, format: "duration" },
                ],
              },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("validates a complex multi-row layout", () => {
    const spec = {
      title: "Full Dashboard",
      description: "Complete view",
      layout: [
        {
          row: [
            { component: "kpi-card", width: 3, props: { title: "A" }, data: { value: 1 } },
            { component: "kpi-card", width: 3, props: { title: "B" }, data: { value: 2 } },
            { component: "kpi-card", width: 3, props: { title: "C" }, data: { value: 3 } },
            { component: "kpi-card", width: 3, props: { title: "D" }, data: { value: 4 } },
          ],
        },
        {
          row: [
            {
              component: "bar-chart",
              width: 6,
              props: { title: "Categories" },
              data: { items: [{ label: "a", value: 1 }] },
            },
            {
              component: "donut-chart",
              width: 6,
              props: { title: "Handlers" },
              data: { items: [{ label: "b", value: 2 }] },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("validates a spec with metric-comparison", () => {
    const spec = {
      title: "Comparison",
      description: "Week over week",
      layout: [
        {
          row: [
            {
              component: "metric-comparison",
              width: 6,
              props: { title: "Response Time Comparison" },
              data: {
                metrics: [
                  { label: "Avg Response", current: 4.2, previous: 5.1, format: "duration" },
                  { label: "SLA Compliance", current: 92, previous: 88, format: "percentage" },
                ],
              },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("validates a spec with stacked-bar-chart", () => {
    const spec = {
      title: "Stacked",
      description: "Multi-series bars",
      layout: [
        {
          row: [
            {
              component: "stacked-bar-chart",
              width: 12,
              props: { title: "Priority by Category" },
              data: {
                categories: ["bugs", "features", "how-to"],
                series: [
                  { name: "urgent", values: [5, 0, 1] },
                  { name: "high", values: [3, 2, 4] },
                  { name: "medium", values: [10, 8, 12] },
                ],
              },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(true)
  })

  it("rejects missing title", () => {
    const spec = { description: "No title", layout: [] }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(false)
  })

  it("rejects missing description", () => {
    const spec = { title: "No desc", layout: [] }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(false)
  })

  it("rejects invalid component type", () => {
    const spec = {
      title: "Bad",
      description: "Invalid component",
      layout: [
        {
          row: [
            {
              component: "sparkline",
              width: 6,
              props: {},
              data: { value: 1 },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(false)
  })

  it("rejects width outside 1-12 range", () => {
    const specTooWide = {
      title: "Bad",
      description: "Width 13",
      layout: [
        {
          row: [
            { component: "kpi-card", width: 13, props: {}, data: { value: 1 } },
          ],
        },
      ],
    }
    expect(ViewSpecSchema.safeParse(specTooWide).success).toBe(false)

    const specTooNarrow = {
      title: "Bad",
      description: "Width 0",
      layout: [
        {
          row: [
            { component: "kpi-card", width: 0, props: {}, data: { value: 1 } },
          ],
        },
      ],
    }
    expect(ViewSpecSchema.safeParse(specTooNarrow).success).toBe(false)
  })

  it("rejects KPI card with non-numeric value", () => {
    const spec = {
      title: "Bad",
      description: "String value",
      layout: [
        {
          row: [
            {
              component: "kpi-card",
              width: 3,
              props: {},
              data: { value: "forty-two" },
            },
          ],
        },
      ],
    }
    const result = ViewSpecSchema.safeParse(spec)
    expect(result.success).toBe(false)
  })
})
