import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { RuntimeHealth, OperationalOverview } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, RefreshCw, Server, CheckCircle2, XCircle } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function RuntimePanel() {
  const { runtimeHealth: health, setRuntimeHealth: setHealth, opsOverview: overview, setOpsOverview: setOverview, streamSnapshot } = useAppStore()
  const { runAction } = useAction()

  async function refreshHealth() {
    const loaded = await runAction(
      () => pactaraFetch<RuntimeHealth>("/v1/health"),
      "Runtime readiness checked."
    )
    if (loaded) setHealth(loaded)
  }

  async function refreshOps() {
    const loaded = await runAction(
      () => pactaraFetch<OperationalOverview>("/v1/ops/overview"),
      "Operational overview refreshed."
    )
    if (loaded) setOverview(loaded)
  }

  const runtimeMetrics = overview ? [
    { label: "Active Workflows", value: overview.runtime.active_workflows },
    { label: "Held Funds", value: overview.runtime.held_ledger_funds },
    { label: "Agent Queue", value: overview.runtime.pending_agent_tasks },
    { label: "Reviews Pending", value: overview.runtime.needs_review_workflows },
    { label: "Reputation Scores", value: overview.runtime.reputation_scores },
    { label: "High Risk", value: overview.runtime.high_risk_assessments },
    { label: "Notifications", value: overview.runtime.unread_notifications },
    { label: "Scenarios", value: overview.runtime.world_scenarios },
    { label: "Scenario Runs", value: overview.runtime.scenario_runs },
    { label: "Commands", value: overview.runtime.runtime_commands },
    { label: "Crews", value: overview.runtime.agent_crews },
    { label: "Signals", value: overview.runtime.civilization_signals },
  ] : []

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Sovereign <span className="accent-text-cyan-teal">Runtime</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Observe runtime nodes, live SSE data streams, and database operational parameters.
          </p>
        </div>
        <div className="flex gap-3.5">
          <Button 
            onClick={() => void refreshHealth()} 
            variant="secondary" 
            className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
          >
            <RefreshCw className="mr-2 h-4 w-4 text-cyan-400" /> Run Diagnostics
          </Button>
          <Button 
            onClick={() => void refreshOps()} 
            variant="secondary" 
            className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
          >
            <Activity className="mr-2 h-4 w-4 text-cyan-400" /> Fetch Telemetry
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-5 rounded-xl border border-white/5 bg-black/20 shadow-[0_4px_24px_rgba(0,0,0,0.35)] relative overflow-hidden group">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_18px_rgba(16,185,129,0.1)]">
          {health?.database ? <CheckCircle2 className="h-6 w-6 text-emerald-400 stroke-[2]" /> : <XCircle className="h-6 w-6 text-red-500 stroke-[2]" />}
        </div>
        <div>
          <p className="font-bold text-xs text-white/90 uppercase tracking-widest">Database Node Link</p>
          <p className="text-[11px] text-white/50 mt-1 font-mono tracking-wide">
            {health?.database ? "consensus-db-online (READ/WRITE)" : "No live diagnostic data yet. Click Run Diagnostics above."}
          </p>
        </div>
      </div>

      {runtimeMetrics.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {runtimeMetrics.map((m) => (
            <div key={m.label} className="glass-panel p-4.5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-cyan-500/20 transition-all duration-300">
              <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mb-2">{m.label}</p>
              <p className="text-2xl font-extrabold font-mono text-white/90 select-all">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        {/* Readiness diagnostics */}
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Server className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Diagnostics Block</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {health ? (
              <div className="p-4 bg-black/40 h-[360px] overflow-auto border-t border-white/5">
                <JsonBlock value={health} />
              </div>
            ) : (
              <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center justify-center min-h-[360px] gap-3 border border-white/5 border-dashed rounded-2xl bg-black/20 m-6">
                <Server className="h-6 w-6 stroke-[1.5] text-white/20 animate-pulse" />
                <p className="max-w-[200px] leading-relaxed">No local operational diagnostics loaded. Click Run Diagnostics to trigger check.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live snapshot terminal output */}
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <CardTitle className="text-base font-bold text-white tracking-wide">Live Stream Terminal</CardTitle>
            <CardDescription className="text-white/40 text-xs">Latest Server-Sent Event (SSE) snapshot payload.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {streamSnapshot ? (
              <pre className="p-5 bg-black/60 text-[10px] text-cyan-300 font-mono whitespace-pre-wrap h-[360px] overflow-auto border-t border-white/5 leading-relaxed">{streamSnapshot}</pre>
            ) : (
              <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center justify-center min-h-[360px] gap-3 border border-white/5 border-dashed rounded-2xl bg-black/20 m-6 animate-pulse">
                <Activity className="h-6 w-6 stroke-[1.5] text-white/20" />
                <p className="max-w-[200px] leading-relaxed">SSE telemetry socket inactive. Open the STREAM dashboard panel tab to bind live socket connection.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
