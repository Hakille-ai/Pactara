import { useAppStore } from "@/store/useAppStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode } from "lucide-react"

export function QrPanel() {
  const { qr, pact } = useAppStore()

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">PACT QR Code</h1>
        <p className="text-muted-foreground mt-2">Portable visual representation of the active PACT.</p>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400"><QrCode className="h-5 w-5" /></div>
            <CardTitle className="text-lg">QR Payload</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {qr ? (
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="rounded-xl border border-white/10 bg-white p-4 shadow-2xl">
                <img src={qr} alt="PACTARA PACT QR code" className="h-64 w-64" />
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <p className="text-sm font-medium text-white/70">PACT ID</p>
                  <p className="mt-2 break-all rounded-lg bg-black/40 border border-white/5 p-4 font-mono text-sm text-indigo-300">{pact?.id ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/70">Status</p>
                  <p className="mt-1 text-emerald-400 font-semibold uppercase">{pact?.status ?? "N/A"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-8 w-8 text-white/30" />
              </div>
              <p className="text-white/40">Create a PACT first to generate a QR payload.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
