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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Protocol Timeline</h1>
          <p className="text-muted-foreground mt-2">Ordered chronological events across the entire protocol.</p>
        </div>
        <Button onClick={() => void refreshTimeline()} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/10 text-sky-400"><History className="h-5 w-5" /></div>
            <CardTitle className="text-lg">Event Feed</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {timeline.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4"><History className="h-6 w-6 text-white/40" /></div>
              <p className="text-white/40 mb-4">No timeline events recorded. Refresh to load the latest data.</p>
              <Button onClick={() => void refreshTimeline()} className="bg-sky-500 hover:bg-sky-600 text-white border-none"><History className="mr-2 h-4 w-4" /> Load Timeline</Button>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-px bg-white/10" />
              <div className="divide-y divide-white/5 max-h-[600px] overflow-auto">
                {timeline.map((event) => (
                  <div key={event.id} className="p-4 pl-14 relative hover:bg-white/[0.02] transition-colors">
                    <div className="absolute left-6 top-5 h-4 w-4 rounded-full bg-sky-500/20 border-2 border-sky-500" />
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-sky-400">{event.item_type}</span>
                      <span className="text-xs text-white/30">{new Date(event.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-white/80">{event.title}</p>
                    {event.actor && <p className="text-xs text-white/40 font-mono mt-1">{event.actor}</p>}
                    {event.domain_id && <span className="text-[10px] uppercase bg-white/10 text-white/50 px-2 py-0.5 rounded mt-1 inline-block">{event.domain_id}</span>}
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
