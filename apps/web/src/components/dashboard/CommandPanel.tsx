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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground mt-2">Turn natural operational intent into PACTs, workflows, and audit records.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-500/10 text-orange-400"><Terminal className="h-5 w-5" /></div>
              <CardTitle className="text-lg">Issue Command</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Domain</Label>
                <Select value={domainId} onValueChange={(v) => setDomainId(v || "")}><SelectTrigger className="glass-input"><SelectValue /></SelectTrigger>
                  <SelectContent>{domains.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Intent</Label>
                <Input value={intent} onChange={(e) => setIntent(e.target.value)} className="glass-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Target</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} className="glass-input font-mono text-sm" placeholder={identity?.id ?? "identity"} />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Command Text</Label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} className="glass-input min-h-[80px] resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Payload JSON</Label>
              <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} className="glass-input font-mono text-xs min-h-[80px] resize-none" />
            </div>
            <Button onClick={() => void sendCommand()} disabled={!identity} className="w-full bg-orange-500 hover:bg-orange-600 text-white border-none mt-2">
              <Activity className="mr-2 h-4 w-4" /> Execute Command
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Execution Result</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {command ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Card className="glass-panel p-3 text-center"><p className="text-[10px] uppercase text-white/40">PACT</p><p className="text-lg font-bold font-mono">{command.pact_id ? "✓" : "—"}</p></Card>
                  <Card className="glass-panel p-3 text-center"><p className="text-[10px] uppercase text-white/40">Workflow</p><p className="text-lg font-bold font-mono">{command.workflow_id ? "✓" : "—"}</p></Card>
                  <Card className="glass-panel p-3 text-center"><p className="text-[10px] uppercase text-white/40">Status</p><p className="text-lg font-bold font-mono uppercase">{command.status}</p></Card>
                </div>
                <div className="rounded border border-white/5 bg-white/[0.02] p-3 text-sm text-white/80">{command.result.summary}</div>
                <JsonBlock value={command} />
              </div>
            ) : (
              <div className="p-8 text-center text-white/40 text-sm">Execute a command to see the result here.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {commands.length > 0 && (
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4"><CardTitle className="text-lg">Command History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5 max-h-[300px] overflow-auto">
              {commands.map((item) => (
                <div key={item.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex justify-between"><span className="text-sm font-medium text-orange-400">{item.intent}</span><span className="text-[10px] uppercase bg-white/10 text-white/60 px-2 py-0.5 rounded">{item.status}</span></div>
                  <p className="text-xs text-white/40 mt-1 line-clamp-1">{item.command_text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
