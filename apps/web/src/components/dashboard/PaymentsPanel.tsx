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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments & Settlement</h1>
        <p className="text-muted-foreground mt-2">
          Orchestrate off-chain fiat settlements tied to on-chain PACTs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500/10 text-yellow-500">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Create Payment Intent</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">From Account (Source)</Label>
              <Select value={fromAccountId} onValueChange={(v) => setFromAccountId(v || "")}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                  {ledgerAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">To Account (Destination)</Label>
              <Input value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="glass-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/70">Amount</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="glass-input" />
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Currency</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v || "")}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => void createPayment()} disabled={!pact || !fromAccountId} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold border-none mt-2">
              <CreditCard className="mr-2 h-4 w-4" /> Draft Payment
            </Button>
            {!pact && <p className="text-xs text-red-400 mt-2">A PACT is required to draft a payment.</p>}
          </CardContent>
        </Card>

        {payment && (
          <Card className="glass-panel animate-in fade-in slide-in-from-bottom-2">
            <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Execution</CardTitle>
                  <CardDescription>Process the drafted payment intent.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="rounded border border-white/5 bg-black/20 p-4">
                <p className="text-sm font-medium text-white/70 mb-1">Intent ID</p>
                <p className="font-mono text-sm text-white">{payment.id}</p>
                
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-white/70">Status</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${payment.status === 'succeeded' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {payment.status}
                  </span>
                </div>
              </div>
              
              <Button onClick={() => void executePayment()} disabled={payment.status === 'succeeded'} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-none mt-2">
                <Send className="mr-2 h-4 w-4" /> Execute Payment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {executedPayment && (
        <Card className="glass-panel animate-in fade-in slide-in-from-bottom-2">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                <History className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Execution Receipt</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <JsonBlock value={executedPayment} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
