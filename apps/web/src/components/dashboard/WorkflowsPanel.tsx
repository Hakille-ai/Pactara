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
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Workflows & <span className="accent-text-primary">Consensus</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Coordinate, review, and advance state machine actions across multiple network domain templates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => void refreshTemplates()} 
            variant="secondary" 
            size="sm" 
            className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 h-9 font-semibold tracking-wide btn-apple-spring rounded-lg text-xs"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5 text-primary stroke-[2.5]" /> Sync Templates
          </Button>
          <Button 
            onClick={() => void refreshWorkflows()} 
            variant="secondary" 
            size="sm" 
            className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 h-9 font-semibold tracking-wide btn-apple-spring rounded-lg text-xs"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5 text-primary stroke-[2.5]" /> Sync Active
          </Button>
        </div>
      </div>

      {/* Domain Selectors */}
      <div className="grid gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
        {domains.map((domain) => (
          <button
            key={domain.id}
            className={`rounded-2xl border p-5 text-left transition-all duration-300 relative overflow-hidden group ${
              domain.id === domainId 
                ? "border-primary/50 bg-primary/10 shadow-[0_4px_24px_rgba(var(--primary-rgb),0.15)]" 
                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"
            }`}
            onClick={() => {
              setDomainId(domain.id)
              const nextTemplate = workflowTemplates.find((t) => t.domain_id === domain.id)
              setTemplateId(nextTemplate?.id ?? "")
              setTitle(`${domain.label} guided workflow`)
            }}
          >
            <p className={`font-bold tracking-wide text-sm ${domain.id === domainId ? 'text-primary' : 'text-white/80'}`}>
              {domain.label}
            </p>
            <p className="mt-2 text-[11px] text-white/40 leading-relaxed font-medium">
              {domain.description}
            </p>
          </button>
        ))}
      </div>

      {/* Main Designer Form */}
      <Card className="glass-panel overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <FileCheck2 className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white tracking-wide">Configure Workflow Instance</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Target Template</Label>
              <Select value={templateId || "_none"} onValueChange={(v) => setTemplateId(v === "_none" || !v ? "" : v)}>
                <SelectTrigger className="glass-input h-10">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0b0b] border-white/10 text-white">
                  <SelectItem value="_none" className="focus:bg-white/5 hover:bg-white/5 transition-colors">Select Template</SelectItem>
                  {domainTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id} className="focus:bg-white/5 hover:bg-white/5 transition-colors">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Workflow Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-primary/20 text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Recipient Target Node</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-primary/20 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Volume Resource Units</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="glass-input h-10 px-3.5 focus:ring-primary/20 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Workflow Risk Category</Label>
              <Select value={risk || "medium"} onValueChange={(v) => setRisk(v || "medium")}>
                <SelectTrigger className="glass-input h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0b0b] border-white/10 text-white">
                  <SelectItem value="low" className="focus:bg-white/5 hover:bg-white/5 transition-colors">Low Risk</SelectItem>
                  <SelectItem value="medium" className="focus:bg-white/5 hover:bg-white/5 transition-colors">Medium Risk</SelectItem>
                  <SelectItem value="high" className="focus:bg-white/5 hover:bg-white/5 transition-colors">High Risk</SelectItem>
                  <SelectItem value="critical" className="focus:bg-white/5 hover:bg-white/5 transition-colors">Critical Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Active Instance Selection</Label>
              <Select value={selectedWorkflow || "_none"} onValueChange={(v) => setSelectedWorkflow(v === "_none" || !v ? "" : v)}>
                <SelectTrigger className="glass-input h-10">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0b0b] border-white/10 text-white">
                  <SelectItem value="_none" className="focus:bg-white/5 hover:bg-white/5 transition-colors">Select Workflow</SelectItem>
                  {workflows.map(w => (
                    <SelectItem key={w.id} value={w.id} className="focus:bg-white/5 hover:bg-white/5 transition-colors">{w.title} ({w.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Consensus Step Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-primary/20 text-xs" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-3 border-t border-white/5">
            <Button 
              onClick={() => void createWorkflow()} 
              disabled={!identity} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold tracking-wide h-10 px-5 rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <SquarePen className="mr-2 h-4.5 w-4.5 stroke-[2.5]" /> Launch Workflow
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => void loadWorkflow()} 
              disabled={!selectedWorkflow} 
              className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 font-semibold tracking-wide h-10 px-5 rounded-lg btn-apple-spring transition-all duration-300"
            >
              <RefreshCw className="mr-2 h-4 w-4 text-white/50 stroke-[2]" /> Load Instance
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => void advanceWorkflow()} 
              disabled={!selectedWorkflow} 
              className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 font-semibold tracking-wide h-10 px-5 rounded-lg btn-apple-spring transition-all duration-300"
            >
              <FileCheck2 className="mr-2 h-4 w-4 text-white/50 stroke-[2]" /> Advance Step
            </Button>
            <Button 
              onClick={() => void reviewWorkflow("approve")} 
              disabled={!identity || !selectedWorkflow} 
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold tracking-wide h-10 px-5 rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <BadgeCheck className="mr-2 h-4 w-4 stroke-[2.5]" /> Record Approval
            </Button>
            <Button 
              onClick={() => void reviewWorkflow("reject")} 
              disabled={!identity || !selectedWorkflow} 
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold tracking-wide h-10 px-5 rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <XCircle className="mr-2 h-4 w-4 stroke-[2.5]" /> Record Rejection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Results Block */}
      {workflowResult && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid gap-4.5 sm:grid-cols-4">
            <Card className="glass-panel p-5 flex flex-col justify-center relative overflow-hidden group">
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1">State Steps</p>
              <p className="text-3xl font-extrabold font-mono text-white tracking-tight">{workflowResult.steps.length}</p>
            </Card>
            <Card className="glass-panel p-5 flex flex-col justify-center relative overflow-hidden group">
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1">Signed Reviews</p>
              <p className="text-3xl font-extrabold font-mono text-white tracking-tight">{workflowResult.reviews.length}</p>
            </Card>
            <Card className="glass-panel p-5 flex flex-col justify-center relative overflow-hidden group">
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1">Weighted Risk</p>
              <p className="text-3xl font-extrabold font-mono text-white tracking-tight">{workflowResult.risk?.score ?? 0}</p>
            </Card>
            <Card className="glass-panel p-5 flex flex-col justify-center border border-white/5 relative overflow-hidden group">
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1">Current Active Step</p>
              <p className="text-xs font-bold font-mono text-white/80 select-all truncate mt-1 leading-normal">{workflowResult.workflow.current_step}</p>
            </Card>
          </div>
          <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
            <JsonBlock value={workflowResult} />
          </div>
        </div>
      )}
    </div>
  )
}
