import { useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { AppHeader } from "./AppHeader"
import { useAppStore } from "@/store/useAppStore"
import { pactaraFetch } from "@/lib/pactara-api"
import type { RuntimeHealth } from "@/lib/pactara-api"
import { Toaster } from "sonner"
import { AmbientBackground } from "@/components/shared/AmbientBackground"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { setHealth, setRuntimeHealth } = useAppStore()

  const refreshHealth = async () => {
    try {
      const data = await pactaraFetch<{ status: string }>("/health")
      setHealth(data.status)
    } catch (error) {
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
    // Optional: add interval polling here if needed
  }, [])

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
        </div>
      </div>
      <Toaster position="bottom-right" theme="system" />
    </SidebarProvider>
  )
}
