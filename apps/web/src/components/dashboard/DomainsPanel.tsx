import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { DomainActionTemplate, DomainActionResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layers, RefreshCw, SquarePen } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"
import { toast } from "sonner"

export function DomainsPanel() {
  const { identity, domains, domainTemplates, setDomainTemplates, domainAction, setDomainAction, setPact } = useAppStore()
  const { runAction } = useAction()

  const [domainId, setDomainId] = useState("economy")
  const [templateId, setTemplateId] = useState("")
  const [actionType, setActionType] = useState("trade.create")
  const [target, setTarget] = useState("pactara:org:civilization-node")
  const [payloadJson, setPayloadJson] = useState('{"asset":"PACT","amount":250,"purpose":"civilization operating layer"}')

  useEffect(() => {
    const selected = domainTemplates.find((t) => t.id === templateId)
    if (selected) setActionType(selected.action_type)
  }, [templateId, domainTemplates])

  async function loadTemplates(nextDomainId = domainId) {
    const loaded = await runAction(
      () => pactaraFetch<DomainActionTemplate[]>(`/v1/domains/${nextDomainId}/actions`),
      "Domain action templates loaded."
    )
    if (loaded) {
      setDomainTemplates(loaded)
      if (loaded[0]) { setTemplateId(loaded[0].id); setActionType(loaded[0].action_type) }
    }
  }

  async function createAction() {
    if (!identity) {
      toast.error("Identity Required", { description: "Create an identity first." })
      return
    }
    let parsedPayload = {}
    try { parsedPayload = JSON.parse(payloadJson) } catch { /* */ }
    const response = await runAction(
      () => pactaraFetch<DomainActionResponse>(`/v1/domains/${domainId}/actions`, {
        method: "POST",
        body: JSON.stringify({ actor: identity.id, target, action_type: actionType, template_id: (templateId && templateId !== "_custom") ? templateId : null, payload: parsedPayload }),
      }),
      "Domain action created."
    )
    if (response) { 
      setDomainAction(response)
      setPact(response.pact) 
      toast.success("Action Executed", { description: `Domain action ${actionType} is backed by PACT.` })
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Civilization <span className="accent-text-cyan-teal">Domains</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Execute domain-specific actions cryptographically backed by sovereign PACTs.
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => void loadTemplates()} 
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4 text-cyan-400" /> Sync Templates
        </Button>
      </div>

      {/* Domain Grid Selection */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {domains.map((domain) => {
          const isSelected = domain.id === domainId;
          return (
            <button 
              key={domain.id}
              className={`rounded-xl border p-4.5 text-left transition-all duration-300 relative overflow-hidden select-none btn-apple-spring ${
                isSelected 
                  ? "border-cyan-500/30 bg-cyan-950/15 shadow-[0_8px_32px_rgba(6,182,212,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]" 
                  : "border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10"
              }`}
              onClick={() => { setDomainId(domain.id); void loadTemplates(domain.id) }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`font-bold text-sm tracking-wide ${isSelected ? 'text-cyan-400 font-extrabold' : 'text-white/80'}`}>{domain.label}</p>
                {isSelected && <span className="status-led status-led-blue scale-75" />}
              </div>
              <p className="mt-2 text-xs text-white/40 leading-relaxed line-clamp-2">{domain.description}</p>
              {isSelected && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500" />}
            </button>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Domain Action Configuration */}
        <Card className="glass-panel-glow lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Layers className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Compose Action</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Action Template</Label>
                <Select value={templateId || "_custom"} onValueChange={(v) => setTemplateId(v === "_custom" || !v ? "" : v)}>
                  <SelectTrigger className="glass-input h-10 focus:ring-cyan-500/20 text-white/80">
                    <SelectValue placeholder="Custom action template" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b0b0b] border-white/5 text-white/85">
                    <SelectItem value="_custom">Custom Action</SelectItem>
                    {domainTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Action Name Type</Label>
                <Input value={actionType} onChange={(e) => setActionType(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-cyan-500/20" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Target Resource URI</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-cyan-500/20 font-mono text-xs" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Action Payload (JSON)</Label>
              <Textarea value={payloadJson} onChange={(e) => setPayloadJson(e.target.value)} className="glass-input min-h-[110px] p-3 resize-none focus:ring-cyan-500/20 font-mono text-xs bg-black/40" />
            </div>

            <Button 
              onClick={() => void createAction()} 
              disabled={!identity} 
              className="w-full h-10 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(6,182,212,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <SquarePen className="mr-2 h-4 w-4 stroke-[2.5]" /> Instantiate Domain Action
            </Button>
          </CardContent>
        </Card>

        {/* Action Result / Ledger Monitor */}
        <div className="lg:col-span-2 space-y-6">
          {domainAction ? (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-500">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">Verifiable Domain PACT</span>
              <JsonBlock value={domainAction} />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#080808]/60 p-8 text-center flex flex-col items-center justify-center min-h-[220px] text-white/30 gap-3 border-dashed">
              <Layers className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
              <p className="text-xs max-w-[200px] leading-relaxed">No action triggered for this civilization domain zone.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
