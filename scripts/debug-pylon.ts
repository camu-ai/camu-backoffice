import "dotenv/config"

async function main() {
  const token = process.env.PYLON_API_TOKEN!

  const start = new Date("2025-04-01T00:00:00Z")
  const end = new Date("2025-04-30T23:59:59Z")
  const params = new URLSearchParams({
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  })

  console.log("Fetching from Pylon API...")
  console.log(`URL: https://api.usepylon.com/issues?${params}`)

  const response = await fetch(`https://api.usepylon.com/issues?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })

  console.log("Status:", response.status)
  const body = await response.json()
  console.log("Response keys:", Object.keys(body))
  console.log("Response (first 2000 chars):", JSON.stringify(body, null, 2).substring(0, 2000))

  if (body.data && Array.isArray(body.data) && body.data.length > 0) {
    console.log("\n--- First issue keys ---")
    console.log(Object.keys(body.data[0]))
    console.log("\n--- First issue custom_fields ---")
    console.log(JSON.stringify(body.data[0].custom_fields, null, 2))
  }
}

main().catch(console.error)
