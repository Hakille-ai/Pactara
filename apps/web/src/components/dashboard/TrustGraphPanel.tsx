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
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Cryptographic <span className="accent-text-cyan-teal">Trust Graph</span>
          </h1>
          <p className="text-white/40 mt-1 text-sm tracking-wide">
            Inspect decentralized relationships, agent links, and verifiable credentials.
          </p>
        </div>
        <Button 
          onClick={() => void refreshTrustGraph()} 
          variant="secondary" 
          className="bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/5 btn-apple-spring h-10 px-5 rounded-lg shrink-0"
        >
          <RefreshCw className="mr-2 h-4 w-4 text-cyan-400" /> Refresh Trust Graph
        </Button>
      </div>

      {!graph ? (
        <Card className="glass-panel-glow border-dashed border-white/10 bg-white/[0.01] overflow-hidden">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
             <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_24px_rgba(6,182,212,0.15)] flex items-center justify-center mb-5 animate-pulse">
              <Network className="h-8 w-8 text-cyan-400 stroke-[1.5]" />
            </div>
            <p className="text-white/40 mb-5 max-w-sm text-xs leading-relaxed">Load the global semantic trust graph to visualize real-time peer relations and mandate delegations.</p>
            <Button 
              onClick={() => void refreshTrustGraph()} 
              className="h-10 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold tracking-wide border-none shadow-[0_4px_24px_rgba(6,182,212,0.25)] rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
            >
              <Network className="mr-2 h-4 w-4 stroke-[2]" /> Load Decentralized Graph
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Node Summary Metrics */}
          <div className="grid gap-6 sm:grid-cols-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="glass-panel p-5 flex flex-col justify-center border-l-4 border-l-cyan-500 rounded-xl relative overflow-hidden bg-black/20 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Total Identity Nodes</p>
              <p className="text-3xl font-extrabold font-mono text-white/90">{graph.nodes.length}</p>
            </div>
            <div className="glass-panel p-5 flex flex-col justify-center border-l-4 border-l-amber-500 rounded-xl relative overflow-hidden bg-black/20 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Active Mandate Edges</p>
              <p className="text-3xl font-extrabold font-mono text-white/90">{graph.edges.length}</p>
            </div>
            <div className="glass-panel p-5 flex flex-col justify-center border-l-4 border-l-pink-500 rounded-xl relative overflow-hidden bg-black/20 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Unique Space Categories</p>
              <p className="text-3xl font-extrabold font-mono text-white/90">{typeCounts.length}</p>
            </div>
          </div>

          {/* Categorized Breakdown Blocks */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {typeCounts.map(([type, count]) => (
              <div key={type} className="glass-panel p-4 flex flex-col border border-white/5 bg-white/[0.01] rounded-xl hover:border-cyan-500/20 transition-all duration-300">
                <div className="flex items-center gap-2 mb-2 text-cyan-400">
                  <Hexagon className="h-4 w-4 stroke-[2]" />
                  <p className="text-[10px] uppercase tracking-widest font-bold truncate">{type}</p>
                </div>
                <p className="text-2xl font-bold font-mono text-white/90">{count}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Edge relationships card list */}
            <Card className="glass-panel overflow-hidden">
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <CardTitle className="text-base font-bold text-white tracking-wide">Linked Edge Relationships</CardTitle>
                <CardDescription className="text-white/40 text-xs">Directional assertions registered on-chain.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {!graph.edges.length ? (
                  <div className="p-12 text-center text-white/30 text-xs flex flex-col items-center justify-center min-h-[220px] gap-3 border border-white/5 border-dashed rounded-2xl bg-black/20 m-6">
                    <Network className="h-6 w-6 stroke-[1.5] text-white/20" />
                    <p className="max-w-[200px] leading-relaxed">No edges or semantic connections resolved in local state graph.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[460px] overflow-auto">
                    {graph.edges.map((edge, index) => (
                      <div key={`${edge.from}-${edge.to}-${index}`} className="p-5 hover:bg-white/[0.01] transition-all duration-300 relative group">
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-cyan-950/20 border border-cyan-800/30 text-cyan-400 font-mono tracking-wider">
                            {edge.type}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 text-[10px] font-mono text-white/60">
                          <div className="flex items-center gap-2">
                            <span className="text-white/30 font-bold uppercase w-10">From:</span>
                            <span className="truncate select-all text-white/80">{nodesById.get(edge.from) ?? edge.from}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white/30 font-bold uppercase w-10">To:</span>
                            <span className="truncate select-all text-cyan-300/80">{nodesById.get(edge.to) ?? edge.to}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Raw representations */}
            <Card className="glass-panel overflow-hidden">
              <CardHeader className="bg-white/[0.01] border-b border-white/5 pb-4 px-6 pt-6">
                <CardTitle className="text-base font-bold text-white tracking-wide">Graph Telemetry Block</CardTitle>
                <CardDescription className="text-white/40 text-xs">Direct structural JSON payload representation.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 bg-black/40 h-full max-h-[460px] overflow-auto border-t border-white/5">
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
