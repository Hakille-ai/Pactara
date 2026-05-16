import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { ReputationResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { BadgeCheck, RefreshCw, ActivitySquare } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function ReputationPanel() {
  const { identity, reputation, setReputation } = useAppStore()
  const { runAction } = useAction()

  const [identityId, setIdentityId] = useState("")

  useEffect(() => {
    if (!identityId && identity?.id) {
      setIdentityId(identity.id)
    }
  }, [identity, identityId])

  async function loadReputation(recompute = false) {
    if (!identityId) return
    const response = await runAction(
      () =>
        recompute
          ? pactaraFetch<ReputationResponse>("/v1/reputation/recompute", {
              method: "POST",
              body: JSON.stringify({ identity_id: identityId }),
            })
          : pactaraFetch<ReputationResponse>(`/v1/reputation/${encodeURIComponent(identityId)}`),
      recompute ? "Reputation recomputed." : "Reputation loaded."
    )
    if (response) {
      setReputation(response)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reputation Engine</h1>
        <p className="text-muted-foreground mt-2">
          Calculate and verify the trust tier and activity score for any protocol identity.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <Card className="glass-panel h-fit">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Trust Query</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Target Identity</Label>
              <Input 
                value={identityId} 
                onChange={(e) => setIdentityId(e.target.value)} 
                className="glass-input font-mono text-sm" 
              />
            </div>
            
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={() => void loadReputation(false)} disabled={!identityId} className="flex-1 bg-white/10 hover:bg-white/20 text-white border-none">
                <RefreshCw className="mr-2 h-4 w-4" /> Load
              </Button>
              <Button onClick={() => void loadReputation(true)} disabled={!identityId} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold border-none">
                <ActivitySquare className="mr-2 h-4 w-4" /> Recompute
              </Button>
            </div>
          </CardContent>
        </Card>

        {reputation ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3 animate-in fade-in slide-in-from-bottom-2">
              <Card className="glass-panel p-4 flex flex-col justify-center border-l-4 border-l-amber-500">
                <p className="text-sm text-white/50 mb-1">Global Score</p>
                <p className="text-3xl font-bold font-mono">{reputation.score.score}</p>
              </Card>
              <Card className="glass-panel p-4 flex flex-col justify-center">
                <p className="text-sm text-white/50 mb-1">Recorded Events</p>
                <p className="text-3xl font-bold font-mono">{reputation.events.length}</p>
              </Card>
              <Card className="glass-panel p-4 flex flex-col justify-center border border-amber-500/30 bg-amber-500/5">
                <p className="text-[11px] uppercase tracking-wider text-amber-500/70 mb-1 font-semibold">Tier</p>
                <p className="text-2xl font-bold uppercase text-amber-400">{reputation.score.tier}</p>
              </Card>
            </div>

            <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-3">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Reputation Ledger</CardTitle>
                <CardDescription>Events contributing to the final score.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {reputation.events.length === 0 ? (
                  <div className="p-8 text-center text-white/40 text-sm">
                    No reputation events yet.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[300px] overflow-auto">
                    {reputation.events.map((event) => (
                      <div key={event.id} className="p-4 hover:bg-white/[0.02] transition-colors flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-white/90">{event.reason}</p>
                          <p className="text-xs text-white/40 font-mono mt-1">{event.source_id ?? event.id}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold font-mono ${
                          event.delta > 0 ? 'bg-emerald-500/20 text-emerald-400' : 
                          event.delta < 0 ? 'bg-red-500/20 text-red-400' : 
                          'bg-white/10 text-white/60'
                        }`}>
                          {event.delta > 0 ? "+" : ""}{event.delta}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="p-4 bg-black/40 border-t border-white/5">
                  <JsonBlock value={reputation} />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
           <div className="flex items-center justify-center p-12 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
            <p className="text-white/40 text-center">
              Load an identity to view its calculated reputation and trust events.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
