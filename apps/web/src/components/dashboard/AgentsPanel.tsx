import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { AgentProfile, AgentRunResponse, AgentTask, AgentTaskResponse, AgentTaskRunResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bot, Play, Search, PlusCircle, CheckCircle2 } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function AgentsPanel() {
  const { 
    identity, mandates, agents, setAgents,
    agentTasks, setAgentTasks, agentTask, setAgentTask,
    agentRun, setAgentRun, agentTaskRun, setAgentTaskRun
  } = useAppStore()
  const { runAction } = useAction()

  const [agentName, setAgentName] = useState("Negotiator-01")
  const [modelName, setModelName] = useState("gpt-4o")
  const [mandateId, setMandateId] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("")
  const [taskName, setTaskName] = useState("Evaluate pricing")
  const [taskInstruction, setTaskInstruction] = useState("Analyze the terms and output decision")

  useEffect(() => {
    if (!mandateId && mandates[0]?.id) setMandateId(mandates[0].id)
  }, [mandates, mandateId])

  useEffect(() => {
    if (!selectedAgent && agents[0]?.id) setSelectedAgent(agents[0].id)
  }, [agents, selectedAgent])

  async function createAgent() {
    if (!identity) return
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
    }
  }

  async function createTask() {
    if (!identity || !selectedAgent) return
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
    }
  }

  async function startRun() {
    if (!identity || !selectedAgent) return
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
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
        <p className="text-muted-foreground mt-2">
          Provision sovereign AI agents and assign them verifiable tasks under your identity mandates.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Create Agent</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Agent Name</Label>
              <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} className="glass-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Model</Label>
              <Select value={modelName} onValueChange={(v) => setModelName(v || "")}>
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo (OpenAI)</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus (Anthropic)</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet (Anthropic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Operating Mandate</Label>
              <Select value={mandateId} onValueChange={(v) => setMandateId(v || "")}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select Mandate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Mandate (Unbound)</SelectItem>
                  {mandates.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void createAgent()} disabled={!identity} className="w-full bg-purple-500 hover:bg-purple-600 text-white border-none mt-2">
              <PlusCircle className="mr-2 h-4 w-4" /> Provision Agent
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Task Assignment</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Target Agent</Label>
              <Select value={selectedAgent} onValueChange={(v) => setSelectedAgent(v || "")}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select an Agent" />
                </SelectTrigger>
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
          </CardContent>
        </Card>
      </div>

      {agentRun && (
        <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2 mt-4">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Agent Run Execution</CardTitle>
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
                <p className="text-xs uppercase text-white/50 mb-1">Policy Auth</p>
                <p className={`font-mono font-medium ${agentRun.run.policy_decision === 'allow' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {agentRun.run.policy_decision}
                </p>
              </div>
            </div>
            
            {agentRun.run.output ? (
              <div className="rounded-lg border border-white/5 bg-black/40 p-4">
                <p className="text-sm font-medium text-white/70 mb-2">Agent Output</p>
                <pre className="text-sm font-mono whitespace-pre-wrap text-emerald-300">
                  {typeof agentRun.run.output === 'string' ? agentRun.run.output : JSON.stringify(agentRun.run.output, null, 2)}
                </pre>
              </div>
            ) : null}
            
            <div className="mt-4">
               <JsonBlock value={agentRun} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
