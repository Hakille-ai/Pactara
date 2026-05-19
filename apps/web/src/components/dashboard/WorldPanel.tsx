import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { WorldScenario, ScenarioRun } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, PlayCircle } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function WorldPanel() {
  const { 
    identity, domains, worldScenarios, worldScenario, setWorldScenario,
    scenarioRun, setScenarioRun
  } = useAppStore()
  const { runAction } = useAction()

  const [domainId, setDomainId] = useState("economy")
  const [targetAccount, setTargetAccount] = useState("pactara:org:future-node")
  const [amount, setAmount] = useState(5000)
  const [selectedScenario, setSelectedScenario] = useState("")

  useEffect(() => {
    if (!selectedScenario && worldScenarios[0]?.id) setSelectedScenario(worldScenarios[0].id)
  }, [worldScenarios, selectedScenario])

  async function createScenario() {
    if (!identity) return
    const response = await runAction(
      () =>
        pactaraFetch<WorldScenario>("/v1/world/scenarios", {
          method: "POST",
          body: JSON.stringify({
            domain_id: domainId,
            creator: identity.id,
            title: `Stress test ${domainId}`,
            configuration: {
              target_account: targetAccount,
              volume: amount,
            },
          }),
        }),
      "Scenario created."
    )
    if (response) {
      setWorldScenario(response)
    }
  }

  async function runScenario() {
    if (!selectedScenario) return
    const response = await runAction(
      () =>
        pactaraFetch<ScenarioRun>(`/v1/world/scenarios/${selectedScenario}/run`, {
          method: "POST",
        }),
      "Scenario executed."
    )
    if (response) {
      setScenarioRun(response)
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          World <span className="accent-text-violet-pink">Scenarios</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Synthesize decentralized simulations, stress test protocol nodes, and audit state transitions.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        {/* Left Side: Create Simulation Scenario */}
        <Card className="glass-panel-glow overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Globe className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Synthesize Scenario</CardTitle>
                <CardDescription className="text-white/40 text-xs">Configure parameters for protocol stress test run.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Target Domain</Label>
              <Select value={domainId} onValueChange={(v) => setDomainId(v || "")}>
                <SelectTrigger className="glass-input h-10">
                  <SelectValue placeholder="Select Domain" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0b0b] border-white/10 text-white">
                  {domains.map(d => (
                    <SelectItem key={d.id} value={d.id} className="focus:bg-white/5 hover:bg-white/5 transition-colors">{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Target Protocol Account</Label>
              <Input value={targetAccount} onChange={(e) => setTargetAccount(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-indigo-500/20 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Simulation Stress Volume</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="glass-input h-10 px-3.5 focus:ring-indigo-500/20 font-mono text-xs" />
            </div>
            <Button 
              onClick={() => void createScenario()} 
              disabled={!identity} 
              className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(99,102,241,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <Globe className="mr-2 h-4 w-4 stroke-[2.5]" /> Create Simulation Scenario
            </Button>
          </CardContent>
        </Card>

        {/* Right Side: Run Execution Scenario */}
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                <PlayCircle className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Execute Simulator</CardTitle>
                <CardDescription className="text-white/40 text-xs">Run synthesized simulations against local ledger.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Active Simulation Scenario</Label>
              <Select value={selectedScenario} onValueChange={(v) => setSelectedScenario(v || "")}>
                <SelectTrigger className="glass-input h-10">
                  <SelectValue placeholder="Select a scenario to run" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0b0b] border-white/10 text-white">
                  {worldScenarios.map(s => (
                    <SelectItem key={s.id} value={s.id} className="focus:bg-white/5 hover:bg-white/5 transition-colors">{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => void runScenario()} 
              disabled={!selectedScenario} 
              className="w-full h-10 bg-rose-500 hover:bg-rose-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(244,63,94,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <PlayCircle className="mr-2 h-4 w-4 stroke-[2.5]" /> Launch State Simulation
            </Button>

            {scenarioRun && (
              <div className="space-y-2.5 pt-4 border-t border-white/5 animate-in fade-in zoom-in-95 duration-500">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">Simulation Diagnostic Result</span>
                <JsonBlock value={scenarioRun} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
