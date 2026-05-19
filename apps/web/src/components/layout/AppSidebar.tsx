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
    <Sidebar className="border-r border-white/5 bg-[#050505]/60 backdrop-blur-3xl">
      <SidebarHeader className="flex h-16 items-center border-b border-white/5 px-6">
        <div className="flex items-center gap-3 font-semibold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-black shadow-[0_0_24px_rgba(45,212,191,0.25)]">
            <Box className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white tracking-wide">PACTARA</span>
            <span className="text-[9px] uppercase tracking-widest text-teal-400 font-bold -mt-0.5">PROTOCOL</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="scrollbar-none px-2 py-4 space-y-4">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-4 mb-1.5">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = view === item.id
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        isActive={isActive} 
                        onClick={() => setView(item.id)}
                        className={`transition-all duration-300 rounded-lg px-4 h-9 btn-apple-spring ${
                          isActive 
                            ? "bg-white/[0.07] font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_16px_rgba(0,0,0,0.4)] border border-white/5" 
                            : "text-white/50 hover:bg-white/[0.03] hover:text-white border border-transparent"
                        }`}
                      >
                        <Icon className={`mr-2.5 h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${
                          isActive ? "text-teal-400 stroke-[2]" : "text-white/40"
                        }`} />
                        <span className="text-xs tracking-wide">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-white/5 p-4 bg-black/10">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="flex flex-col text-[10px] text-white/40 font-mono">
            <span className="font-semibold text-white/60">NODE: ONLINE</span>
            <span>v0.5.0-mock</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
