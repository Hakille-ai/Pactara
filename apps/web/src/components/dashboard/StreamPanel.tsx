import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000"

export function StreamPanel() {
  const { streamSnapshot, setStreamSnapshot } = useAppStore()
  const { runAction } = useAction()

  async function readStream() {
    await runAction(async () => {
      const response = await fetch(`${API_BASE}/v1/ops/stream`)
      const text = await response.text()
      if (!response.ok) throw new Error(text || `PACTARA stream error ${response.status}`)
      setStreamSnapshot(text)
      return text
    }, "SSE stream snapshot loaded.")
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Event <span className="accent-text-emerald-teal">Stream</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Observe real-time transaction pipelines, proof verification traces, and ledger states directly from the runtime server.
          </p>
        </div>
        <Button 
          onClick={() => void readStream()} 
          className="w-full sm:w-auto h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(16,185,129,0.25)] rounded-lg btn-apple-spring transition-all duration-300 px-6 pt-0.5"
        >
          <Activity className="mr-2 h-4.5 w-4.5 stroke-[2.5] animate-pulse" /> Capture Live Stream
        </Button>
      </div>

      <Card className="glass-panel overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white tracking-wide">Dynamic Event Stream Terminal</CardTitle>
            </div>
          </div>
          {streamSnapshot && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 pt-0.5">Live Connection Snapshot</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {streamSnapshot ? (
            <pre className="p-6 bg-black/50 text-[11px] leading-relaxed text-emerald-400 font-mono whitespace-pre-wrap max-h-[550px] overflow-auto select-all selection:bg-emerald-500/20">
              {streamSnapshot}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 border border-dashed border-white/5 rounded-b-2xl bg-black/20 gap-3">
              <Activity className="h-8 w-8 stroke-[1.5] text-white/20 animate-pulse" />
              <p className="text-xs text-white/30 text-center max-w-[280px] leading-relaxed">
                No real-time runtime pipeline events recorded. Initiate live connection capture to display streaming transactions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
