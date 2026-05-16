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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Genome of Things</h1>
        <p className="text-muted-foreground mt-2">
          Create digital genomes for physical and virtual assets with provenance, history, and rights.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-pink-500/10 text-pink-400">
                <Dna className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">Create Genome</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Subject ID</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="glass-input font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Origin</Label>
              <Textarea value={originJson} onChange={(e) => setOriginJson(e.target.value)} className="glass-input font-mono text-xs min-h-[80px] resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">History</Label>
              <Textarea value={historyJson} onChange={(e) => setHistoryJson(e.target.value)} className="glass-input font-mono text-xs min-h-[80px] resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Rights</Label>
              <Textarea value={rightsJson} onChange={(e) => setRightsJson(e.target.value)} className="glass-input font-mono text-xs min-h-[80px] resize-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => void createGenome()} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white border-none">
                <Dna className="mr-2 h-4 w-4" /> Create Genome
              </Button>
              <Button variant="secondary" onClick={() => void refreshGenomes()} className="bg-white/10 hover:bg-white/20 text-white border-none">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Genome Registry</CardTitle>
            <CardDescription>All registered digital genomes.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {genomes.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm">No genomes registered yet.</div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[600px] overflow-auto">
                {genomes.map((genome) => (
                  <div key={genome.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-sm text-pink-400">{genome.subject}</span>
                    </div>
                    <p className="text-xs text-white/40 font-mono break-all">{genome.id}</p>
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
