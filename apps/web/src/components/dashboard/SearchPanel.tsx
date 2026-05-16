import { useState } from "react"
import { useAppStore } from "@/store/useAppStore"
import { useAction } from "@/hooks/useAction"
import { pactaraFetch } from "@/lib/pactara-api"
import type { SearchResponse } from "@/lib/pactara-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Sparkles } from "lucide-react"
import { JsonBlock } from "@/components/shared/JsonBlock"

export function SearchPanel() {
  const { searchResponse, setSearchResponse } = useAppStore()
  const { runAction } = useAction()
  const [query, setQuery] = useState("pactara")

  async function search() {
    const response = await runAction(
      () => pactaraFetch<SearchResponse>(`/v1/search?q=${encodeURIComponent(query)}`),
      "Global search complete."
    )
    if (response) setSearchResponse(response)
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Global Search</h1>
        <p className="text-muted-foreground mt-2">Search across all protocol entities, identities, and PACTs.</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} className="glass-input pl-10 h-12 text-base" placeholder="Search identities, PACTs, proofs..." />
        </div>
        <Button onClick={() => void search()} disabled={!query.trim()} className="bg-indigo-500 hover:bg-indigo-600 text-white border-none h-12 px-6">
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </div>

      {searchResponse ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {searchResponse.results.length === 0 ? (
            <Card className="glass-panel border-dashed"><CardContent className="p-12 text-center"><p className="text-white/40">No results found for &ldquo;{query}&rdquo;.</p></CardContent></Card>
          ) : (
            <>
              <div className="grid gap-3">
                {searchResponse.results.map((result, i) => (
                  <Card key={i} className="glass-panel hover:bg-white/[0.03] transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Sparkles className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold text-sm truncate">{result.label}</p>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-400 shrink-0 ml-2">{result.category}</span>
                        </div>
                        <p className="text-xs text-white/50 line-clamp-2">{result.summary}</p>
                        <p className="text-[10px] text-white/30 font-mono mt-1">{result.id}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="glass-panel overflow-hidden"><CardContent className="p-0"><div className="p-4 bg-black/40"><JsonBlock value={searchResponse} /></div></CardContent></Card>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
