import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { AgentCrewResponse, CrewRunResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bot, Activity } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function CrewsPanel() {
  const { identity, agents, mandates, agentCrews: crews, agentCrew: crew, setAgentCrew: setCrew, crewRun, setCrewRun } = useAppStore()
  const { runAction } = useAction()

  const [label, setLabel] = useState("Civic Response Crew")
  const [objective, setObjective] = useState("Coordinate a supervised climate transport economy response.")
  const [agentId, setAgentId] = useState("")
  const [mandateId, setMandateId] = useState("")
  const [action, setAction] = useState("compare_prices")
  const activeCrewId = crew?.crew.id ?? crews[0]?.crew.id ?? ""

  async function createCrew() {
    if (!identity || !agentId || !mandateId) return
    const created = await runAction(
      () => pactaraFetch<AgentCrewResponse>("/v1/agent-crews", {
        method: "POST",
        body: JSON.stringify({
          actor: identity.id, label, objective,
          members: [{ agent_id: agentId, mandate_id: mandateId, role: "orchestrator" }],
        }),
      }),
      "Agent crew created."
    )
    if (created) setCrew(created)
  }

  async function runCrew() {
    if (!activeCrewId) return
    const run = await runAction(
      () => pactaraFetch<CrewRunResponse>(`/v1/agent-crews/${activeCrewId}/run`, {
        method: "POST",
        body: JSON.stringify({ input: { action, risk: action.includes("sign") ? "high" : "low", objective } }),
      }),
      "Crew run evaluated."
    )
    if (run) setCrewRun(run)
  }

  async function refreshCrews() {
    await runAction(
      () => pactaraFetch<AgentCrewResponse[]>("/v1/agent-crews?limit=20"),
      "Crew list refreshed."
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Supervised <span className="accent-text-gold-orange">Agent Crews</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Orchestrate collaborative multi-agent crews mandated to execute protocol tasks safely.
          </p>
        </div>
        <Button 
          onClick={() => void refreshCrews()} 
          variant="secondary" 
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <Activity className="mr-2 h-4 w-4 text-amber-400" /> Sync Crews List
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Left Side: Creation Form */}
        <Card className="glass-panel-glow lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_16px_rgba(251,191,36,0.1)]">
                <Bot className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">Assemble Crew Crew</CardTitle>
                <CardDescription className="text-white/40 text-xs">Configure collective mandates and policies.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Crew Label</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-amber-500/20" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Simulated Action</Label>
                <Input value={action} onChange={(e) => setAction(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-amber-500/20" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Global Objective</Label>
              <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="glass-input min-h-[90px] p-3 resize-none focus:ring-amber-500/20 bg-black/40" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Orchestrator Agent</Label>
                <Select value={agentId || "_none"} onValueChange={(v) => setAgentId(v === "_none" || !v ? "" : v)}>
                  <SelectTrigger className="glass-input h-10 focus:ring-amber-500/20 text-white/80">
                    <SelectValue placeholder="Select orchestrator" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b0b0b] border-white/5 text-white/85">
                    <SelectItem value="_none">Select Orchestrator</SelectItem>
                    {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Operating Scope Mandate</Label>
                <Select value={mandateId || "_none"} onValueChange={(v) => setMandateId(v === "_none" || !v ? "" : v)}>
                  <SelectTrigger className="glass-input h-10 focus:ring-amber-500/20 text-white/80">
                    <SelectValue placeholder="Select mandate scope" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b0b0b] border-white/5 text-white/85">
                    <SelectItem value="_none">Select Mandate</SelectItem>
                    {mandates.map(m => <SelectItem key={m.id} value={m.id}>{m.id.slice(0, 16)}...</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <Button 
                onClick={() => void createCrew()} 
                disabled={!identity || !agentId || agentId === "_none" || !mandateId || mandateId === "_none"} 
                className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 rounded-lg btn-apple-spring"
              >
                <Bot className="mr-2 h-4 w-4 stroke-[2]" /> Assemble Crew
              </Button>
              <Button 
                onClick={() => void runCrew()} 
                disabled={!activeCrewId} 
                className="flex-1 h-10 bg-amber-500 hover:bg-amber-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(251,191,36,0.25)] rounded-lg btn-apple-spring"
              >
                <Activity className="mr-2 h-4 w-4 stroke-[2.5]" /> Run Operations
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Crew Decisions Log */}
        <Card className="glass-panel lg:col-span-2 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <CardTitle className="text-lg font-bold text-white tracking-wide">Crew Run Monitor</CardTitle>
            <CardDescription className="text-white/40 text-xs">Real-time status updates of active operations.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {crewRun ? (
              <div className="space-y-6">
                <div className="grid gap-4 grid-cols-3">
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">Members</p>
                    <p className="text-base font-bold font-mono text-white/80">{crewRun.members.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">Override</p>
                    <p className="text-base font-bold font-mono text-white/80">{crewRun.run.requires_review ? "YES" : "NO"}</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">Decision</p>
                    <p className={`text-base font-bold font-mono uppercase ${
                      crewRun.run.policy_decision === 'allow' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'
                    }`}>
                      {crewRun.run.policy_decision}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">Policy Manifest Block</span>
                  <JsonBlock value={crewRun} />
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center justify-center min-h-[220px] gap-3 border border-white/5 border-dashed rounded-2xl bg-black/20">
                <Activity className="h-6 w-6 stroke-[1.5] text-white/20 animate-pulse" />
                <p className="max-w-[200px] leading-relaxed">Runs are gated by mandate bounds and policy conditions before execution.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
