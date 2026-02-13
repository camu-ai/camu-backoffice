import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ChartPanelProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function ChartPanel({ title, description, children, className }: ChartPanelProps) {
  return (
    <Card className={cn("min-h-[300px] border-border/60 shadow-none", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground/70">{description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}
