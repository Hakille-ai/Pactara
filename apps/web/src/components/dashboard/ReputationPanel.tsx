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
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Reputation <span className="accent-text-amber-yellow">Engine</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Calculate trust weight thresholds, evaluate consensus metrics, and query decentralized protocol identity tier standings.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_2fr] items-start">
        {/* Trust Query Column */}
        <Card className="glass-panel-glow h-fit overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <BadgeCheck className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Identity Trust Query</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4.5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Target Protocol Identity</Label>
              <Input 
                value={identityId} 
                onChange={(e) => setIdentityId(e.target.value)} 
                className="glass-input h-10 px-3.5 focus:ring-amber-500/20 font-mono text-xs" 
              />
            </div>
            
            <div className="flex gap-3.5 pt-2">
              <Button 
                variant="secondary" 
                onClick={() => void loadReputation(false)} 
                disabled={!identityId} 
                className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 font-semibold tracking-wide btn-apple-spring rounded-lg text-xs"
              >
                <RefreshCw className="mr-2 h-4 w-4 text-amber-400 stroke-[2.5]" /> Pull Standing
              </Button>
              <Button 
                onClick={() => void loadReputation(true)} 
                disabled={!identityId} 
                className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-black font-extrabold tracking-wide border-none shadow-[0_4px_24px_rgba(245,158,11,0.25)] rounded-lg btn-apple-spring transition-all duration-300 text-xs pt-0.5"
              >
                <ActivitySquare className="mr-2 h-4 w-4 stroke-[2.5]" /> Recompute Score
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reputation Details Column */}
        {reputation ? (
          <div className="space-y-8">
            <div className="grid gap-4.5 sm:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="glass-panel p-5 flex flex-col justify-center border-l-2 border-l-amber-500 relative overflow-hidden group">
                <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1">Global Standing Score</p>
                <p className="text-3xl font-extrabold font-mono text-white tracking-tight">{reputation.score.score}</p>
              </Card>
              <Card className="glass-panel p-5 flex flex-col justify-center relative overflow-hidden group">
                <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1">Audit Ledger Events</p>
                <p className="text-3xl font-extrabold font-mono text-white tracking-tight">{reputation.events.length}</p>
              </Card>
              <Card className="glass-panel p-5 flex flex-col justify-center border border-amber-500/20 bg-amber-500/[0.02] relative overflow-hidden group">
                <p className="text-[10px] uppercase tracking-wider text-amber-500/70 mb-1 font-extrabold">Trust Tier Class</p>
                <p className="text-2xl font-extrabold uppercase text-amber-400 tracking-wide">{reputation.score.tier}</p>
              </Card>
            </div>

            <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500">
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <CardTitle className="text-base font-bold text-white tracking-wide">Reputation Standing History</CardTitle>
                <CardDescription className="text-white/40 text-xs">Event constraints and assertions contributing to the standing score.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {reputation.events.length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center justify-center min-h-[220px] gap-2 border border-white/5 border-dashed rounded-xl bg-black/20 m-6">
                    <BadgeCheck className="h-6 w-6 text-white/20 animate-pulse" />
                    <p className="text-xs text-white/30">No recorded standing audit events compiled inside history ledger.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[300px] overflow-auto">
                    {reputation.events.map((event) => (
                      <div key={event.id} className="p-5 hover:bg-white/[0.01] transition-all duration-300 flex items-center justify-between group relative">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-white/90 select-all leading-normal">{event.reason}</p>
                          <p className="text-[10px] text-white/30 font-mono select-all truncate w-40 sm:w-80 leading-normal">{event.source_id ?? event.id}</p>
                        </div>
                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          event.delta > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          event.delta < 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                          'bg-white/5 text-white/60 border border-white/10'
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
          <div className="flex flex-col items-center justify-center p-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] min-h-[320px] gap-3">
            <BadgeCheck className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
            <p className="text-xs text-white/30 text-center max-w-[280px] leading-relaxed">
              Pull or recompute standing metrics on any decentralized target identity to load calculated trust weight.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
