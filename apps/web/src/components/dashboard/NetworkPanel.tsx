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
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Network Status</h1>
        <p className="text-muted-foreground mt-2">
          Monitor the global state and nodes of the PACTARA network.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Identities</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {network ? (
              <div className="text-2xl font-bold pt-4">{network.identities}</div>
            ) : (
              <Skeleton className="h-8 w-16 mt-4" />
            )}
          </CardContent>
        </Card>
        
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active PACTs</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {network ? (
              <div className="text-2xl font-bold pt-4">{network.active_pacts} / {network.pacts}</div>
            ) : (
              <Skeleton className="h-8 w-24 mt-4" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Network Statistics</CardTitle>
              <CardDescription>Metrics from the decentralized protocol.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!network ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Identities</TableCell>
                  <TableCell className="text-right font-mono text-emerald-400">{network.identities}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">PACTs (Total)</TableCell>
                  <TableCell className="text-right font-mono text-emerald-400">{network.pacts}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Active PACTs</TableCell>
                  <TableCell className="text-right font-mono text-emerald-400">{network.active_pacts}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Revoked PACTs</TableCell>
                  <TableCell className="text-right font-mono text-red-400">{network.revoked_pacts}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Proofs</TableCell>
                  <TableCell className="text-right font-mono text-blue-400">{network.proofs}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Mandates</TableCell>
                  <TableCell className="text-right font-mono text-purple-400">{network.mandates}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Genomes</TableCell>
                  <TableCell className="text-right font-mono text-yellow-400">{network.genomes}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
