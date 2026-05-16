import { useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { AppHeader } from "./AppHeader"
import { useAppStore } from "@/store/useAppStore"
import { pactaraFetch, API_BASE } from "@/lib/pactara-api"
import type { RuntimeHealth } from "@/lib/pactara-api"
import { Toaster, toast } from "sonner"
import { AmbientBackground } from "@/components/shared/AmbientBackground"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { setHealth, setRuntimeHealth, message } = useAppStore()

  const refreshHealth = async () => {
    try {
      const data = await pactaraFetch<{ status: string }>("/health")
      setHealth(data.status)
    } catch {
      setHealth("offline")
    }
    try {
      setRuntimeHealth(await pactaraFetch<RuntimeHealth>("/ready"))
    } catch {
      setRuntimeHealth(null)
    }
  }

  useEffect(() => {
    void refreshHealth()
  }, [])

  // Show toast whenever message changes
  useEffect(() => {
    if (!message || message === "Working...") return
    if (message.toLowerCase().includes("error") || message.toLowerCase().includes("fail") || message.toLowerCase().includes("pactara")) {
      toast.error("Error", { description: message })
    } else {
      toast.success("Success", { description: message })
    }
  }, [message])

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full font-sans antialiased text-foreground selection:bg-primary selection:text-primary-foreground relative z-0">
        <AmbientBackground />
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden relative">
          <AppHeader onRefreshHealth={refreshHealth} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-muted-foreground/20">
            <div className="mx-auto max-w-7xl w-full">
              {children}
            </div>
          </main>

          {/* Global Status Bar */}
          {message && (
            <div className="border-t border-white/5 bg-black/40 backdrop-blur-xl px-4 py-2 text-xs text-white/50 flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${
                message === "Working..." ? "bg-amber-500 animate-pulse" :
                message.toLowerCase().includes("error") ? "bg-red-500" : "bg-emerald-500"
              }`} />
              <span className="truncate">{message}</span>
              <span className="text-white/20 ml-auto shrink-0">{API_BASE}</span>
            </div>
          )}
        </div>
      </div>
      <Toaster position="bottom-right" theme="dark" richColors />
    </SidebarProvider>
  )
}
