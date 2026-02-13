import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { PylonClient, syncFromPylon, syncDb } from "@/lib/pylon"

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = process.env.PYLON_API_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: "PYLON_API_TOKEN not configured" },
      { status: 500 },
    )
  }

  try {
    const client = new PylonClient(token)
    await syncFromPylon(client, syncDb)
    revalidateTag("queries", "max")
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
