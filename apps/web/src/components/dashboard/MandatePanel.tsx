import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { Mandate, Identity } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Bot, BadgeCheck, RefreshCw } from "lucide-react"

export function MandatePanel() {
  const { identity, mandates, setMandates } = useAppStore()
  const { runAction } = useAction()

  const [agentId, setAgentId] = useState("")
  const [expiresAt, setExpiresAt] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 16))
  const [scopeJson, setScopeJson] = useState(
    '{\n  "can": ["compare_prices", "negotiate_terms"],\n  "cannot": ["sign_contract", "share_private_data"],\n  "max_value": "1000 EUR"\n}'
  )

  async function createAgent() {
    const created = await runAction(
      () =>
        pactaraFetch<Identity>("/v1/identities", {
          method: "POST",
          body: JSON.stringify({ label: "PACTARA Negotiator Agent", kind: "agent" }),
        }),
      "Agent identity created."
    )
    if (created) {
      setAgentId(created.id)
    }
  }

  async function createMandate() {
    if (!identity || !agentId) return
    
    let parsedScope = {}
    try {
      parsedScope = JSON.parse(scopeJson)
    } catch {
      // API fallback
    }

    const created = await runAction(
      () =>
        pactaraFetch<Mandate>("/v1/mandates", {
          method: "POST",
          body: JSON.stringify({
            principal: identity.id,
            agent: agentId,
            scope: parsedScope,
            expires_at: new Date(expiresAt).toISOString(),
          }),
        }),
      "Mandate created."
    )
    if (created) {
      setMandates([created, ...mandates])
    }
  }

  async function refreshMandates() {
    const next = await runAction(
      () => pactaraFetch<Mandate[]>("/v1/mandates"),
      "Mandate registry refreshed."
    )
    if (next) {
      setMandates(next)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Mandates</h1>
        <p className="text-muted-foreground mt-2">
          Delegate cryptographic authority to autonomous AI agents with precise scopes.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Create Mandate</CardTitle>
                <CardDescription>Authorize an agent to act on your behalf.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Principal Identity</Label>
              <Input value={identity?.id ?? "none"} readOnly className="glass-input font-mono text-sm opacity-70" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-white/70">Agent Identity</Label>
              <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} className="glass-input font-mono text-sm" placeholder="agent:id:..." />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Expiration</Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="glass-input" />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Scope JSON</Label>
              <Textarea 
                value={scopeJson} 
                onChange={(e) => setScopeJson(e.target.value)} 
                className="glass-input font-mono text-xs min-h-[120px] resize-none" 
              />
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4">
              <Button onClick={() => void createAgent()} variant="secondary" className="flex-1 bg-white/10 hover:bg-white/20 text-white border-none text-xs">
                <Bot className="mr-2 h-4 w-4" /> Demo Agent
              </Button>
              <Button onClick={() => void createMandate()} disabled={!identity || !agentId} className="flex-[2] bg-purple-500 hover:bg-purple-600 text-white border-none">
                <BadgeCheck className="mr-2 h-4 w-4" /> Create Mandate
              </Button>
              <Button variant="secondary" onClick={() => void refreshMandates()} className="bg-white/10 hover:bg-white/20 text-white border-none">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Active Mandates</CardTitle>
            <CardDescription>Registry of issued delegations.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {mandates.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm">
                No active mandates.
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[500px] overflow-auto">
                {mandates.map((mandate) => (
                  <div key={mandate.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-sm text-purple-400">Delegation</span>
                      <span className="text-xs text-white/40">Expires {new Date(mandate.expires_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-white/60 mb-1">
                      <span className="text-white/40">Principal: </span>
                      <span className="font-mono">{mandate.principal}</span>
                    </div>
                    <div className="text-xs text-white/60 mb-2">
                      <span className="text-white/40">Agent: </span>
                      <span className="font-mono text-purple-300">{mandate.agent}</span>
                    </div>
                    <div className="bg-black/30 rounded p-2 text-xs font-mono text-white/50 break-all overflow-hidden mt-2">
                      {JSON.stringify(mandate.scope)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
