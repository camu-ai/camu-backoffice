import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("gap-2 py-4", className)}>
      <CardContent className="px-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-9 w-20" />
        <Skeleton className="mt-1 h-3 w-32" />
      </CardContent>
    </Card>
  )
}

export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ChartPanelSkeleton({
  className,
  height = "h-[250px]",
}: {
  className?: string
  height?: string
}) {
  return (
    <Card className={cn("min-h-[300px]", className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className={cn("w-full rounded-lg", height)} />
      </CardContent>
    </Card>
  )
}

export function TablePanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="min-h-[300px]">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
    </div>
  )
}
