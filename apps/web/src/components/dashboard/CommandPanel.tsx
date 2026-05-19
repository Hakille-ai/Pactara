import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { RuntimeCommand, Pact } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Terminal, Activity } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function CommandPanel() {
  const { identity, domains, runtimeCommand: command, setRuntimeCommand: setCommand, runtimeCommands: commands, setPact } = useAppStore()
  const { runAction } = useAction()

  const [domainId, setDomainId] = useState("economy")
  const [intent, setIntent] = useState("coordinate_trade_response")
  const [target, setTarget] = useState("")
  const [text, setText] = useState("Create a signed PACT and workflow for a sandbox trade/payment response.")
  const [payload, setPayload] = useState('{"amount": 1200, "risk": "medium"}')

  async function sendCommand() {
    if (!identity) return
    let parsedPayload = {}
    try { parsedPayload = JSON.parse(payload) } catch { /* */ }

    const created = await runAction(
      () => pactaraFetch<RuntimeCommand>("/v1/runtime/commands", {
        method: "POST",
        body: JSON.stringify({
          actor: identity.id, domain_id: domainId, intent,
          target: target || identity.id, command_text: text, payload: parsedPayload,
        }),
      }),
      "Runtime command executed."
    )
    if (created) {
      setCommand(created)
      if (created.pact_id) {
        const pact = await runAction(() => pactaraFetch<Pact>(`/v1/pacts/${created.pact_id}`), "Generated PACT loaded.")
        if (pact) setPact(pact)
      }
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Command <span className="accent-text-orange-red">Center</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Turn natural operational intent, message structures, and prompt vectors directly into immutable consensus PACT contracts.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        {/* Issue Command */}
        <Card className="glass-panel-glow overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Terminal className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Issue Protocol Command</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4.5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Domain Layer</Label>
                <Select value={domainId} onValueChange={(v) => setDomainId(v || "")}>
                  <SelectTrigger className="glass-input h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b0b0b] border-white/10 text-white">
                    {domains.map(d => (
                      <SelectItem key={d.id} value={d.id} className="focus:bg-white/5 hover:bg-white/5 transition-colors">{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Consensus Intent</Label>
                <Input value={intent} onChange={(e) => setIntent(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-orange-500/20 text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Recipient Target</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-orange-500/20 font-mono text-xs" placeholder={identity?.id ?? "identity"} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Operational Plaintext Intent</Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} className="glass-input min-h-[90px] resize-none focus:ring-orange-500/20 text-xs p-3.5 leading-relaxed" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Structured Parameter Payload JSON</Label>
              <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="glass-input font-mono text-xs min-h-[90px] resize-none focus:ring-orange-500/20 p-3.5 leading-normal" />
            </div>
            <Button 
              onClick={() => void sendCommand()} 
              disabled={!identity} 
              className="w-full h-10 bg-orange-500 hover:bg-orange-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(249,115,22,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <Activity className="mr-2 h-4 w-4 stroke-[2.5]" /> Launch Protocol Intent
            </Button>
          </CardContent>
        </Card>

        {/* Execution Result */}
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <CardTitle className="text-base font-bold text-white tracking-wide">Dynamic Execution Response</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {command ? (
              <div className="space-y-5 animate-in fade-in zoom-in-95 duration-500">
                <div className="grid gap-4.5 sm:grid-cols-3">
                  <Card className="glass-panel p-4 text-center border border-white/5 relative overflow-hidden group">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1">Contract Hash</p>
                    <p className="text-base font-extrabold font-mono text-emerald-400 mt-1">{command.pact_id ? "STABLE" : "NONE"}</p>
                  </Card>
                  <Card className="glass-panel p-4 text-center border border-white/5 relative overflow-hidden group">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1">Workflow State</p>
                    <p className="text-base font-extrabold font-mono text-cyan-400 mt-1">{command.workflow_id ? "ACTIVE" : "NONE"}</p>
                  </Card>
                  <Card className="glass-panel p-4 text-center border border-white/5 relative overflow-hidden group">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-white/40 mb-1">Response Standing</p>
                    <p className="text-base font-extrabold font-mono text-orange-400 uppercase mt-1">{command.status}</p>
                  </Card>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4.5 text-xs text-white/80 select-all leading-relaxed shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/30 block mb-1">Decentralized Execution Summary</span>
                  {command.result.summary}
                </div>
                <div className="p-4 bg-black/40 border border-white/5 rounded-xl">
                  <JsonBlock value={command} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] min-h-[300px] gap-3">
                <Terminal className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
                <p className="text-xs text-white/30 text-center max-w-[280px] leading-relaxed">
                  Trigger an intent command standing from the editor block to view compiled state mutation reports.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History log */}
      {commands.length > 0 && (
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <CardTitle className="text-base font-bold text-white tracking-wide">Consensus Execution Ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5 max-h-[340px] overflow-auto">
              {commands.map((item) => (
                <div key={item.id} className="p-5 hover:bg-white/[0.01] transition-all duration-300 relative group flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="status-led status-led-orange scale-75" />
                      <span className="text-xs font-bold text-white/90 select-all tracking-wide">{item.intent}</span>
                    </div>
                    <p className="text-[10px] text-white/30 font-mono mt-1 max-w-sm sm:max-w-lg select-all leading-normal truncate">{item.command_text}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
