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

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Supervised Agent Crews</h1>
        <p className="text-muted-foreground mt-2">Assemble multi-agent teams under mandated authority for complex operations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/10 text-violet-400"><Bot className="h-5 w-5" /></div>
              <CardTitle className="text-lg">Assemble Crew</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="text-white/70">Crew Label</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} className="glass-input" /></div>
              <div className="space-y-2"><Label className="text-white/70">Action</Label><Input value={action} onChange={(e) => setAction(e.target.value)} className="glass-input" /></div>
            </div>
            <div className="space-y-2"><Label className="text-white/70">Objective</Label><Textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="glass-input min-h-[80px] resize-none" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Agent</Label>
                <Select value={agentId} onValueChange={(v) => setAgentId(v || "")}><SelectTrigger className="glass-input"><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>{agents.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Mandate</Label>
                <Select value={mandateId} onValueChange={(v) => setMandateId(v || "")}><SelectTrigger className="glass-input"><SelectValue placeholder="Select mandate" /></SelectTrigger>
                  <SelectContent>{mandates.map(m => <SelectItem key={m.id} value={m.id}>{m.id.slice(0, 12)}...</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => void createCrew()} disabled={!identity || !agentId || !mandateId} className="flex-1 bg-violet-500 hover:bg-violet-600 text-white border-none"><Bot className="mr-2 h-4 w-4" /> Create Crew</Button>
              <Button onClick={() => void runCrew()} disabled={!activeCrewId} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border-none"><Activity className="mr-2 h-4 w-4" /> Run</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4"><CardTitle className="text-lg">Crew Decision</CardTitle></CardHeader>
          <CardContent className="p-6">
            {crewRun ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card className="glass-panel p-3 text-center"><p className="text-[10px] uppercase text-white/40">Members</p><p className="text-lg font-bold">{crewRun.members.length}</p></Card>
                  <Card className="glass-panel p-3 text-center"><p className="text-[10px] uppercase text-white/40">Review</p><p className="text-lg font-bold">{crewRun.run.requires_review ? "Required" : "None"}</p></Card>
                  <Card className={`glass-panel p-3 text-center border-l-4 ${crewRun.run.policy_decision === 'allow' ? 'border-l-emerald-500' : 'border-l-amber-500'}`}><p className="text-[10px] uppercase text-white/40">Policy</p><p className="text-lg font-bold uppercase">{crewRun.run.policy_decision}</p></Card>
                </div>
                <JsonBlock value={crewRun} />
              </div>
            ) : (
              <div className="p-8 text-center text-white/40 text-sm">Crew runs are gated by mandate and policy before sandbox execution.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
