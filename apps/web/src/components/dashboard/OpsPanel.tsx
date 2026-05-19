import { useMemo } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { OperationalOverview } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, RefreshCw } from "lucide-react"

export function OpsPanel() {
  const { opsOverview: overview, setOpsOverview: setOverview } = useAppStore()
  const { runAction } = useAction()

  const actionMix = useMemo(() => {
    const counts = new Map<string, number>()
    overview?.recent_domain_actions.forEach((action) => {
      counts.set(action.domain_id, (counts.get(action.domain_id) ?? 0) + 1)
    })
    return Array.from(counts.entries()).sort(([, left], [, right]) => right - left)
  }, [overview])

  async function refreshOps() {
    const loaded = await runAction(
      () => pactaraFetch<OperationalOverview>("/v1/ops/overview"),
      "Operational overview refreshed."
    )
    if (loaded) setOverview(loaded)
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Mission <span className="accent-text-violet-pink">Control</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Decentralized sovereign operations console, transaction telemetry, and audit logs.
          </p>
        </div>
        <Button 
          onClick={() => void refreshOps()} 
          variant="secondary" 
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4 text-pink-400" /> Pull Operations Logs
        </Button>
      </div>

      {!overview ? (
        <Card className="glass-panel border-dashed border-white/10 m-2">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-5 animate-pulse">
              <Activity className="h-7 w-7 text-pink-400 stroke-[1.5]" />
            </div>
            <p className="text-xs text-white/40 max-w-[260px] leading-relaxed mb-6">
              Protocol diagnostic metrics has not been loaded from the node coordinator.
            </p>
            <Button 
              onClick={() => void refreshOps()} 
              className="bg-pink-500 hover:bg-pink-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(236,72,153,0.25)] rounded-lg btn-apple-spring h-10 px-6 pt-0.5"
            >
              <Activity className="mr-2 h-4 w-4 stroke-[2]" /> Load Operations Console
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Identities", value: overview.network.identities },
              { label: "Active PACTs", value: overview.network.active_pacts },
              { label: "Ledger Accounts", value: overview.network.ledger_accounts },
              { label: "Audit Events", value: overview.network.audit_events },
            ].map((m) => (
              <div key={m.label} className="glass-panel p-4.5 rounded-xl border border-white/5 bg-white/[0.01]">
                <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mb-1.5">{m.label}</p>
                <p className="text-2xl font-extrabold font-mono text-white/95">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-panel p-4.5 rounded-xl border border-amber-500/10 bg-amber-500/[0.01] shadow-[0_4px_20px_rgba(245,158,11,0.02)]">
              <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mb-1.5">Pending Payments</p>
              <p className="text-2xl font-extrabold font-mono text-amber-400 select-all">{overview.payments.pending}</p>
            </div>
            <div className="glass-panel p-4.5 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.01] shadow-[0_4px_20px_rgba(16,185,129,0.02)]">
              <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mb-1.5">Executed Payments</p>
              <p className="text-2xl font-extrabold font-mono text-emerald-400 select-all">{overview.payments.executed}</p>
            </div>
            <div className="glass-panel p-4.5 rounded-xl border border-rose-500/10 bg-rose-500/[0.01] shadow-[0_4px_20px_rgba(244,63,94,0.02)]">
              <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mb-1.5">Rejected Payments</p>
              <p className="text-2xl font-extrabold font-mono text-rose-400 select-all">{overview.payments.rejected}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-panel overflow-hidden">
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <CardTitle className="text-base font-bold text-white tracking-wide">Recent Domain Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5 max-h-[320px] overflow-auto">
                  {overview.recent_domain_actions.slice(0, 8).map((action, i) => (
                    <div key={i} className="p-5 hover:bg-white/[0.01] transition-all duration-300 relative group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-white/90">{action.domain_id}</span>
                        <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">{action.action_type}</span>
                      </div>
                      <p className="text-[10px] text-white/30 font-mono break-all leading-normal select-all">{action.pact_id}</p>
                    </div>
                  ))}
                  {!overview.recent_domain_actions.length && (
                    <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center justify-center min-h-[200px] gap-2 border border-white/5 border-dashed rounded-xl bg-black/20 m-5">
                      <Activity className="h-5 w-5 text-white/20 animate-pulse" />
                      <p>No recorded domain actions.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel overflow-hidden">
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <CardTitle className="text-base font-bold text-white tracking-wide">Recent Agent Runs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5 max-h-[320px] overflow-auto">
                  {overview.recent_agent_runs.slice(0, 8).map((run, i) => (
                    <div key={i} className="p-5 hover:bg-white/[0.01] transition-all duration-300 relative group">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-xs text-white/90">{run.action}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          run.policy_decision === 'allow' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {run.policy_decision}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/30 font-mono break-all leading-normal select-all">{run.id}</p>
                    </div>
                  ))}
                  {!overview.recent_agent_runs.length && (
                    <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center justify-center min-h-[200px] gap-2 border border-white/5 border-dashed rounded-xl bg-black/20 m-5">
                      <Activity className="h-5 w-5 text-white/20 animate-pulse" />
                      <p>No recorded agent workflow runs.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-panel overflow-hidden">
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <CardTitle className="text-base font-bold text-white tracking-wide">Domain Activity Mix</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {actionMix.map(([domain, count]) => (
                  <div key={domain} className="flex items-center justify-between rounded-lg bg-black/40 px-4.5 py-3 border border-white/5">
                    <span className="font-bold text-xs text-white/80">{domain}</span>
                    <span className="text-xs font-bold font-mono text-pink-400 select-all">{count}</span>
                  </div>
                ))}
                {!actionMix.length && (
                  <p className="text-xs text-white/40 text-center p-8 border border-white/5 border-dashed rounded-xl">No active telemetry metrics checkmarks found.</p>
                )}
              </CardContent>
            </Card>

            <Card className="glass-panel overflow-hidden">
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <CardTitle className="text-base font-bold text-white tracking-wide">Audit Pulse Logs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5 max-h-[320px] overflow-auto">
                  {overview.recent_audit.slice(0, 8).map((event, i) => (
                    <div key={i} className="p-5 hover:bg-white/[0.01] transition-all duration-300 relative group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-white/90">{event.event_type}</span>
                        {event.decision && (
                          <span className="text-[9px] uppercase tracking-wider font-extrabold bg-white/5 border border-white/10 text-white/60 px-2 py-0.5 rounded-full">{event.decision}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/30 font-mono break-all leading-normal select-all">{event.subject_id}</p>
                    </div>
                  ))}
                  {!overview.recent_audit.length && (
                    <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center justify-center min-h-[200px] gap-2 border border-white/5 border-dashed rounded-xl bg-black/20 m-5">
                      <Activity className="h-5 w-5 text-white/20 animate-pulse" />
                      <p>No logged consensus audits.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] text-white/30 font-semibold uppercase tracking-widest">
              Last synced node state: {new Date(overview.generated_at).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
