import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { MandateCheckResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldCheck, ShieldAlert, CheckCircle2 } from "lucide-react"

export function AuthorityPanel() {
  const { mandates, mandateCheck, setMandateCheck } = useAppStore()
  const { runAction } = useAction()

  const [mandateId, setMandateId] = useState("")
  const [action, setAction] = useState("negotiate_terms")
  const [intent, setIntent] = useState("trade.sell")

  useEffect(() => {
    if (!mandateId && mandates[0]?.id) {
      setMandateId(mandates[0].id)
    }
  }, [mandateId, mandates])

  async function checkAuthority() {
    if (!mandateId) return
    const response = await runAction(
      () =>
        pactaraFetch<MandateCheckResponse>(`/v1/mandates/${mandateId}/check`, {
          method: "POST",
          body: JSON.stringify({
            action,
            intent,
            context: { surface: "pactara-dashboard" },
          }),
        }),
      "Mandate authority checked."
    )
    if (response) {
      setMandateCheck(response)
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Authority <span className="accent-text-cyan-teal">Check Policy</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Verify cryptographic mandates and permission bounds before sandbox code execution.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Evaluate Permissions Form */}
        <Card className="glass-panel-glow lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <ShieldCheck className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Evaluate Permissions</CardTitle>
                <CardDescription className="text-white/40 text-xs">Simulate mandate scope validation.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {!mandates.length && (
              <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 text-xs text-amber-400 flex items-center gap-2.5 backdrop-blur-md">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-amber-400" />
                <span>No active mandate tokens found. Issue a mandate first to enable policy evaluation.</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Mandate Reference ID</Label>
              <Select value={mandateId} onValueChange={(v) => setMandateId(v || "")}>
                <SelectTrigger className="glass-input h-10 focus:ring-cyan-500/20 text-white/80">
                  <SelectValue placeholder="Select active mandate token" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0b0b] border-white/5 text-white/85">
                  {mandates.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.id.slice(0, 32)}...</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Action String</Label>
                <Input value={action} onChange={(e) => setAction(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-cyan-500/20" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Intent Scope</Label>
                <Input value={intent} onChange={(e) => setIntent(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-cyan-500/20" />
              </div>
            </div>
            
            <Button 
              onClick={() => void checkAuthority()} 
              disabled={!mandateId} 
              className="w-full h-10 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(6,182,212,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <ShieldCheck className="mr-2 h-4 w-4 stroke-[2.5]" /> Run Authority Verification
            </Button>
          </CardContent>
        </Card>

        {/* Evaluation Result Output */}
        <div className="lg:col-span-2 space-y-6">
          {mandateCheck ? (
            <Card className="glass-panel overflow-hidden animate-in fade-in zoom-in-95 duration-500">
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <CardTitle className="text-base font-bold text-white tracking-wide">Evaluation Result</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className={`rounded-2xl border p-6 flex flex-col items-center justify-center text-center relative overflow-hidden ${
                  mandateCheck.allowed 
                    ? 'border-emerald-500/20 bg-emerald-950/10 shadow-[0_8px_32px_rgba(16,185,129,0.08)]' 
                    : 'border-rose-500/20 bg-rose-950/10 shadow-[0_8px_32px_rgba(244,63,94,0.08)]'
                }`}>
                  {mandateCheck.allowed ? (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_24px_rgba(16,185,129,0.15)] mb-4">
                      <CheckCircle2 className="h-7 w-7 stroke-[2]" />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_24px_rgba(244,63,94,0.15)] mb-4">
                      <ShieldAlert className="h-7 w-7 stroke-[2]" />
                    </div>
                  )}
                  <h3 className={`text-xl font-bold tracking-wide mb-1.5 ${
                    mandateCheck.allowed ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {mandateCheck.allowed ? 'AUTHORIZED' : 'ACCESS DENIED'}
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed max-w-[200px]">
                    {mandateCheck.reasons.join(", ")}
                  </p>
                  {/* Decorative background scanline */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#080808]/60 p-8 text-center flex flex-col items-center justify-center min-h-[220px] text-white/30 gap-3 border-dashed">
              <ShieldCheck className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
              <p className="text-xs max-w-[200px] leading-relaxed">Authority evaluation log is blank. Choose a mandate above to verify parameters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
