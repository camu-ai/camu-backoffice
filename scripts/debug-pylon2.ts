import "dotenv/config"

async function tryRequest(label: string, url: string, options: RequestInit) {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`TEST: ${label}`)
  console.log(`${options.method ?? "GET"} ${url}`)
  console.log(`${"=".repeat(60)}`)

  try {
    const response = await fetch(url, options)
    console.log("Status:", response.status)
    console.log("Headers:", Object.fromEntries(response.headers.entries()))
    const body = await response.json()
    console.log("Response keys:", Object.keys(body))
    if (body.data) {
      console.log("data type:", typeof body.data, Array.isArray(body.data) ? `(array, length=${body.data.length})` : "")
      if (Array.isArray(body.data) && body.data.length > 0) {
        console.log("First item keys:", Object.keys(body.data[0]))
      }
    }
    if (body.pagination) {
      console.log("pagination:", JSON.stringify(body.pagination))
    }
    if (body.errors) {
      console.log("errors:", JSON.stringify(body.errors))
    }
    console.log("Full response (first 1500 chars):", JSON.stringify(body, null, 2).substring(0, 1500))
  } catch (error) {
    console.error("Error:", error)
  }
}

async function main() {
  const token = process.env.PYLON_API_TOKEN!
  const baseUrl = "https://api.usepylon.com"
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  }
  const jsonHeaders = {
    ...authHeaders,
    "Content-Type": "application/json",
  }

  const start = "2025-04-01T00:00:00Z"
  const end = "2025-04-30T23:59:59Z"

  // Test 1: GET /issues with query params (original approach)
  await tryRequest(
    "GET /issues with start_time/end_time (original)",
    `${baseUrl}/issues?start_time=${start}&end_time=${end}`,
    { headers: authHeaders },
  )

  // Test 2: GET /issues with limit param
  await tryRequest(
    "GET /issues with limit=10",
    `${baseUrl}/issues?start_time=${start}&end_time=${end}&limit=10`,
    { headers: authHeaders },
  )

  // Test 3: POST /issues/search (filter-based)
  await tryRequest(
    "POST /issues/search (empty filter, limit 5)",
    `${baseUrl}/issues/search`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ limit: 5 }),
    },
  )

  // Test 4: POST /issues/search with date filter
  await tryRequest(
    "POST /issues/search with created_at filter",
    `${baseUrl}/issues/search`,
    {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        filter: {
          operator: "and",
          subfilters: [
            { field: "created_at", operator: "gte", value: start },
            { field: "created_at", operator: "lte", value: end },
          ],
        },
        limit: 5,
      }),
    },
  )

  // Test 5: GET /issues without Content-Type, wider date range
  await tryRequest(
    "GET /issues recent (last 7 days)",
    `${baseUrl}/issues?start_time=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}&end_time=${new Date().toISOString()}&limit=5`,
    { headers: authHeaders },
  )

  // Test 6: GET /accounts (to verify token works)
  await tryRequest(
    "GET /accounts (verify token)",
    `${baseUrl}/accounts?limit=2`,
    { headers: authHeaders },
  )
}

main().catch(console.error)
