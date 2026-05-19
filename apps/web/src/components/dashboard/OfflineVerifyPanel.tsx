import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { BundleVerificationResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BadgeCheck, QrCode, ShieldCheck, AlertTriangle } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function OfflineVerifyPanel() {
  const { bundle, offlineVerification, setOfflineVerification } = useAppStore()
  const { runAction } = useAction()
  const [bundleJson, setBundleJson] = useState("")

  useEffect(() => {
    if (bundle) setBundleJson(JSON.stringify(bundle, null, 2))
  }, [bundle])

  async function verifyOfflineBundle() {
    let parsed = {}
    try { parsed = JSON.parse(bundleJson) } catch { /* fallback */ }
    const result = await runAction(
      () => pactaraFetch<BundleVerificationResponse>("/v1/bundles/verify", {
        method: "POST",
        body: JSON.stringify(parsed),
      }),
      "Portable bundle verified without database lookup."
    )
    if (result) setOfflineVerification(result)
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Offline <span className="accent-text-cyan-teal">Verification</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Verify a portable PACT bundle cryptographically without relying on active network consensus lookup.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Left: Input Payload */}
        <Card className="glass-panel-glow lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <BadgeCheck className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Portable Bundle Manifest</CardTitle>
                <CardDescription className="text-white/40 text-xs">Verify signature validity and cryptographic proof.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">PACT Bundle JSON Input</Label>
              <Textarea 
                value={bundleJson} 
                onChange={(e) => setBundleJson(e.target.value)} 
                className="glass-input min-h-[220px] p-3.5 resize-none focus:ring-cyan-500/20 font-mono text-xs bg-black/40" 
              />
            </div>
            
            <div className="flex gap-4 pt-2">
              <Button 
                onClick={() => void verifyOfflineBundle()} 
                disabled={!bundleJson} 
                className="flex-[2] h-10 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(6,182,212,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
              >
                <BadgeCheck className="mr-2 h-4 w-4 stroke-[2.5]" /> Run Offline Verification
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setBundleJson(bundle ? JSON.stringify(bundle, null, 2) : "")} 
                disabled={!bundle} 
                className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 rounded-lg btn-apple-spring text-xs"
              >
                <QrCode className="mr-2 h-4 w-4 stroke-[2]" /> Load Current
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Verification Output */}
        <div className="lg:col-span-2 space-y-6">
          {offlineVerification ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              <div className="grid gap-4 grid-cols-2">
                <div className={`glass-panel p-4.5 rounded-xl border relative overflow-hidden bg-black/20 ${
                  offlineVerification.valid 
                    ? 'border-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.06)]' 
                    : 'border-rose-500/20 shadow-[0_4px_20px_rgba(244,63,94,0.06)]'
                }`}>
                  <p className="text-[9px] uppercase tracking-wider font-bold text-white/30 mb-1">Integrity</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`status-led ${offlineVerification.valid ? 'status-led-green' : 'status-led-rose'} scale-90`} />
                    <p className={`text-base font-extrabold tracking-wide ${offlineVerification.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {offlineVerification.valid ? "VALID SEAL" : "CORRUPTED"}
                    </p>
                  </div>
                </div>

                <div className="glass-panel p-4.5 rounded-xl border border-white/5 bg-black/20">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-white/30 mb-1">Proofs Count</p>
                  <p className="text-xl font-extrabold font-mono text-cyan-300 mt-2">{offlineVerification.proofs_count}</p>
                </div>

                <div className="glass-panel p-4.5 rounded-xl border border-white/5 bg-black/20">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-white/30 mb-1">Timeline Events</p>
                  <p className="text-xl font-extrabold font-mono text-cyan-300 mt-2">{offlineVerification.timeline_events}</p>
                </div>

                <div className={`glass-panel p-4.5 rounded-xl border relative overflow-hidden bg-black/20 ${
                  offlineVerification.revoked 
                    ? 'border-rose-500/20 shadow-[0_4px_20px_rgba(244,63,94,0.06)]' 
                    : 'border-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.06)]'
                }`}>
                  <p className="text-[9px] uppercase tracking-wider font-bold text-white/30 mb-1">Revoked Status</p>
                  <p className={`text-base font-extrabold tracking-wide mt-2 ${offlineVerification.revoked ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {offlineVerification.revoked ? "REVOKED" : "ACTIVE"}
                  </p>
                </div>
              </div>

              {/* Raw Details JsonBlock */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">Raw verification proof</span>
                <JsonBlock value={offlineVerification} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#080808]/60 p-8 text-center flex flex-col items-center justify-center min-h-[260px] text-white/30 gap-3 border-dashed">
              <ShieldCheck className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
              <p className="text-xs max-w-[200px] leading-relaxed">Verification logs are empty. Submit a portable PACT bundle to evaluate.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
