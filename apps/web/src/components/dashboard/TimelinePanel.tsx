import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { RuntimeTimelineItem } from "@/lib/pactara-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { History, RefreshCw } from "lucide-react"

export function TimelinePanel() {
  const { timelineItems: timeline, setTimelineItems: setTimeline } = useAppStore()
  const { runAction } = useAction()

  async function refreshTimeline() {
    const loaded = await runAction(
      () => pactaraFetch<RuntimeTimelineItem[]>("/v1/timeline?limit=50"),
      "Timeline refreshed."
    )
    if (loaded) setTimeline(loaded)
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Protocol <span className="accent-text-cyan-teal">Timeline</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Linear sequence of assertions, transactions, state mutations, and coordination messages.
          </p>
        </div>
        <Button 
          onClick={() => void refreshTimeline()} 
          variant="secondary" 
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4 text-cyan-400" /> Sync Timeline Feed
        </Button>
      </div>

      <Card className="glass-panel-glow overflow-hidden">
        <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <History className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white tracking-wide">Dynamic Event Feed</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {timeline.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center min-h-[300px] gap-3 border border-white/5 border-dashed rounded-2xl bg-black/20 m-6">
              <History className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
              <p className="text-xs text-white/30 max-w-[220px] leading-relaxed mb-3">No timeline events compiled in current session ledger.</p>
              <Button 
                onClick={() => void refreshTimeline()} 
                className="bg-cyan-500 hover:bg-cyan-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(6,182,212,0.25)] rounded-lg btn-apple-spring h-10 px-6 pt-0.5"
              >
                <History className="mr-2 h-4 w-4 stroke-[2.5]" /> Pull Timeline Ledger
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-px bg-white/10" />
              <div className="divide-y divide-white/5 max-h-[580px] overflow-auto">
                {timeline.map((event) => (
                  <div key={event.id} className="p-5 pl-14 relative hover:bg-white/[0.01] transition-all duration-300 relative group">
                    <div className="absolute left-6.5 top-6.5 h-3.5 w-3.5 rounded-full bg-sky-500/20 border border-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.3)] animate-pulse" />
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs text-sky-400 uppercase tracking-widest">{event.item_type}</span>
                      <span className="text-[10px] font-mono text-white/30">{new Date(event.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-semibold text-white/90 select-all leading-normal mt-1">{event.title}</p>
                    {event.actor && (
                      <p className="text-[10px] text-white/40 font-mono mt-1.5 break-all select-all leading-normal">{event.actor}</p>
                    )}
                    {event.domain_id && (
                      <span className="text-[9px] uppercase font-bold bg-white/5 border border-white/10 text-white/50 px-2 py-0.5 rounded-full mt-2.5 inline-block">
                        {event.domain_id}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
