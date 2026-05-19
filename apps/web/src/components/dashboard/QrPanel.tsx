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
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          PACT <span className="accent-text-indigo-pink">QR Code</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Generate portable visual payloads containing protocol hashes to instantly verify on-chain states externally.
        </p>
      </div>

      <Card className="glass-panel overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <QrCode className="h-5 w-5 stroke-[2]" />
            </div>
            <CardTitle className="text-base font-bold text-white tracking-wide">Interactive Verification Token</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {qr && pact ? (
            <div className="flex flex-col md:flex-row items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="relative group shrink-0">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl blur opacity-30 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative rounded-2xl border border-white/10 bg-white p-5 shadow-2xl">
                  <img src={qr} alt="PACTARA PACT QR code" className="h-56 w-56 select-none" />
                </div>
              </div>
              
              <div className="min-w-0 flex-1 space-y-5 w-full">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Cryptographic PACT Hash</p>
                  <div className="flex items-center gap-2">
                    <p className="break-all rounded-xl bg-black/40 border border-white/5 p-4.5 font-mono text-xs text-indigo-300 flex-1 leading-normal select-all">
                      {pact.id}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={copyPactId} 
                      className="shrink-0 h-10 w-10 text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all duration-300 btn-apple-spring border border-white/5"
                    >
                      <Copy className="h-4.5 w-4.5 stroke-[2]" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Contract Status</p>
                    <p className={`text-sm font-extrabold uppercase tracking-wider ${
                      pact.status === 'active' ? 'text-emerald-400' :
                      pact.status === 'draft' ? 'text-amber-400' :
                      pact.status === 'revoked' ? 'text-rose-400' : 'text-white/80'
                    }`}>{pact.status}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Intent Domain</p>
                    <p className="text-sm font-semibold text-white/85 truncate">{pact.intent}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">Consensus Verify Endpoints</p>
                  <p className="text-[10px] font-mono text-white/35 flex items-center gap-1.5 select-all leading-normal">
                    <ExternalLink className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    {API_BASE}/v1/pacts/{pact.id}/verify
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 border border-dashed border-white/5 rounded-2xl bg-black/20 gap-3 min-h-[300px]">
              <div className="h-14 w-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-1">
                <QrCode className="h-6 w-6 text-white/20 animate-pulse" />
              </div>
              <h3 className="text-sm font-bold text-white/80">No Active PACT Compiled</h3>
              <p className="text-xs text-white/30 text-center max-w-[280px] leading-relaxed">
                Initialize or select a transaction pact from the agreement builder to synthesize visual verification tokens.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
