import "dotenv/config"
import { PylonClient } from "../src/lib/pylon/client"
import { syncFromPylon } from "../src/lib/pylon/sync"
import { syncDb } from "../src/lib/pylon/sync-db"

async function main() {
  const token = process.env.PYLON_API_TOKEN
  if (!token) {
    console.error("PYLON_API_TOKEN not set")
    process.exit(1)
  }

  console.log("Starting sync...")
  console.log("Token prefix:", token.substring(0, 15) + "...")

  const client = new PylonClient(token)

  try {
    await syncFromPylon(client, syncDb)
    console.log("Sync completed successfully!")
  } catch (error) {
    console.error("Sync failed:", error)
    process.exit(1)
  }
}

main()
