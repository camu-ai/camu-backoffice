import { unstable_cache } from "next/cache"
import { bigquery } from "@/lib/bigquery"

export interface UsageKpis {
  totalDocuments: number
  integrationRate: number
  escriturado: number
  naoEscriturado: number
}

export interface DocumentVolumePoint {
  date: string
  count: number
}

export interface IntegrationTrendPoint {
  month: string
  escriturado: number
  nao_escriturado: number
}

export interface CountRow {
  label: string
  count: number
}

export interface UsageDateRange {
  from: string
  to: string
}

export interface TenantOption {
  id: string
  name: string
}

const DATASET = "camu-warehouse.camu_br"

const BASE_FILTERS = `
  AND cu.validation_status != 'canceled'
  AND cu.manifestation_status != 'operation_not_performed'
`

const ERP_INTEGRATION_CASE = `
  CASE
    WHEN cu.erp_status IN (
      'pending',
      'purchase_invoice_posted_in_erp',
      'purchase_invoice_draft_in_erp',
      'purchase_delivery_posted_in_erp',
      'purchase_delivery_draft_in_erp',
      'purchase_invoice_partially_posted_in_erp',
      'purchase_return_invoice_posted_in_erp',
      'awaiting_purchase_invoice_posting_in_erp',
      'purchase_invoice_posted_in_erp_with_errors'
    ) THEN 'Escriturado'
    WHEN cu.erp_status IN (
      'purchase_order_found',
      'purchase_order_not_found',
      'no_purchase_order_required'
    ) THEN 'Não Escriturado'
    ELSE 'Outro'
  END
`

function serializeArgs(...args: unknown[]): string[] {
  return args.map((a) => JSON.stringify(a) ?? "undefined")
}

async function bqQuery<T>(sql: string): Promise<T[]> {
  const response = await bigquery.query({ query: sql })
  return response[0] as T[]
}

export async function getTenants(): Promise<TenantOption[]> {
  return unstable_cache(
    async () => {
      const rows = await bqQuery<{ id: string; name: string }>(
        `SELECT id, name FROM \`${DATASET}.tenants\` ORDER BY name`,
      )
      return rows
    },
    ["getTenants"],
    { revalidate: 3600, tags: ["usage"] },
  )()
}

export async function getUsageKpis(
  tenantId: string,
  dateRange: UsageDateRange,
): Promise<UsageKpis> {
  return unstable_cache(
    async () => {
      const rows = await bqQuery<{
        total_documents: number
        escriturado: number
        nao_escriturado: number
        integration_rate: number
      }>(`
        SELECT
          COUNT(DISTINCT cu.chave_de_acesso) AS total_documents,
          COUNT(DISTINCT CASE WHEN ${ERP_INTEGRATION_CASE} = 'Escriturado' THEN cu.chave_de_acesso END) AS escriturado,
          COUNT(DISTINCT CASE WHEN ${ERP_INTEGRATION_CASE} = 'Não Escriturado' THEN cu.chave_de_acesso END) AS nao_escriturado,
          ROUND(
            SAFE_DIVIDE(
              COUNT(DISTINCT CASE WHEN ${ERP_INTEGRATION_CASE} = 'Escriturado' THEN cu.chave_de_acesso END),
              COUNT(DISTINCT cu.chave_de_acesso)
            ) * 100, 1
          ) AS integration_rate
        FROM \`${DATASET}.customer_updates\` cu
        WHERE cu.tenant_id = '${tenantId}'
          AND DATE(cu.data_emissao) >= '${dateRange.from}'
          AND DATE(cu.data_emissao) <= '${dateRange.to}'
          ${BASE_FILTERS}
      `)

      const row = rows[0]
      return {
        totalDocuments: row?.total_documents ?? 0,
        integrationRate: row?.integration_rate ?? 0,
        escriturado: row?.escriturado ?? 0,
        naoEscriturado: row?.nao_escriturado ?? 0,
      }
    },
    ["getUsageKpis", ...serializeArgs(tenantId, dateRange)],
    { revalidate: 3600, tags: ["usage"] },
  )()
}

export async function getDocumentVolumes(
  tenantId: string,
  dateRange: UsageDateRange,
): Promise<DocumentVolumePoint[]> {
  return unstable_cache(
    async () => {
      const rows = await bqQuery<{ date: { value: string }; count: number }>(`
        SELECT
          DATE(cu.data_emissao) AS date,
          COUNT(DISTINCT cu.chave_de_acesso) AS count
        FROM \`${DATASET}.customer_updates\` cu
        WHERE cu.tenant_id = '${tenantId}'
          AND DATE(cu.data_emissao) >= '${dateRange.from}'
          AND DATE(cu.data_emissao) <= '${dateRange.to}'
          ${BASE_FILTERS}
        GROUP BY date
        ORDER BY date
      `)

      return rows.map((r) => ({
        date: typeof r.date === "object" ? r.date.value : String(r.date),
        count: r.count,
      }))
    },
    ["getDocumentVolumes", ...serializeArgs(tenantId, dateRange)],
    { revalidate: 3600, tags: ["usage"] },
  )()
}

export async function getIntegrationTrend(
  tenantId: string,
  dateRange: UsageDateRange,
): Promise<IntegrationTrendPoint[]> {
  return unstable_cache(
    async () => {
      const rows = await bqQuery<{
        month: { value: string }
        escriturado: number
        nao_escriturado: number
      }>(`
        SELECT
          DATE_TRUNC(DATE(cu.data_emissao), MONTH) AS month,
          COUNT(DISTINCT CASE WHEN ${ERP_INTEGRATION_CASE} = 'Escriturado' THEN cu.chave_de_acesso END) AS escriturado,
          COUNT(DISTINCT CASE WHEN ${ERP_INTEGRATION_CASE} = 'Não Escriturado' THEN cu.chave_de_acesso END) AS nao_escriturado
        FROM \`${DATASET}.customer_updates\` cu
        WHERE cu.tenant_id = '${tenantId}'
          AND DATE(cu.data_emissao) >= '${dateRange.from}'
          AND DATE(cu.data_emissao) <= '${dateRange.to}'
          ${BASE_FILTERS}
        GROUP BY month
        ORDER BY month
      `)

      return rows.map((r) => ({
        month: typeof r.month === "object" ? r.month.value.slice(0, 7) : String(r.month).slice(0, 7),
        escriturado: r.escriturado,
        nao_escriturado: r.nao_escriturado,
      }))
    },
    ["getIntegrationTrend", ...serializeArgs(tenantId, dateRange)],
    { revalidate: 3600, tags: ["usage"] },
  )()
}

export async function getDocumentsByType(
  tenantId: string,
  dateRange: UsageDateRange,
): Promise<CountRow[]> {
  return unstable_cache(
    async () => {
      const rows = await bqQuery<{ label: string; count: number }>(`
        SELECT
          cu.document_type AS label,
          COUNT(DISTINCT cu.chave_de_acesso) AS count
        FROM \`${DATASET}.customer_updates\` cu
        WHERE cu.tenant_id = '${tenantId}'
          AND DATE(cu.data_emissao) >= '${dateRange.from}'
          AND DATE(cu.data_emissao) <= '${dateRange.to}'
          ${BASE_FILTERS}
        GROUP BY label
        ORDER BY count DESC
      `)
      return rows
    },
    ["getDocumentsByType", ...serializeArgs(tenantId, dateRange)],
    { revalidate: 3600, tags: ["usage"] },
  )()
}

export async function getDocumentsByValidationStatus(
  tenantId: string,
  dateRange: UsageDateRange,
): Promise<CountRow[]> {
  return unstable_cache(
    async () => {
      const rows = await bqQuery<{ label: string; count: number }>(`
        SELECT
          cu.validation_status AS label,
          COUNT(DISTINCT cu.chave_de_acesso) AS count
        FROM \`${DATASET}.customer_updates\` cu
        WHERE cu.tenant_id = '${tenantId}'
          AND DATE(cu.data_emissao) >= '${dateRange.from}'
          AND DATE(cu.data_emissao) <= '${dateRange.to}'
          ${BASE_FILTERS}
        GROUP BY label
        ORDER BY count DESC
      `)
      return rows
    },
    ["getDocumentsByValidationStatus", ...serializeArgs(tenantId, dateRange)],
    { revalidate: 3600, tags: ["usage"] },
  )()
}

export async function getDocumentsByErpStatus(
  tenantId: string,
  dateRange: UsageDateRange,
): Promise<CountRow[]> {
  return unstable_cache(
    async () => {
      const rows = await bqQuery<{ label: string; count: number }>(`
        SELECT
          cu.erp_status AS label,
          COUNT(DISTINCT cu.chave_de_acesso) AS count
        FROM \`${DATASET}.customer_updates\` cu
        WHERE cu.tenant_id = '${tenantId}'
          AND DATE(cu.data_emissao) >= '${dateRange.from}'
          AND DATE(cu.data_emissao) <= '${dateRange.to}'
          ${BASE_FILTERS}
        GROUP BY label
        ORDER BY count DESC
      `)
      return rows
    },
    ["getDocumentsByErpStatus", ...serializeArgs(tenantId, dateRange)],
    { revalidate: 3600, tags: ["usage"] },
  )()
}

export async function getDocumentsByManifestationStatus(
  tenantId: string,
  dateRange: UsageDateRange,
): Promise<CountRow[]> {
  return unstable_cache(
    async () => {
      const rows = await bqQuery<{ label: string | null; count: number }>(`
        SELECT
          cu.manifestation_status AS label,
          COUNT(DISTINCT cu.chave_de_acesso) AS count
        FROM \`${DATASET}.customer_updates\` cu
        WHERE cu.tenant_id = '${tenantId}'
          AND DATE(cu.data_emissao) >= '${dateRange.from}'
          AND DATE(cu.data_emissao) <= '${dateRange.to}'
          AND cu.validation_status != 'canceled'
        GROUP BY label
        ORDER BY count DESC
      `)
      return rows.map((r) => ({
        label: r.label ?? "unset",
        count: r.count,
      }))
    },
    ["getDocumentsByManifestationStatus", ...serializeArgs(tenantId, dateRange)],
    { revalidate: 3600, tags: ["usage"] },
  )()
}
