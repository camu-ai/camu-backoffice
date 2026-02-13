"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SyncButton() {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch("/api/sync", { method: "POST" })
      if (res.ok) {
        setLastSync(new Date().toLocaleTimeString())
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {lastSync && (
        <span className="text-xs text-muted-foreground">
          Last sync: {lastSync}
        </span>
      )}
      <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
        <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
        {syncing ? "Syncing…" : "Sync"}
      </Button>
    </div>
  )
}
