import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { Genome } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dna, RefreshCw } from "lucide-react"

export function GenomePanel() {
  const { genomes, setGenomes } = useAppStore()
  const { runAction } = useAction()

  const [subject, setSubject] = useState("cacao:batch:001")
  const [originJson, setOriginJson] = useState('{\n  "producer": "Cooperative Dakar",\n  "location": "Senegal"\n}')
  const [historyJson, setHistoryJson] = useState('{\n  "created_from": "field inspection",\n  "chain": ["farm", "port", "buyer"]\n}')
  const [rightsJson, setRightsJson] = useState('{\n  "view": true,\n  "resell": false,\n  "revoke": true\n}')

  async function createGenome() {
    let origin = {}, history = {}, rights = {}
    try { origin = JSON.parse(originJson) } catch { /* */ }
    try { history = JSON.parse(historyJson) } catch { /* */ }
    try { rights = JSON.parse(rightsJson) } catch { /* */ }

    const created = await runAction(
      () => pactaraFetch<Genome>("/v1/genomes", {
        method: "POST",
        body: JSON.stringify({ subject, origin, history, rights }),
      }),
      "Genome created."
    )
    if (created) setGenomes([created, ...genomes])
  }

  async function refreshGenomes() {
    const next = await runAction(
      () => pactaraFetch<Genome[]>("/v1/genomes?limit=20"),
      "Genome registry refreshed."
    )
    if (next) setGenomes(next)
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Genome <span className="accent-text-violet-pink">of Things</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Bind physical or virtual assets cryptographically with immutable provenance history, rights, and claims.
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => void refreshGenomes()} 
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4 text-pink-400" /> Sync Genome Registry
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Left Side: Create Genome Form */}
        <Card className="glass-panel-glow lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 animate-pulse">
                <Dna className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Synthesize Asset Genome</CardTitle>
                <CardDescription className="text-white/40 text-xs">Instantiate cryptographic digital pedigree parameters.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Subject Asset URI Reference</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-pink-500/20 font-mono text-xs" />
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Origin (JSON)</Label>
                <Textarea value={originJson} onChange={(e) => setOriginJson(e.target.value)} className="glass-input min-h-[90px] p-3 resize-none focus:ring-pink-500/20 font-mono text-[10.5px] bg-black/40" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">History Trace (JSON)</Label>
                <Textarea value={historyJson} onChange={(e) => setHistoryJson(e.target.value)} className="glass-input min-h-[90px] p-3 resize-none focus:ring-pink-500/20 font-mono text-[10.5px] bg-black/40" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Usage Rights (JSON)</Label>
                <Textarea value={rightsJson} onChange={(e) => setRightsJson(e.target.value)} className="glass-input min-h-[90px] p-3 resize-none focus:ring-pink-500/20 font-mono text-[10.5px] bg-black/40" />
              </div>
            </div>

            <Button 
              onClick={() => void createGenome()} 
              className="w-full h-10 bg-pink-500 hover:bg-pink-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(236,72,153,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <Dna className="mr-2 h-4 w-4 stroke-[2.5]" /> Synthesize Digital Genome
            </Button>
          </CardContent>
        </Card>

        {/* Right Side: Genome Registry */}
        <Card className="glass-panel lg:col-span-2 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <CardTitle className="text-base font-bold text-white tracking-wide">Registry Genomes</CardTitle>
            <CardDescription className="text-white/40 text-xs">Resolved immutable digital pedigree records.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {genomes.length === 0 ? (
              <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center justify-center min-h-[260px] gap-3 border border-white/5 border-dashed rounded-2xl bg-black/20 m-6">
                <Dna className="h-6 w-6 stroke-[1.5] text-white/20 animate-pulse" />
                <p className="max-w-[200px] leading-relaxed">No digital pedigree genomes synthesized on this local network node.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[520px] overflow-auto">
                {genomes.map((genome) => (
                  <div key={genome.id} className="p-5 hover:bg-white/[0.01] transition-all duration-300 relative group">
                    <div className="flex justify-between items-center mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="status-led status-led-blue scale-75 animate-pulse" />
                        <span className="font-bold text-xs text-white/90 select-all tracking-wide">{genome.subject}</span>
                      </div>
                      <Dna className="h-4 w-4 text-pink-500/40 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <p className="text-[10px] font-mono text-white/30 break-all select-all leading-normal">{genome.id}</p>
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
