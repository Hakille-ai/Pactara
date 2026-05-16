import { useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { API_BASE } from "@/lib/pactara-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import QRCode from "qrcode"

export function QrPanel() {
  const { qr, setQr, pact } = useAppStore()

  // Auto-generate QR code whenever the active pact changes
  useEffect(() => {
    async function generateQr() {
      if (!pact?.id) {
        setQr("")
        return
      }
      try {
        const payload = {
          protocol: "PACTARA",
          pact_id: pact.id,
          api: API_BASE,
          verify_endpoint: `/v1/pacts/${pact.id}/verify`,
          status: pact.status,
        }
        const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
          margin: 1,
          width: 320,
          color: { dark: "#000000", light: "#ffffff" },
        })
        setQr(dataUrl)
      } catch {
        setQr("")
      }
    }
    void generateQr()
  }, [pact?.id, pact?.status, setQr])

  function copyPactId() {
    if (pact?.id) {
      void navigator.clipboard.writeText(pact.id)
      toast.success("Copied", { description: "PACT ID copied to clipboard." })
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">PACT QR Code</h1>
        <p className="text-muted-foreground mt-2">
          Portable visual representation of the active PACT for verification and sharing.
        </p>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
              <QrCode className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">QR Payload</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {qr && pact ? (
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-2xl shadow-indigo-500/10">
                <img src={qr} alt="PACTARA PACT QR code" className="h-64 w-64" />
              </div>
              <div className="min-w-0 flex-1 space-y-5">
                <div>
                  <p className="text-sm font-medium text-white/70 mb-2">PACT ID</p>
                  <div className="flex items-center gap-2">
                    <p className="break-all rounded-lg bg-black/40 border border-white/5 p-4 font-mono text-sm text-indigo-300 flex-1">
                      {pact.id}
                    </p>
                    <Button variant="ghost" size="icon" onClick={copyPactId} className="shrink-0 h-10 w-10 text-white/50 hover:text-white hover:bg-white/10">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/50 mb-1">Status</p>
                    <p className={`text-lg font-bold uppercase ${
                      pact.status === 'active' ? 'text-emerald-400' :
                      pact.status === 'draft' ? 'text-amber-400' :
                      pact.status === 'revoked' ? 'text-red-400' : 'text-white/80'
                    }`}>{pact.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50 mb-1">Intent</p>
                    <p className="text-sm font-medium text-white/80">{pact.intent}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/50 mb-1">Verify Endpoint</p>
                  <p className="text-xs font-mono text-white/40 flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {API_BASE}/v1/pacts/{pact.id}/verify
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-8 w-8 text-white/30" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No PACT Selected</h3>
              <p className="text-white/40 max-w-sm mx-auto">
                Create a PACT first in the PACT panel. The QR code will be automatically generated from the active PACT data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
