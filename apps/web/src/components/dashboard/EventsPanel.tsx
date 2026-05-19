import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { EventLog } from "@/lib/pactara-api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { History, RefreshCw } from "lucide-react"

export function EventsPanel() {
  const { events, setEvents } = useAppStore()
  const { runAction } = useAction()

  async function refreshEvents() {
    const loaded = await runAction(
      () => pactaraFetch<EventLog[]>("/v1/events?limit=50"),
      "Events refreshed."
    )
    if (loaded) setEvents(loaded)
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Event <span className="accent-text-violet-pink">Log</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Immutable chronological logging of network operations, state changes, and peer assertions.
          </p>
        </div>
        <Button 
          onClick={() => void refreshEvents()} 
          variant="secondary" 
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4 text-pink-400" /> Pull Audit Trails
        </Button>
      </div>

      <Card className="glass-panel-glow overflow-hidden">
        <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <History className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white tracking-wide">All Consensus Events</CardTitle>
              <CardDescription className="text-white/40 text-xs">{events.length} cryptographic events resolved on this node.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center min-h-[300px] gap-3 border border-white/5 border-dashed rounded-2xl bg-black/20 m-6">
              <History className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
              <p className="text-xs text-white/30 max-w-[220px] leading-relaxed mb-3">No sovereign network logs recorded in this session state.</p>
              <Button 
                onClick={() => void refreshEvents()} 
                className="bg-pink-500 hover:bg-pink-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(236,72,153,0.25)] rounded-lg btn-apple-spring h-10 px-6 pt-0.5"
              >
                <History className="mr-2 h-4 w-4 stroke-[2.5]" /> Synchronize Events
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[580px] overflow-auto">
              {events.map((event) => (
                <div key={event.id} className="p-5 hover:bg-white/[0.01] transition-all duration-300 relative group">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="status-led status-led-blue scale-75 animate-pulse" />
                      <span className="font-bold text-xs text-white/90 select-all tracking-wide">{event.event_type}</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/30">{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-white/30 font-mono break-all select-all leading-normal">{event.subject_id}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
