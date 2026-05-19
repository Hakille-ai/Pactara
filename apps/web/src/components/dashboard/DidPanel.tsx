import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { DidDocument } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { KeyRound, ShieldAlert, Cpu, QrCode } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function DidPanel() {
  const { identity, did, setDid } = useAppStore()
  const { runAction } = useAction()

  async function loadDid() {
    if (!identity) return
    const loaded = await runAction(
      () => pactaraFetch<DidDocument>(`/v1/identities/${identity.id}/did`),
      "DID document resolved."
    )
    if (loaded) setDid(loaded)
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Sovereign <span className="accent-text-cyan-teal">DID Document</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Resolve and examine your cryptographically verifiable Decentralized Identifier ledger records.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Left Action Card */}
        <Card className="glass-panel-glow lg:col-span-2 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_16px_rgba(6,182,212,0.1)]">
                <KeyRound className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">DID Resolution</CardTitle>
                <CardDescription className="text-white/40 text-xs">Query sovereign identity properties.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {!identity && (
              <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 text-xs text-amber-400/90 flex items-center gap-2.5 backdrop-blur-md">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-amber-400" />
                <span>Create a public identity register first to query and resolve your DID.</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Active Sovereign Alias</Label>
              <Input 
                value={identity?.label ?? ""} 
                readOnly 
                className="glass-input font-mono text-xs opacity-60 h-10 select-none bg-black/40" 
                placeholder="No identity provisioned" 
              />
            </div>
            
            <Button 
              onClick={() => void loadDid()} 
              disabled={!identity} 
              className="w-full h-10 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(6,182,212,0.25)] rounded-lg btn-apple-spring transition-all duration-300"
            >
              <KeyRound className="mr-2 h-4 w-4 stroke-[2.5]" /> Resolve DID Document
            </Button>
          </CardContent>
        </Card>

        {/* Right Output Log / Visual Card */}
        <div className="lg:col-span-3 space-y-6">
          {did ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              {/* Virtual DID Card */}
              <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[#0c161a] via-[#05090b] to-[#010203] border border-cyan-500/20 flex flex-col justify-between aspect-[1.7/1] shadow-[0_32px_64px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] group hover:border-cyan-500/40 transition-all duration-500">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-cyan-400 stroke-[1.5]" />
                    <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">CRYPTO-ANCHOR</span>
                  </div>
                  <QrCode className="h-8 w-8 text-cyan-500/30 group-hover:text-cyan-400/50 transition-colors duration-500" />
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-white/30">DID DOCUMENT IDENTIFICATION URL</span>
                    <p className="text-[10px] font-mono text-cyan-300 truncate select-all">{did.id}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/30">Verification Scheme</span>
                      <p className="text-xs font-semibold text-white/80 mt-0.5 truncate">{did.verification_method?.[0]?.type?.split("/").pop() ?? "Ed25519VerificationKey2020"}</p>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/30">Service Enpoints</span>
                      <p className="text-xs font-semibold text-white/80 mt-0.5">{did.service?.length ?? 0} endpoints active</p>
                    </div>
                  </div>
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-2">
                  <span className="text-[8px] font-mono text-white/20 uppercase">TACTICAL TRUST ANCHOR SECURED</span>
                  <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-cyan-400 bg-cyan-950/20 border border-cyan-800/30 rounded-full px-2 py-0.5">
                    <span className="status-led status-led-blue scale-75" />
                    <span>RESOLVED</span>
                  </div>
                </div>
              </div>

              {/* Manifest Output */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">DID Resolution Metadata</span>
                <JsonBlock value={did} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#080808]/60 p-8 text-center flex flex-col items-center justify-center min-h-[260px] text-white/30 gap-3 border-dashed">
              <KeyRound className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
              <p className="text-xs max-w-[200px] leading-relaxed">No DID document resolved yet. Click the Resolve action button.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
