import { Activity, RefreshCw } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function AppHeader({ onRefreshHealth }: { onRefreshHealth: () => void }) {
  const { health } = useAppStore()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-black/20 px-4 backdrop-blur-2xl transition-all">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1 text-white/70 hover:text-white" />
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium capitalize tracking-wide text-white/90">
            {useAppStore((s) => s.view)} Console
          </h2>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 shadow-sm transition-colors hover:bg-muted/50">
          <Activity 
            className={`h-4 w-4 ${health === "ok" ? "text-emerald-500" : "text-amber-500 animate-pulse"}`} 
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 leading-none">Status</span>
            <span className="text-xs font-semibold text-foreground capitalize leading-tight">{health}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-1 h-6 w-6 rounded-full hover:bg-background"
            onClick={onRefreshHealth}
            title="Refresh Status"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </header>
  )
}
