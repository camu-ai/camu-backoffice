import { BigQuery } from "@google-cloud/bigquery"

const globalForBQ = globalThis as unknown as {
  bigquery: BigQuery | undefined
}

export const bigquery =
  globalForBQ.bigquery ??
  new BigQuery({
    projectId: process.env.GCP_PROJECT_ID || "camu-warehouse",
  })

if (process.env.NODE_ENV !== "production") {
  globalForBQ.bigquery = bigquery
}
