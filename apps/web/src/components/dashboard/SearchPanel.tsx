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
    <div className="flex flex-col gap-8 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Global <span className="accent-text-indigo-cyan">Search</span>
        </h1>
        <p className="text-white/40 mt-1 text-sm tracking-wide">
          Query cross-node indexing records, trace identity signatures, inspect consensus proofs, and audit active ledger accounts.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3.5">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && void search()} 
            className="glass-input pl-12 h-12 text-sm focus:ring-indigo-500/20" 
            placeholder="Search identities, PACTs, proofs, ledger hashes..." 
          />
        </div>
        <Button 
          onClick={() => void search()} 
          disabled={!query.trim()} 
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold tracking-wide border-none h-12 px-7 rounded-lg btn-apple-spring transition-all duration-300 pt-0.5"
        >
          <Search className="mr-2 h-4.5 w-4.5 stroke-[2.5]" /> Run Search
        </Button>
      </div>

      {searchResponse ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {searchResponse.results.length === 0 ? (
            <Card className="glass-panel border-dashed rounded-2xl m-2 bg-black/20">
              <CardContent className="p-16 text-center flex flex-col items-center justify-center gap-3">
                <Search className="h-8 w-8 text-white/20 animate-pulse" />
                <p className="text-xs text-white/30 leading-relaxed max-w-[200px]">No ledger index results located matching query &ldquo;{query}&rdquo;.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4.5">
                {searchResponse.results.map((result, i) => (
                  <Card key={i} className="glass-panel-glow hover:bg-white/[0.01] transition-all duration-300 cursor-pointer">
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                        <Sparkles className="h-5 w-5 text-indigo-400 stroke-[2] animate-pulse" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start mb-1 gap-4">
                          <p className="font-semibold text-sm text-white/95 select-all truncate">{result.label}</p>
                          <span className="px-3 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 ml-2">
                            {result.category}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 leading-relaxed font-medium select-all mt-1">{result.summary}</p>
                        <p className="text-[10px] text-white/30 font-mono mt-2.5 select-all">{result.id}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Card className="glass-panel overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 bg-black/40 border-t border-white/5">
                    <JsonBlock value={searchResponse} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
