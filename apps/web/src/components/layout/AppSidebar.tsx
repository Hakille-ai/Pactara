import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { useAppStore, type View } from "@/store/useAppStore"
import {
  Activity, BadgeCheck, Bot, Dna, FileCheck2, Fingerprint, History,
  KeyRound, Network, QrCode, ShieldCheck, SquarePen, Box,
  Terminal, BarChart, Server, Layers, Zap, UserSquare2
} from "lucide-react"

// Grouped navigation items for better organization
const navGroups = [
  {
    label: "Core",
    items: [
      { id: "identity" as View, label: "Identity", icon: Fingerprint },
      { id: "pact" as View, label: "PACT", icon: SquarePen },
      { id: "verify" as View, label: "Verify", icon: ShieldCheck },
      { id: "offline" as View, label: "Offline", icon: BadgeCheck },
      { id: "did" as View, label: "DID", icon: KeyRound },
    ]
  },
  {
    label: "Assets & Graph",
    items: [
      { id: "bundle" as View, label: "Bundle", icon: QrCode },
      { id: "proof" as View, label: "Proof", icon: FileCheck2 },
      { id: "genome" as View, label: "Genome", icon: Dna },
      { id: "mandate" as View, label: "Mandate", icon: Bot },
      { id: "authority" as View, label: "Authority", icon: ShieldCheck },
      { id: "graph" as View, label: "Graph", icon: Network },
      { id: "domains" as View, label: "Domains", icon: Layers },
    ]
  },
  {
    label: "Agents & Workflows",
    items: [
      { id: "workflows" as View, label: "Workflows", icon: FileCheck2 },
      { id: "agents" as View, label: "Agents", icon: UserSquare2 },
      { id: "crews" as View, label: "Crews", icon: Bot },
    ]
  },
  {
    label: "Runtime & Ops",
    items: [
      { id: "ops" as View, label: "Ops", icon: BarChart },
      { id: "runtime" as View, label: "Runtime", icon: Server },
      { id: "network" as View, label: "Network", icon: Box },
      { id: "world" as View, label: "World", icon: Zap },
      { id: "command" as View, label: "Command", icon: Terminal },
      { id: "timeline" as View, label: "Timeline", icon: History },
      { id: "events" as View, label: "Events", icon: History },
    ]
  },
  {
    label: "Finance & Security",
    items: [
      { id: "ledger" as View, label: "Ledger", icon: BadgeCheck },
      { id: "payments" as View, label: "Payments", icon: ShieldCheck },
      { id: "policy" as View, label: "Policy", icon: ShieldCheck },
      { id: "reputation" as View, label: "Reputation", icon: BadgeCheck },
      { id: "search" as View, label: "Search", icon: Network },
      { id: "stream" as View, label: "Stream", icon: Activity },
      { id: "security" as View, label: "Security", icon: KeyRound },
      { id: "qr" as View, label: "QR", icon: QrCode },
    ]
  }
]

export function AppSidebar() {
  const { view, setView } = useAppStore()

  return (
    <Sidebar className="border-r border-white/5 bg-black/40 backdrop-blur-2xl">
      <SidebarHeader className="flex h-14 items-center border-b border-white/5 px-4">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Box className="h-4 w-4" />
          </div>
          Pactara Protocol
        </div>
      </SidebarHeader>
      
      <SidebarContent className="scrollbar-none">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = view === item.id
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        isActive={isActive} 
                        onClick={() => setView(item.id)}
                        className={`transition-all duration-300 ${
                          isActive 
                            ? "bg-white/10 font-medium text-white shadow-sm" 
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Icon className={`mr-2 h-4 w-4 ${isActive ? "text-white" : "text-white/60"}`} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 p-4">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground/60">
          <p>Pactara Web Console</p>
          <p>v0.1.0-alpha</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
