import { Activity, RefreshCw, Cpu, Database, Network } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export function AppHeader({ onRefreshHealth }: { onRefreshHealth: () => void }) {
  const { health, runtimeHealth } = useAppStore()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-[#050505]/40 px-6 backdrop-blur-3xl transition-all">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1 text-white/50 hover:text-white transition-colors" />
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold capitalize tracking-wider text-white/90 font-mono">
            // {useAppStore((s) => s.view)} console
          </h2>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Dynamic active indicators */}
        <div className="hidden md:flex items-center gap-6 text-xs text-white/40 mr-2">
          <div className="flex items-center gap-1.5 font-mono">
            <Cpu className="h-3.5 w-3.5 text-teal-500/70" />
            <span>SANDBOX: READY</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono">
            <Database className="h-3.5 w-3.5 text-cyan-500/70" />
            <span>DB: {runtimeHealth?.database ? "CONNECTED" : "MOCKED"}</span>
          </div>
        </div>

        {/* Apple style Status Badge */}
        <div className="flex items-center gap-3 rounded-full border border-white/5 bg-white/[0.02] pl-3.5 pr-1.5 py-1 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-white/[0.04] transition-all">
          <span className={`status-led ${health === "ok" ? "status-led-green" : "status-led-amber"}`} />
          <div className="flex flex-col text-left select-none">
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/30 leading-none">NETWORK</span>
            <span className="text-xs font-semibold text-white/80 capitalize leading-tight mt-0.5">{health === "ok" ? "Connected" : "Warning"}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-1 h-6 w-6 rounded-full hover:bg-white/10 btn-apple-spring"
            onClick={onRefreshHealth}
            title="Refresh Status"
          >
            <RefreshCw className="h-3 w-3 text-white/60 hover:text-white transition-colors" />
          </Button>
        </div>
      </div>
    </header>
  )
}
