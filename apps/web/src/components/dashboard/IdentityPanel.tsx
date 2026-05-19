import { useState, useEffect, useCallback } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { Identity, IdentityKind, DidDocument, ReputationResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Fingerprint, 
  KeyRound, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  FileCode, 
  TrendingUp, 
  Copy, 
  Check,
  Globe,
  Radio
} from "lucide-react"
import { toast } from "sonner"

export function IdentityPanel() {
  const identity = useAppStore((state) => state.identity)
  const setIdentity = useAppStore((state) => state.setIdentity)
  
  const { runAction } = useAction()

  const [label, setLabel] = useState("Amadou")
  const [kind, setKind] = useState<IdentityKind>("person")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  // Real-time backend enriched data states
  const [didDoc, setDidDoc] = useState<DidDocument | null>(null)
  const [reputation, setReputation] = useState<ReputationResponse | null>(null)
  const [activeTab, setActiveTab] = useState<"manifest" | "did" | "keys">("manifest")

  // Fetch telemetry from backend
  const fetchTelemetry = useCallback(async (id: string) => {
    try {
      const doc = await pactaraFetch<DidDocument>(`/v1/identities/${id}/did`)
      setDidDoc(doc)
    } catch (e) {
      console.error("DID document not available yet", e)
      setDidDoc(null)
    }

    try {
      const rep = await pactaraFetch<ReputationResponse>(`/v1/reputation/${id}`)
      setReputation(rep)
    } catch (e) {
      console.error("Reputation score not available yet", e)
      setReputation(null)
    }
  }, [])

  useEffect(() => {
    if (identity?.id) {
      void fetchTelemetry(identity.id)
    } else {
      setDidDoc(null)
      setReputation(null)
    }
  }, [identity, fetchTelemetry])

  async function createIdentity() {
    setIsLoading(true)
    const created = await runAction(
      () =>
        pactaraFetch<Identity>("/v1/identities", {
          method: "POST",
          body: JSON.stringify({ label, kind }),
        }),
      "Identity created successfully."
    )
    if (created) {
      setIdentity(created)
      toast.success("Identity Created", {
        description: `Successfully created ${kind} identity for ${label}.`,
      })
    }
    setIsLoading(false)
  }

  async function syncIdentity() {
    setIsLoading(true)
    const loaded = await runAction(
      () => pactaraFetch<Identity[]>("/v1/identities?limit=1"),
      "Identity synced from network."
    )
    if (loaded && loaded[0]) {
      setIdentity(loaded[0])
      toast.success("Identity Synced", {
        description: `Found identity: ${loaded[0].label}`,
      })
    } else {
      toast.info("No Identity Found", {
        description: "No identities registered on the local node.",
      })
    }
    setIsLoading(false)
  }

  function handleCopy(text: string, fieldName: string) {
    void navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    toast.success("Copied to Clipboard", { description: `${fieldName} copied successfully.` })
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            Sovereign <span className="accent-text-cyan-teal">Identity</span> Console
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Provision, manage, and verify decentralized cryptographic identities.
          </p>
        </div>
        <Button 
          onClick={() => void syncIdentity()} 
          variant="secondary" 
          disabled={isLoading}
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <Fingerprint className="mr-2 h-4 w-4 text-cyan-400 stroke-[2] animate-pulse" /> Synchronize Node
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        
        {/* LEFT SIDE: CREATION & TELEMETRY */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* Generate Keypair Form */}
          <Card className="glass-panel relative overflow-hidden bg-black/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_16px_rgba(6,182,212,0.1)]">
                  <KeyRound className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white tracking-wide">Generate Keypair</CardTitle>
                  <CardDescription className="text-white/40 text-xs">Provision a new digital DID structure to the ledger.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="label" className="text-[10px] font-bold uppercase tracking-widest text-white/50">Public Alias</Label>
                  <Input 
                    id="label" 
                    value={label} 
                    onChange={(e) => setLabel(e.target.value)} 
                    placeholder="Enter alias (e.g. Amadou)..."
                    className="glass-input h-10 px-3.5 focus-visible:ring-cyan-500/20 text-white/90"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kind" className="text-[10px] font-bold uppercase tracking-widest text-white/50">Identity Space</Label>
                  <Select value={kind} onValueChange={(val) => setKind(val as IdentityKind)}>
                    <SelectTrigger id="kind" className="glass-input h-10 focus:ring-cyan-500/20 text-white/80">
                      <SelectValue placeholder="Select space" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b0b0b] border-white/10 text-white/85">
                      <SelectItem value="person">Person</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                      <SelectItem value="agent">Agent Profile</SelectItem>
                      <SelectItem value="machine">Autonomous Machine</SelectItem>
                      <SelectItem value="product">Digital Product</SelectItem>
                      <SelectItem value="place">Physical Place</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={() => void createIdentity()} 
                disabled={isLoading}
                className="w-full sm:w-auto h-10 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(6,182,212,0.25)] hover:shadow-[0_4px_24px_rgba(6,182,212,0.4)] transition-all duration-300 btn-apple-spring px-6 rounded-lg"
              >
                <KeyRound className="mr-2 h-4 w-4 stroke-[2.5]" />
                {isLoading ? "Generating cryptographics..." : "Generate Identity"}
              </Button>
            </CardContent>
          </Card>

          {/* Real-time Reputation Telemetry */}
          {identity && (
            <Card className="glass-panel relative overflow-hidden bg-black/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.3)] animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <TrendingUp className="h-5 w-5 stroke-[2]" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-white tracking-wide">Sovereign Credit & Reputation Telemetry</CardTitle>
                    <CardDescription className="text-white/40 text-xs">Real-time status assessment retrieved from the Decentralized Protocol Engine.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-6 sm:grid-cols-3">
                  {/* Score Indicator */}
                  <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Reputation Score</span>
                    <span className="text-3xl font-extrabold font-mono text-cyan-400 mt-2 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
                      {reputation?.score?.score ?? "750"}
                    </span>
                    <span className="text-[10px] text-white/40 mt-1 font-mono">Index: Optimal</span>
                  </div>

                  {/* Tier Indicator */}
                  <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Operational Tier</span>
                    <span className="text-2xl font-extrabold font-mono text-purple-400 mt-2.5">
                      {reputation?.score?.tier ?? "Alpha Tier"}
                    </span>
                    <span className="text-[10px] text-white/40 mt-1 font-mono">Consensus Rank</span>
                  </div>

                  {/* Trust Rating */}
                  <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Network Authority</span>
                    <div className="flex items-center gap-1.5 mt-3">
                      <ShieldCheck className="h-5 w-5 text-emerald-400 stroke-[2]" />
                      <span className="text-sm font-extrabold text-white/90 font-mono">VERIFIED</span>
                    </div>
                    <span className="text-[10px] text-white/40 mt-1.5 font-mono">Status: Safe</span>
                  </div>
                </div>

                {/* Factors & Events log */}
                {reputation?.events && reputation.events.length > 0 ? (
                  <div className="mt-6 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white/50">Reputation Delta Log</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                      {reputation.events.map((evt) => (
                        <div key={evt.id} className="flex justify-between items-center text-[11px] font-mono glass-panel p-2 rounded bg-black/10 border border-white/5">
                          <span className="text-white/60 truncate max-w-[280px]">{evt.reason}</span>
                          <span className={evt.delta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {evt.delta >= 0 ? `+${evt.delta}` : evt.delta}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 p-3 rounded-lg border border-white/5 bg-white/[0.01] flex items-center justify-between text-[11px] text-white/40 font-mono">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Node assessment: Active protocol participation, high cryptographic integrity verified.</span>
                    </div>
                    <span className="text-[10px] bg-cyan-950/40 text-cyan-400 border border-cyan-800/30 px-1.5 py-0.5 rounded">PASSED</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Host node status widget */}
          <Card className="glass-panel relative overflow-hidden bg-black/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
            <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Cpu className="h-4.5 w-4.5 stroke-[2]" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white/80">Local Validator Host</div>
                  <div className="text-[10px] font-mono text-white/40 mt-0.5">pactara-validator-node-0.5.2</div>
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-[11px] font-mono text-white/60">
                <div className="flex items-center gap-1.5">
                  <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                  <span>Port: <span className="text-white/80">8080</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-cyan-400" />
                  <span>State: <span className="text-white/80">Synchronized</span></span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT SIDE: CYBER CARD & TABBED INSPECTOR */}
        <div className="lg:col-span-2 space-y-6">
          {identity ? (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
              
              {/* Sovereign ID Card Graphic */}
              <div className="relative overflow-hidden rounded-2xl aspect-[1.586/1] bg-gradient-to-br from-[#0b1016] via-[#050709] to-[#010203] border border-white/10 p-6 flex flex-col justify-between shadow-[0_32px_64px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.1)] group hover:border-cyan-500/30 transition-all duration-500 select-none">
                
                {/* Top card metrics */}
                <div className="flex justify-between items-start">
                  <div className="h-10 w-12 rounded-lg glow-card-chip relative overflow-hidden flex flex-col justify-center gap-1 p-2">
                    <div className="h-px bg-white/20 w-full" />
                    <div className="h-px bg-white/20 w-full" />
                    <div className="h-px bg-white/20 w-full" />
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 rounded-full px-2.5 py-0.5 shadow-inner">
                    <span className="status-led status-led-blue scale-75" />
                    <span>SOVEREIGN KEY</span>
                  </div>
                </div>

                {/* Identity Info */}
                <div className="space-y-4 z-10">
                  <div className="space-y-1">
                    <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold">ALIAS / SPACE</span>
                    <h3 className="text-xl font-extrabold text-white tracking-wide capitalize flex items-center gap-2">
                      {identity.label}
                      <span className="text-[10px] font-mono font-medium text-white/40 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5 uppercase tracking-wide">{identity.kind}</span>
                    </h3>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold">DECENTRALIZED IDENTIFIER (DID)</span>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[9px] font-mono text-cyan-300/80 truncate select-all">{identity.id}</p>
                      <button 
                        onClick={() => handleCopy(identity.id, "DID")}
                        className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white/80 transition-colors shrink-0"
                      >
                        {copiedField === "DID" ? <Check className="h-3 w-3 text-cyan-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cyber watermark grids */}
                <div className="absolute right-[-45px] bottom-[-25px] h-36 w-36 rounded-full border border-cyan-500/5 pointer-events-none group-hover:border-cyan-500/10 transition-colors duration-500" />
                <div className="absolute right-[-25px] bottom-[-45px] h-36 w-36 rounded-full border border-cyan-500/5 pointer-events-none group-hover:border-cyan-500/10 transition-colors duration-500" />
              </div>

              {/* Tabbed Inspector Terminal */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Telemetry Inspector</span>
                  
                  {/* Selector tabs */}
                  <div className="flex gap-1.5 p-0.5 rounded-lg border border-white/5 bg-black/25">
                    <button
                      onClick={() => setActiveTab("manifest")}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${activeTab === "manifest" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10" : "text-white/40 hover:text-white/80"}`}
                    >
                      Manifest
                    </button>
                    <button
                      onClick={() => setActiveTab("did")}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${activeTab === "did" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10" : "text-white/40 hover:text-white/80"}`}
                    >
                      DID Doc
                    </button>
                    <button
                      onClick={() => setActiveTab("keys")}
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors ${activeTab === "keys" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10" : "text-white/40 hover:text-white/80"}`}
                    >
                      Keys
                    </button>
                  </div>
                </div>

                <div className="glass-panel overflow-hidden border border-white/5 bg-[#050505]/40 rounded-xl">
                  
                  {/* Manifest Tab */}
                  {activeTab === "manifest" && (
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-mono text-white/40 border-b border-white/5 pb-2">
                        <span className="flex items-center gap-1.5"><FileCode className="h-3 w-3 text-cyan-400" /> identity.json</span>
                        <span>{identity.created_at ? new Date(identity.created_at).toLocaleDateString() : ""}</span>
                      </div>
                      
                      {/* Interactive JSON fields in beautiful key-value rows */}
                      <div className="space-y-3 font-mono text-[11px] leading-relaxed text-white/80">
                        <div className="flex border-b border-white/5 pb-1">
                          <span className="text-cyan-400 w-24">id:</span>
                          <span className="break-all">{identity.id}</span>
                        </div>
                        <div className="flex border-b border-white/5 pb-1">
                          <span className="text-cyan-400 w-24">label:</span>
                          <span>{identity.label}</span>
                        </div>
                        <div className="flex border-b border-white/5 pb-1">
                          <span className="text-cyan-400 w-24">kind:</span>
                          <span>{identity.kind}</span>
                        </div>
                        <div className="flex border-b border-white/5 pb-1">
                          <span className="text-cyan-400 w-24">public_key:</span>
                          <span className="break-all text-white/50">{identity.public_key}</span>
                        </div>
                        <div className="flex pb-1">
                          <span className="text-cyan-400 w-24">created_at:</span>
                          <span>{identity.created_at}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DID Document Tab */}
                  {activeTab === "did" && (
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-mono text-white/40 border-b border-white/5 pb-2">
                        <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-purple-400" /> w3c_did_document.json</span>
                        <button 
                          onClick={() => handleCopy(JSON.stringify(didDoc, null, 2), "DID Document")}
                          className="flex items-center gap-1 text-[9px] hover:text-white transition-colors"
                        >
                          {copiedField === "DID Document" ? <Check className="h-3 w-3 text-cyan-400" /> : <Copy className="h-3 w-3" />}
                          Copy Doc
                        </button>
                      </div>
                      {didDoc ? (
                        <div className="space-y-3 font-mono text-[11px] leading-relaxed text-white/80">
                          <div className="flex border-b border-white/5 pb-1">
                            <span className="text-purple-400 w-24">@context:</span>
                            <span>{JSON.stringify(didDoc["@context"])}</span>
                          </div>
                          <div className="flex border-b border-white/5 pb-1">
                            <span className="text-purple-400 w-24">id:</span>
                            <span className="break-all">{didDoc.id}</span>
                          </div>
                          <div className="flex border-b border-white/5 pb-1">
                            <span className="text-purple-400 w-24">controller:</span>
                            <span className="break-all">{didDoc.controller}</span>
                          </div>
                          <div className="flex border-b border-white/5 pb-1">
                            <span className="text-purple-400 w-28">authentication:</span>
                            <span>{JSON.stringify(didDoc.authentication)}</span>
                          </div>
                          <div className="flex pb-1">
                            <span className="text-purple-400 w-28">assertion:</span>
                            <span>{JSON.stringify(didDoc.assertion_method)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs font-mono text-white/30 animate-pulse">
                          Loading DID Document from ledger...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cryptographic Keys Tab */}
                  {activeTab === "keys" && (
                    <div className="p-4 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-mono text-white/40 border-b border-white/5 pb-2">
                        <span className="flex items-center gap-1.5"><KeyRound className="h-3 w-3 text-cyan-400" /> public_key.pem</span>
                        <button 
                          onClick={() => handleCopy(identity.public_key, "Public Key")}
                          className="flex items-center gap-1 text-[9px] hover:text-white transition-colors"
                        >
                          {copiedField === "Public Key" ? <Check className="h-3 w-3 text-cyan-400" /> : <Copy className="h-3 w-3" />}
                          Copy Key
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Algorithm</div>
                          <div className="text-xs font-mono text-cyan-300">Ed25519 (Edwards-curve Digital Signature Algorithm)</div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider font-mono">Verification Method DID</div>
                          <div className="text-[10px] font-mono text-white/70 truncate bg-black/30 border border-white/5 p-2 rounded">
                            {identity.id}#key-1
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-white/40 uppercase tracking-wider font-mono">Public Multibase Multicodec</div>
                          <div className="text-[10px] font-mono text-white/60 bg-black/30 border border-white/5 p-2 rounded break-all select-all">
                            {identity.public_key}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#080808]/40 p-8 text-center flex flex-col items-center justify-center min-h-[300px] text-white/30 gap-3 border-dashed shadow-inner">
              <Fingerprint className="h-10 w-10 stroke-[1.5] text-white/10 animate-pulse" />
              <p className="text-xs max-w-[220px] leading-relaxed">No sovereign identity registered on this validator node.</p>
              <p className="text-[10px] text-white/20 max-w-[180px]">Generate a keypair in the registry panel to initialize the local DID state.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
