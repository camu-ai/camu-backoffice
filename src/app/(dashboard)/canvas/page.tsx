export const dynamic = "force-dynamic"

import { CanvasClient } from "./canvas-client"
import { getSavedViews } from "./actions"

export default async function CanvasPage() {
  const savedViews = await getSavedViews()

  return <CanvasClient initialSavedViews={savedViews} />
}
