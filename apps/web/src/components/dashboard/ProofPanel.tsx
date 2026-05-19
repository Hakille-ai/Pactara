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
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Proof <span className="accent-text-violet-pink">Attestations</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Attach cryptographically verifiable claims, audits, and assertions to existing PACT protocol graphs.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Left Card: Create attestation */}
        <Card className="glass-panel-glow lg:col-span-2 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_0_16px_rgba(167,139,250,0.1)]">
                <FileCheck2 className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white tracking-wide">Issue Attestation</CardTitle>
                <CardDescription className="text-white/40 text-xs">Publish verifiable telemetry or payload state.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Target PACT Context</Label>
              <Input value={pact?.id ?? "No PACT active - Standalone proof"} readOnly className="glass-input font-mono text-xs opacity-60 h-10 select-none bg-black/40" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Attestation Scheme</Label>
              <Input value={proofType} onChange={(e) => setProofType(e.target.value)} className="glass-input h-10 focus:ring-violet-500/20" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Payload Structure (JSON)</Label>
              <Textarea 
                value={payloadJson} 
                onChange={(e) => setPayloadJson(e.target.value)} 
                className="glass-input font-mono text-xs min-h-[140px] p-3 resize-none focus:ring-violet-500/20 bg-black/40" 
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button onClick={() => void createProof()} className="flex-1 h-10 bg-violet-500 hover:bg-violet-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(167,139,250,0.25)] btn-apple-spring rounded-lg">
                <FileCheck2 className="mr-2 h-4 w-4 stroke-[2.5]" /> Issue Proof
              </Button>
              <Button variant="secondary" onClick={() => void refreshProofs()} className="h-10 w-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 rounded-lg shrink-0 btn-apple-spring">
                <RefreshCw className="h-4 w-4 text-white/60" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right Card: Registry log */}
        <Card className="glass-panel lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <CardTitle className="text-lg font-bold text-white tracking-wide">Registry Attestation Ledger</CardTitle>
            <CardDescription className="text-white/40 text-xs">Latest verified digital proofs registered on this node.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {proofs.length === 0 ? (
              <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center gap-3">
                <FileCheck2 className="h-6 w-6 stroke-[1.5] text-white/20 animate-bounce" />
                No proofs published to the local node ledger.
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
                {proofs.map((proof) => (
                  <div key={proof.id} className="p-5 hover:bg-white/[0.01] transition-all duration-300">
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <span className="font-semibold text-xs tracking-wider text-violet-400 bg-violet-950/20 border border-violet-800/30 rounded px-2.5 py-0.5 shadow-inner uppercase font-mono">{proof.proof_type}</span>
                      <span className="text-[10px] text-white/30 font-mono">{new Date(proof.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[11px] text-white/50 mb-3 font-mono flex items-center gap-1.5">
                      <span className="text-white/30">Target context:</span>
                      <span className="bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5">{proof.pact_id ?? "Standalone Ledger Attestation"}</span>
                    </div>
                    <div className="bg-black/45 rounded-lg border border-white/5 p-3 text-[11px] font-mono text-white/70 select-all overflow-hidden shadow-inner leading-relaxed">
                      {JSON.stringify(proof.payload, null, 2)}
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
