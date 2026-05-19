import { useEffect } from "react"
import { useAppStore } from "@/store/useAppStore"
import { pactaraFetch } from "@/lib/pactara-api"
import type { NetworkStatus } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Network, Server } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function NetworkPanel() {
  const { network, setNetwork, loadedGroups, markLoaded } = useAppStore()

  useEffect(() => {
    async function loadNetwork() {
      if (loadedGroups.has("network")) return
      try {
        const nextNetwork = await pactaraFetch<NetworkStatus>("/v1/network/status")
        setNetwork(nextNetwork)
        markLoaded("network")
      } catch (e) {
        setNetwork(null)
      }
    }
    void loadNetwork()
  }, [loadedGroups, markLoaded, setNetwork])

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Network <span className="accent-text-cyan-teal">Status</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Real-time metrics, synchronized nodes, and decentralized protocol state indexes.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="glass-panel relative overflow-hidden bg-black/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-5 pt-5 border-b border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total Identities</span>
            <Server className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent className="p-5">
            {network ? (
              <div className="text-3xl font-extrabold font-mono text-white/90">{network.identities}</div>
            ) : (
              <Skeleton className="h-9 w-20 bg-white/5" />
            )}
          </CardContent>
        </Card>
        
        <Card className="glass-panel relative overflow-hidden bg-black/20 border border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-5 pt-5 border-b border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Active PACTs / Total</span>
            <Network className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent className="p-5">
            {network ? (
              <div className="text-3xl font-extrabold font-mono text-white/90">
                {network.active_pacts} <span className="text-white/30 text-lg">/ {network.pacts}</span>
              </div>
            ) : (
              <Skeleton className="h-9 w-32 bg-white/5" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel-glow overflow-hidden">
        <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Network className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white tracking-wide">Network Statistics</CardTitle>
              <CardDescription className="text-white/40 text-xs">Cryptographic metrics compiled from peer node assertions.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!network ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full bg-white/5" />
              <Skeleton className="h-10 w-full bg-white/5" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/[0.01] border-b border-white/5">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[10px] font-bold uppercase tracking-widest text-white/40 h-11 px-6">Protocol Metric</TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-white/40 h-11 px-6">Total Asserted Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-white/5">
                  <TableRow className="hover:bg-white/[0.01] border-none transition-colors">
                    <TableCell className="font-semibold text-xs text-white/80 h-12 px-6">Identities</TableCell>
                    <TableCell className="text-right font-bold font-mono text-cyan-400 text-xs h-12 px-6 select-all">{network.identities}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-white/[0.01] border-none transition-colors">
                    <TableCell className="font-semibold text-xs text-white/80 h-12 px-6">PACTs (Total)</TableCell>
                    <TableCell className="text-right font-bold font-mono text-cyan-400 text-xs h-12 px-6 select-all">{network.pacts}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-white/[0.01] border-none transition-colors">
                    <TableCell className="font-semibold text-xs text-white/80 h-12 px-6">Active PACTs</TableCell>
                    <TableCell className="text-right font-bold font-mono text-cyan-400 text-xs h-12 px-6 select-all">{network.active_pacts}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-white/[0.01] border-none transition-colors">
                    <TableCell className="font-semibold text-xs text-white/80 h-12 px-6">Revoked PACTs</TableCell>
                    <TableCell className="text-right font-bold font-mono text-rose-400 text-xs h-12 px-6 select-all">{network.revoked_pacts}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-white/[0.01] border-none transition-colors">
                    <TableCell className="font-semibold text-xs text-white/80 h-12 px-6">Proofs</TableCell>
                    <TableCell className="text-right font-bold font-mono text-cyan-400 text-xs h-12 px-6 select-all">{network.proofs}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-white/[0.01] border-none transition-colors">
                    <TableCell className="font-semibold text-xs text-white/80 h-12 px-6">Mandates</TableCell>
                    <TableCell className="text-right font-bold font-mono text-cyan-400 text-xs h-12 px-6 select-all">{network.mandates}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-white/[0.01] border-none transition-colors">
                    <TableCell className="font-semibold text-xs text-white/80 h-12 px-6">Genomes</TableCell>
                    <TableCell className="text-right font-bold font-mono text-cyan-400 text-xs h-12 px-6 select-all">{network.genomes}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
