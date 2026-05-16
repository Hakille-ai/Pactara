"use client"

import { AppLayout } from "@/components/layout/AppLayout"
import { useAppStore } from "@/store/useAppStore"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Construction } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

// Core
import { IdentityPanel } from "@/components/dashboard/IdentityPanel"
import { PactPanel } from "@/components/dashboard/PactPanel"
import { VerifyPanel } from "@/components/dashboard/VerifyPanel"
import { OfflineVerifyPanel } from "@/components/dashboard/OfflineVerifyPanel"
import { DidPanel } from "@/components/dashboard/DidPanel"

// Assets & Graph
import { BundlePanel } from "@/components/dashboard/BundlePanel"
import { ProofPanel } from "@/components/dashboard/ProofPanel"
import { GenomePanel } from "@/components/dashboard/GenomePanel"
import { MandatePanel } from "@/components/dashboard/MandatePanel"
import { AuthorityPanel } from "@/components/dashboard/AuthorityPanel"
import { TrustGraphPanel } from "@/components/dashboard/TrustGraphPanel"
import { DomainsPanel } from "@/components/dashboard/DomainsPanel"

// Agents & Workflows
import { WorkflowsPanel } from "@/components/dashboard/WorkflowsPanel"
import { AgentsPanel } from "@/components/dashboard/AgentsPanel"
import { CrewsPanel } from "@/components/dashboard/CrewsPanel"

// Runtime & Ops
import { OpsPanel } from "@/components/dashboard/OpsPanel"
import { RuntimePanel } from "@/components/dashboard/RuntimePanel"
import { NetworkPanel } from "@/components/dashboard/NetworkPanel"
import { WorldPanel } from "@/components/dashboard/WorldPanel"
import { CommandPanel } from "@/components/dashboard/CommandPanel"
import { TimelinePanel } from "@/components/dashboard/TimelinePanel"
import { EventsPanel } from "@/components/dashboard/EventsPanel"

// Finance & Security
import { LedgerPanel } from "@/components/dashboard/LedgerPanel"
import { PaymentsPanel } from "@/components/dashboard/PaymentsPanel"
import { PolicyPanel } from "@/components/dashboard/PolicyPanel"
import { ReputationPanel } from "@/components/dashboard/ReputationPanel"
import { SearchPanel } from "@/components/dashboard/SearchPanel"
import { StreamPanel } from "@/components/dashboard/StreamPanel"
import { SecurityPanel } from "@/components/dashboard/SecurityPanel"
import { QrPanel } from "@/components/dashboard/QrPanel"

function DefaultPanel() {
  const view = useAppStore(s => s.view)
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight capitalize">{view}</h1>
        <p className="text-muted-foreground mt-2">Manage your {view} settings and data.</p>
      </div>
      
      <Card className="glass-panel overflow-hidden relative border-amber-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
        <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-2">
            <Construction className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold">Module en cours de migration</h2>
          <p className="text-muted-foreground max-w-md">
            L'interface utilisateur de ce module est actuellement en cours de refonte vers la nouvelle architecture Vercel/Apple. Les fonctionnalités sous-jacentes du réseau restent actives.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3 opacity-50 pointer-events-none">
        <Skeleton className="h-[150px] w-full rounded-xl bg-white/5" />
        <Skeleton className="h-[150px] w-full rounded-xl bg-white/5" />
        <Skeleton className="h-[150px] w-full rounded-xl bg-white/5" />
      </div>
    </div>
  )
}

function ViewRenderer() {
  const view = useAppStore(s => s.view)

  switch (view) {
    // Core
    case "identity":    return <IdentityPanel />
    case "pact":        return <PactPanel />
    case "verify":      return <VerifyPanel />
    case "offline":     return <OfflineVerifyPanel />
    case "did":         return <DidPanel />

    // Assets & Graph
    case "bundle":      return <BundlePanel />
    case "proof":       return <ProofPanel />
    case "genome":      return <GenomePanel />
    case "mandate":     return <MandatePanel />
    case "authority":   return <AuthorityPanel />
    case "graph":       return <TrustGraphPanel />
    case "domains":     return <DomainsPanel />

    // Agents & Workflows
    case "workflows":   return <WorkflowsPanel />
    case "agents":      return <AgentsPanel />
    case "crews":       return <CrewsPanel />

    // Runtime & Ops
    case "ops":         return <OpsPanel />
    case "runtime":     return <RuntimePanel />
    case "network":     return <NetworkPanel />
    case "world":       return <WorldPanel />
    case "command":     return <CommandPanel />
    case "timeline":    return <TimelinePanel />
    case "events":      return <EventsPanel />

    // Finance & Security
    case "ledger":      return <LedgerPanel />
    case "payments":    return <PaymentsPanel />
    case "policy":      return <PolicyPanel />
    case "reputation":  return <ReputationPanel />
    case "search":      return <SearchPanel />
    case "stream":      return <StreamPanel />
    case "security":    return <SecurityPanel />
    case "qr":          return <QrPanel />

    default:            return <DefaultPanel />
  }
}

export default function Home() {
  return (
    <AppLayout>
      <Suspense fallback={<Skeleton className="h-full w-full rounded-xl" />}>
        <ViewRenderer />
      </Suspense>
    </AppLayout>
  )
}
