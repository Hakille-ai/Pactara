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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Authority Check</h1>
        <p className="text-muted-foreground mt-2">
          Verify cryptographic mandates and permissions before executing critical actions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Evaluate Permissions</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {!mandates.length && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-center gap-2 mb-4">
                <ShieldAlert className="h-4 w-4" />
                Create a mandate first.
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-white/70">Mandate ID</Label>
              <Select value={mandateId} onValueChange={(v) => setMandateId(v || "")}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select a mandate" />
                </SelectTrigger>
                <SelectContent>
                  {mandates.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-white/70">Action</Label>
                <Input value={action} onChange={(e) => setAction(e.target.value)} className="glass-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Intent</Label>
                <Input value={intent} onChange={(e) => setIntent(e.target.value)} className="glass-input" />
              </div>
            </div>
            
            <Button onClick={() => void checkAuthority()} disabled={!mandateId} className="w-full bg-blue-500 hover:bg-blue-600 text-white border-none mt-2">
              <ShieldCheck className="mr-2 h-4 w-4" /> Check Authority
            </Button>
          </CardContent>
        </Card>

        {mandateCheck && (
          <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
              <CardTitle className="text-lg">Evaluation Result</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className={`rounded-lg border p-6 flex flex-col items-center justify-center text-center ${
                mandateCheck.allowed 
                  ? 'border-emerald-500/30 bg-emerald-500/10' 
                  : 'border-red-500/30 bg-red-500/10'
              }`}>
                {mandateCheck.allowed ? (
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                ) : (
                  <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
                )}
                <h3 className={`text-2xl font-bold mb-2 ${
                  mandateCheck.allowed ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {mandateCheck.allowed ? 'Authorized' : 'Denied'}
                </h3>
                <p className="text-sm text-white/70">
                  {mandateCheck.reasons.join(", ")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
