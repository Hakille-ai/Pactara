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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portable Bundle</h1>
        <p className="text-muted-foreground mt-2">
          Export full cryptographic evidence and history for offline verification.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-panel md:col-span-1 h-fit">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Retrieve Bundle</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">PACT ID</Label>
              <Input 
                value={pactId} 
                onChange={(e) => setPactId(e.target.value)} 
                className="glass-input font-mono text-sm" 
                placeholder="pact:..."
              />
            </div>
            <Button onClick={() => void loadBundle()} disabled={!pactId} className="w-full bg-blue-500 hover:bg-blue-600 text-white border-none mt-2">
              <QrCode className="mr-2 h-4 w-4" /> Load Bundle
            </Button>
          </CardContent>
        </Card>

        {bundle ? (
          <div className="md:col-span-2 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-2">
              <Card className="glass-panel p-4 flex flex-col justify-center">
                <p className="text-sm text-white/50 mb-1">Attached Proofs</p>
                <p className="text-3xl font-bold font-mono">{bundle.proofs.length}</p>
              </Card>
              <Card className="glass-panel p-4 flex flex-col justify-center">
                <p className="text-sm text-white/50 mb-1">Timeline Events</p>
                <p className="text-3xl font-bold font-mono">{bundle.timeline.length}</p>
              </Card>
              <Card className={`glass-panel p-4 flex flex-col justify-center border-l-4 ${bundle.verification.valid ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                <p className="text-sm text-white/50 mb-1">Integrity</p>
                <div className="flex items-center gap-2">
                  {bundle.verification.valid ? (
                    <ShieldCheck className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  )}
                  <p className="text-xl font-bold uppercase">{bundle.verification.valid ? 'Valid' : 'Invalid'}</p>
                </div>
              </Card>
              <Card className={`glass-panel p-4 flex flex-col justify-center border-l-4 ${bundle.revocation ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                <p className="text-sm text-white/50 mb-1">Revocation Status</p>
                <p className={`text-xl font-bold uppercase ${bundle.revocation ? 'text-red-400' : 'text-emerald-400'}`}>
                  {bundle.revocation ? 'Revoked' : 'Active'}
                </p>
              </Card>
            </div>

            <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-3">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Raw Bundle Data</CardTitle>
                <CardDescription>Full cryptographic export of the agreement.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 bg-black/40 h-[400px] overflow-auto">
                  <JsonBlock value={bundle} />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="md:col-span-2 flex items-center justify-center p-12 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
            <p className="text-white/40 text-center">
              Load a bundle to view its cryptographic proofs and timeline.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
