import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { PactBundle } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { QrCode, ShieldCheck, AlertTriangle } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function BundlePanel() {
  const { pact, bundle, setBundle } = useAppStore()
  const { runAction } = useAction()

  const [pactId, setPactId] = useState(pact?.id ?? "")

  useEffect(() => {
    if (pact?.id) {
      setPactId(pact.id)
    }
  }, [pact?.id])

  async function loadBundle() {
    const loaded = await runAction(
      () => pactaraFetch<PactBundle>(`/v1/pacts/${pactId}/bundle`),
      "Portable PACT bundle loaded."
    )
    if (loaded) {
      setBundle(loaded)
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Portable <span className="accent-text-cyan-teal">Bundle</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Export full cryptographically seal-signed historical records for offline zero-trust audit compliance.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Left: Search / Retrieve Form */}
        <Card className="glass-panel-glow lg:col-span-2 overflow-hidden h-fit">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <QrCode className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Export Evidence</CardTitle>
                <CardDescription className="text-white/40 text-xs">Bundle historical state proofs.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">PACT ID Reference</Label>
              <Input 
                value={pactId} 
                onChange={(e) => setPactId(e.target.value)} 
                className="glass-input h-10 px-3.5 focus:ring-cyan-500/20 font-mono text-xs text-white/90" 
                placeholder="pact:..."
              />
            </div>
            <Button 
              onClick={() => void loadBundle()} 
              disabled={!pactId} 
              className="w-full h-10 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(6,182,212,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <QrCode className="mr-2 h-4 w-4 stroke-[2.5]" /> Compile Bundle
            </Button>
          </CardContent>
        </Card>

        {/* Right: Compiled telemetry display */}
        <div className="lg:col-span-3 space-y-6">
          {bundle ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="glass-panel p-4.5 rounded-xl border border-white/5 bg-black/20">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-white/30 mb-1">Attached Proofs</p>
                  <p className="text-xl font-extrabold font-mono text-cyan-300 mt-2">{bundle.proofs.length}</p>
                </div>
                <div className="glass-panel p-4.5 rounded-xl border border-white/5 bg-black/20">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-white/30 mb-1">Timeline Events</p>
                  <p className="text-xl font-extrabold font-mono text-cyan-300 mt-2">{bundle.timeline.length}</p>
                </div>
                <div className={`glass-panel p-4.5 rounded-xl border relative overflow-hidden bg-black/20 ${
                  bundle.verification.valid 
                    ? 'border-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.06)]' 
                    : 'border-rose-500/20 shadow-[0_4px_20px_rgba(244,63,94,0.06)]'
                }`}>
                  <p className="text-[9px] uppercase tracking-wider font-bold text-white/30 mb-1">Seal Integrity</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`status-led ${bundle.verification.valid ? 'status-led-green' : 'status-led-rose'} scale-75`} />
                    <p className={`text-sm font-bold uppercase tracking-wider ${bundle.verification.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {bundle.verification.valid ? 'VALID SEAL' : 'CORRUPT'}
                    </p>
                  </div>
                </div>
                <div className={`glass-panel p-4.5 rounded-xl border relative overflow-hidden bg-black/20 ${
                  bundle.revocation 
                    ? 'border-rose-500/20 shadow-[0_4px_20px_rgba(244,63,94,0.06)]' 
                    : 'border-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.06)]'
                }`}>
                  <p className="text-[9px] uppercase tracking-wider font-bold text-white/30 mb-1">Revocation Log</p>
                  <p className={`text-sm font-bold uppercase tracking-wider mt-2 ${bundle.revocation ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {bundle.revocation ? 'REVOKED' : 'ACTIVE'}
                  </p>
                </div>
              </div>

              {/* Raw Details JsonBlock */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">Raw telemetry data bundle</span>
                <JsonBlock value={bundle} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#080808]/60 p-8 text-center flex flex-col items-center justify-center min-h-[220px] text-white/30 gap-3 border-dashed">
              <QrCode className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
              <p className="text-xs max-w-[200px] leading-relaxed">No compiled bundle loaded in local panel state. Query a PACT ID on the left to export cryptographic evidence.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
