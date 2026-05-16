import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch, parseJsonField } from "@/lib/pactara-api"
import type { Pact } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SquarePen } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"
import { toast } from "sonner"

export function PactPanel() {
  const { identity, pact, setPact } = useAppStore()
  const { runAction } = useAction()

  const [intent, setIntent] = useState("trade.sell")
  const [target, setTarget] = useState("pactara:org:buyer-demo")
  const [objectJson, setObjectJson] = useState('{\n  "batch": "cacao-001",\n  "quantity": "500kg"\n}')
  const [termsJson, setTermsJson] = useState('{\n  "price": "market-index-minus-3%",\n  "delivery": "Dakar -> Marseille"\n}')
  const [isLoading, setIsLoading] = useState(false)

  async function createPact() {
    if (!identity) {
      toast.error("Identity Required", { description: "You must create an identity first." })
      return
    }
    
    setIsLoading(true)
    const created = await runAction(
      () =>
        pactaraFetch<Pact>("/v1/pacts", {
          method: "POST",
          body: JSON.stringify({
            actor: identity.id,
            intent,
            object: parseJsonField(objectJson, {}),
            target,
            terms: parseJsonField(termsJson, {}),
            consent: { mode: "explicit", revocable: true },
            proof: { origin: "self_attested", protocol: "PACTARA" },
          }),
        }),
      "PACT draft created successfully."
    )
    if (created) {
      setPact(created)
      toast.success("PACT Created", { description: "Draft PACT is ready for signature." })
    }
    setIsLoading(false)
  }

  async function syncPacts() {
    setIsLoading(true)
    const loaded = await runAction(
      () => pactaraFetch<Pact[]>("/v1/pacts?limit=1"),
      "PACT synced from network."
    )
    if (loaded && loaded[0]) {
      setPact(loaded[0])
      toast.success("PACT Synced", {
        description: `Found PACT: ${loaded[0].id.slice(0, 8)}...`,
      })
    } else {
      toast.info("No PACT Found", {
        description: "No PACTs registered on the local node.",
      })
    }
    setIsLoading(false)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PACT Creation</h1>
          <p className="text-muted-foreground mt-2">
            Define intents, targets, and proofs for your universal agreements.
          </p>
        </div>
        <Button onClick={() => void syncPacts()} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
          <SquarePen className="mr-2 h-4 w-4" /> Sync
        </Button>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <SquarePen className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Create PACT</CardTitle>
              <CardDescription>Draft a new PACT entity.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 sm:grid-cols-2 mb-6">
            <div className="space-y-2">
              <Label htmlFor="intent" className="text-white/70">Intent</Label>
              <Input 
                id="intent" 
                value={intent} 
                onChange={(e) => setIntent(e.target.value)} 
                className="glass-input font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target" className="text-white/70">Target (DID/URI)</Label>
              <Input 
                id="target" 
                value={target} 
                onChange={(e) => setTarget(e.target.value)} 
                className="glass-input font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 mb-6">
            <div className="space-y-2">
              <Label htmlFor="objectJson" className="text-white/70">Object (JSON)</Label>
              <Textarea 
                id="objectJson" 
                value={objectJson} 
                onChange={(e) => setObjectJson(e.target.value)} 
                className="glass-input font-mono text-xs min-h-[120px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="termsJson" className="text-white/70">Terms (JSON)</Label>
              <Textarea 
                id="termsJson" 
                value={termsJson} 
                onChange={(e) => setTermsJson(e.target.value)} 
                className="glass-input font-mono text-xs min-h-[120px] resize-none"
              />
            </div>
          </div>

          <Button 
            onClick={() => void createPact()} 
            disabled={!identity || isLoading}
            className="w-full sm:w-auto"
          >
            <SquarePen className="mr-2 h-4 w-4" />
            {isLoading ? "Creating..." : "Create PACT"}
          </Button>
          {!identity && (
            <p className="text-sm text-destructive mt-3">You must create an Identity first to draft a PACT.</p>
          )}

          {pact && (
            <div className="mt-8 space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Draft PACT</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  pact.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 
                  pact.status === 'draft' ? 'bg-amber-500/10 text-amber-500' : 'bg-white/10 text-white/50'
                }`}>{pact.status}</span>
              </div>
              <JsonBlock value={pact} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
