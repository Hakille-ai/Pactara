import { useMemo } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { TrustGraph } from "@/lib/pactara-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Network, RefreshCw, Hexagon } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function TrustGraphPanel() {
  const { trustGraph: graph, setTrustGraph: setGraph } = useAppStore()
  const { runAction } = useAction()

  const nodesById = useMemo(() => {
    const map = new Map<string, string>()
    graph?.nodes.forEach((node) => map.set(node.id, node.label))
    return map
  }, [graph])

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    graph?.nodes.forEach((node) => counts.set(node.type, (counts.get(node.type) ?? 0) + 1))
    return Array.from(counts.entries()).sort(([left], [right]) => left.localeCompare(right))
  }, [graph])

  async function refreshTrustGraph() {
    const loaded = await runAction(
      () => pactaraFetch<TrustGraph>("/v1/graph"),
      "Trust graph refreshed."
    )
    if (loaded) {
      setGraph(loaded)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trust Graph</h1>
          <p className="text-muted-foreground mt-2">
            Visualize decentralized relationships and cryptographic edges across the protocol.
          </p>
        </div>
        <Button onClick={() => void refreshTrustGraph()} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-none">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh Graph
        </Button>
      </div>

      {!graph ? (
        <Card className="glass-panel border-dashed border-white/10 bg-white/[0.01]">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
             <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Network className="h-8 w-8 text-white/40" />
            </div>
            <p className="text-white/40 mb-4 max-w-sm">Load the global trust graph to view node connectivity and semantic relationships.</p>
            <Button onClick={() => void refreshTrustGraph()} className="bg-indigo-500 hover:bg-indigo-600 text-white border-none">
              <Network className="mr-2 h-4 w-4" /> Load Protocol Graph
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3 animate-in fade-in slide-in-from-bottom-2">
            <Card className="glass-panel p-4 flex flex-col justify-center border-l-4 border-l-indigo-500">
              <p className="text-sm text-white/50 mb-1">Total Nodes</p>
              <p className="text-3xl font-bold font-mono">{graph.nodes.length}</p>
            </Card>
            <Card className="glass-panel p-4 flex flex-col justify-center border-l-4 border-l-purple-500">
              <p className="text-sm text-white/50 mb-1">Semantic Edges</p>
              <p className="text-3xl font-bold font-mono">{graph.edges.length}</p>
            </Card>
            <Card className="glass-panel p-4 flex flex-col justify-center border-l-4 border-l-pink-500">
              <p className="text-sm text-white/50 mb-1">Entity Types</p>
              <p className="text-3xl font-bold font-mono">{typeCounts.length}</p>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-3">
            {typeCounts.map(([type, count]) => (
              <Card key={type} className="glass-panel p-4 flex flex-col border border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2 text-indigo-400">
                  <Hexagon className="h-4 w-4" />
                  <p className="text-[11px] uppercase tracking-wider font-semibold truncate">{type}</p>
                </div>
                <p className="text-2xl font-bold font-mono text-white/90">{count}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Edge Relationships</CardTitle>
                <CardDescription>Directional links between entities.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!graph.edges.length ? (
                  <div className="p-8 text-center text-white/40 text-sm">
                    No graph edges yet.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[500px] overflow-auto">
                    {graph.edges.map((edge, index) => (
                      <div key={`${edge.from}-${edge.to}-${index}`} className="p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-400">
                            {edge.type}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 text-xs font-mono">
                          <div className="flex items-center gap-2 text-white/70">
                            <span className="text-white/40">From:</span>
                            <span className="truncate">{nodesById.get(edge.from) ?? edge.from}</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/70">
                            <span className="text-white/40">To:</span>
                            <span className="truncate text-indigo-300">{nodesById.get(edge.to) ?? edge.to}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-panel overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
                <CardTitle className="text-lg">Raw Graph Representation</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 bg-black/40 h-full max-h-[500px] overflow-auto border-t border-white/5">
                  <JsonBlock value={graph} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
