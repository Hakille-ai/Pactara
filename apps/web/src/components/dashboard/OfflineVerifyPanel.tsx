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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Offline Verification</h1>
        <p className="text-muted-foreground mt-2">
          Verify a PACT bundle cryptographically without any database lookup.
        </p>
      </div>

      <Card className="glass-panel">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-500/10 text-teal-400">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Bundle Input</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">PACT Bundle JSON</Label>
            <Textarea value={bundleJson} onChange={(e) => setBundleJson(e.target.value)} className="glass-input font-mono text-xs min-h-[280px] resize-none" />
          </div>
          <div className="flex gap-3">
            <Button onClick={() => void verifyOfflineBundle()} disabled={!bundleJson} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white border-none">
              <BadgeCheck className="mr-2 h-4 w-4" /> Verify Bundle
            </Button>
            <Button variant="secondary" onClick={() => setBundleJson(bundle ? JSON.stringify(bundle, null, 2) : "")} disabled={!bundle} className="bg-white/10 hover:bg-white/20 text-white border-none">
              <QrCode className="mr-2 h-4 w-4" /> Use Current
            </Button>
          </div>
        </CardContent>
      </Card>

      {offlineVerification && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className={`glass-panel p-4 border-l-4 ${offlineVerification.valid ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
              <p className="text-sm text-white/50 mb-1">Integrity</p>
              <div className="flex items-center gap-2">
                {offlineVerification.valid ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
                <p className="text-xl font-bold">{offlineVerification.valid ? "Valid" : "Invalid"}</p>
              </div>
            </Card>
            <Card className="glass-panel p-4"><p className="text-sm text-white/50 mb-1">Proofs</p><p className="text-2xl font-bold font-mono">{offlineVerification.proofs_count}</p></Card>
            <Card className="glass-panel p-4"><p className="text-sm text-white/50 mb-1">Timeline Events</p><p className="text-2xl font-bold font-mono">{offlineVerification.timeline_events}</p></Card>
            <Card className={`glass-panel p-4 border-l-4 ${offlineVerification.revoked ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
              <p className="text-sm text-white/50 mb-1">Revoked</p>
              <p className={`text-xl font-bold ${offlineVerification.revoked ? 'text-red-400' : 'text-emerald-400'}`}>{offlineVerification.revoked ? "Yes" : "No"}</p>
            </Card>
          </div>
          <Card className="glass-panel overflow-hidden">
            <CardContent className="p-0"><div className="p-4 bg-black/40"><JsonBlock value={offlineVerification} /></div></CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
