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
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            PACT <span className="accent-text-gold-orange">Agreement System</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Draft, sign, and verify autonomous machine-to-machine agreements on the protocol.
          </p>
        </div>
        <Button 
          onClick={() => void syncPacts()} 
          variant="secondary" 
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <SquarePen className="mr-2 h-4 w-4 text-amber-400" /> Sync PACTs Log
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Left Side: Create Pact Card */}
        <Card className="glass-panel-glow lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <SquarePen className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Compose New PACT</CardTitle>
                <CardDescription className="text-white/40 text-xs">Define intents, targets, and parameters.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="intent" className="text-xs font-bold uppercase tracking-widest text-white/50">Agreement Intent</Label>
                <Input 
                  id="intent" 
                  value={intent} 
                  onChange={(e) => setIntent(e.target.value)} 
                  className="glass-input h-10 px-3.5 focus:ring-amber-500/20 font-mono text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target" className="text-xs font-bold uppercase tracking-widest text-white/50">Target Recipient URI</Label>
                <Input 
                  id="target" 
                  value={target} 
                  onChange={(e) => setTarget(e.target.value)} 
                  className="glass-input h-10 px-3.5 focus:ring-amber-500/20 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="objectJson" className="text-xs font-bold uppercase tracking-widest text-white/50">Subject Parameters (JSON)</Label>
                <Textarea 
                  id="objectJson" 
                  value={objectJson} 
                  onChange={(e) => setObjectJson(e.target.value)} 
                  className="glass-input min-h-[120px] p-3 resize-none focus:ring-amber-500/20 font-mono text-xs bg-black/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="termsJson" className="text-xs font-bold uppercase tracking-widest text-white/50">Execution Terms (JSON)</Label>
                <Textarea 
                  id="termsJson" 
                  value={termsJson} 
                  onChange={(e) => setTermsJson(e.target.value)} 
                  className="glass-input min-h-[120px] p-3 resize-none focus:ring-amber-500/20 font-mono text-xs bg-black/40"
                />
              </div>
            </div>

            <Button 
              onClick={() => void createPact()} 
              disabled={!identity || isLoading}
              className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(251,191,36,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <SquarePen className="mr-2 h-4 w-4 stroke-[2.5]" />
              {isLoading ? "Compiling PACT..." : "Compile & Issue PACT"}
            </Button>
            
            {!identity && (
              <p className="text-xs font-semibold text-rose-400 mt-2">Sovereign registration required first to draft PACTs.</p>
            )}
          </CardContent>
        </Card>

        {/* Right Side: Pact Monitor */}
        <div className="lg:col-span-2 space-y-6">
          {pact ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Active PACT Manifest</span>
                <div className={`flex items-center gap-1.5 font-mono text-[9px] tracking-wider px-2 py-0.5 rounded-full border ${
                  pact.status === 'active' 
                    ? 'text-emerald-400 bg-emerald-950/20 border-emerald-800/30' 
                    : 'text-amber-400 bg-amber-950/20 border-amber-800/30'
                }`}>
                  <span className={`status-led ${pact.status === 'active' ? 'status-led-green' : 'status-led-orange'} scale-75`} />
                  <span className="uppercase">{pact.status}</span>
                </div>
              </div>
              <JsonBlock value={pact} />
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#080808]/60 p-8 text-center flex flex-col items-center justify-center min-h-[260px] text-white/30 gap-3 border-dashed">
              <SquarePen className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
              <p className="text-xs max-w-[200px] leading-relaxed">No compiled PACT agreement loaded or active in dashboard state.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
