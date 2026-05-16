import { useState, useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { LedgerAccount, LedgerStatement } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Wallet, RefreshCw, Plus, ArrowRightLeft } from "lucide-react"
import { toast } from "sonner"

export function LedgerPanel() {
  const { 
    identity, 
    ledgerAccounts, setLedgerAccounts,
    ledgerStatement, setLedgerStatement,
    loadedGroups, markLoaded
  } = useAppStore()
  const { runAction } = useAction()

  const [label, setLabel] = useState("Main Wallet")
  const [initialBalance, setInitialBalance] = useState(100000)
  const [selectedAccount, setSelectedAccount] = useState("")

  useEffect(() => {
    async function loadInitial() {
      if (loadedGroups.has("ledger")) return
      const loaded = await runAction(
        () => pactaraFetch<LedgerAccount[]>("/v1/ledger/accounts?limit=30"),
        ""
      )
      if (loaded) {
        setLedgerAccounts(loaded)
        markLoaded("ledger")
      }
    }
    void loadInitial()
  }, [loadedGroups, markLoaded, setLedgerAccounts, runAction])

  useEffect(() => {
    if (!selectedAccount && ledgerAccounts[0]?.id) {
      setSelectedAccount(ledgerAccounts[0].id)
    }
  }, [ledgerAccounts, selectedAccount])

  async function createAccount() {
    if (!identity) {
      toast.error("Identity Required", { description: "Create an identity to open a ledger account." })
      return
    }
    const account = await runAction(
      () =>
        pactaraFetch<LedgerAccount>("/v1/ledger/accounts", {
          method: "POST",
          body: JSON.stringify({
            owner: identity.id,
            asset_id: "asset:pact",
            label,
            initial_balance: initialBalance,
          }),
        }),
      "Ledger account created successfully."
    )
    if (account) {
      setLedgerAccounts([account, ...ledgerAccounts])
    }
  }

  async function loadStatement(accountId: string) {
    setSelectedAccount(accountId)
    const loaded = await runAction(
      () => pactaraFetch<LedgerStatement>(`/v1/ledger/accounts/${accountId}/statement?limit=10`),
      "Statement loaded."
    )
    if (loaded) {
      setLedgerStatement(loaded)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Ledger</h1>
        <p className="text-muted-foreground mt-2">
          Manage accounts, view balances, and audit transaction statements.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Account Section */}
        <Card className="glass-panel md:col-span-1">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Open Account</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Account Label</Label>
              <Input 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                className="glass-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Initial Balance</Label>
              <Input 
                type="number"
                value={initialBalance} 
                onChange={(e) => setInitialBalance(Number(e.target.value))} 
                className="glass-input font-mono"
              />
            </div>
            <Button onClick={() => void createAccount()} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-none mt-2">
              Create Account
            </Button>
          </CardContent>
        </Card>

        {/* Accounts List Section */}
        <Card className="glass-panel md:col-span-2 overflow-hidden flex flex-col">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Your Accounts</CardTitle>
                <CardDescription>Select an account to view its statement.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader className="bg-white/[0.02]">
                <TableRow className="border-white/5">
                  <TableHead>Label</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerAccounts.map((account) => (
                  <TableRow 
                    key={account.id} 
                    className={`border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedAccount === account.id ? 'bg-white/[0.04]' : ''}`}
                    onClick={() => void loadStatement(account.id)}
                  >
                    <TableCell className="font-medium">
                      {account.label}
                      <p className="text-xs text-muted-foreground font-mono mt-1 opacity-60 truncate w-32">{account.id}</p>
                    </TableCell>
                    <TableCell className="font-mono text-emerald-400">
                      {account.balance} {account.asset_id.split(':')[1]?.toUpperCase()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10">
                        View <ArrowRightLeft className="ml-2 h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {ledgerAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-32 text-white/40">
                      No accounts found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Statement Section */}
      {ledgerStatement && (
        <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Statement: {ledgerStatement.account.label}</CardTitle>
                <CardDescription>Recent transactions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Table>
            <TableHeader className="bg-white/[0.02]">
              <TableRow className="border-white/5">
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerStatement.entries.map((entry, idx) => {
                const isCredit = entry.direction === "credit";
                return (
                  <TableRow key={idx} className="border-white/5">
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {entry.direction.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-white/60">{entry.transfer_id || "System Issue"}</TableCell>
                    <TableCell className={`text-right font-mono ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isCredit ? '+' : '-'}{entry.amount}
                    </TableCell>
                  </TableRow>
                )
              })}
              {ledgerStatement.entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24 text-white/40">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
