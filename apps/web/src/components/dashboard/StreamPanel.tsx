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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Event Stream</h1>
        <p className="text-muted-foreground mt-2">Real-time SSE stream from the sovereign runtime.</p>
      </div>

      <Button onClick={() => void readStream()} className="w-fit bg-emerald-500 hover:bg-emerald-600 text-white border-none">
        <Activity className="mr-2 h-4 w-4" /> Read Stream
      </Button>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400"><Activity className="h-5 w-5" /></div>
            <CardTitle className="text-lg">Stream Output</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {streamSnapshot ? (
            <pre className="p-6 bg-black/60 text-xs leading-relaxed text-emerald-300 font-mono whitespace-pre-wrap max-h-[600px] overflow-auto">
              {streamSnapshot}
            </pre>
          ) : (
            <div className="p-12 text-center text-white/40 text-sm">No stream snapshot loaded yet. Click Read Stream to pull the latest SSE data.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
