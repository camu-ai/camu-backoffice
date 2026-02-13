"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
}

export class PanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error("[PanelErrorBoundary]", this.props.fallbackTitle ?? "panel", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="min-h-[200px] flex items-center justify-center">
          <CardContent className="flex flex-col items-center gap-2 text-muted-foreground">
            <AlertTriangle className="size-6" />
            <p className="text-sm">
              {this.props.fallbackTitle
                ? `Failed to load ${this.props.fallbackTitle}`
                : "Something went wrong"}
            </p>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
