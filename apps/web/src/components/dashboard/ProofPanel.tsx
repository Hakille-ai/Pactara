import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { Proof } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileCheck2, RefreshCw } from "lucide-react"

export function ProofPanel() {
  const { pact, proofs, setProofs } = useAppStore()
  const { runAction } = useAction()

  const [proofType, setProofType] = useState("origin.certificate")
  const [payloadJson, setPayloadJson] = useState(
    '{\n  "issuer": "PACTARA field verifier",\n  "claim": "Batch origin inspected",\n  "confidence": 0.98\n}'
  )

  async function createProof() {
    let parsedPayload
    try {
      parsedPayload = JSON.parse(payloadJson)
    } catch {
      // Allow API to catch invalid JSON, or just pass empty obj
      parsedPayload = {}
    }

    const created = await runAction(
      () =>
        pactaraFetch<Proof>("/v1/proofs", {
          method: "POST",
          body: JSON.stringify({
            pact_id: pact?.id ?? null,
            proof_type: proofType,
            payload: parsedPayload,
          }),
        }),
      "Proof attached to the protocol graph."
    )
    if (created) {
      setProofs([created, ...proofs])
    }
  }

  async function refreshProofs() {
    const next = await runAction(
      () => pactaraFetch<Proof[]>("/v1/proofs?limit=20"),
      "Proof registry refreshed."
    )
    if (next) {
      setProofs(next)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proof Registry</h1>
        <p className="text-muted-foreground mt-2">
          Attach cryptographically verifiable claims and attestations to existing PACTs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Create Attestation</CardTitle>
                <CardDescription>Mint a new proof to the trust graph.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Attached PACT</Label>
              <Input value={pact?.id ?? "none"} readOnly className="glass-input font-mono text-sm opacity-70" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-white/70">Proof Type</Label>
              <Input value={proofType} onChange={(e) => setProofType(e.target.value)} className="glass-input" />
            </div>

            <div className="space-y-2">
              <Label className="text-white/70">Payload JSON</Label>
              <Textarea 
                value={payloadJson} 
                onChange={(e) => setPayloadJson(e.target.value)} 
                className="glass-input font-mono text-xs min-h-[120px] resize-none" 
              />
            </div>
            
            <div className="flex gap-3 mt-4">
              <Button onClick={() => void createProof()} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border-none">
                <FileCheck2 className="mr-2 h-4 w-4" /> Create Proof
              </Button>
              <Button variant="secondary" onClick={() => void refreshProofs()} className="bg-white/10 hover:bg-white/20 text-white border-none">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Recent Proofs</CardTitle>
            <CardDescription>Latest attestations on the network.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {proofs.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm">
                No proofs registered yet.
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[400px] overflow-auto">
                {proofs.map((proof) => (
                  <div key={proof.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-sm text-emerald-400">{proof.proof_type}</span>
                      <span className="text-xs text-white/40">{new Date(proof.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-white/60 mb-2">
                      <span className="text-white/40">PACT: </span>
                      <span className="font-mono">{proof.pact_id ?? "Standalone"}</span>
                    </div>
                    <div className="bg-black/30 rounded p-2 text-xs font-mono text-white/50 break-all overflow-hidden">
                      {JSON.stringify(proof.payload)}
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
