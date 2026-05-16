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
    if (!identity) return
    let parsedPayload = {}
    try { parsedPayload = JSON.parse(payloadJson) } catch { /* */ }
    const response = await runAction(
      () => pactaraFetch<DomainActionResponse>(`/v1/domains/${domainId}/actions`, {
        method: "POST",
        body: JSON.stringify({ actor: identity.id, target, action_type: actionType, template_id: templateId || null, payload: parsedPayload }),
      }),
      "Domain action created with backing PACT."
    )
    if (response) { setDomainAction(response); setPact(response.pact) }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Civilization Domains</h1>
        <p className="text-muted-foreground mt-2">Execute domain-specific actions backed by sovereign PACTs.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {domains.map((domain) => (
          <button key={domain.id}
            className={`rounded-xl border p-4 text-left transition-all duration-300 ${domain.id === domainId ? "border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10"}`}
            onClick={() => { setDomainId(domain.id); void loadTemplates(domain.id) }}>
            <p className={`font-semibold ${domain.id === domainId ? 'text-primary' : 'text-foreground'}`}>{domain.label}</p>
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{domain.description}</p>
          </button>
        ))}
      </div>

      <Card className="glass-panel">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-400"><Layers className="h-5 w-5" /></div>
            <CardTitle className="text-lg">Domain Action</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white/70">Template</Label>
              <Select value={templateId} onValueChange={(v) => setTemplateId(v || "")}><SelectTrigger className="glass-input"><SelectValue placeholder="Custom action" /></SelectTrigger>
                <SelectContent><SelectItem value="">Custom action</SelectItem>{domainTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-white/70">Action Type</Label><Input value={actionType} onChange={(e) => setActionType(e.target.value)} className="glass-input" /></div>
            <div className="space-y-2"><Label className="text-white/70">Target</Label><Input value={target} onChange={(e) => setTarget(e.target.value)} className="glass-input font-mono text-sm" /></div>
          </div>
          <div className="space-y-2"><Label className="text-white/70">Payload JSON</Label><Textarea value={payloadJson} onChange={(e) => setPayloadJson(e.target.value)} className="glass-input font-mono text-xs min-h-[100px] resize-none" /></div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => void loadTemplates()} className="bg-white/10 hover:bg-white/20 text-white border-none"><RefreshCw className="mr-2 h-4 w-4" /> Templates</Button>
            <Button onClick={() => void createAction()} disabled={!identity} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white border-none"><SquarePen className="mr-2 h-4 w-4" /> Create Action</Button>
          </div>
        </CardContent>
      </Card>

      {domainAction && <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2"><CardContent className="p-0"><div className="p-4 bg-black/40"><JsonBlock value={domainAction} /></div></CardContent></Card>}
    </div>
  )
}
