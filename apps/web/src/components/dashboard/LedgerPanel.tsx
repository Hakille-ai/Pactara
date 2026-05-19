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

import { useCallback } from "react"

export function LedgerPanel() {
  const identity = useAppStore((state) => state.identity)
  const ledgerAccounts = useAppStore((state) => state.ledgerAccounts)
  const setLedgerAccounts = useAppStore((state) => state.setLedgerAccounts)
  const ledgerStatement = useAppStore((state) => state.ledgerStatement)
  const setLedgerStatement = useAppStore((state) => state.setLedgerStatement)
  const loadedGroups = useAppStore((state) => state.loadedGroups)
  const markLoaded = useAppStore((state) => state.markLoaded)

  const { runAction } = useAction()

  const [label, setLabel] = useState("Main Wallet")
  const [initialBalance, setInitialBalance] = useState(100000)
  const [selectedAccount, setSelectedAccount] = useState("")

  const loadStatement = useCallback(
    async (accountId: string) => {
      setSelectedAccount(accountId)
      const loaded = await runAction(
        () => pactaraFetch<LedgerStatement>(`/v1/ledger/accounts/${accountId}/statement?limit=10`),
        "Statement loaded."
      )
      if (loaded) {
        setLedgerStatement(loaded)
      }
    },
    [runAction, setLedgerStatement]
  )

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
      void loadStatement(ledgerAccounts[0].id)
    }
  }, [ledgerAccounts, selectedAccount, loadStatement])

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

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Financial <span className="accent-text-emerald-green">Ledger</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Open multiple currency asset accounts, monitor dynamic balances, and view transaction statements.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-3 items-start">
        {/* Create Account Section */}
        <Card className="glass-panel-glow md:col-span-1 overflow-hidden">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Plus className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Open Node Account</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4.5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Account Name Label</Label>
              <Input 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                className="glass-input h-10 px-3.5 focus:ring-emerald-500/20 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Initial Mint Balance</Label>
              <Input 
                type="number"
                value={initialBalance} 
                onChange={(e) => setInitialBalance(Number(e.target.value))} 
                className="glass-input h-10 px-3.5 focus:ring-emerald-500/20 font-mono text-xs"
              />
            </div>
            <Button 
              onClick={() => void createAccount()} 
              className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(16,185,129,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              Mint Asset Account
            </Button>
          </CardContent>
        </Card>

        {/* Accounts List Section */}
        <Card className="glass-panel md:col-span-2 overflow-hidden flex flex-col min-h-[300px]">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Wallet className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Active Ledger Wallets</CardTitle>
                <CardDescription className="text-white/40 text-xs">Select wallet account node below to load dynamic statement audit.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="flex-1 overflow-auto p-0">
            <Table>
              <TableHeader className="bg-white/[0.01] border-b border-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-xs text-white/40 font-bold uppercase tracking-widest pl-6">Label</TableHead>
                  <TableHead className="text-xs text-white/40 font-bold uppercase tracking-widest">Balance</TableHead>
                  <TableHead className="text-xs text-white/40 font-bold uppercase tracking-widest text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerAccounts.map((account) => (
                  <TableRow 
                    key={account.id} 
                    className={`border-white/5 cursor-pointer hover:bg-white/[0.01] transition-all duration-200 ${selectedAccount === account.id ? 'bg-white/[0.03]' : ''}`}
                    onClick={() => void loadStatement(account.id)}
                  >
                    <TableCell className="font-semibold text-xs text-white/90 pl-6 py-4.5">
                      {account.label}
                      <p className="text-[10px] text-white/30 font-mono mt-1 select-all truncate w-40">{account.id}</p>
                    </TableCell>
                    <TableCell className="font-bold font-mono text-xs text-emerald-400 py-4.5">
                      {account.balance.toLocaleString()} {account.asset_id.split(':')[1]?.toUpperCase()}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4.5">
                      <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 rounded-full border border-white/5">
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {ledgerAccounts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-48 text-white/30 text-xs">
                      No mint accounts found. Mint a ledger wallet account to initiate.
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
        <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500">
          <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <RefreshCw className="h-5 w-5 stroke-[2] animate-spin-slow" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white tracking-wide">Audit Trail Statement: {ledgerStatement.account.label}</CardTitle>
                <CardDescription className="text-white/40 text-xs">Most recent state mutations transfer lists.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Table>
            <TableHeader className="bg-white/[0.01] border-b border-white/5">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-xs text-white/40 font-bold uppercase tracking-widest pl-6">Mutation Type</TableHead>
                <TableHead className="text-xs text-white/40 font-bold uppercase tracking-widest">Transaction Hash Reference</TableHead>
                <TableHead className="text-xs text-white/40 font-bold uppercase tracking-widest text-right pr-6">Dynamic Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledgerStatement.entries.map((entry, idx) => {
                const isCredit = entry.direction === "credit";
                return (
                  <TableRow key={idx} className="border-white/5 hover:bg-white/[0.01] transition-all duration-200">
                    <TableCell className="pl-6 py-4.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        isCredit 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {entry.direction}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-white/40 select-all py-4.5">{entry.transfer_id || "genesis-transfer-block"}</TableCell>
                    <TableCell className={`text-right font-bold font-mono text-xs pr-6 py-4.5 ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isCredit ? '+' : '-'}{entry.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                )
              })}
              {ledgerStatement.entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-28 text-white/30 text-xs">
                    This account ledger is static. No recent transfers logged.
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
