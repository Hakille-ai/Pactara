import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { PaymentIntent, ExecutePaymentResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Send, History } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function PaymentsPanel() {
  const { 
    pact, ledgerAccounts, payment, setPayment, 
    payments, setPayments, executedPayment, setExecutedPayment 
  } = useAppStore()
  const { runAction } = useAction()

  const [fromAccountId, setFromAccountId] = useState("")
  const [toAccountId, setToAccountId] = useState("")
  const [amount, setAmount] = useState(50)
  const [currency, setCurrency] = useState("USD")

  useEffect(() => {
    if (!fromAccountId && ledgerAccounts[0]?.id) setFromAccountId(ledgerAccounts[0].id)
    if (!toAccountId && ledgerAccounts[1]?.id) setToAccountId(ledgerAccounts[1].id)
  }, [ledgerAccounts, fromAccountId, toAccountId])

  async function createPayment() {
    if (!pact) return
    const response = await runAction(
      () =>
        pactaraFetch<PaymentIntent>("/v1/payments", {
          method: "POST",
          body: JSON.stringify({
            pact_id: pact.id,
            from_account_id: fromAccountId,
            to_account_id: toAccountId,
            amount,
            currency,
            provider: "stripe",
            settlement_mode: "immediate",
          }),
        }),
      "Payment intent created."
    )
    if (response) {
      setPayment(response)
      setPayments([response, ...payments])
    }
  }

  async function executePayment() {
    if (!payment) return
    const response = await runAction(
      () =>
        pactaraFetch<ExecutePaymentResponse>(`/v1/payments/${payment.id}/execute`, {
          method: "POST",
          body: JSON.stringify({
            payment_method: "pm_card_visa",
            metadata: { dashboard: true },
          }),
        }),
      "Payment executed successfully."
    )
    if (response) {
      setExecutedPayment(response)
      setPayment(response.payment)
      setPayments(payments.map(p => p.id === response.payment.id ? response.payment : p))
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Payments & <span className="accent-text-yellow-orange">Settlement</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Orchestrate decentralized off-chain fiat settlements securely linked to on-chain transaction pacts.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 items-start">
        {/* Create Payment Intent */}
        <Card className="glass-panel-glow overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                <CreditCard className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Synthesize Settlement Intent</CardTitle>
                <CardDescription className="text-white/40 text-xs">Configure off-chain assets transfers tied to agreement contracts.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">From Source Node Wallet</Label>
              <Select value={fromAccountId} onValueChange={(v) => setFromAccountId(v || "")}>
                <SelectTrigger className="glass-input h-10">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b0b0b] border-white/10 text-white">
                  {ledgerAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id} className="focus:bg-white/5 hover:bg-white/5 transition-colors">{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Destination Protocol Account</Label>
              <Input value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="glass-input h-10 px-3.5 focus:ring-yellow-500/20 font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Volume Amount</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="glass-input h-10 px-3.5 focus:ring-yellow-500/20 font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Settlement Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v || "")}>
                  <SelectTrigger className="glass-input h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b0b0b] border-white/10 text-white">
                    <SelectItem value="USD" className="focus:bg-white/5 hover:bg-white/5 transition-colors">USD</SelectItem>
                    <SelectItem value="EUR" className="focus:bg-white/5 hover:bg-white/5 transition-colors">EUR</SelectItem>
                    <SelectItem value="GBP" className="focus:bg-white/5 hover:bg-white/5 transition-colors">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={() => void createPayment()} 
              disabled={!pact || !fromAccountId} 
              className="w-full h-10 bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold tracking-wide border-none shadow-[0_4px_24px_rgba(234,179,8,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <CreditCard className="mr-2 h-4 w-4 stroke-[2.5]" /> Draft Agreement Settlement
            </Button>
            {!pact && (
              <p className="text-[10px] text-rose-400 mt-2 font-semibold text-center uppercase tracking-wider bg-rose-500/5 border border-rose-500/10 py-2.5 rounded-lg">
                ⚠️ A PACT agreement node must be active to draft settlements.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Dynamic Execution */}
        {payment && (
          <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
            <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Send className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white tracking-wide">Settle Agreement Execution</CardTitle>
                  <CardDescription className="text-white/40 text-xs">Process the drafted payment intent in sandbox.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="rounded-xl border border-white/5 bg-black/40 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] relative overflow-hidden group">
                <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mb-1">Agreement Intent Hash</p>
                <p className="font-mono text-[11px] text-white/80 select-all">{payment.id}</p>
                
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40">Consensus Status</p>
                  <span className={`px-3 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                    payment.status === 'succeeded' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
              
              <Button 
                onClick={() => void executePayment()} 
                disabled={payment.status === 'succeeded'} 
                className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(16,185,129,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
              >
                <Send className="mr-2 h-4 w-4 stroke-[2.5]" /> Execute Ledger Settlement
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Executed Payment Receipt */}
      {executedPayment && (
        <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <History className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Cryptographic Settlement Receipt</CardTitle>
                <CardDescription className="text-white/40 text-xs">Immutable validation payload response from fiat gateway.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 bg-black/40 border-t border-white/5">
              <JsonBlock value={executedPayment} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
