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
    <div className="flex flex-col gap-6 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification</h1>
        <p className="text-muted-foreground mt-2">
          Verify the cryptographic integrity and status of a PACT.
        </p>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Network Verification</CardTitle>
              <CardDescription>Request a live verification check from the network.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!pact ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <div className="rounded-full bg-muted p-3">
                <ShieldAlert className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No PACT selected for verification.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                <p className="text-sm font-medium text-muted-foreground mb-1">Target PACT ID</p>
                <p className="font-mono text-sm break-all">{pact.id}</p>
              </div>

              <Button onClick={() => void verifyPact()} className="w-full sm:w-auto">
                <BadgeCheck className="mr-2 h-4 w-4" />
                Run Verification
              </Button>

              {verification && (
                <div className={`mt-6 rounded-lg border p-5 animate-in fade-in slide-in-from-bottom-2 ${
                  verification.valid 
                    ? "border-emerald-500/20 bg-emerald-500/5" 
                    : "border-destructive/20 bg-destructive/5"
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`rounded-full p-2 ${verification.valid ? "bg-emerald-500/20 text-emerald-500" : "bg-destructive/20 text-destructive"}`}>
                      {verification.valid ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                    </div>
                    <div>
                      <h4 className="font-semibold">{verification.valid ? "Valid Signature" : "Invalid PACT"}</h4>
                      <p className="text-sm opacity-80 capitalize">{verification.status}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-medium mb-1">Hash</p>
                      <p className="text-sm font-semibold">{verification.hash_matches ? "Matches" : "Mismatch"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-medium mb-1">Signature</p>
                      <p className="text-sm font-semibold">{verification.signature_valid ? "Valid" : "Invalid"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-medium mb-1">Revoked</p>
                      <p className="text-sm font-semibold">{verification.revoked ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
