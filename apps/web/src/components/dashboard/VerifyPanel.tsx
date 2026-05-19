import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { VerifyPactResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, ShieldAlert, BadgeCheck } from "lucide-react"

export function VerifyPanel() {
  const { pact, verification, setVerification } = useAppStore()
  const { runAction } = useAction()

  async function verifyPact() {
    if (!pact) return
    const result = await runAction(
      () =>
        pactaraFetch<VerifyPactResponse>(`/v1/pacts/${pact.id}/verify`, { method: "POST" }),
      "PACT verification completed."
    )
    if (result) {
      setVerification(result)
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          On-Chain <span className="accent-text-cyan-teal">Verification</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Verify cryptographic signatures, seal hashes, and active revocation logs of sovereign agreements.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Verification Trigger Card */}
        <Card className="glass-panel-glow lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <ShieldCheck className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Live Protocol Audit</CardTitle>
                <CardDescription className="text-white/40 text-xs">Verify signature validity and cryptographic proof.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!pact ? (
              <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center justify-center min-h-[220px] gap-3 border border-white/5 border-dashed rounded-2xl bg-black/20">
                <ShieldAlert className="h-7 w-7 stroke-[1.5] text-white/20 animate-pulse" />
                <p className="max-w-[220px] leading-relaxed">No compiled PACT draft loaded in session. Create a PACT first before triggering Live Verification.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-white/5 bg-black/40 p-4.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Target PACT Identifier</p>
                  <p className="font-mono text-[11px] text-cyan-300 select-all break-all">{pact.id}</p>
                </div>

                <Button 
                  onClick={() => void verifyPact()} 
                  className="w-full h-10 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(6,182,212,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
                >
                  <BadgeCheck className="mr-2 h-4 w-4 stroke-[2.5]" /> Run Network Audit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Result Monitor */}
        <div className="lg:col-span-2 space-y-6">
          {verification ? (
            <Card className={`glass-panel overflow-hidden animate-in fade-in zoom-in-95 duration-500 border ${
              verification.valid 
                ? "border-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.08)]" 
                : "border-rose-500/20 shadow-[0_8px_32px_rgba(244,63,94,0.08)]"
            }`}>
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <CardTitle className="text-base font-bold text-white tracking-wide">Audit Output</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3.5">
                  {verification.valid ? (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_18px_rgba(16,185,129,0.15)]">
                      <ShieldCheck className="h-6 w-6 stroke-[2]" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_18px_rgba(244,63,94,0.15)]">
                      <ShieldAlert className="h-6 w-6 stroke-[2]" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-white tracking-wide text-sm">{verification.valid ? "Integrity Confirmed" : "Integrity Corrupted"}</h4>
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mt-0.5">{verification.status}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5 text-center">
                  <div>
                    <p className="text-[9px] uppercase text-white/30 font-bold tracking-wider mb-1">Hash Seal</p>
                    <p className={`text-xs font-semibold font-mono ${verification.hash_matches ? "text-emerald-400" : "text-rose-400"}`}>
                      {verification.hash_matches ? "MATCH" : "FAIL"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-white/30 font-bold tracking-wider mb-1">Signature</p>
                    <p className={`text-xs font-semibold font-mono ${verification.signature_valid ? "text-emerald-400" : "text-rose-400"}`}>
                      {verification.signature_valid ? "VALID" : "FAIL"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-white/30 font-bold tracking-wider mb-1">Revoked</p>
                    <p className={`text-xs font-semibold font-mono ${verification.revoked ? "text-rose-400" : "text-emerald-400"}`}>
                      {verification.revoked ? "YES" : "NO"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#080808]/60 p-8 text-center flex flex-col items-center justify-center min-h-[220px] text-white/30 gap-3 border-dashed">
              <ShieldCheck className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
              <p className="text-xs max-w-[200px] leading-relaxed">Verification logs are empty. Trigger a protocol audit to display verified node parameters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
