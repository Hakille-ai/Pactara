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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Policy Studio</h1>
        <p className="text-muted-foreground mt-2">
          Manage dynamic access control rules and evaluate contextual policies.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-500/10 text-rose-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Draft Rule</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Rule Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="glass-input" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Effect</Label>
                <Select value={effect} onValueChange={(v) => setEffect(v || "")}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allow">Allow</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                    <SelectItem value="deny">Deny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Risk Condition</Label>
                <Select value={risk} onValueChange={(v) => setRisk(v || "")}>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Action</Label>
                <Input value={action} onChange={(e) => setAction(e.target.value)} className="glass-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Resource</Label>
                <Input value={resource} onChange={(e) => setResource(e.target.value)} className="glass-input font-mono" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Priority (Higher executes first)</Label>
              <Input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="glass-input" />
            </div>
            
            <div className="flex gap-3 mt-4">
              <Button onClick={() => void createRule()} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white border-none">
                <ShieldCheck className="mr-2 h-4 w-4" /> Create Rule
              </Button>
              <Button onClick={() => void evaluate()} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white border-none">
                <Activity className="mr-2 h-4 w-4" /> Evaluate
              </Button>
              <Button variant="secondary" onClick={() => void refreshRules()} className="bg-white/10 hover:bg-white/20 text-white border-none">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {decision && (
            <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Evaluation Decision</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className={`rounded-lg border p-6 flex flex-col items-center justify-center text-center mb-4 ${
                  decision.decision === 'allow' ? 'border-emerald-500/30 bg-emerald-500/10' :
                  decision.decision === 'needs_review' ? 'border-amber-500/30 bg-amber-500/10' :
                  'border-red-500/30 bg-red-500/10'
                }`}>
                  {decision.decision === 'allow' ? (
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                  ) : (
                    <AlertTriangle className={`h-10 w-10 mb-2 ${decision.decision === 'needs_review' ? 'text-amber-500' : 'text-red-500'}`} />
                  )}
                  <h3 className={`text-xl font-bold uppercase ${
                    decision.decision === 'allow' ? 'text-emerald-400' :
                    decision.decision === 'needs_review' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>
                    {decision.decision.replace('_', ' ')}
                  </h3>
                  {decision.reasons.length > 0 && (
                    <p className="text-sm text-white/60 mt-2">{decision.reasons.join(", ")}</p>
                  )}
                </div>
                <JsonBlock value={decision} />
              </CardContent>
            </Card>
          )}

          <Card className="glass-panel overflow-hidden">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
              <CardTitle className="text-lg">Rule Registry</CardTitle>
              <CardDescription>All active rules evaluated by the engine.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {rules.length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm">
                  No policy rules found.
                </div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[400px] overflow-auto">
                  {rules.map((rule) => (
                    <div key={rule.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          rule.effect === 'allow' ? 'bg-emerald-500/20 text-emerald-400' :
                          rule.effect === 'needs_review' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {rule.effect.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] uppercase font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded">
                          Priority {rule.priority}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white/90">{rule.name}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-white/50 font-mono">
                        <span>{rule.action}</span>
                        <span>→</span>
                        <span className="truncate">{rule.resource}</span>
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
