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
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Agent <span className="accent-text-gold-orange">Delegation Mandates</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Delegate authority to autonomous AI agents with scoped execution parameters.
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => void refreshMandates()} 
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4 text-amber-400" /> Sync Mandates Registry
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Left Side: Create Mandate Form */}
        <Card className="glass-panel-glow lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <BadgeCheck className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Issue Mandate Token</CardTitle>
                <CardDescription className="text-white/40 text-xs">Define agent operational boundaries.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Principal Identifier ID</Label>
                <Input value={identity?.id ?? "No sovereign identity active"} readOnly className="glass-input h-10 px-3.5 focus:ring-amber-500/20 font-mono text-xs opacity-60 bg-black/40" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Target Agent Identifier ID</Label>
                <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-amber-500/20 font-mono text-xs" placeholder="agent:id:..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Mandate Expiration Date</Label>
              <Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-amber-500/20 text-white/80" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Policy Capabilities (JSON)</Label>
              <Textarea 
                value={scopeJson} 
                onChange={(e) => setScopeJson(e.target.value)} 
                className="glass-input min-h-[120px] p-3 resize-none focus:ring-amber-500/20 font-mono text-xs bg-black/40" 
              />
            </div>
            
            <div className="flex gap-4 pt-2">
              <Button 
                onClick={() => void createAgent()} 
                variant="secondary" 
                className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 rounded-lg btn-apple-spring text-xs"
              >
                <Bot className="mr-2 h-4 w-4 stroke-[2]" /> Demo Agent
              </Button>
              <Button 
                onClick={() => void createMandate()} 
                disabled={!identity || !agentId} 
                className="flex-[2] h-10 bg-amber-500 hover:bg-amber-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(251,191,36,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
              >
                <BadgeCheck className="mr-2 h-4 w-4 stroke-[2.5]" /> Issue Cryptographic Mandate
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Active Mandates Registry */}
        <Card className="glass-panel lg:col-span-2 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <CardTitle className="text-base font-bold text-white tracking-wide">Registry Mandates</CardTitle>
            <CardDescription className="text-white/40 text-xs">Verify issued authority delegations.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {mandates.length === 0 ? (
              <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center justify-center min-h-[260px] gap-3 border border-white/5 border-dashed rounded-2xl bg-black/20 m-6">
                <BadgeCheck className="h-6 w-6 stroke-[1.5] text-white/20 animate-pulse" />
                <p className="max-w-[200px] leading-relaxed">No active authority mandates issued on this node registry yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[520px] overflow-auto">
                {mandates.map((mandate) => (
                  <div key={mandate.id} className="p-5 hover:bg-white/[0.01] transition-all duration-300 relative group">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="status-led status-led-green scale-75" />
                        <span className="font-mono text-[10px] font-bold tracking-widest text-amber-400 uppercase">ACTIVE DELEGATION</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/30">Exp: {new Date(mandate.expires_at).toLocaleDateString()}</span>
                    </div>
                    <div className="space-y-1.5 mb-3.5">
                      <div className="text-[10px] font-mono text-white/55 truncate">
                        <span className="text-white/30">PRINCIPAL: </span>
                        <span className="select-all">{mandate.principal}</span>
                      </div>
                      <div className="text-[10px] font-mono text-white/55 truncate">
                        <span className="text-white/30">DELEGATE: </span>
                        <span className="text-amber-300/80 select-all">{mandate.agent}</span>
                      </div>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 text-[10.5px] font-mono text-white/50 break-all overflow-hidden leading-relaxed shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
                      {JSON.stringify(mandate.scope, null, 2)}
                    </div>
                    <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <BadgeCheck className="h-4 w-4 text-amber-500/40" />
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
