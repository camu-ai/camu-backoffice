import { BigQuery } from "@google-cloud/bigquery"

const bigquery = new BigQuery({ projectId: "camu-warehouse" })

const TABLES = [
  "customer_updates",
  "dfe_documents",
  "dfe_document_relationships",
  "dfe_document_relationships_events",
  "tenants",
]

async function main() {
  for (const table of TABLES) {
    console.log(`\n${"=".repeat(60)}`)
    console.log(`TABLE: camu-warehouse.camu_br.${table}`)
    console.log("=".repeat(60))

    try {
      const [rows] = await bigquery.query({
        query: `
          SELECT column_name, data_type, is_nullable
          FROM \`camu-warehouse.camu_br.INFORMATION_SCHEMA.COLUMNS\`
          WHERE table_name = '${table}'
          ORDER BY ordinal_position
        `,
      })

      if (rows.length === 0) {
        console.log("  (table not found or no columns)")
        continue
      }

      for (const row of rows as { column_name: string; data_type: string; is_nullable: string }[]) {
        const nullable = row.is_nullable === "YES" ? " (nullable)" : ""
        console.log(`  ${row.column_name.padEnd(45)} ${row.data_type}${nullable}`)
      }

      const [countRows] = await bigquery.query({
        query: `SELECT COUNT(*) as cnt FROM \`camu-warehouse.camu_br.${table}\``,
      })
      const count = (countRows as { cnt: number }[])[0]?.cnt
      console.log(`\n  Row count: ${count?.toLocaleString() ?? "unknown"}`)
    } catch (err) {
      console.log(`  ERROR: ${(err as Error).message}`)
    }
  }
}

main().catch(console.error)
