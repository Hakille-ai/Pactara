import { useState } from "react"
import { Check, Copy, ChevronDown, ChevronRight, Terminal } from "lucide-react"
import { toast } from "sonner"

export function JsonBlock({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const jsonString = JSON.stringify(value, null, 2)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)
      toast.success("Payload Copied", {
        description: "JSON content successfully copied to clipboard.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Copy Failed", {
        description: "Unable to access system clipboard.",
      })
    }
  }

  function highlightJson(json: string) {
    if (!json) return ""
    // Escape HTML first
    const escaped = json
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")

    // Apply regex highlighting for Keys, Strings, Booleans, Numbers and Nulls
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "text-[#c3e88d]" // standard string values (light emerald)
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-[#80cbc4] font-semibold" // keys (soft teal)
          } else {
            cls = "text-[#a9c179]" // string value
          }
        } else if (/true|false/.test(match)) {
          cls = "text-[#ff9cac] font-bold" // boolean (soft red/pink)
        } else if (/null/.test(match)) {
          cls = "text-[#ff5370] font-bold" // null (vivid red)
        } else {
          cls = "text-[#f7768e] font-mono" // numbers (pink/salmon)
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
  }

  return (
    <div className="group rounded-xl border border-white/5 bg-[#080808]/90 overflow-hidden shadow-2xl transition-all duration-300 hover:border-white/10">
      {/* Code Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/40 select-none">
        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-white/40">
          <Terminal className="h-3.5 w-3.5 text-teal-400 stroke-[2]" />
          <span>Attestation Payload</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.04] transition-all btn-apple-spring"
            title={expanded ? "Collapse Payload" : "Expand Payload"}
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => void handleCopy()}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.04] transition-all btn-apple-spring relative"
            title="Copy to Clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Code Panel */}
      {expanded && (
        <div className="p-4 overflow-auto max-h-96 scrollbar-thin scrollbar-thumb-white/10 font-mono text-[11px] leading-relaxed text-white/70 bg-black/10">
          <pre
            className="whitespace-pre overflow-x-auto selection:bg-white/15"
            dangerouslySetInnerHTML={{ __html: highlightJson(jsonString) }}
          />
        </div>
      )}
    </div>
  )
}
