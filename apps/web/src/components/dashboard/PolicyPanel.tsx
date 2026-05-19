import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { PolicyRule, PolicyDecision } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldCheck, Activity, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function PolicyPanel() {
  const { identity, policyRules: rules, setPolicyRules: setRules, policyDecision: decision, setPolicyDecision: setDecision } = useAppStore()
  const { runAction } = useAction()

  const [name, setName] = useState("Require review for high-risk actions")
  const [effect, setEffect] = useState("needs_review")
  const [action, setAction] = useState("transfer")
  const [resource, setResource] = useState("*")
  const [priority, setPriority] = useState(50)
  const [risk, setRisk] = useState("high")

  async function refreshRules() {
    const loaded = await runAction(
      () => pactaraFetch<PolicyRule[]>("/v1/policies/rules?limit=50"),
      "Policy rules refreshed."
    )
    if (loaded) {
      setRules(loaded)
    }
  }

  async function createRule() {
    const rule = await runAction(
      () =>
        pactaraFetch<PolicyRule>("/v1/policies/rules", {
          method: "POST",
          body: JSON.stringify({
            name,
            effect,
            action,
            resource,
            priority,
            condition: { risk },
          }),
        }),
      "Policy rule created."
    )
    if (rule) {
      setRules([rule, ...rules])
    }
  }

  async function evaluate() {
    const evaluated = await runAction(
      () =>
        pactaraFetch<PolicyDecision>("/v1/policies/evaluate", {
          method: "POST",
          body: JSON.stringify({
            subject_id: identity?.id ?? "pactara:anonymous",
            action,
            resource,
            context: { risk },
          }),
        }),
      "Policy evaluated with persistent precedence."
    )
    if (evaluated) {
      setDecision(evaluated)
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Policy <span className="accent-text-cyan-teal">Studio</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Define contextual authorization rule layers and evaluate granular access control decisions dynamically.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        {/* Policy Rule Editor */}
        <Card className="glass-panel-glow overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldCheck className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Draft Security Rule</CardTitle>
                <CardDescription className="text-white/40 text-xs">Define a new contextual authorization rule inside the sandbox ledger.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4.5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Rule Label Title</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-rose-500/20 text-xs" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Rule Effect</Label>
                <Select value={effect} onValueChange={(v) => setEffect(v || "")}>
                  <SelectTrigger className="glass-input h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b0b0b] border-white/10 text-white">
                    <SelectItem value="allow" className="focus:bg-white/5 hover:bg-white/5 transition-colors">Allow</SelectItem>
                    <SelectItem value="needs_review" className="focus:bg-white/5 hover:bg-white/5 transition-colors">Needs Review</SelectItem>
                    <SelectItem value="deny" className="focus:bg-white/5 hover:bg-white/5 transition-colors">Deny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Risk Threshold</Label>
                <Select value={risk} onValueChange={(v) => setRisk(v || "")}>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Action Identifier</Label>
                <Input value={action} onChange={(e) => setAction(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-rose-500/20 text-xs font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Resource Pattern</Label>
                <Input value={resource} onChange={(e) => setResource(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-rose-500/20 text-xs font-mono" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Precedence Priority Weight</Label>
              <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="glass-input h-10 px-3.5 focus:ring-rose-500/20 font-mono text-xs" />
            </div>
            
            <div className="flex gap-3 pt-3">
              <Button 
                onClick={() => void createRule()} 
                className="flex-1 h-10 bg-rose-500 hover:bg-rose-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(244,63,94,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
              >
                <ShieldCheck className="mr-2 h-4 w-4 stroke-[2.5]" /> Deploy Rule
              </Button>
              <Button 
                onClick={() => void evaluate()} 
                className="flex-1 h-10 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(99,102,241,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
              >
                <Activity className="mr-2 h-4 w-4 stroke-[2.5]" /> Evaluate Engine
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => void refreshRules()} 
                className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 h-10 w-10 shrink-0 p-0 flex items-center justify-center rounded-lg transition-all duration-300 btn-apple-spring"
              >
                <RefreshCw className="h-4.5 w-4.5 text-rose-400 stroke-[2.5]" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rule Decisions & Registry */}
        <div className="space-y-8">
          {decision && (
            <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <CardTitle className="text-base font-bold text-white tracking-wide">Dynamic Evaluation Consensus</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className={`rounded-xl border p-6 flex flex-col items-center justify-center text-center shadow-[0_4px_24px_rgba(0,0,0,0.3)] ${
                  decision.decision === 'allow' ? 'border-emerald-500/20 bg-emerald-500/[0.02] text-emerald-400' :
                  decision.decision === 'needs_review' ? 'border-amber-500/20 bg-amber-500/[0.02] text-amber-400' :
                  'border-rose-500/20 bg-rose-500/[0.02] text-rose-400'
                }`}>
                  {decision.decision === 'allow' ? (
                    <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2 stroke-[2]" />
                  ) : (
                    <AlertTriangle className={`h-10 w-10 mb-2 stroke-[2] ${decision.decision === 'needs_review' ? 'text-amber-400' : 'text-rose-400'}`} />
                  )}
                  <h3 className={`text-lg font-bold uppercase tracking-wider ${
                    decision.decision === 'allow' ? 'text-emerald-400' :
                    decision.decision === 'needs_review' ? 'text-amber-400' :
                    'text-rose-400'
                  }`}>
                    {decision.decision.replace('_', ' ')}
                  </h3>
                  {decision.reasons.length > 0 && (
                    <p className="text-xs text-white/50 mt-2 font-medium bg-white/5 px-3 py-1 rounded-full border border-white/10">{decision.reasons.join(", ")}</p>
                  )}
                </div>
                <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
                  <JsonBlock value={decision} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-panel overflow-hidden">
            <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
              <CardTitle className="text-base font-bold text-white tracking-wide">Registry Rules Matrix</CardTitle>
              <CardDescription className="text-white/40 text-xs">All active rule constraints evaluated inside the local engine ledger.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {rules.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center min-h-[220px] gap-2 border border-white/5 border-dashed rounded-xl bg-black/20 m-6">
                  <ShieldCheck className="h-6 w-6 text-white/20 animate-pulse" />
                  <p className="text-xs text-white/30">No active access control rules compiled inside the registry.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[380px] overflow-auto">
                  {rules.map((rule) => (
                    <div key={rule.id} className="p-5 hover:bg-white/[0.01] transition-all duration-300 relative group">
                      <div className="flex justify-between items-center mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          rule.effect === 'allow' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          rule.effect === 'needs_review' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {rule.effect.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] uppercase font-bold font-mono text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                          W_ {rule.priority}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white/90 select-all leading-normal">{rule.name}</p>
                      <div className="flex items-center gap-2 mt-2.5 text-[10px] text-white/30 font-mono select-all">
                        <span className="bg-white/5 px-2 py-0.5 rounded text-white/50">{rule.action}</span>
                        <span>→</span>
                        <span className="truncate bg-white/5 px-2 py-0.5 rounded text-white/50">{rule.resource}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
