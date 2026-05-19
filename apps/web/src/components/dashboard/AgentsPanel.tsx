import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { AgentProfile, AgentRunResponse, AgentTaskResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bot, Play, PlusCircle, CheckCircle2, RefreshCw } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"
import { toast } from "sonner"

export function AgentsPanel() {
  const {
    identity, mandates, agents, setAgents,
    agentTasks, setAgentTasks, agentTask, setAgentTask,
    agentRun, setAgentRun
  } = useAppStore()
  const { runAction } = useAction()

  const [agentName, setAgentName] = useState("Negotiator-01")
  const [modelName, setModelName] = useState("gpt-4o")
  const [mandateId, setMandateId] = useState<string | undefined>(undefined)
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>(undefined)
  const [taskName, setTaskName] = useState("Evaluate pricing")
  const [taskInstruction, setTaskInstruction] = useState("Analyze the terms and output decision")

  useEffect(() => {
    if (!mandateId && mandates[0]?.id) setMandateId(mandates[0].id)
  }, [mandates, mandateId])

  useEffect(() => {
    if (!selectedAgent && agents[0]?.id) setSelectedAgent(agents[0].id)
  }, [agents, selectedAgent])

  async function createAgent() {
    if (!identity) {
      toast.error("Identity Required", { description: "Create an identity first." })
      return
    }
    const response = await runAction(
      () =>
        pactaraFetch<AgentProfile>("/v1/agents", {
          method: "POST",
          body: JSON.stringify({
            controller: identity.id,
            mandate_id: mandateId || null,
            name: agentName,
            model_provider: "openai",
            model_name: modelName,
            system_prompt: "You are a specialized agent operating under explicit mandate.",
          }),
        }),
      "Agent profile created."
    )
    if (response) {
      setAgents([response, ...agents])
      setSelectedAgent(response.id)
      toast.success("Agent Provisioned", { description: `${response.label} is ready.` })
    }
  }

  async function refreshAgents() {
    const loaded = await runAction(
      () => pactaraFetch<AgentProfile[]>("/v1/agents?limit=20"),
      "Agent list refreshed."
    )
    if (loaded) {
      setAgents(loaded)
      if (loaded[0]) setSelectedAgent(loaded[0].id)
    }
  }

  async function createTask() {
    if (!identity || !selectedAgent) {
      toast.error("Missing Info", { description: "Select an identity and agent." })
      return
    }
    const response = await runAction(
      () =>
        pactaraFetch<AgentTaskResponse>("/v1/agents/tasks", {
          method: "POST",
          body: JSON.stringify({
            agent_id: selectedAgent,
            mandate_id: mandateId || null,
            requester: identity.id,
            name: taskName,
            instruction: taskInstruction,
            requires_review: true,
          }),
        }),
      "Task created."
    )
    if (response) {
      setAgentTask(response)
      setAgentTasks([response.task, ...agentTasks])
      toast.success("Task Drafted", { description: `Task "${response.task.action}" assigned.` })
    }
  }

  async function startRun() {
    if (!identity || !selectedAgent) {
      toast.error("Missing Info", { description: "Select an identity and agent." })
      return
    }
    const response = await runAction(
      () =>
        pactaraFetch<AgentRunResponse>(`/v1/agents/${selectedAgent}/runs`, {
          method: "POST",
          body: JSON.stringify({
            requester: identity.id,
            prompt: taskInstruction,
            temperature: 0.2,
          }),
        }),
      "Agent run started."
    )
    if (response) {
      setAgentRun(response)
      toast.success("Run Complete", { description: `Policy: ${response.run.policy_decision}` })
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Autonomous <span className="accent-text-cyan-teal">AI Agents</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Provision secure AI agents and assign them mandate-bound policy evaluation tasks.
          </p>
        </div>
        <Button 
          onClick={() => void refreshAgents()} 
          variant="secondary" 
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4 text-cyan-400" /> Sync Agent Profiles
        </Button>
      </div>

      {!identity && (
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4.5 text-xs text-amber-400/90 flex items-center gap-3 backdrop-blur-md">
          <Bot className="h-5 w-5 shrink-0 text-amber-400" />
          <span>A registered sovereign <strong>Identity Alias</strong> is required before provisioning autonomous agent entities. Please configure an identity first.</span>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Provision Form */}
        <Card className="glass-panel-glow lg:col-span-2 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Bot className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">Provision Profile</CardTitle>
                <CardDescription className="text-white/40 text-xs">Instantiate a secure mandate delegate.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Agent Identifier</Label>
              <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-cyan-500/20" placeholder="e.g. Negotiator-01" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Model Profile</Label>
              <Select value={modelName} onValueChange={(v) => setModelName(v ?? "gpt-4o")}>
                <SelectTrigger className="glass-input h-10 focus:ring-cyan-500/20 text-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0b0b] border-white/5 text-white/85">
                  <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo (OpenAI)</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus (Anthropic)</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet (Anthropic)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mandates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Delegate Mandate</Label>
                <Select value={mandateId ?? "_none"} onValueChange={(v) => setMandateId(v === "_none" || !v ? undefined : v)}>
                  <SelectTrigger className="glass-input h-10 focus:ring-cyan-500/20 text-white/80">
                    <SelectValue placeholder="Select Mandate" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b0b0b] border-white/5 text-white/85">
                    <SelectItem value="_none">No Mandate (Unbound)</SelectItem>
                    {mandates.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.id.slice(0, 16)}...</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button 
              onClick={() => void createAgent()} 
              disabled={!identity} 
              className="w-full h-10 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(6,182,212,0.25)] transition-all duration-300 btn-apple-spring mt-2 rounded-lg"
            >
              <PlusCircle className="mr-2 h-4 w-4 stroke-[2.5]" /> Provision Agent
            </Button>
          </CardContent>
        </Card>

        {/* Task & Run Form */}
        <Card className="glass-panel-glow lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Play className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">Evaluate Policy Action</CardTitle>
                <CardDescription className="text-white/40 text-xs">Run policy simulations bound by active delegates.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {agents.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Active Agent Delegate</Label>
                  <Select value={selectedAgent ?? "_none"} onValueChange={(v) => setSelectedAgent(v === "_none" || !v ? undefined : v)}>
                    <SelectTrigger className="glass-input h-10 focus:ring-cyan-500/20 text-white/80">
                      <SelectValue placeholder="Select Agent" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b0b0b] border-white/5 text-white/85">
                      {agents.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Simulated Action Name</Label>
                  <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-cyan-500/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Policy Scenarios Instruction</Label>
                  <Input value={taskInstruction} onChange={(e) => setTaskInstruction(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-cyan-500/20" />
                </div>
                <div className="flex gap-4 pt-2">
                  <Button variant="secondary" onClick={() => void createTask()} disabled={!identity || !selectedAgent} className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 rounded-lg btn-apple-spring">
                    <PlusCircle className="mr-2 h-4 w-4 text-violet-400 stroke-[2]" /> Draft Task
                  </Button>
                  <Button onClick={() => void startRun()} disabled={!identity || !selectedAgent} className="flex-1 h-10 bg-violet-500 hover:bg-violet-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(167,139,250,0.25)] rounded-lg btn-apple-spring">
                    <Play className="mr-2 h-4 w-4 stroke-[2.5]" /> Start Evaluation
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center gap-3">
                <Bot className="h-6 w-6 stroke-[1.5] text-white/20 animate-pulse" />
                <p>No active agent delegates configured on this node.</p>
                <p className="text-[10px] text-white/25 mt-0.5">Please provision an agent profile using the setup form.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Registry & Execution Result Details */}
      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Agent Profiles Registry List */}
        {agents.length > 0 && (
          <Card className="glass-panel lg:col-span-2 overflow-hidden">
            <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white">Active Delegates</CardTitle>
                <CardDescription className="text-white/40 text-xs">{agents.length} profile(s) provisioned</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5 max-h-[360px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
                {agents.map((agent) => {
                  const isSelected = selectedAgent === agent.id;
                  return (
                    <div 
                      key={agent.id} 
                      className={`p-4.5 hover:bg-white/[0.02] transition-all duration-300 cursor-pointer flex items-center justify-between gap-4 select-none ${
                        isSelected ? 'bg-cyan-500/[0.04] border-l-2 border-cyan-500' : ''
                      }`}
                      onClick={() => setSelectedAgent(agent.id)}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white/90 truncate">{agent.label}</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>
                        <p className="text-[10px] text-white/30 font-mono truncate">{agent.id}</p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded text-[9px] font-mono tracking-wider font-bold uppercase bg-white/[0.04] border border-white/5 text-white/50">{agent.model}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Execution Log Result Display */}
        {agentRun && (
          <Card className="glass-panel lg:col-span-3 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Play className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">Execution Telemetry Log</CardTitle>
                  <CardDescription className="text-white/40 text-xs">Run manifest identifier: {agentRun.run.id.slice(0, 16)}...</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-4 grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">Scope Action</p>
                  <p className="font-mono text-xs font-semibold text-white/80 truncate capitalize">{agentRun.run.action}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">Policy Safeguard</p>
                  <p className={`font-mono text-xs font-bold truncate capitalize ${
                    agentRun.run.policy_decision === 'allow' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'
                  }`}>
                    {agentRun.run.policy_decision}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">State</p>
                  <p className="font-mono text-xs font-semibold text-white/80 uppercase truncate">{agentRun.run.status}</p>
                </div>
              </div>

              {!!agentRun.run.output && (
                <div className="rounded-xl border border-white/5 bg-black/45 p-4 shadow-inner">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2.5">Agent Raw Output</p>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-emerald-300/90 leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                    {typeof agentRun.run.output === 'string' ? agentRun.run.output : JSON.stringify(agentRun.run.output, null, 2)}
                  </pre>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">Evaluation Response Schema</span>
                <JsonBlock value={agentRun} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
