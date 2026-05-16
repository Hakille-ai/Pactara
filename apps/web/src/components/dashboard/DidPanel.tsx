import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { DidDocument } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { KeyRound, ShieldAlert } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function DidPanel() {
  const { identity, did, setDid } = useAppStore()
  const { runAction } = useAction()

  async function loadDid() {
    if (!identity) return
    const loaded = await runAction(
      () => pactaraFetch<DidDocument>(`/v1/identities/${identity.id}/did`),
      "DID document loaded."
    )
    if (loaded) setDid(loaded)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sovereign DID</h1>
        <p className="text-muted-foreground mt-2">
          Decentralized Identifier Document for cryptographically verifiable identities.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Identity Resolution</CardTitle>
                <CardDescription>Resolve your sovereign identity.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {!identity && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-center gap-2 mb-4">
                <ShieldAlert className="h-4 w-4" />
                Create an identity first to resolve a DID.
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-white/70">Linked Identity</Label>
              <Input value={identity?.id ?? ""} readOnly className="glass-input font-mono text-sm opacity-70" placeholder="No identity active" />
            </div>
            
            <Button onClick={() => void loadDid()} disabled={!identity} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white border-none mt-2">
              <KeyRound className="mr-2 h-4 w-4" /> Resolve DID Document
            </Button>
          </CardContent>
        </Card>

        {did && (
          <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
              <CardTitle className="text-lg">DID Document Output</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 bg-black/40 h-full border-t border-white/5">
                <JsonBlock value={did} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
