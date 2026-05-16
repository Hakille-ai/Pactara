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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground mt-2">High-level operational overview of the entire protocol.</p>
        </div>
        <Button onClick={() => void refreshOps()} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {!overview ? (
        <Card className="glass-panel border-dashed border-white/10">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Activity className="h-8 w-8 text-white/40" />
            </div>
            <p className="text-white/40 mb-4">Load the operational overview to see protocol health.</p>
            <Button onClick={() => void refreshOps()} className="bg-blue-500 hover:bg-blue-600 text-white border-none">
              <Activity className="mr-2 h-4 w-4" /> Load Overview
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Identities", value: overview.network.identities },
              { label: "Active PACTs", value: overview.network.active_pacts },
              { label: "Ledger Accounts", value: overview.network.ledger_accounts },
              { label: "Audit Events", value: overview.network.audit_events },
            ].map((m) => (
              <Card key={m.label} className="glass-panel p-4">
                <p className="text-sm text-white/50 mb-1">{m.label}</p>
                <p className="text-3xl font-bold font-mono">{m.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="glass-panel p-4 border-l-4 border-l-amber-500">
              <p className="text-sm text-white/50 mb-1">Pending</p>
              <p className="text-2xl font-bold font-mono text-amber-400">{overview.payments.pending}</p>
            </Card>
            <Card className="glass-panel p-4 border-l-4 border-l-emerald-500">
              <p className="text-sm text-white/50 mb-1">Executed</p>
              <p className="text-2xl font-bold font-mono text-emerald-400">{overview.payments.executed}</p>
            </Card>
            <Card className="glass-panel p-4 border-l-4 border-l-red-500">
              <p className="text-sm text-white/50 mb-1">Rejected</p>
              <p className="text-2xl font-bold font-mono text-red-400">{overview.payments.rejected}</p>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-panel overflow-hidden">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Recent Domain Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5 max-h-[300px] overflow-auto">
                  {overview.recent_domain_actions.slice(0, 8).map((action, i) => (
                    <div key={i} className="p-4 hover:bg-white/[0.02] transition-colors">
                      <p className="text-sm font-medium text-white/90">{action.domain_id} / {action.action_type}</p>
                      <p className="text-xs text-white/40 font-mono mt-1">{action.pact_id}</p>
                    </div>
                  ))}
                  {!overview.recent_domain_actions.length && <div className="p-6 text-center text-white/40 text-sm">No domain actions yet.</div>}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel overflow-hidden">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Recent Agent Runs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5 max-h-[300px] overflow-auto">
                  {overview.recent_agent_runs.slice(0, 8).map((run, i) => (
                    <div key={i} className="p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-white/90">{run.action}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${run.policy_decision === 'allow' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {run.policy_decision}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 font-mono mt-1">{run.id}</p>
                    </div>
                  ))}
                  {!overview.recent_agent_runs.length && <div className="p-6 text-center text-white/40 text-sm">No agent runs yet.</div>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-panel overflow-hidden">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Domain Activity Mix</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {actionMix.map(([domain, count]) => (
                  <div key={domain} className="flex items-center justify-between rounded bg-white/[0.02] px-3 py-2 border border-white/5">
                    <span className="font-medium text-white/90 text-sm">{domain}</span>
                    <span className="text-sm font-mono text-white/60">{count}</span>
                  </div>
                ))}
                {!actionMix.length && <p className="text-sm text-white/40 text-center p-4">No activity data.</p>}
              </CardContent>
            </Card>

            <Card className="glass-panel overflow-hidden">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Audit Pulse</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5 max-h-[300px] overflow-auto">
                  {overview.recent_audit.slice(0, 8).map((event, i) => (
                    <div key={i} className="p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-white/90">{event.event_type}</p>
                        {event.decision && <span className="text-[10px] uppercase font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded">{event.decision}</span>}
                      </div>
                      <p className="text-xs text-white/40 font-mono mt-1">{event.subject_id}</p>
                    </div>
                  ))}
                  {!overview.recent_audit.length && <div className="p-6 text-center text-white/40 text-sm">No audit events yet.</div>}
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-white/30">Generated {new Date(overview.generated_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  )
}
