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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">World Scenarios</h1>
        <p className="text-muted-foreground mt-2">
          Simulate state transitions and stress-test the protocol.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Create Scenario</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Domain</Label>
              <Select value={domainId} onValueChange={(v) => setDomainId(v || "")}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select Domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Target Account</Label>
              <Input value={targetAccount} onChange={(e) => setTargetAccount(e.target.value)} className="glass-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Volume</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="glass-input" />
            </div>
            <Button onClick={() => void createScenario()} disabled={!identity} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white border-none mt-2">
              <Globe className="mr-2 h-4 w-4" /> Create Simulation
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-500/10 text-rose-400">
                <PlayCircle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Run Execution</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Select Scenario</Label>
              <Select value={selectedScenario} onValueChange={(v) => setSelectedScenario(v || "")}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select a scenario to run" />
                </SelectTrigger>
                <SelectContent>
                  {worldScenarios.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void runScenario()} disabled={!selectedScenario} className="w-full bg-rose-500 hover:bg-rose-600 text-white border-none mt-2">
              <PlayCircle className="mr-2 h-4 w-4" /> Execute Run
            </Button>

            {scenarioRun && (
              <div className="mt-6">
                <p className="text-sm font-medium mb-2 text-white/80">Execution Results</p>
                <JsonBlock value={scenarioRun} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
