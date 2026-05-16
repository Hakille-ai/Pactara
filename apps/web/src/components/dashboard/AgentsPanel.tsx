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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground mt-2">
            Provision sovereign AI agents and assign them verifiable tasks under your identity mandates.
          </p>
        </div>
        <Button onClick={() => void refreshAgents()} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {!identity && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-400 flex items-center gap-2">
          <Bot className="h-4 w-4 shrink-0" />
          Create an Identity first to provision agents.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-400"><Bot className="h-5 w-5" /></div>
              <CardTitle className="text-lg">Create Agent</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Agent Name</Label>
              <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} className="glass-input" placeholder="e.g. Negotiator-01" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Model</Label>
              <Select value={modelName} onValueChange={(v) => setModelName(v ?? "gpt-4o")}>
                <SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo (OpenAI)</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus (Anthropic)</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet (Anthropic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mandates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-white/70">Operating Mandate</Label>
                <Select value={mandateId ?? "_none"} onValueChange={(v) => setMandateId(v === "_none" || !v ? undefined : v)}>
                  <SelectTrigger className="glass-input"><SelectValue placeholder="Select Mandate" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No Mandate (Unbound)</SelectItem>
                    {mandates.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.id.slice(0, 16)}...</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={() => void createAgent()} disabled={!identity} className="w-full bg-purple-500 hover:bg-purple-600 text-white border-none mt-2">
              <PlusCircle className="mr-2 h-4 w-4" /> Provision Agent
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400"><CheckCircle2 className="h-5 w-5" /></div>
              <CardTitle className="text-lg">Task & Run</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {agents.length > 0 ? (
              <>
                <div className="space-y-2">
                  <Label className="text-white/70">Target Agent</Label>
                  <Select value={selectedAgent ?? "_none"} onValueChange={(v) => setSelectedAgent(v === "_none" || !v ? undefined : v)}>
                    <SelectTrigger className="glass-input"><SelectValue placeholder="Select Agent" /></SelectTrigger>
                    <SelectContent>
                      {agents.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Task Name</Label>
                  <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} className="glass-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Instruction</Label>
                  <Input value={taskInstruction} onChange={(e) => setTaskInstruction(e.target.value)} className="glass-input" />
                </div>
                <div className="flex gap-3 mt-2">
                  <Button variant="secondary" onClick={() => void createTask()} disabled={!identity || !selectedAgent} className="flex-1 bg-white/10 hover:bg-white/20 text-white border-none">
                    <PlusCircle className="mr-2 h-4 w-4" /> Draft Task
                  </Button>
                  <Button onClick={() => void startRun()} disabled={!identity || !selectedAgent} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border-none">
                    <Play className="mr-2 h-4 w-4" /> Start Run
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-white/40 text-sm">
                <Bot className="h-8 w-8 mx-auto mb-3 text-white/20" />
                <p>No agents provisioned yet.</p>
                <p className="text-xs mt-1">Create an agent first, or click Refresh.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Registry */}
      {agents.length > 0 && (
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Agent Registry</CardTitle>
            <CardDescription>{agents.length} agent(s) provisioned</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5 max-h-[300px] overflow-auto">
              {agents.map((agent) => (
                <div key={agent.id} className={`p-4 hover:bg-white/[0.02] transition-colors cursor-pointer ${selectedAgent === agent.id ? 'bg-purple-500/5 border-l-2 border-l-purple-500' : ''}`}
                  onClick={() => setSelectedAgent(agent.id)}>
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm text-purple-400">{agent.label}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-white/60">{agent.model}</span>
                  </div>
                  <p className="text-xs text-white/40 font-mono mt-1">{agent.id}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Run Result */}
      {agentRun && (
        <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500"><Play className="h-5 w-5" /></div>
              <div>
                <CardTitle className="text-lg">Agent Execution Result</CardTitle>
                <CardDescription>Status: {agentRun.run.status}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-3 sm:grid-cols-3 mb-6">
              <div className="rounded border border-white/5 bg-white/[0.02] p-4 text-center">
                <p className="text-xs uppercase text-white/50 mb-1">Action</p>
                <p className="font-mono text-sm break-all">{agentRun.run.action}</p>
              </div>
              <div className="rounded border border-white/5 bg-white/[0.02] p-4 text-center">
                <p className="text-xs uppercase text-white/50 mb-1">Policy</p>
                <p className={`font-mono font-medium ${agentRun.run.policy_decision === 'allow' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {agentRun.run.policy_decision}
                </p>
              </div>
              <div className="rounded border border-white/5 bg-white/[0.02] p-4 text-center">
                <p className="text-xs uppercase text-white/50 mb-1">Status</p>
                <p className="font-mono font-medium text-white/80 uppercase">{agentRun.run.status}</p>
              </div>
            </div>
            {!!agentRun.run.output && (
              <div className="rounded-lg border border-white/5 bg-black/40 p-4 mb-4">
                <p className="text-sm font-medium text-white/70 mb-2">Agent Output</p>
                <pre className="text-sm font-mono whitespace-pre-wrap text-emerald-300">
                  {typeof agentRun.run.output === 'string' ? agentRun.run.output : JSON.stringify(agentRun.run.output, null, 2)}
                </pre>
              </div>
            )}
            <JsonBlock value={agentRun} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
