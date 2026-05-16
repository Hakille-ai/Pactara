import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { WorkflowResponse, WorkflowTemplate } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileCheck2, SquarePen, RefreshCw, BadgeCheck, XCircle } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"
import { toast } from "sonner"

export function WorkflowsPanel() {
  const { 
    identity, domains, workflowTemplates, workflows, setWorkflows, 
    workflowResult, setWorkflowResult, setPact 
  } = useAppStore()
  const { runAction } = useAction()

  const [domainId, setDomainId] = useState("economy")
  const [templateId, setTemplateId] = useState("")
  const [selectedWorkflow, setSelectedWorkflow] = useState("")
  const [title, setTitle] = useState("Guided economy settlement")
  const [target, setTarget] = useState("pactara:org:future-node")
  const [amount, setAmount] = useState(500)
  const [risk, setRisk] = useState("medium")
  const [notes, setNotes] = useState("reviewed from dashboard")

  const domainTemplates = workflowTemplates.filter((template) => template.domain_id === domainId)

  useEffect(() => {
    if (!templateId && domainTemplates[0]?.id) setTemplateId(domainTemplates[0].id)
  }, [domainTemplates, templateId])

  useEffect(() => {
    if (!selectedWorkflow && workflows[0]?.id) setSelectedWorkflow(workflows[0].id)
  }, [selectedWorkflow, workflows])

  async function createWorkflow() {
    if (!identity) return
    const response = await runAction(
      () =>
        pactaraFetch<WorkflowResponse>("/v1/workflows", {
          method: "POST",
          body: JSON.stringify({
            domain_id: domainId,
            template_id: templateId || null,
            actor: identity.id,
            target,
            title,
            payload: {
              guided: true,
              amount,
              risk,
              domain: domainId,
              requested_capabilities: ["pact", "proof", "audit", "runtime"],
            },
          }),
        }),
      "Guided workflow created."
    )
    if (response) {
      setWorkflowResult(response)
      setWorkflows([response.workflow, ...workflows.filter((item) => item.id !== response.workflow.id)])
      setSelectedWorkflow(response.workflow.id)
      if (response.pact) setPact(response.pact)
    }
  }

  async function loadWorkflow() {
    if (!selectedWorkflow) return
    const response = await runAction(
      () => pactaraFetch<WorkflowResponse>(`/v1/workflows/${selectedWorkflow}`),
      "Workflow loaded."
    )
    if (response) {
      setWorkflowResult(response)
      if (response.pact) setPact(response.pact)
    }
  }

  async function advanceWorkflow() {
    if (!selectedWorkflow) return
    const response = await runAction(
      () =>
        pactaraFetch<WorkflowResponse>(`/v1/workflows/${selectedWorkflow}/advance`, {
          method: "POST",
          body: JSON.stringify({
            output: {
              completed_by: identity?.id ?? "dashboard",
              notes,
              checkpoint: new Date().toISOString(),
            },
          }),
        }),
      "Workflow advanced."
    )
    if (response) {
      setWorkflowResult(response)
      setWorkflows(workflows.map((item) => (item.id === response.workflow.id ? response.workflow : item)))
    }
  }

  async function reviewWorkflow(decision: string) {
    if (!identity || !selectedWorkflow) return
    const response = await runAction(
      () =>
        pactaraFetch<WorkflowResponse>(`/v1/workflows/${selectedWorkflow}/review`, {
          method: "POST",
          body: JSON.stringify({
            reviewer: identity.id,
            decision,
            notes,
          }),
        }),
      `Workflow review recorded as ${decision}.`
    )
    if (response) {
      setWorkflowResult(response)
      setWorkflows(workflows.map((item) => (item.id === response.workflow.id ? response.workflow : item)))
    }
  }

  async function refreshWorkflows() {
    const loaded = await runAction(
      () => pactaraFetch<WorkflowResponse[]>("/v1/workflows?limit=20"),
      "Workflow list refreshed."
    )
    if (loaded) {
      setWorkflows(loaded.map(r => r.workflow))
      if (loaded[0]) setSelectedWorkflow(loaded[0].workflow.id)
    }
  }

  async function refreshTemplates() {
    const loaded = await runAction(
      () => pactaraFetch<WorkflowTemplate[]>("/v1/workflows/templates"),
      "Workflow templates refreshed."
    )
    if (loaded) {
      // Assuming setWorkflowTemplates exists in store
      useAppStore.getState().setWorkflowTemplates(loaded)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-2">
            Manage domain workflows, templates, and execution steps.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void refreshTemplates()} variant="secondary" size="sm" className="bg-white/5 hover:bg-white/10 text-white border-none">
            <RefreshCw className="mr-2 h-3 w-3" /> Templates
          </Button>
          <Button onClick={() => void refreshWorkflows()} variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-none">
            <RefreshCw className="mr-2 h-3 w-3" /> Workflows
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {domains.map((domain) => (
          <button
            key={domain.id}
            className={`rounded-xl border p-4 text-left transition-all duration-300 ${
              domain.id === domainId 
                ? "border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
            }`}
            onClick={() => {
              setDomainId(domain.id)
              const nextTemplate = workflowTemplates.find((t) => t.domain_id === domain.id)
              setTemplateId(nextTemplate?.id ?? "")
              setTitle(`${domain.label} guided workflow`)
            }}
          >
            <p className={`font-semibold ${domain.id === domainId ? 'text-primary' : 'text-foreground'}`}>
              {domain.label}
            </p>
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
              {domain.description}
            </p>
          </button>
        ))}
      </div>

      <Card className="glass-panel">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Workflow Details</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 sm:grid-cols-2 mb-6">
            <div className="space-y-2">
              <Label className="text-white/70">Template</Label>
              <Select value={templateId || "_none"} onValueChange={(v) => setTemplateId(v === "_none" || !v ? "" : v)}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Select Template</SelectItem>
                  {domainTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="glass-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Target</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} className="glass-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Amount / units</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="glass-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Risk</Label>
              <Select value={risk || "medium"} onValueChange={(v) => setRisk(v || "medium")}>
                <SelectTrigger className="glass-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Existing Workflow</Label>
              <Select value={selectedWorkflow || "_none"} onValueChange={(v) => setSelectedWorkflow(v === "_none" || !v ? "" : v)}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Select Workflow</SelectItem>
                  {workflows.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.title} ({w.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-white/70">Review / Step Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="glass-input" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void createWorkflow()} disabled={!identity} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <SquarePen className="mr-2 h-4 w-4" /> Create
            </Button>
            <Button variant="secondary" onClick={() => void loadWorkflow()} disabled={!selectedWorkflow} className="bg-white/10 hover:bg-white/20 text-white border-none">
              <RefreshCw className="mr-2 h-4 w-4" /> Load
            </Button>
            <Button variant="secondary" onClick={() => void advanceWorkflow()} disabled={!selectedWorkflow} className="bg-white/10 hover:bg-white/20 text-white border-none">
              <FileCheck2 className="mr-2 h-4 w-4" /> Advance
            </Button>
            <Button onClick={() => void reviewWorkflow("approve")} disabled={!identity || !selectedWorkflow} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-none">
              <BadgeCheck className="mr-2 h-4 w-4" /> Approve
            </Button>
            <Button onClick={() => void reviewWorkflow("reject")} disabled={!identity || !selectedWorkflow} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-none">
              <XCircle className="mr-2 h-4 w-4" /> Deny
            </Button>
          </div>
        </CardContent>
      </Card>

      {workflowResult && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid gap-3 sm:grid-cols-4">
            <Card className="glass-panel p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">Steps</p>
              <p className="text-2xl font-bold">{workflowResult.steps.length}</p>
            </Card>
            <Card className="glass-panel p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">Reviews</p>
              <p className="text-2xl font-bold">{workflowResult.reviews.length}</p>
            </Card>
            <Card className="glass-panel p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">Risk Score</p>
              <p className="text-2xl font-bold">{workflowResult.risk?.score ?? 0}</p>
            </Card>
            <Card className="glass-panel p-4 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground">Current Step</p>
              <p className="text-2xl font-bold font-mono text-sm break-all">{workflowResult.workflow.current_step}</p>
            </Card>
          </div>
          <JsonBlock value={workflowResult} />
        </div>
      )}
    </div>
  )
}
