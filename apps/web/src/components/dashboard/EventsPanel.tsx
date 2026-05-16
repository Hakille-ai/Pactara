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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Log</h1>
          <p className="text-muted-foreground mt-2">Protocol-wide event log for audit and observability.</p>
        </div>
        <Button onClick={() => void refreshEvents()} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-400"><History className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-lg">All Events</CardTitle>
              <CardDescription>{events.length} events loaded</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-white/40 mb-4">No events recorded. Click Refresh to load.</p>
              <Button onClick={() => void refreshEvents()} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold border-none"><History className="mr-2 h-4 w-4" /> Load Events</Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[600px] overflow-auto">
              {events.map((event) => (
                <div key={event.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm text-amber-400">{event.event_type}</span>
                    <span className="text-xs text-white/30">{new Date(event.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-white/50 font-mono">{event.subject_id}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
