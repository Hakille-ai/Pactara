import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { AuthChallenge, Credential, AuthSession, SignedRequestVerification, PolicyDecision } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShieldCheck, KeyRound, BadgeCheck, Activity, RefreshCw, XCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function SecurityPanel() {
  const { 
    identity, 
    authChallenge, setAuthChallenge,
    credential, setCredential,
    credentials, setCredentials,
    authSession, setAuthSession,
    signedVerification, setSignedVerification,
    policyDecision, setPolicyDecision,
    auditEvents
  } = useAppStore()
  const { runAction } = useAction()

  const [policyAction, setPolicyAction] = useState("compare_prices")
  const [deleteCredentialId, setDeleteCredentialId] = useState("")

  async function startPasskey() {
    if (!identity) return
    const response = await runAction(
      () =>
        pactaraFetch<AuthChallenge>("/v1/auth/passkeys/register/start", {
          method: "POST",
          body: JSON.stringify({ identity_id: identity.id }),
        }),
      "Passkey registration challenge created."
    )
    if (response) {
      setAuthChallenge(response)
    }
  }

  async function finishPasskey() {
    if (!identity || !authChallenge) return
    const response = await runAction(
      () =>
        pactaraFetch<Credential>("/v1/auth/passkeys/register/finish", {
          method: "POST",
          body: JSON.stringify({
            challenge_id: authChallenge.id,
            identity_id: identity.id,
            credential_id: `passkey-${identity.id.slice(-8)}-${Date.now()}`,
            public_key: identity.public_key,
            transports: ["internal", "dev-sandbox"],
          }),
        }),
      "Passkey credential stored."
    )
    if (response) {
      setCredential(response)
    }
  }

  async function evaluateSecurityPolicy() {
    const decision = await runAction(
      () =>
        pactaraFetch<PolicyDecision>("/v1/policies/evaluate", {
          method: "POST",
          body: JSON.stringify({
            subject_id: identity?.id ?? "pactara:anonymous",
            action: policyAction,
            resource: "pactara:v0.5",
            context: {
              risk: policyAction === "sign_contract" ? "high" : "low",
              sensitivity: policyAction === "health.raw" ? "medical_raw" : "standard",
            },
          }),
        }),
      "Security policy evaluated."
    )
    if (decision) {
      setPolicyDecision(decision)
    }
  }

  async function createDevSession() {
    if (!identity) return
    const session = await runAction(
      () =>
        pactaraFetch<AuthSession>("/v1/auth/sessions/dev", {
          method: "POST",
          body: JSON.stringify({ identity_id: identity.id, ttl_seconds: 86_400 }),
        }),
      "Dev session created."
    )
    if (session) {
      setAuthSession(session)
    }
  }

  async function refreshCredentials() {
    const loaded = await runAction(
      () =>
        pactaraFetch<Credential[]>(
          `/v1/auth/credentials${identity?.id ? `?identity=${encodeURIComponent(identity.id)}` : ""}`
        ),
      "Credentials refreshed."
    )
    if (loaded) {
      setCredentials(loaded)
      if (loaded[0]) {
        setDeleteCredentialId(loaded[0].id)
      }
    }
  }

  async function deleteCredential() {
    if (!deleteCredentialId) return
    await runAction(
      () => pactaraFetch<{ deleted: boolean; id: string }>(`/v1/auth/credentials/${deleteCredentialId}`, { method: "DELETE" }),
      "Credential revoked."
    )
    setCredentials(credentials.filter((item) => item.id !== deleteCredentialId))
    setDeleteCredentialId("")
  }

  async function verifySignedRequestDemo() {
    if (!identity) return
    const verification = await runAction(
      () =>
        pactaraFetch<SignedRequestVerification>("/v1/auth/signed-requests/verify", {
          method: "POST",
          body: JSON.stringify({
            identity_id: identity.id,
            nonce: `dashboard-${Date.now()}`,
            payload: { action: policyAction, resource: "pactara:v0.7" },
            signature: "dev-demo-invalid-signature",
            created_at: new Date().toISOString(),
          }),
        }),
      "Signed request checked."
    )
    if (verification) {
      setSignedVerification(verification)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & Audit</h1>
        <p className="text-muted-foreground mt-2">
          Manage credentials, passkeys, session tokens, and review protocol audit logs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-500/10 text-teal-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Authentication</CardTitle>
                <CardDescription>Manage your identity keys and passkeys.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void startPasskey()} disabled={!identity} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white border-none">
                <KeyRound className="mr-2 h-4 w-4" /> Start Passkey
              </Button>
              <Button variant="secondary" onClick={() => void finishPasskey()} disabled={!identity || !authChallenge} className="flex-1 bg-white/10 hover:bg-white/20 text-white border-none">
                <BadgeCheck className="mr-2 h-4 w-4" /> Store Key
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4 border-t border-white/5 pt-4">
              <Button variant="secondary" onClick={() => void createDevSession()} disabled={!identity} className="flex-1 bg-white/10 hover:bg-white/20 text-white border-none text-xs">
                <Activity className="mr-2 h-4 w-4" /> Dev Session
              </Button>
              <Button variant="secondary" onClick={() => void refreshCredentials()} className="flex-1 bg-white/10 hover:bg-white/20 text-white border-none text-xs">
                <RefreshCw className="mr-2 h-4 w-4" /> Sync Keys
              </Button>
            </div>
            
            {credentials.length > 0 && (
              <div className="mt-4 border-t border-white/5 pt-4 space-y-2">
                <Label className="text-white/70">Revoke Credential</Label>
                <div className="flex gap-2">
                  <Select value={deleteCredentialId} onValueChange={(v) => setDeleteCredentialId(v || "")}>
                    <SelectTrigger className="glass-input flex-1">
                      <SelectValue placeholder="Select credential" />
                    </SelectTrigger>
                    <SelectContent>
                      {credentials.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.credential_id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="destructive" onClick={() => void deleteCredential()} disabled={!deleteCredentialId} className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border-none">
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Policy Verification</CardTitle>
                <CardDescription>Simulate action policy evaluations.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Simulated Action</Label>
              <Input value={policyAction} onChange={(e) => setPolicyAction(e.target.value)} className="glass-input" />
            </div>
            
            <div className="flex gap-3">
              <Button onClick={() => void evaluateSecurityPolicy()} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-none">
                <ShieldCheck className="mr-2 h-4 w-4" /> Evaluate
              </Button>
              <Button variant="secondary" onClick={() => void verifySignedRequestDemo()} disabled={!identity} className="flex-1 bg-white/10 hover:bg-white/20 text-white border-none">
                <ShieldCheck className="mr-2 h-4 w-4" /> Check Sign
              </Button>
            </div>

            {policyDecision && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-sm font-medium text-white/70 mb-2">Evaluation Result</p>
                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  policyDecision.decision === 'allow' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  policyDecision.decision === 'needs_review' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <div className="flex items-center gap-2 font-bold uppercase text-sm">
                    {policyDecision.decision === 'allow' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {policyDecision.decision.replace('_', ' ')}
                  </div>
                  <span className="text-xs font-mono opacity-60">
                    {policyDecision.reasons.join(', ') || 'default'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {(authChallenge || credential || authSession || signedVerification) && (
          <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
              <CardTitle className="text-lg">Security Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 bg-black/40 max-h-[400px] overflow-auto border-t border-white/5 space-y-4">
                {authChallenge && <div><p className="text-xs text-white/50 mb-1">Challenge</p><JsonBlock value={authChallenge} /></div>}
                {credential && <div><p className="text-xs text-white/50 mb-1">Credential</p><JsonBlock value={credential} /></div>}
                {authSession && <div><p className="text-xs text-white/50 mb-1">Session</p><JsonBlock value={authSession} /></div>}
                {signedVerification && <div><p className="text-xs text-white/50 mb-1">Signed Request</p><JsonBlock value={signedVerification} /></div>}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Audit Trail</CardTitle>
            <CardDescription>Immutable record of critical security events.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {auditEvents.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm">
                No audit events recorded.
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[400px] overflow-auto">
                {auditEvents.map((event, index) => (
                  <div key={index} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-sm text-blue-400">{event.event_type}</span>
                    </div>
                    <div className="text-xs text-white/60 mb-2 font-mono break-all">
                      <span className="text-white/40">Subject: </span>
                      {event.subject_id}
                    </div>
                    {event.decision && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white/10 text-white/70">
                        {event.decision}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
