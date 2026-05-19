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
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Security & <span className="accent-text-cyan-teal">Audit</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Manage passkeys, session tokens, sign simulated policy transactions, and trace decentralized node audit logs.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        {/* Left Card: Authentication */}
        <Card className="glass-panel-glow overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <KeyRound className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Authentication Credentials</CardTitle>
                <CardDescription className="text-white/40 text-xs">Manage public keys, biometric passkeys, and sessions.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row gap-3.5">
              <Button 
                onClick={() => void startPasskey()} 
                disabled={!identity} 
                className="flex-1 h-10 bg-teal-500 hover:bg-teal-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(20,184,166,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
              >
                <KeyRound className="mr-2 h-4 w-4 stroke-[2.5]" /> Start Passkey
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => void finishPasskey()} 
                disabled={!identity || !authChallenge} 
                className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring rounded-lg font-semibold tracking-wide"
              >
                <BadgeCheck className="mr-2 h-4 w-4 text-teal-400 stroke-[2]" /> Store Passkey
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3.5 pt-4 border-t border-white/5">
              <Button 
                variant="secondary" 
                onClick={() => void createDevSession()} 
                disabled={!identity} 
                className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring rounded-lg text-xs font-semibold tracking-wide"
              >
                <Activity className="mr-2 h-4 w-4 text-cyan-400 stroke-[2]" /> Generate Dev Session
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => void refreshCredentials()} 
                className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring rounded-lg text-xs font-semibold tracking-wide"
              >
                <RefreshCw className="mr-2 h-4 w-4 text-cyan-400 stroke-[2]" /> Synchronize Keys
              </Button>
            </div>
            
            {credentials.length > 0 && (
              <div className="pt-4 border-t border-white/5 space-y-2.5">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Revoke Authorization Link</Label>
                <div className="flex gap-2.5">
                  <Select value={deleteCredentialId} onValueChange={(v) => setDeleteCredentialId(v || "")}>
                    <SelectTrigger className="glass-input flex-1 h-10">
                      <SelectValue placeholder="Select credential" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b0b0b] border-white/10 text-white">
                      {credentials.map((item) => (
                        <SelectItem key={item.id} value={item.id} className="focus:bg-white/5 hover:bg-white/5 transition-colors">{item.credential_id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="destructive" 
                    onClick={() => void deleteCredential()} 
                    disabled={!deleteCredentialId} 
                    className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 h-10 w-10 shrink-0 p-0 flex items-center justify-center rounded-lg transition-all duration-300"
                  >
                    <XCircle className="h-5 w-5 stroke-[2]" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Card: Policy Evaluation */}
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                <ShieldCheck className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Policy Sandbox Simulator</CardTitle>
                <CardDescription className="text-white/40 text-xs">Simulate dynamic action and role policy checks.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Simulated Action Verb</Label>
              <Input value={policyAction} onChange={(e) => setPolicyAction(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-blue-500/20 font-mono text-xs" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3.5">
              <Button 
                onClick={() => void evaluateSecurityPolicy()} 
                className="flex-1 h-10 bg-blue-500 hover:bg-blue-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(59,130,246,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
              >
                <ShieldCheck className="mr-2 h-4 w-4 stroke-[2.5]" /> Run Policy Check
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => void verifySignedRequestDemo()} 
                disabled={!identity} 
                className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring rounded-lg font-semibold tracking-wide"
              >
                <ShieldCheck className="mr-2 h-4 w-4 text-blue-400 stroke-[2]" /> Check Cryptography
              </Button>
            </div>

            {policyDecision && (
              <div className="pt-4 border-t border-white/5 space-y-2.5 animate-in fade-in zoom-in-95 duration-500">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-1">Simulator Verification Block</span>
                <div className={`p-4.5 rounded-xl border flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.3)] ${
                  policyDecision.decision === 'allow' ? 'bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-400' :
                  policyDecision.decision === 'needs_review' ? 'bg-amber-500/[0.02] border-amber-500/20 text-amber-400' :
                  'bg-rose-500/[0.02] border-rose-500/20 text-rose-400'
                }`}>
                  <div className="flex items-center gap-2.5 font-bold uppercase text-xs tracking-wider">
                    {policyDecision.decision === 'allow' ? <CheckCircle2 className="h-4.5 w-4.5 stroke-[2.5]" /> : <AlertTriangle className="h-4.5 w-4.5 stroke-[2.5]" />}
                    {policyDecision.decision.replace('_', ' ')}
                  </div>
                  <span className="text-[10px] font-mono opacity-70 tracking-wide bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                    {policyDecision.reasons.join(', ') || 'default'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        {/* Logs */}
        {(authChallenge || credential || authSession || signedVerification) && (
          <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
              <CardTitle className="text-base font-bold text-white tracking-wide">Credential Raw Payload Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-5 bg-black/60 max-h-[380px] overflow-auto border-t border-white/5 space-y-5">
                {authChallenge && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/30">Active Challenge payload</span>
                    <JsonBlock value={authChallenge} />
                  </div>
                )}
                {credential && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/30">Active Credential stored</span>
                    <JsonBlock value={credential} />
                  </div>
                )}
                {authSession && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/30">Active Session state</span>
                    <JsonBlock value={authSession} />
                  </div>
                )}
                {signedVerification && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/30">Signature Verification details</span>
                    <JsonBlock value={signedVerification} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audit Trail */}
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <CardTitle className="text-base font-bold text-white tracking-wide">Local Node Audit Trail</CardTitle>
            <CardDescription className="text-white/40 text-xs">Immutable cryptographic record of critical security assertions.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {auditEvents.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center justify-center min-h-[300px] gap-2 border border-white/5 border-dashed rounded-xl bg-black/20 m-6">
                <ShieldCheck className="h-6 w-6 text-white/20 animate-pulse" />
                <p className="text-xs text-white/30">No security audit event assertions generated yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[380px] overflow-auto">
                {auditEvents.map((event, index) => (
                  <div key={index} className="p-5 hover:bg-white/[0.01] transition-all duration-300 relative group">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="status-led status-led-blue scale-75" />
                        <span className="font-bold text-xs text-white/90 select-all tracking-wide">{event.event_type}</span>
                      </div>
                      {event.decision && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          event.decision === 'allow' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {event.decision}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/30 font-mono break-all select-all leading-normal">
                      Subject: {event.subject_id}
                    </p>
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
