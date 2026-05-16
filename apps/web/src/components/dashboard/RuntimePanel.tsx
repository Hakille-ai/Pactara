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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sovereign Runtime</h1>
          <p className="text-muted-foreground mt-2">System health, runtime metrics, and live stream snapshot.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => void refreshHealth()} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
            <RefreshCw className="mr-2 h-4 w-4" /> Health
          </Button>
          <Button onClick={() => void refreshOps()} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
            <Activity className="mr-2 h-4 w-4" /> Overview
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
          {health?.database ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <XCircle className="h-6 w-6 text-red-500" />}
        </div>
        <div>
          <p className="font-semibold">Database Connection</p>
          <p className="text-sm text-white/60">{health?.database ? "Connected and operational" : "Not checked yet — click Health"}</p>
        </div>
      </div>

      {runtimeMetrics.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-2">
          {runtimeMetrics.map((m) => (
            <Card key={m.label} className="glass-panel p-4">
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-1">{m.label}</p>
              <p className="text-2xl font-bold font-mono">{m.value}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
                <Server className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Runtime Readiness</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {health ? (
              <div className="p-4 bg-black/40"><JsonBlock value={health} /></div>
            ) : (
              <div className="p-8 text-center text-white/40 text-sm">Click Health to load runtime state.</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Stream Snapshot</CardTitle>
            <CardDescription>Latest SSE runtime data.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {streamSnapshot ? (
              <pre className="p-4 bg-black/40 text-xs text-emerald-300 font-mono whitespace-pre-wrap max-h-[400px] overflow-auto">{streamSnapshot}</pre>
            ) : (
              <div className="p-8 text-center text-white/40 text-sm">Open the Stream tab to pull an SSE runtime snapshot.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
