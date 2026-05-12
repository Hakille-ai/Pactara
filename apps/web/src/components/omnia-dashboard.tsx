"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import QRCode from "qrcode";
import {
  Activity,
  BadgeCheck,
  Bot,
  Dna,
  FileCheck2,
  Fingerprint,
  History,
  KeyRound,
  Network,
  QrCode,
  RefreshCw,
  ShieldCheck,
  SquarePen,
  XCircle,
} from "lucide-react";
import {
  AgentProfile,
  AgentCrewResponse,
  AgentRun,
  AgentRunResponse,
  AgentRunLog,
  AgentTask,
  AgentTaskResponse,
  AgentTaskRunResponse,
  API_BASE,
  AuditEvent,
  AuthChallenge,
  AuthSession,
  BundleVerificationResponse,
  Credential,
  CrewRunResponse,
  DomainAction,
  DidDocument,
  DomainActionResponse,
  DomainActionTemplate,
  DomainModule,
  DomainWorkflow,
  EventLog,
  ExecutePaymentResponse,
  Genome,
  Identity,
  IdentityKind,
  LedgerAccount,
  LedgerAsset,
  LedgerHold,
  LedgerStatement,
  LedgerTransferResponse,
  MandateCheckResponse,
  Mandate,
  NetworkStatus,
  OperationalOverview,
  Pact,
  PactBundle,
  PaymentIntent,
  PolicyDecision,
  PolicyRule,
  Proof,
  ReputationResponse,
  RuntimeCommand,
  RuntimeHealth,
  RuntimeTimelineItem,
  SearchResponse,
  ScenarioRun,
  SignedRequestVerification,
  TokenIssuanceResponse,
  TrustGraph,
  VerifyPactResponse,
  WorkflowResponse,
  WorkflowTemplate,
  WorldScenario,
  omniaFetch,
  parseJsonField,
} from "@/lib/omnia-api";

type View =
  | "identity"
  | "pact"
  | "verify"
  | "offline"
  | "did"
  | "bundle"
  | "proof"
  | "genome"
  | "mandate"
  | "authority"
  | "ops"
  | "runtime"
  | "world"
  | "command"
  | "crews"
  | "timeline"
  | "network"
  | "graph"
  | "domains"
  | "workflows"
  | "ledger"
  | "payments"
  | "agents"
  | "policy"
  | "reputation"
  | "search"
  | "stream"
  | "security"
  | "qr"
  | "events";

const views: Array<{ id: View; label: string; icon: ComponentType<{ size?: number }> }> = [
  { id: "identity", label: "Identity", icon: Fingerprint },
  { id: "pact", label: "PACT", icon: SquarePen },
  { id: "verify", label: "Verify", icon: ShieldCheck },
  { id: "offline", label: "Offline", icon: BadgeCheck },
  { id: "did", label: "DID", icon: KeyRound },
  { id: "bundle", label: "Bundle", icon: QrCode },
  { id: "proof", label: "Proof", icon: FileCheck2 },
  { id: "genome", label: "Genome", icon: Dna },
  { id: "mandate", label: "Mandate", icon: Bot },
  { id: "authority", label: "Authority", icon: ShieldCheck },
  { id: "ops", label: "Ops", icon: Activity },
  { id: "runtime", label: "Runtime", icon: Activity },
  { id: "world", label: "World", icon: Network },
  { id: "command", label: "Command", icon: SquarePen },
  { id: "crews", label: "Crews", icon: Bot },
  { id: "timeline", label: "Timeline", icon: History },
  { id: "network", label: "Network", icon: Network },
  { id: "graph", label: "Graph", icon: Network },
  { id: "domains", label: "Domains", icon: Network },
  { id: "workflows", label: "Workflows", icon: FileCheck2 },
  { id: "ledger", label: "Ledger", icon: BadgeCheck },
  { id: "payments", label: "Payments", icon: ShieldCheck },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "policy", label: "Policy", icon: ShieldCheck },
  { id: "reputation", label: "Reputation", icon: BadgeCheck },
  { id: "search", label: "Search", icon: Network },
  { id: "stream", label: "Stream", icon: Activity },
  { id: "security", label: "Security", icon: KeyRound },
  { id: "qr", label: "QR", icon: QrCode },
  { id: "events", label: "Events", icon: History },
];

export function OmniaDashboard() {
  const [view, setView] = useState<View>("identity");
  const [health, setHealth] = useState<string>("checking");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [pact, setPact] = useState<Pact | null>(null);
  const [verification, setVerification] = useState<VerifyPactResponse | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [genomes, setGenomes] = useState<Genome[]>([]);
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [network, setNetwork] = useState<NetworkStatus | null>(null);
  const [did, setDid] = useState<DidDocument | null>(null);
  const [bundle, setBundle] = useState<PactBundle | null>(null);
  const [offlineVerification, setOfflineVerification] =
    useState<BundleVerificationResponse | null>(null);
  const [trustGraph, setTrustGraph] = useState<TrustGraph | null>(null);
  const [domains, setDomains] = useState<DomainModule[]>([]);
  const [domainTemplates, setDomainTemplates] = useState<DomainActionTemplate[]>([]);
  const [domainAction, setDomainAction] = useState<DomainActionResponse | null>(null);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [ledgerAssets, setLedgerAssets] = useState<LedgerAsset[]>([]);
  const [ledgerStatement, setLedgerStatement] = useState<LedgerStatement | null>(null);
  const [ledgerHold, setLedgerHold] = useState<LedgerHold | null>(null);
  const [ledgerTransfer, setLedgerTransfer] = useState<LedgerTransferResponse | null>(null);
  const [tokenIssuance, setTokenIssuance] = useState<TokenIssuanceResponse | null>(null);
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const [payments, setPayments] = useState<PaymentIntent[]>([]);
  const [executedPayment, setExecutedPayment] = useState<ExecutePaymentResponse | null>(null);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);
  const [agentRun, setAgentRun] = useState<AgentRunResponse | null>(null);
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([]);
  const [agentTask, setAgentTask] = useState<AgentTaskResponse | null>(null);
  const [agentTaskRun, setAgentTaskRun] = useState<AgentTaskRunResponse | null>(null);
  const [policyDecision, setPolicyDecision] = useState<PolicyDecision | null>(null);
  const [policyRules, setPolicyRules] = useState<PolicyRule[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [opsOverview, setOpsOverview] = useState<OperationalOverview | null>(null);
  const [runtimeHealth, setRuntimeHealth] = useState<RuntimeHealth | null>(null);
  const [authChallenge, setAuthChallenge] = useState<AuthChallenge | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [signedVerification, setSignedVerification] =
    useState<SignedRequestVerification | null>(null);
  const [mandateCheck, setMandateCheck] = useState<MandateCheckResponse | null>(null);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [workflows, setWorkflows] = useState<DomainWorkflow[]>([]);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResponse | null>(null);
  const [reputation, setReputation] = useState<ReputationResponse | null>(null);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [worldScenarios, setWorldScenarios] = useState<WorldScenario[]>([]);
  const [worldScenario, setWorldScenario] = useState<WorldScenario | null>(null);
  const [scenarioRun, setScenarioRun] = useState<ScenarioRun | null>(null);
  const [runtimeCommands, setRuntimeCommands] = useState<RuntimeCommand[]>([]);
  const [runtimeCommand, setRuntimeCommand] = useState<RuntimeCommand | null>(null);
  const [agentCrews, setAgentCrews] = useState<AgentCrewResponse[]>([]);
  const [agentCrew, setAgentCrew] = useState<AgentCrewResponse | null>(null);
  const [crewRun, setCrewRun] = useState<CrewRunResponse | null>(null);
  const [timelineItems, setTimelineItems] = useState<RuntimeTimelineItem[]>([]);
  const [streamSnapshot, setStreamSnapshot] = useState<string>("");
  const [qr, setQr] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const currentPactId = pact?.id ?? verification?.pact_id ?? "";

  useEffect(() => {
    void refreshHealth();
    void refreshEvents();
    void refreshProtocolObjects();
    void refreshNetwork();
    void refreshTrustGraph();
    void refreshOperatingLayer();
  }, []);

  useEffect(() => {
    async function makeQr() {
      if (!currentPactId) {
        setQr("");
        return;
      }
      const payload = {
        protocol: "OMNIA",
        pact_id: currentPactId,
        api: API_BASE,
        verify_endpoint: `/v1/pacts/${currentPactId}/verify`,
      };
      setQr(await QRCode.toDataURL(JSON.stringify(payload), { margin: 1, width: 320 }));
    }

    void makeQr();
  }, [currentPactId]);

  async function refreshHealth() {
    try {
      const data = await omniaFetch<{ status: string }>("/health");
      setHealth(data.status);
    } catch (error) {
      setHealth("offline");
    }
    try {
      setRuntimeHealth(await omniaFetch<RuntimeHealth>("/ready"));
    } catch {
      setRuntimeHealth(null);
    }
  }

  async function refreshEvents() {
    try {
      setEvents(await omniaFetch<EventLog[]>("/v1/events?limit=30"));
    } catch {
      setEvents([]);
    }
  }

  async function refreshProtocolObjects() {
    const [nextProofs, nextGenomes, nextMandates] = await Promise.allSettled([
      omniaFetch<Proof[]>("/v1/proofs?limit=20"),
      omniaFetch<Genome[]>("/v1/genomes?limit=20"),
      omniaFetch<Mandate[]>("/v1/mandates"),
    ]);
    setProofs(nextProofs.status === "fulfilled" ? nextProofs.value : []);
    setGenomes(nextGenomes.status === "fulfilled" ? nextGenomes.value : []);
    setMandates(nextMandates.status === "fulfilled" ? nextMandates.value : []);
  }

  async function refreshNetwork() {
    try {
      setNetwork(await omniaFetch<NetworkStatus>("/v1/network/status"));
    } catch {
      setNetwork(null);
    }
  }

  async function refreshTrustGraph() {
    try {
      setTrustGraph(await omniaFetch<TrustGraph>("/v1/graph/trust?limit=80"));
    } catch {
      setTrustGraph(null);
    }
  }

  async function refreshOperatingLayer() {
    const [
      nextDomains,
      nextAccounts,
      nextAgents,
      nextAudit,
      nextPayments,
      nextOps,
      nextAgentRuns,
      nextAssets,
      nextWorkflowTemplates,
      nextWorkflows,
      nextAgentTasks,
      nextPolicyRules,
      nextWorldScenarios,
      nextRuntimeCommands,
      nextAgentCrews,
      nextTimelineItems,
    ] = await Promise.allSettled([
      omniaFetch<DomainModule[]>("/v1/domains"),
      omniaFetch<LedgerAccount[]>("/v1/ledger/accounts?limit=30"),
      omniaFetch<AgentProfile[]>("/v1/agents"),
      omniaFetch<AuditEvent[]>("/v1/audit/events?limit=30"),
      omniaFetch<PaymentIntent[]>("/v1/payments/intents?limit=30"),
      omniaFetch<OperationalOverview>("/v1/ops/overview"),
      omniaFetch<AgentRun[]>("/v1/ops/agent-runs?limit=30"),
      omniaFetch<LedgerAsset[]>("/v1/ledger/assets"),
      omniaFetch<WorkflowTemplate[]>("/v1/workflows/templates"),
      omniaFetch<DomainWorkflow[]>("/v1/workflows?limit=30"),
      omniaFetch<AgentTask[]>("/v1/agent-tasks?limit=30"),
      omniaFetch<PolicyRule[]>("/v1/policies/rules?limit=30"),
      omniaFetch<WorldScenario[]>("/v1/world/scenarios?limit=30"),
      omniaFetch<RuntimeCommand[]>("/v1/runtime/commands?limit=30"),
      omniaFetch<AgentCrewResponse[]>("/v1/agent-crews?limit=30"),
      omniaFetch<RuntimeTimelineItem[]>("/v1/runtime/timeline?limit=80"),
    ]);
    setDomains(nextDomains.status === "fulfilled" ? nextDomains.value : []);
    setLedgerAccounts(nextAccounts.status === "fulfilled" ? nextAccounts.value : []);
    setAgents(nextAgents.status === "fulfilled" ? nextAgents.value : []);
    setAuditEvents(nextAudit.status === "fulfilled" ? nextAudit.value : []);
    setPayments(nextPayments.status === "fulfilled" ? nextPayments.value : []);
    setOpsOverview(nextOps.status === "fulfilled" ? nextOps.value : null);
    setAgentRuns(nextAgentRuns.status === "fulfilled" ? nextAgentRuns.value : []);
    setLedgerAssets(nextAssets.status === "fulfilled" ? nextAssets.value : []);
    setWorkflowTemplates(
      nextWorkflowTemplates.status === "fulfilled" ? nextWorkflowTemplates.value : []
    );
    setWorkflows(nextWorkflows.status === "fulfilled" ? nextWorkflows.value : []);
    setAgentTasks(nextAgentTasks.status === "fulfilled" ? nextAgentTasks.value : []);
    setPolicyRules(nextPolicyRules.status === "fulfilled" ? nextPolicyRules.value : []);
    setWorldScenarios(nextWorldScenarios.status === "fulfilled" ? nextWorldScenarios.value : []);
    setRuntimeCommands(nextRuntimeCommands.status === "fulfilled" ? nextRuntimeCommands.value : []);
    setAgentCrews(nextAgentCrews.status === "fulfilled" ? nextAgentCrews.value : []);
    setTimelineItems(nextTimelineItems.status === "fulfilled" ? nextTimelineItems.value : []);
  }

  async function runAction<T>(action: () => Promise<T>, success: string) {
    try {
      setMessage("Working...");
      const result = await action();
      setMessage(success);
      await refreshEvents();
      await refreshNetwork();
      await refreshTrustGraph();
      await refreshOperatingLayer();
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
      return null;
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-signal">
              OMNIA Protocol
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-ink">Universal Action Console</h1>
            <p className="mt-2 max-w-3xl text-base text-ink/70">
              Create identities, issue PACTs, sign actions, verify consent, revoke access,
              and inspect the event log from one protocol surface.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded border border-ink/10 bg-white px-4 py-3 shadow-panel">
            <Activity size={18} className={health === "ok" ? "text-signal" : "text-ember"} />
            <div>
              <p className="text-xs uppercase text-ink/50">API</p>
              <p className="font-medium text-ink">{health}</p>
            </div>
            <button
              className="ml-2 rounded border border-ink/10 p-2 text-ink/70 hover:bg-ink hover:text-white"
              onClick={() => void refreshHealth()}
              title="Refresh API status"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <nav className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {views.map((item) => {
            const Icon = item.icon;
            const active = item.id === view;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex h-11 items-center justify-center gap-2 rounded border px-4 text-sm font-medium transition ${
                  active
                    ? "border-ink bg-ink text-white"
                    : "border-ink/10 bg-white text-ink/70 hover:border-ink/30 hover:text-ink"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {message ? (
          <div className="rounded border border-ink/10 bg-white px-4 py-3 text-sm text-ink/80 shadow-panel">
            {message}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded border border-ink/10 bg-white p-5 shadow-panel">
            {view === "identity" ? (
              <IdentityPanel
                identity={identity}
                setIdentity={setIdentity}
                runAction={runAction}
              />
            ) : null}
            {view === "pact" ? (
              <PactPanel
                identity={identity}
                pact={pact}
                setPact={setPact}
                setVerification={setVerification}
                runAction={runAction}
              />
            ) : null}
            {view === "verify" ? (
              <VerifyPanel
                pact={pact}
                verification={verification}
                setVerification={setVerification}
                runAction={runAction}
              />
            ) : null}
            {view === "offline" ? (
              <OfflineVerifyPanel
                bundle={bundle}
                offlineVerification={offlineVerification}
                setOfflineVerification={setOfflineVerification}
                runAction={runAction}
              />
            ) : null}
            {view === "did" ? (
              <DidPanel
                identity={identity}
                did={did}
                setDid={setDid}
                runAction={runAction}
              />
            ) : null}
            {view === "bundle" ? (
              <BundlePanel
                pact={pact}
                bundle={bundle}
                setBundle={setBundle}
                runAction={runAction}
              />
            ) : null}
            {view === "proof" ? (
              <ProofPanel
                pact={pact}
                proofs={proofs}
                setProofs={setProofs}
                runAction={runAction}
              />
            ) : null}
            {view === "authority" ? (
              <AuthorityPanel
                mandates={mandates}
                mandateCheck={mandateCheck}
                setMandateCheck={setMandateCheck}
                runAction={runAction}
              />
            ) : null}
            {view === "ops" ? (
              <OpsPanel overview={opsOverview} refreshOperatingLayer={refreshOperatingLayer} />
            ) : null}
            {view === "runtime" ? (
              <RuntimePanel
                health={runtimeHealth}
                overview={opsOverview}
                streamSnapshot={streamSnapshot}
                refreshHealth={refreshHealth}
                refreshOperatingLayer={refreshOperatingLayer}
              />
            ) : null}
            {view === "world" ? (
              <WorldPanel
                identity={identity}
                domains={domains}
                scenarios={worldScenarios}
                scenario={worldScenario}
                scenarioRun={scenarioRun}
                setScenario={setWorldScenario}
                setScenarioRun={setScenarioRun}
                runAction={runAction}
              />
            ) : null}
            {view === "command" ? (
              <CommandPanel
                identity={identity}
                domains={domains}
                command={runtimeCommand}
                commands={runtimeCommands}
                setCommand={setRuntimeCommand}
                setPact={setPact}
                runAction={runAction}
              />
            ) : null}
            {view === "crews" ? (
              <CrewsPanel
                identity={identity}
                agents={agents}
                mandates={mandates}
                crews={agentCrews}
                crew={agentCrew}
                crewRun={crewRun}
                setCrew={setAgentCrew}
                setCrewRun={setCrewRun}
                runAction={runAction}
              />
            ) : null}
            {view === "timeline" ? (
              <TimelinePanel items={timelineItems} runAction={runAction} setItems={setTimelineItems} />
            ) : null}
            {view === "genome" ? (
              <GenomePanel
                genomes={genomes}
                setGenomes={setGenomes}
                runAction={runAction}
              />
            ) : null}
            {view === "mandate" ? (
              <MandatePanel
                identity={identity}
                mandates={mandates}
                setMandates={setMandates}
                runAction={runAction}
              />
            ) : null}
            {view === "network" ? (
              <NetworkPanel network={network} refreshNetwork={refreshNetwork} />
            ) : null}
            {view === "graph" ? (
              <TrustGraphPanel graph={trustGraph} refreshTrustGraph={refreshTrustGraph} />
            ) : null}
            {view === "domains" ? (
              <DomainsPanel
                identity={identity}
                domains={domains}
                templates={domainTemplates}
                domainAction={domainAction}
                setTemplates={setDomainTemplates}
                setDomainAction={setDomainAction}
                setPact={setPact}
                runAction={runAction}
              />
            ) : null}
            {view === "workflows" ? (
              <WorkflowsPanel
                identity={identity}
                domains={domains}
                templates={workflowTemplates}
                workflows={workflows}
                workflowResult={workflowResult}
                setWorkflows={setWorkflows}
                setWorkflowResult={setWorkflowResult}
                setPact={setPact}
                runAction={runAction}
              />
            ) : null}
            {view === "ledger" ? (
              <LedgerPanel
                identity={identity}
                pact={pact}
                accounts={ledgerAccounts}
                assets={ledgerAssets}
                statement={ledgerStatement}
                hold={ledgerHold}
                transfer={ledgerTransfer}
                tokenIssuance={tokenIssuance}
                setAccounts={setLedgerAccounts}
                setStatement={setLedgerStatement}
                setHold={setLedgerHold}
                setTransfer={setLedgerTransfer}
                setTokenIssuance={setTokenIssuance}
                runAction={runAction}
              />
            ) : null}
            {view === "payments" ? (
              <PaymentsPanel
                pact={pact}
                accounts={ledgerAccounts}
                payment={payment}
                payments={payments}
                executedPayment={executedPayment}
                setPayment={setPayment}
                setPayments={setPayments}
                setExecutedPayment={setExecutedPayment}
                runAction={runAction}
              />
            ) : null}
            {view === "agents" ? (
              <AgentsPanel
                identity={identity}
                mandates={mandates}
                agents={agents}
                tasks={agentTasks}
                agentRun={agentRun}
                agentTask={agentTask}
                agentTaskRun={agentTaskRun}
                agentRuns={agentRuns}
                setAgents={setAgents}
                setMandates={setMandates}
                setAgentRuns={setAgentRuns}
                setAgentRun={setAgentRun}
                setTasks={setAgentTasks}
                setAgentTask={setAgentTask}
                setAgentTaskRun={setAgentTaskRun}
                runAction={runAction}
              />
            ) : null}
            {view === "policy" ? (
              <PolicyPanel
                identity={identity}
                rules={policyRules}
                decision={policyDecision}
                setRules={setPolicyRules}
                setDecision={setPolicyDecision}
                runAction={runAction}
              />
            ) : null}
            {view === "reputation" ? (
              <ReputationPanel
                identity={identity}
                reputation={reputation}
                setReputation={setReputation}
                runAction={runAction}
              />
            ) : null}
            {view === "search" ? (
              <SearchPanel
                searchResponse={searchResponse}
                setSearchResponse={setSearchResponse}
                runAction={runAction}
              />
            ) : null}
            {view === "stream" ? (
              <StreamPanel
                streamSnapshot={streamSnapshot}
                setStreamSnapshot={setStreamSnapshot}
                runAction={runAction}
              />
            ) : null}
            {view === "security" ? (
              <SecurityPanel
                identity={identity}
                challenge={authChallenge}
                credential={credential}
                credentials={credentials}
                authSession={authSession}
                signedVerification={signedVerification}
                policyDecision={policyDecision}
                auditEvents={auditEvents}
                setChallenge={setAuthChallenge}
                setCredential={setCredential}
                setCredentials={setCredentials}
                setAuthSession={setAuthSession}
                setSignedVerification={setSignedVerification}
                setPolicyDecision={setPolicyDecision}
                runAction={runAction}
              />
            ) : null}
            {view === "qr" ? <QrPanel qr={qr} pactId={currentPactId} /> : null}
            {view === "events" ? <EventsPanel events={events} refreshEvents={refreshEvents} /> : null}
          </div>

          <ProtocolState
            identity={identity}
            pact={pact}
            verification={verification}
            network={network}
            trustGraph={trustGraph}
          />
        </section>
      </div>
    </main>
  );
}

function IdentityPanel({
  identity,
  setIdentity,
  runAction,
}: {
  identity: Identity | null;
  setIdentity: (identity: Identity) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [label, setLabel] = useState("Amadou");
  const [kind, setKind] = useState<IdentityKind>("person");

  async function createIdentity() {
    const created = await runAction(
      () =>
        omniaFetch<Identity>("/v1/identities", {
          method: "POST",
          body: JSON.stringify({ label, kind }),
        }),
      "Identity created."
    );
    if (created) {
      setIdentity(created);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={Fingerprint} title="Create OMNIA Identity" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label">
          <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
        </Field>
        <Field label="Kind">
          <select className="input" value={kind} onChange={(event) => setKind(event.target.value as IdentityKind)}>
            <option value="person">Person</option>
            <option value="organization">Organization</option>
            <option value="agent">Agent</option>
            <option value="machine">Machine</option>
            <option value="product">Product</option>
            <option value="place">Place</option>
          </select>
        </Field>
      </div>
      <button className="primary-button" onClick={() => void createIdentity()}>
        <KeyRound size={16} />
        Create identity
      </button>
      {identity ? <JsonBlock value={identity} /> : null}
    </div>
  );
}

function PactPanel({
  identity,
  pact,
  setPact,
  setVerification,
  runAction,
}: {
  identity: Identity | null;
  pact: Pact | null;
  setPact: (pact: Pact) => void;
  setVerification: (verification: VerifyPactResponse) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [intent, setIntent] = useState("trade.sell");
  const [target, setTarget] = useState("omnia:org:buyer-demo");
  const [objectJson, setObjectJson] = useState('{"batch":"cacao-001","quantity":"500kg"}');
  const [termsJson, setTermsJson] = useState('{"price":"market-index-minus-3%","delivery":"Dakar -> Marseille"}');

  async function createPact() {
    if (!identity) {
      return;
    }
    const created = await runAction(
      () =>
        omniaFetch<Pact>("/v1/pacts", {
          method: "POST",
          body: JSON.stringify({
            actor: identity.id,
            intent,
            object: parseJsonField(objectJson, {}),
            target,
            terms: parseJsonField(termsJson, {}),
            consent: { mode: "explicit", revocable: true },
            proof: { origin: "self_attested", protocol: "OMNIA" },
          }),
        }),
      "PACT draft created."
    );
    if (created) {
      setPact(created);
    }
  }

  async function signPact() {
    if (!pact) {
      return;
    }
    const signed = await runAction(
      () => omniaFetch<Pact>(`/v1/pacts/${pact.id}/sign`, { method: "POST" }),
      "PACT signed."
    );
    if (signed) {
      setPact(signed);
    }
  }

  async function verifyPact() {
    if (!pact) {
      return;
    }
    const result = await runAction(
      () => omniaFetch<VerifyPactResponse>(`/v1/pacts/${pact.id}/verify`, { method: "POST" }),
      "PACT verified."
    );
    if (result) {
      setVerification(result);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={SquarePen} title="Create And Sign PACT" />
      {!identity ? (
        <p className="rounded border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          Create an identity first.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Actor">
          <input className="input" value={identity?.id ?? ""} readOnly />
        </Field>
        <Field label="Intent">
          <input className="input" value={intent} onChange={(event) => setIntent(event.target.value)} />
        </Field>
        <Field label="Target">
          <input className="input" value={target} onChange={(event) => setTarget(event.target.value)} />
        </Field>
      </div>
      <Field label="Object JSON">
        <textarea className="textarea" value={objectJson} onChange={(event) => setObjectJson(event.target.value)} />
      </Field>
      <Field label="Terms JSON">
        <textarea className="textarea" value={termsJson} onChange={(event) => setTermsJson(event.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void createPact()} disabled={!identity}>
          <SquarePen size={16} />
          Create draft
        </button>
        <button className="secondary-button" onClick={() => void signPact()} disabled={!pact}>
          <BadgeCheck size={16} />
          Sign
        </button>
        <button className="secondary-button" onClick={() => void verifyPact()} disabled={!pact}>
          <ShieldCheck size={16} />
          Verify
        </button>
      </div>
      {pact ? <JsonBlock value={pact} /> : null}
    </div>
  );
}

function VerifyPanel({
  pact,
  verification,
  setVerification,
  runAction,
}: {
  pact: Pact | null;
  verification: VerifyPactResponse | null;
  setVerification: (verification: VerifyPactResponse) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [pactId, setPactId] = useState(pact?.id ?? "");
  const [reason, setReason] = useState("Consent withdrawn");

  useEffect(() => {
    if (pact?.id) {
      setPactId(pact.id);
    }
  }, [pact?.id]);

  async function verify() {
    const result = await runAction(
      () => omniaFetch<VerifyPactResponse>(`/v1/pacts/${pactId}/verify`, { method: "POST" }),
      "Verification complete."
    );
    if (result) {
      setVerification(result);
    }
  }

  async function revoke() {
    if (!pact) {
      return;
    }
    await runAction(
      () =>
        omniaFetch(`/v1/pacts/${pactId}/revoke`, {
          method: "POST",
          body: JSON.stringify({ revoked_by: pact.actor, reason }),
        }),
      "PACT revoked."
    );
    await verify();
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={ShieldCheck} title="Verify Or Revoke PACT" />
      <Field label="PACT ID">
        <input className="input" value={pactId} onChange={(event) => setPactId(event.target.value)} />
      </Field>
      <Field label="Revocation reason">
        <input className="input" value={reason} onChange={(event) => setReason(event.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void verify()} disabled={!pactId}>
          <ShieldCheck size={16} />
          Verify
        </button>
        <button className="danger-button" onClick={() => void revoke()} disabled={!pactId || !pact}>
          <XCircle size={16} />
          Revoke
        </button>
      </div>
      {verification ? <VerificationResult verification={verification} /> : null}
    </div>
  );
}

function OfflineVerifyPanel({
  bundle,
  offlineVerification,
  setOfflineVerification,
  runAction,
}: {
  bundle: PactBundle | null;
  offlineVerification: BundleVerificationResponse | null;
  setOfflineVerification: (verification: BundleVerificationResponse) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [bundleJson, setBundleJson] = useState("");

  useEffect(() => {
    if (bundle) {
      setBundleJson(JSON.stringify(bundle, null, 2));
    }
  }, [bundle]);

  async function verifyOfflineBundle() {
    const result = await runAction(
      () =>
        omniaFetch<BundleVerificationResponse>("/v1/bundles/verify", {
          method: "POST",
          body: JSON.stringify(parseJsonField(bundleJson, {})),
        }),
      "Portable bundle verified without database lookup."
    );
    if (result) {
      setOfflineVerification(result);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={BadgeCheck} title="Offline Bundle Verification" />
      <Field label="PACT Bundle JSON">
        <textarea
          className="textarea min-h-[280px]"
          value={bundleJson}
          onChange={(event) => setBundleJson(event.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void verifyOfflineBundle()} disabled={!bundleJson}>
          <BadgeCheck size={16} />
          Verify bundle
        </button>
        <button
          className="secondary-button"
          onClick={() => setBundleJson(bundle ? JSON.stringify(bundle, null, 2) : "")}
          disabled={!bundle}
        >
          <QrCode size={16} />
          Use current bundle
        </button>
      </div>
      {offlineVerification ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Valid" value={offlineVerification.valid ? 1 : 0} />
            <Metric label="Proofs" value={offlineVerification.proofs_count} />
            <Metric label="Events" value={offlineVerification.timeline_events} />
            <Metric label="Revoked" value={offlineVerification.revoked ? 1 : 0} />
          </div>
          <VerificationResult verification={offlineVerification} />
          <JsonBlock value={offlineVerification} />
        </div>
      ) : null}
    </div>
  );
}

function DidPanel({
  identity,
  did,
  setDid,
  runAction,
}: {
  identity: Identity | null;
  did: DidDocument | null;
  setDid: (did: DidDocument) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  async function loadDid() {
    if (!identity) {
      return;
    }
    const loaded = await runAction(
      () => omniaFetch<DidDocument>(`/v1/identities/${identity.id}/did`),
      "DID document loaded."
    );
    if (loaded) {
      setDid(loaded);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={KeyRound} title="Sovereign DID Document" />
      {!identity ? (
        <p className="rounded border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          Create an identity first.
        </p>
      ) : null}
      <Field label="Identity">
        <input className="input" value={identity?.id ?? ""} readOnly />
      </Field>
      <button className="primary-button" onClick={() => void loadDid()} disabled={!identity}>
        <KeyRound size={16} />
        Load DID
      </button>
      {did ? <JsonBlock value={did} /> : null}
    </div>
  );
}

function BundlePanel({
  pact,
  bundle,
  setBundle,
  runAction,
}: {
  pact: Pact | null;
  bundle: PactBundle | null;
  setBundle: (bundle: PactBundle) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [pactId, setPactId] = useState(pact?.id ?? "");

  useEffect(() => {
    if (pact?.id) {
      setPactId(pact.id);
    }
  }, [pact?.id]);

  async function loadBundle() {
    const loaded = await runAction(
      () => omniaFetch<PactBundle>(`/v1/pacts/${pactId}/bundle`),
      "Portable PACT bundle loaded."
    );
    if (loaded) {
      setBundle(loaded);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={QrCode} title="Portable PACT Bundle" />
      <Field label="PACT ID">
        <input className="input" value={pactId} onChange={(event) => setPactId(event.target.value)} />
      </Field>
      <button className="primary-button" onClick={() => void loadBundle()} disabled={!pactId}>
        <QrCode size={16} />
        Load bundle
      </button>
      {bundle ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Proofs" value={bundle.proofs.length} />
            <Metric label="Timeline" value={bundle.timeline.length} />
            <Metric label="Valid" value={bundle.verification.valid ? 1 : 0} />
            <Metric label="Revoked" value={bundle.revocation ? 1 : 0} />
          </div>
          <JsonBlock value={bundle} />
        </div>
      ) : null}
    </div>
  );
}

function QrPanel({ qr, pactId }: { qr: string; pactId: string }) {
  return (
    <div className="space-y-5">
      <PanelTitle icon={QrCode} title="Portable PACT QR" />
      {qr ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <img src={qr} alt="OMNIA PACT QR code" className="h-64 w-64 rounded border border-ink/10 bg-white p-3" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">PACT ID</p>
            <p className="mt-2 break-all rounded bg-ink/5 p-3 font-mono text-sm text-ink/70">{pactId}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink/60">Create a PACT to generate a QR payload.</p>
      )}
    </div>
  );
}

function ProofPanel({
  pact,
  proofs,
  setProofs,
  runAction,
}: {
  pact: Pact | null;
  proofs: Proof[];
  setProofs: (proofs: Proof[]) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [proofType, setProofType] = useState("origin.certificate");
  const [payloadJson, setPayloadJson] = useState(
    '{"issuer":"OMNIA field verifier","claim":"Batch origin inspected","confidence":0.98}'
  );

  async function createProof() {
    const created = await runAction(
      () =>
        omniaFetch<Proof>("/v1/proofs", {
          method: "POST",
          body: JSON.stringify({
            pact_id: pact?.id ?? null,
            proof_type: proofType,
            payload: parseJsonField(payloadJson, {}),
          }),
        }),
      "Proof attached to the protocol graph."
    );
    if (created) {
      setProofs([created, ...proofs]);
    }
  }

  async function refreshProofs() {
    const next = await runAction(
      () => omniaFetch<Proof[]>("/v1/proofs?limit=20"),
      "Proof registry refreshed."
    );
    if (next) {
      setProofs(next);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={FileCheck2} title="Proof Registry" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Attached PACT">
          <input className="input" value={pact?.id ?? "none"} readOnly />
        </Field>
        <Field label="Proof type">
          <input className="input" value={proofType} onChange={(event) => setProofType(event.target.value)} />
        </Field>
      </div>
      <Field label="Proof payload JSON">
        <textarea className="textarea" value={payloadJson} onChange={(event) => setPayloadJson(event.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void createProof()}>
          <FileCheck2 size={16} />
          Create proof
        </button>
        <button className="secondary-button" onClick={() => void refreshProofs()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <ObjectList
        empty="No proofs yet."
        items={proofs}
        getTitle={(proof) => proof.proof_type}
        getSubtitle={(proof) => proof.pact_id ?? proof.id}
      />
    </div>
  );
}

function GenomePanel({
  genomes,
  setGenomes,
  runAction,
}: {
  genomes: Genome[];
  setGenomes: (genomes: Genome[]) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [subject, setSubject] = useState("cacao:batch:001");
  const [originJson, setOriginJson] = useState('{"producer":"Cooperative Dakar","location":"Senegal"}');
  const [historyJson, setHistoryJson] = useState('{"created_from":"field inspection","chain":["farm","port","buyer"]}');
  const [rightsJson, setRightsJson] = useState('{"view":true,"resell":false,"revoke":true}');

  async function createGenome() {
    const created = await runAction(
      () =>
        omniaFetch<Genome>("/v1/genomes", {
          method: "POST",
          body: JSON.stringify({
            subject,
            origin: parseJsonField(originJson, {}),
            history: parseJsonField(historyJson, {}),
            rights: parseJsonField(rightsJson, {}),
          }),
        }),
      "Genome created."
    );
    if (created) {
      setGenomes([created, ...genomes]);
    }
  }

  async function refreshGenomes() {
    const next = await runAction(
      () => omniaFetch<Genome[]>("/v1/genomes?limit=20"),
      "Genome registry refreshed."
    );
    if (next) {
      setGenomes(next);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={Dna} title="Genome Of Things" />
      <Field label="Subject">
        <input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} />
      </Field>
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Origin JSON">
          <textarea className="textarea" value={originJson} onChange={(event) => setOriginJson(event.target.value)} />
        </Field>
        <Field label="History JSON">
          <textarea className="textarea" value={historyJson} onChange={(event) => setHistoryJson(event.target.value)} />
        </Field>
        <Field label="Rights JSON">
          <textarea className="textarea" value={rightsJson} onChange={(event) => setRightsJson(event.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void createGenome()}>
          <Dna size={16} />
          Create genome
        </button>
        <button className="secondary-button" onClick={() => void refreshGenomes()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <ObjectList
        empty="No genomes yet."
        items={genomes}
        getTitle={(genome) => genome.subject}
        getSubtitle={(genome) => genome.id}
      />
    </div>
  );
}

function MandatePanel({
  identity,
  mandates,
  setMandates,
  runAction,
}: {
  identity: Identity | null;
  mandates: Mandate[];
  setMandates: (mandates: Mandate[]) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [agentId, setAgentId] = useState("");
  const [expiresAt, setExpiresAt] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 16));
  const [scopeJson, setScopeJson] = useState(
    '{"can":["compare_prices","negotiate_terms"],"cannot":["sign_contract","share_private_data"],"max_value":"1000 EUR"}'
  );

  async function createAgent() {
    const created = await runAction(
      () =>
        omniaFetch<Identity>("/v1/identities", {
          method: "POST",
          body: JSON.stringify({ label: "OMNIA Negotiator Agent", kind: "agent" }),
        }),
      "Agent identity created."
    );
    if (created) {
      setAgentId(created.id);
    }
  }

  async function createMandate() {
    if (!identity || !agentId) {
      return;
    }
    const created = await runAction(
      () =>
        omniaFetch<Mandate>("/v1/mandates", {
          method: "POST",
          body: JSON.stringify({
            principal: identity.id,
            agent: agentId,
            scope: parseJsonField(scopeJson, {}),
            expires_at: new Date(expiresAt).toISOString(),
          }),
        }),
      "Mandate created."
    );
    if (created) {
      setMandates([created, ...mandates]);
    }
  }

  async function refreshMandates() {
    const next = await runAction(
      () => omniaFetch<Mandate[]>("/v1/mandates"),
      "Mandate registry refreshed."
    );
    if (next) {
      setMandates(next);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={Bot} title="Agent Mandates" />
      {!identity ? (
        <p className="rounded border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          Create a principal identity first.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Principal">
          <input className="input" value={identity?.id ?? ""} readOnly />
        </Field>
        <Field label="Agent">
          <input className="input" value={agentId} onChange={(event) => setAgentId(event.target.value)} />
        </Field>
        <Field label="Expires at">
          <input
            className="input"
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Scope JSON">
        <textarea className="textarea" value={scopeJson} onChange={(event) => setScopeJson(event.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <button className="secondary-button" onClick={() => void createAgent()}>
          <Bot size={16} />
          Create demo agent
        </button>
        <button className="primary-button" onClick={() => void createMandate()} disabled={!identity || !agentId}>
          <BadgeCheck size={16} />
          Create mandate
        </button>
        <button className="secondary-button" onClick={() => void refreshMandates()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <ObjectList
        empty="No mandates yet."
        items={mandates}
        getTitle={(mandate) => `${mandate.principal} -> ${mandate.agent}`}
        getSubtitle={(mandate) => `expires ${new Date(mandate.expires_at).toLocaleString()}`}
      />
    </div>
  );
}

function AuthorityPanel({
  mandates,
  mandateCheck,
  setMandateCheck,
  runAction,
}: {
  mandates: Mandate[];
  mandateCheck: MandateCheckResponse | null;
  setMandateCheck: (response: MandateCheckResponse) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [mandateId, setMandateId] = useState("");
  const [action, setAction] = useState("negotiate_terms");
  const [intent, setIntent] = useState("trade.sell");

  useEffect(() => {
    if (!mandateId && mandates[0]?.id) {
      setMandateId(mandates[0].id);
    }
  }, [mandateId, mandates]);

  async function checkAuthority() {
    const response = await runAction(
      () =>
        omniaFetch<MandateCheckResponse>(`/v1/mandates/${mandateId}/check`, {
          method: "POST",
          body: JSON.stringify({
            action,
            intent,
            context: { surface: "omnia-dashboard" },
          }),
        }),
      "Mandate authority checked."
    );
    if (response) {
      setMandateCheck(response);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={ShieldCheck} title="Mandate Authority Check" />
      {!mandates.length ? (
        <p className="rounded border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          Create a mandate first.
        </p>
      ) : null}
      <Field label="Mandate">
        <select className="input" value={mandateId} onChange={(event) => setMandateId(event.target.value)}>
          <option value="">Select a mandate</option>
          {mandates.map((mandate) => (
            <option key={mandate.id} value={mandate.id}>
              {mandate.id}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Action">
          <input className="input" value={action} onChange={(event) => setAction(event.target.value)} />
        </Field>
        <Field label="Intent">
          <input className="input" value={intent} onChange={(event) => setIntent(event.target.value)} />
        </Field>
      </div>
      <button className="primary-button" onClick={() => void checkAuthority()} disabled={!mandateId}>
        <ShieldCheck size={16} />
        Check authority
      </button>
      {mandateCheck ? (
        <div className="space-y-4">
          <div
            className={`rounded border px-4 py-3 text-sm font-medium ${
              mandateCheck.allowed
                ? "border-signal/20 bg-signal/10 text-signal"
                : "border-ember/30 bg-ember/10 text-ember"
            }`}
          >
            {mandateCheck.allowed ? "Allowed by mandate" : "Denied by mandate"}
          </div>
          <JsonBlock value={mandateCheck} />
        </div>
      ) : null}
    </div>
  );
}

function NetworkPanel({
  network,
  refreshNetwork,
}: {
  network: NetworkStatus | null;
  refreshNetwork: () => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle icon={Network} title="Network Status" />
        <button className="secondary-button" onClick={() => void refreshNetwork()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {network ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Identities" value={network.identities} />
          <Metric label="PACTs" value={network.pacts} />
          <Metric label="Active" value={network.active_pacts} />
          <Metric label="Revoked" value={network.revoked_pacts} />
          <Metric label="Proofs" value={network.proofs} />
          <Metric label="Mandates" value={network.mandates} />
          <Metric label="Genomes" value={network.genomes} />
          <Metric label="Events" value={network.events} />
          <Metric label="Domains" value={network.domains} />
          <Metric label="Ledger" value={network.ledger_accounts} />
          <Metric label="Payments" value={network.payment_intents} />
          <Metric label="Agents" value={network.agents} />
          <Metric label="Audit" value={network.audit_events} />
        </div>
      ) : (
        <p className="text-sm text-ink/60">Network status unavailable.</p>
      )}
    </div>
  );
}

function OpsPanel({
  overview,
  refreshOperatingLayer,
}: {
  overview: OperationalOverview | null;
  refreshOperatingLayer: () => Promise<void>;
}) {
  const actionMix = useMemo(() => {
    const counts = new Map<string, number>();
    overview?.recent_domain_actions.forEach((action) => {
      counts.set(action.domain_id, (counts.get(action.domain_id) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort(([, left], [, right]) => right - left);
  }, [overview]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle icon={Activity} title="Mission Control" />
        <button className="secondary-button" onClick={() => void refreshOperatingLayer()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {overview ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Identities" value={overview.network.identities} />
            <Metric label="Active PACTs" value={overview.network.active_pacts} />
            <Metric label="Ledger accounts" value={overview.network.ledger_accounts} />
            <Metric label="Audit events" value={overview.network.audit_events} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Pending payments" value={overview.payments.pending} />
            <Metric label="Executed payments" value={overview.payments.executed} />
            <Metric label="Rejected payments" value={overview.payments.rejected} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded border border-ink/10 p-4">
              <h3 className="font-semibold text-ink">Recent Domain Actions</h3>
              <ObjectList
                empty="No domain actions yet."
                items={overview.recent_domain_actions.slice(0, 6)}
                getTitle={(action) => `${action.domain_id} / ${action.action_type}`}
                getSubtitle={(action) => action.pact_id}
              />
            </section>
            <section className="rounded border border-ink/10 p-4">
              <h3 className="font-semibold text-ink">Recent Agent Runs</h3>
              <ObjectList
                empty="No agent runs yet."
                items={overview.recent_agent_runs.slice(0, 6)}
                getTitle={(run) => `${run.action} (${run.policy_decision})`}
                getSubtitle={(run) => run.id}
              />
            </section>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded border border-ink/10 p-4">
              <h3 className="font-semibold text-ink">Domain Mix</h3>
              <div className="mt-3 space-y-2">
                {actionMix.map(([domain, count]) => (
                  <div key={domain} className="flex items-center justify-between rounded bg-ink/[0.03] px-3 py-2">
                    <span className="font-medium text-ink">{domain}</span>
                    <span className="text-sm text-ink/60">{count}</span>
                  </div>
                ))}
                {!actionMix.length ? <p className="text-sm text-ink/60">No action mix yet.</p> : null}
              </div>
            </section>
            <section className="rounded border border-ink/10 p-4">
              <h3 className="font-semibold text-ink">Audit Pulse</h3>
              <ObjectList
                empty="No audit events yet."
                items={overview.recent_audit.slice(0, 6)}
                getTitle={(event) => `${event.event_type} ${event.decision ? `(${event.decision})` : ""}`}
                getSubtitle={(event) => event.subject_id}
              />
            </section>
          </div>
          <p className="text-xs text-ink/45">
            Generated {new Date(overview.generated_at).toLocaleString()}
          </p>
        </div>
      ) : (
        <p className="text-sm text-ink/60">Operational overview unavailable.</p>
      )}
    </div>
  );
}

function RuntimePanel({
  health,
  overview,
  streamSnapshot,
  refreshHealth,
  refreshOperatingLayer,
}: {
  health: RuntimeHealth | null;
  overview: OperationalOverview | null;
  streamSnapshot: string;
  refreshHealth: () => Promise<void>;
  refreshOperatingLayer: () => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle icon={Activity} title="Sovereign Runtime" />
        <div className="flex flex-wrap gap-3">
          <button className="secondary-button" onClick={() => void refreshHealth()}>
            <RefreshCw size={16} />
            Readiness
          </button>
          <button className="secondary-button" onClick={() => void refreshOperatingLayer()}>
            <Activity size={16} />
            Overview
          </button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="DB ready" value={health?.database ? 1 : 0} />
        <Metric label="Active workflows" value={overview?.runtime.active_workflows ?? 0} />
        <Metric label="Held funds" value={overview?.runtime.held_ledger_funds ?? 0} />
        <Metric label="Agent queue" value={overview?.runtime.pending_agent_tasks ?? 0} />
        <Metric label="Reviews" value={overview?.runtime.needs_review_workflows ?? 0} />
        <Metric label="Reputation scores" value={overview?.runtime.reputation_scores ?? 0} />
        <Metric label="High risk" value={overview?.runtime.high_risk_assessments ?? 0} />
        <Metric label="Notifications" value={overview?.runtime.unread_notifications ?? 0} />
        <Metric label="Scenarios" value={overview?.runtime.world_scenarios ?? 0} />
        <Metric label="Scenario runs" value={overview?.runtime.scenario_runs ?? 0} />
        <Metric label="Commands" value={overview?.runtime.runtime_commands ?? 0} />
        <Metric label="Crews" value={overview?.runtime.agent_crews ?? 0} />
        <Metric label="Signals" value={overview?.runtime.civilization_signals ?? 0} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded border border-ink/10 p-4">
          <h3 className="font-semibold text-ink">Runtime Readiness</h3>
          {health ? <JsonBlock value={health} /> : <p className="mt-3 text-sm text-ink/60">Readiness unavailable.</p>}
        </section>
        <section className="rounded border border-ink/10 p-4">
          <h3 className="font-semibold text-ink">Latest Stream Snapshot</h3>
          {streamSnapshot ? (
            <pre className="mt-3 max-h-80 overflow-auto rounded bg-ink p-4 text-xs text-white">{streamSnapshot}</pre>
          ) : (
            <p className="mt-3 text-sm text-ink/60">Open the Stream tab to pull an SSE runtime snapshot.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function WorldPanel({
  identity,
  domains,
  scenarios,
  scenario,
  scenarioRun,
  setScenario,
  setScenarioRun,
  runAction,
}: {
  identity: Identity | null;
  domains: DomainModule[];
  scenarios: WorldScenario[];
  scenario: WorldScenario | null;
  scenarioRun: ScenarioRun | null;
  setScenario: (scenario: WorldScenario) => void;
  setScenarioRun: (run: ScenarioRun) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [domainId, setDomainId] = useState("transport");
  const [title, setTitle] = useState("climate + transport + economy shock");
  const [summary, setSummary] = useState("Climate disruption delays transport, raises settlement risk, and triggers an OMNIA response workflow.");
  const [shock, setShock] = useState("critical climate shock impacting transport corridors and local economy");
  const selectedScenarioId = scenario?.id ?? scenarios[0]?.id ?? "";

  async function createScenario() {
    if (!identity) return;
    const created = await runAction(
      () =>
        omniaFetch<WorldScenario>("/v1/world/scenarios", {
          method: "POST",
          body: JSON.stringify({
            actor: identity.id,
            domain_id: domainId,
            title,
            summary,
            payload: {
              domains: ["climate", "transport", "economy"],
              priority: "demo",
            },
          }),
        }),
      "World scenario created."
    );
    if (created) {
      setScenario(created);
    }
  }

  async function runScenario() {
    if (!selectedScenarioId) return;
    const run = await runAction(
      () =>
        omniaFetch<ScenarioRun>(`/v1/world/scenarios/${selectedScenarioId}/run`, {
          method: "POST",
          body: JSON.stringify({
            parameters: {
              shock,
              requested_by: identity?.id,
              mode: "night-sprint-demo",
            },
          }),
        }),
      "Scenario simulation completed."
    );
    if (run) {
      setScenarioRun(run);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={Network} title="World Runtime" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded border border-ink/10 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Domain">
              <select className="input" value={domainId} onChange={(event) => setDomainId(event.target.value)}>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Actor">
              <input className="input" value={identity?.id ?? "Create an identity first"} readOnly />
            </Field>
          </div>
          <Field label="Scenario title">
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Summary">
            <textarea className="input min-h-24" value={summary} onChange={(event) => setSummary(event.target.value)} />
          </Field>
          <Field label="Shock input">
            <textarea className="input min-h-20" value={shock} onChange={(event) => setShock(event.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button className="primary-button" onClick={() => void createScenario()} disabled={!identity}>
              <Network size={16} />
              Create scenario
            </button>
            <button className="secondary-button" onClick={() => void runScenario()} disabled={!selectedScenarioId}>
              <Activity size={16} />
              Run simulation
            </button>
          </div>
        </section>
        <section className="rounded border border-ink/10 p-4">
          <h3 className="font-semibold text-ink">Simulation Result</h3>
          {scenarioRun ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Impact" value={scenarioRun.impact_score} />
                <Metric label="Risk" value={scenarioRun.risk_level === "high" ? 3 : scenarioRun.risk_level === "medium" ? 2 : 1} />
                <Metric label="Objects" value={Object.keys((scenarioRun.generated_objects as Record<string, unknown>) ?? {}).length} />
              </div>
              <div className="rounded border border-signal/20 bg-signal/10 p-4 text-sm text-ink">
                {String((scenarioRun.output as Record<string, unknown>)?.decision ?? "Decision generated")}
              </div>
              <JsonBlock value={scenarioRun} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink/60">Create and run a scenario to see impact, risk, and generated protocol objects.</p>
          )}
        </section>
      </div>
      <ObjectList
        empty="No world scenarios yet."
        items={scenarios}
        getTitle={(item) => `${item.title} / ${item.status}`}
        getSubtitle={(item) => `${item.domain_id} / ${item.id}`}
      />
    </div>
  );
}

function CommandPanel({
  identity,
  domains,
  command,
  commands,
  setCommand,
  setPact,
  runAction,
}: {
  identity: Identity | null;
  domains: DomainModule[];
  command: RuntimeCommand | null;
  commands: RuntimeCommand[];
  setCommand: (command: RuntimeCommand) => void;
  setPact: (pact: Pact) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [domainId, setDomainId] = useState("economy");
  const [intent, setIntent] = useState("coordinate_trade_response");
  const [target, setTarget] = useState("");
  const [text, setText] = useState("Create a signed PACT and workflow for a sandbox trade/payment response.");
  const [payload, setPayload] = useState('{"amount": 1200, "risk": "medium"}');

  async function sendCommand() {
    if (!identity) return;
    const created = await runAction(
      () =>
        omniaFetch<RuntimeCommand>("/v1/runtime/commands", {
          method: "POST",
          body: JSON.stringify({
            actor: identity.id,
            domain_id: domainId,
            intent,
            target: target || identity.id,
            command_text: text,
            payload: parseJsonField(payload, {}),
          }),
        }),
      "Runtime command executed."
    );
    if (created) {
      setCommand(created);
      if (created.pact_id) {
        const pact = await runAction(
          () => omniaFetch<Pact>(`/v1/pacts/${created.pact_id}`),
          "Generated PACT loaded."
        );
        if (pact) {
          setPact(pact);
        }
      }
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={SquarePen} title="Runtime Command Center" />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded border border-ink/10 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Domain">
              <select className="input" value={domainId} onChange={(event) => setDomainId(event.target.value)}>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Intent">
              <input className="input" value={intent} onChange={(event) => setIntent(event.target.value)} />
            </Field>
            <Field label="Target">
              <input className="input" value={target} onChange={(event) => setTarget(event.target.value)} placeholder={identity?.id ?? "identity"} />
            </Field>
          </div>
          <Field label="Command">
            <textarea className="input min-h-24" value={text} onChange={(event) => setText(event.target.value)} />
          </Field>
          <Field label="Payload">
            <textarea className="input min-h-24 font-mono text-xs" value={payload} onChange={(event) => setPayload(event.target.value)} />
          </Field>
          <button className="primary-button" onClick={() => void sendCommand()} disabled={!identity}>
            <Activity size={16} />
            Execute command
          </button>
        </section>
        <section className="rounded border border-ink/10 p-4">
          <h3 className="font-semibold text-ink">Command Result</h3>
          {command ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="PACT" value={command.pact_id ? 1 : 0} />
                <Metric label="Workflow" value={command.workflow_id ? 1 : 0} />
                <Metric label="Status" value={command.status === "active" || command.status === "completed" ? 1 : 0} />
              </div>
              <p className="rounded border border-ink/10 bg-ink/[0.03] p-3 text-sm text-ink/80">
                {command.result.summary}
              </p>
              <JsonBlock value={command} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink/60">Commands turn natural operational intent into PACTs, workflows, risk and audit records.</p>
          )}
        </section>
      </div>
      <ObjectList
        empty="No runtime commands yet."
        items={commands}
        getTitle={(item) => `${item.intent} / ${item.status}`}
        getSubtitle={(item) => item.command_text}
      />
    </div>
  );
}

function CrewsPanel({
  identity,
  agents,
  mandates,
  crews,
  crew,
  crewRun,
  setCrew,
  setCrewRun,
  runAction,
}: {
  identity: Identity | null;
  agents: AgentProfile[];
  mandates: Mandate[];
  crews: AgentCrewResponse[];
  crew: AgentCrewResponse | null;
  crewRun: CrewRunResponse | null;
  setCrew: (crew: AgentCrewResponse) => void;
  setCrewRun: (run: CrewRunResponse) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [label, setLabel] = useState("Civic Response Crew");
  const [objective, setObjective] = useState("Coordinate a supervised climate transport economy response.");
  const [agentId, setAgentId] = useState("");
  const [mandateId, setMandateId] = useState("");
  const [action, setAction] = useState("compare_prices");
  const activeCrewId = crew?.crew.id ?? crews[0]?.crew.id ?? "";

  async function createCrew() {
    if (!identity || !agentId || !mandateId) return;
    const created = await runAction(
      () =>
        omniaFetch<AgentCrewResponse>("/v1/agent-crews", {
          method: "POST",
          body: JSON.stringify({
            actor: identity.id,
            label,
            objective,
            members: [{ agent_id: agentId, mandate_id: mandateId, role: "orchestrator" }],
          }),
        }),
      "Agent crew created."
    );
    if (created) {
      setCrew(created);
    }
  }

  async function runCrew() {
    if (!activeCrewId) return;
    const run = await runAction(
      () =>
        omniaFetch<CrewRunResponse>(`/v1/agent-crews/${activeCrewId}/run`, {
          method: "POST",
          body: JSON.stringify({
            input: {
              action,
              risk: action.includes("sign") ? "high" : "low",
              objective,
            },
          }),
        }),
      "Crew run evaluated."
    );
    if (run) {
      setCrewRun(run);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={Bot} title="Supervised Agent Crews" />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded border border-ink/10 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label">
              <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
            </Field>
            <Field label="Action">
              <input className="input" value={action} onChange={(event) => setAction(event.target.value)} />
            </Field>
          </div>
          <Field label="Objective">
            <textarea className="input min-h-20" value={objective} onChange={(event) => setObjective(event.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Agent">
              <select className="input" value={agentId} onChange={(event) => setAgentId(event.target.value)}>
                <option value="">Select agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mandate">
              <select className="input" value={mandateId} onChange={(event) => setMandateId(event.target.value)}>
                <option value="">Select mandate</option>
                {mandates.map((mandate) => (
                  <option key={mandate.id} value={mandate.id}>
                    {mandate.id.slice(0, 8)} / {mandate.agent.slice(0, 18)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="primary-button" onClick={() => void createCrew()} disabled={!identity || !agentId || !mandateId}>
              <Bot size={16} />
              Create crew
            </button>
            <button className="secondary-button" onClick={() => void runCrew()} disabled={!activeCrewId}>
              <Activity size={16} />
              Run crew
            </button>
          </div>
        </section>
        <section className="rounded border border-ink/10 p-4">
          <h3 className="font-semibold text-ink">Crew Decision</h3>
          {crewRun ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Members" value={crewRun.members.length} />
                <Metric label="Review" value={crewRun.run.requires_review ? 1 : 0} />
                <Metric label="Allowed" value={crewRun.run.policy_decision === "allow" ? 1 : 0} />
              </div>
              <JsonBlock value={crewRun} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink/60">Crew runs are gated by mandate and policy before any sandbox execution.</p>
          )}
        </section>
      </div>
      <ObjectList
        empty="No agent crews yet."
        items={crews}
        getTitle={(item) => `${item.crew.label} / ${item.crew.status} / ${item.crew.policy_decision}`}
        getSubtitle={(item) => `${item.members.length} members / ${item.crew.id}`}
      />
    </div>
  );
}

function TimelinePanel({
  items,
  setItems,
  runAction,
}: {
  items: RuntimeTimelineItem[];
  setItems: (items: RuntimeTimelineItem[]) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  async function refreshTimeline() {
    const loaded = await runAction(
      () => omniaFetch<RuntimeTimelineItem[]>("/v1/runtime/timeline?limit=100"),
      "Timeline refreshed."
    );
    if (loaded) {
      setItems(loaded);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle icon={History} title="Unified Runtime Timeline" />
        <button className="secondary-button" onClick={() => void refreshTimeline()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <article key={`${item.item_type}-${item.id}`} className="rounded border border-ink/10 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-signal">{item.item_type}</p>
                <h3 className="mt-1 font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-xs text-ink/50">
                  {item.domain_id ?? "runtime"} / {item.actor ?? "system"}
                </p>
              </div>
              <span className="rounded border border-ink/10 px-2 py-1 text-xs font-medium text-ink/70">
                {item.status}
              </span>
            </div>
            <p className="mt-3 text-xs text-ink/45">{new Date(item.created_at).toLocaleString()}</p>
          </article>
        ))}
        {!items.length ? <p className="text-sm text-ink/60">Timeline empty.</p> : null}
      </div>
    </div>
  );
}

function WorkflowsPanel({
  identity,
  domains,
  templates,
  workflows,
  workflowResult,
  setWorkflows,
  setWorkflowResult,
  setPact,
  runAction,
}: {
  identity: Identity | null;
  domains: DomainModule[];
  templates: WorkflowTemplate[];
  workflows: DomainWorkflow[];
  workflowResult: WorkflowResponse | null;
  setWorkflows: (workflows: DomainWorkflow[]) => void;
  setWorkflowResult: (workflow: WorkflowResponse) => void;
  setPact: (pact: Pact) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [domainId, setDomainId] = useState("economy");
  const [templateId, setTemplateId] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [title, setTitle] = useState("Guided economy settlement");
  const [target, setTarget] = useState("omnia:org:future-node");
  const [amount, setAmount] = useState(500);
  const [risk, setRisk] = useState("medium");
  const [notes, setNotes] = useState("reviewed from dashboard");

  const domainTemplates = templates.filter((template) => template.domain_id === domainId);

  useEffect(() => {
    if (!templateId && domainTemplates[0]?.id) {
      setTemplateId(domainTemplates[0].id);
    }
  }, [domainTemplates, templateId]);

  useEffect(() => {
    if (!selectedWorkflow && workflows[0]?.id) {
      setSelectedWorkflow(workflows[0].id);
    }
  }, [selectedWorkflow, workflows]);

  async function createWorkflow() {
    if (!identity) return;
    const response = await runAction(
      () =>
        omniaFetch<WorkflowResponse>("/v1/workflows", {
          method: "POST",
          body: JSON.stringify({
            domain_id: domainId,
            template_id: templateId || null,
            actor: identity.id,
            target,
            title,
            payload: {
              guided: true,
              amount,
              risk,
              domain: domainId,
              requested_capabilities: ["pact", "proof", "audit", "runtime"],
            },
          }),
        }),
      "Guided workflow created."
    );
    if (response) {
      setWorkflowResult(response);
      setWorkflows([response.workflow, ...workflows.filter((item) => item.id !== response.workflow.id)]);
      setSelectedWorkflow(response.workflow.id);
      if (response.pact) {
        setPact(response.pact);
      }
    }
  }

  async function loadWorkflow(id = selectedWorkflow) {
    if (!id) return;
    const response = await runAction(
      () => omniaFetch<WorkflowResponse>(`/v1/workflows/${id}`),
      "Workflow loaded."
    );
    if (response) {
      setWorkflowResult(response);
      if (response.pact) {
        setPact(response.pact);
      }
    }
  }

  async function advanceWorkflow() {
    if (!selectedWorkflow) return;
    const response = await runAction(
      () =>
        omniaFetch<WorkflowResponse>(`/v1/workflows/${selectedWorkflow}/advance`, {
          method: "POST",
          body: JSON.stringify({
            output: {
              completed_by: identity?.id ?? "dashboard",
              notes,
              checkpoint: new Date().toISOString(),
            },
          }),
        }),
      "Workflow advanced."
    );
    if (response) {
      setWorkflowResult(response);
      setWorkflows(workflows.map((item) => (item.id === response.workflow.id ? response.workflow : item)));
    }
  }

  async function reviewWorkflow(decision: string) {
    if (!identity || !selectedWorkflow) return;
    const response = await runAction(
      () =>
        omniaFetch<WorkflowResponse>(`/v1/workflows/${selectedWorkflow}/review`, {
          method: "POST",
          body: JSON.stringify({
            reviewer: identity.id,
            decision,
            notes,
          }),
        }),
      `Workflow review recorded as ${decision}.`
    );
    if (response) {
      setWorkflowResult(response);
      setWorkflows(workflows.map((item) => (item.id === response.workflow.id ? response.workflow : item)));
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={FileCheck2} title="Domain Workflow OS" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {domains.map((domain) => (
          <button
            key={domain.id}
            className={`rounded border p-4 text-left transition ${
              domain.id === domainId ? "border-ink bg-ink text-white" : "border-ink/10 hover:border-ink/30"
            }`}
            onClick={() => {
              setDomainId(domain.id);
              const nextTemplate = templates.find((template) => template.domain_id === domain.id);
              setTemplateId(nextTemplate?.id ?? "");
              setTitle(`${domain.label} guided workflow`);
            }}
          >
            <p className="font-semibold">{domain.label}</p>
            <p className={`mt-2 text-xs ${domain.id === domainId ? "text-white/70" : "text-ink/55"}`}>
              {domain.description}
            </p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Template">
          <select className="input" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {domainTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Target">
          <input className="input" value={target} onChange={(event) => setTarget(event.target.value)} />
        </Field>
        <Field label="Amount / units">
          <input className="input" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </Field>
        <Field label="Risk">
          <select className="input" value={risk} onChange={(event) => setRisk(event.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </Field>
        <Field label="Existing workflow">
          <select className="input" value={selectedWorkflow} onChange={(event) => setSelectedWorkflow(event.target.value)}>
            <option value="">Select workflow</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.title} / {workflow.status}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Review / step notes">
        <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void createWorkflow()} disabled={!identity}>
          <SquarePen size={16} />
          Create workflow
        </button>
        <button className="secondary-button" onClick={() => void loadWorkflow()} disabled={!selectedWorkflow}>
          <RefreshCw size={16} />
          Load
        </button>
        <button className="secondary-button" onClick={() => void advanceWorkflow()} disabled={!selectedWorkflow}>
          <FileCheck2 size={16} />
          Advance
        </button>
        <button className="secondary-button" onClick={() => void reviewWorkflow("approve")} disabled={!identity || !selectedWorkflow}>
          <BadgeCheck size={16} />
          Approve
        </button>
        <button className="danger-button" onClick={() => void reviewWorkflow("reject")} disabled={!identity || !selectedWorkflow}>
          <XCircle size={16} />
          Deny
        </button>
      </div>
      {workflowResult ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Steps" value={workflowResult.steps.length} compact />
            <Metric label="Reviews" value={workflowResult.reviews.length} compact />
            <Metric label="Risk score" value={workflowResult.risk?.score ?? 0} compact />
            <Metric label="Current step" value={workflowResult.workflow.current_step} compact />
          </div>
          <ObjectList
            empty="No workflow steps."
            items={workflowResult.steps}
            getTitle={(step) => `${step.step_order}. ${step.label} / ${step.status}`}
            getSubtitle={(step) => step.id}
          />
          <JsonBlock value={workflowResult} />
        </div>
      ) : null}
    </div>
  );
}

function PolicyPanel({
  identity,
  rules,
  decision,
  setRules,
  setDecision,
  runAction,
}: {
  identity: Identity | null;
  rules: PolicyRule[];
  decision: PolicyDecision | null;
  setRules: (rules: PolicyRule[]) => void;
  setDecision: (decision: PolicyDecision) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [name, setName] = useState("Require review for high-risk actions");
  const [effect, setEffect] = useState("needs_review");
  const [action, setAction] = useState("transfer");
  const [resource, setResource] = useState("*");
  const [priority, setPriority] = useState(50);
  const [risk, setRisk] = useState("high");

  async function refreshRules() {
    const loaded = await runAction(
      () => omniaFetch<PolicyRule[]>("/v1/policies/rules?limit=50"),
      "Policy rules refreshed."
    );
    if (loaded) {
      setRules(loaded);
    }
  }

  async function createRule() {
    const rule = await runAction(
      () =>
        omniaFetch<PolicyRule>("/v1/policies/rules", {
          method: "POST",
          body: JSON.stringify({
            name,
            effect,
            action,
            resource,
            priority,
            condition: { risk },
          }),
        }),
      "Policy rule created."
    );
    if (rule) {
      setRules([rule, ...rules]);
    }
  }

  async function evaluate() {
    const evaluated = await runAction(
      () =>
        omniaFetch<PolicyDecision>("/v1/policies/evaluate", {
          method: "POST",
          body: JSON.stringify({
            subject_id: identity?.id ?? "omnia:anonymous",
            action,
            resource,
            context: { risk },
          }),
        }),
      "Policy evaluated with persistent precedence."
    );
    if (evaluated) {
      setDecision(evaluated);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle icon={ShieldCheck} title="Policy Studio" />
        <button className="secondary-button" onClick={() => void refreshRules()}>
          <RefreshCw size={16} />
          Refresh rules
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rule name">
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Effect">
          <select className="input" value={effect} onChange={(event) => setEffect(event.target.value)}>
            <option value="allow">Allow</option>
            <option value="needs_review">Needs review</option>
            <option value="deny">Deny</option>
          </select>
        </Field>
        <Field label="Action">
          <input className="input" value={action} onChange={(event) => setAction(event.target.value)} />
        </Field>
        <Field label="Resource">
          <input className="input" value={resource} onChange={(event) => setResource(event.target.value)} />
        </Field>
        <Field label="Priority">
          <input className="input" type="number" value={priority} onChange={(event) => setPriority(Number(event.target.value))} />
        </Field>
        <Field label="Risk condition">
          <select className="input" value={risk} onChange={(event) => setRisk(event.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void createRule()}>
          <ShieldCheck size={16} />
          Create rule
        </button>
        <button className="secondary-button" onClick={() => void evaluate()}>
          <Activity size={16} />
          Evaluate
        </button>
      </div>
      {decision ? <JsonBlock value={decision} /> : null}
      <ObjectList
        empty="No policy rules yet."
        items={rules}
        getTitle={(rule) => `${rule.effect} ${rule.action} on ${rule.resource} / p${rule.priority}`}
        getSubtitle={(rule) => rule.name}
      />
    </div>
  );
}

function ReputationPanel({
  identity,
  reputation,
  setReputation,
  runAction,
}: {
  identity: Identity | null;
  reputation: ReputationResponse | null;
  setReputation: (response: ReputationResponse) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [identityId, setIdentityId] = useState("");

  useEffect(() => {
    if (!identityId && identity?.id) {
      setIdentityId(identity.id);
    }
  }, [identity, identityId]);

  async function loadReputation(recompute = false) {
    if (!identityId) return;
    const response = await runAction(
      () =>
        recompute
          ? omniaFetch<ReputationResponse>("/v1/reputation/recompute", {
              method: "POST",
              body: JSON.stringify({ identity_id: identityId }),
            })
          : omniaFetch<ReputationResponse>(`/v1/reputation/${encodeURIComponent(identityId)}`),
      recompute ? "Reputation recomputed." : "Reputation loaded."
    );
    if (response) {
      setReputation(response);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={BadgeCheck} title="Reputation Engine" />
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Identity">
          <input className="input" value={identityId} onChange={(event) => setIdentityId(event.target.value)} />
        </Field>
        <button className="secondary-button" onClick={() => void loadReputation(false)} disabled={!identityId}>
          <RefreshCw size={16} />
          Load
        </button>
        <button className="primary-button" onClick={() => void loadReputation(true)} disabled={!identityId}>
          <BadgeCheck size={16} />
          Recompute
        </button>
      </div>
      {reputation ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Score" value={reputation.score.score} />
            <Metric label="Events" value={reputation.events.length} />
            <div className="rounded border border-ink/10 p-4">
              <p className="text-[11px] uppercase text-ink/45">Tier</p>
              <p className="mt-1 text-3xl font-semibold text-signal">{reputation.score.tier}</p>
            </div>
          </div>
          <ObjectList
            empty="No reputation events yet."
            items={reputation.events}
            getTitle={(event) => `${event.delta > 0 ? "+" : ""}${event.delta} / ${event.reason}`}
            getSubtitle={(event) => event.source_id ?? event.id}
          />
          <JsonBlock value={reputation} />
        </div>
      ) : null}
    </div>
  );
}

function SearchPanel({
  searchResponse,
  setSearchResponse,
  runAction,
}: {
  searchResponse: SearchResponse | null;
  setSearchResponse: (response: SearchResponse) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [query, setQuery] = useState("omnia");

  async function search() {
    const response = await runAction(
      () => omniaFetch<SearchResponse>(`/v1/search?q=${encodeURIComponent(query)}`),
      "Global search complete."
    );
    if (response) {
      setSearchResponse(response);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={Network} title="Global Runtime Search" />
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Query">
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <button className="primary-button" onClick={() => void search()} disabled={!query.trim()}>
          <Network size={16} />
          Search
        </button>
      </div>
      <ObjectList
        empty="No search results yet."
        items={searchResponse?.results ?? []}
        getTitle={(result) => `${result.category} / ${result.label}`}
        getSubtitle={(result) => `${result.id} - ${result.summary}`}
      />
      {searchResponse ? <JsonBlock value={searchResponse} /> : null}
    </div>
  );
}

function StreamPanel({
  streamSnapshot,
  setStreamSnapshot,
  runAction,
}: {
  streamSnapshot: string;
  setStreamSnapshot: (snapshot: string) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  async function readStream() {
    await runAction(async () => {
      const response = await fetch(`${API_BASE}/v1/ops/stream`);
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || `OMNIA stream error ${response.status}`);
      }
      setStreamSnapshot(text);
      return text;
    }, "SSE stream snapshot loaded.");
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={Activity} title="Runtime Event Stream" />
      <button className="primary-button" onClick={() => void readStream()}>
        <Activity size={16} />
        Read stream
      </button>
      {streamSnapshot ? (
        <pre className="max-h-[34rem] overflow-auto rounded border border-ink/10 bg-ink p-4 text-xs leading-relaxed text-white">
          {streamSnapshot}
        </pre>
      ) : (
        <p className="text-sm text-ink/60">No stream snapshot loaded yet.</p>
      )}
    </div>
  );
}

function DomainsPanel({
  identity,
  domains,
  templates,
  domainAction,
  setTemplates,
  setDomainAction,
  setPact,
  runAction,
}: {
  identity: Identity | null;
  domains: DomainModule[];
  templates: DomainActionTemplate[];
  domainAction: DomainActionResponse | null;
  setTemplates: (templates: DomainActionTemplate[]) => void;
  setDomainAction: (response: DomainActionResponse) => void;
  setPact: (pact: Pact) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [domainId, setDomainId] = useState("economy");
  const [templateId, setTemplateId] = useState("");
  const [actionType, setActionType] = useState("trade.create");
  const [target, setTarget] = useState("omnia:org:civilization-node");
  const [payloadJson, setPayloadJson] = useState(
    '{"asset":"OMN","amount":250,"purpose":"civilization operating layer"}'
  );

  useEffect(() => {
    const selected = templates.find((template) => template.id === templateId);
    if (selected) {
      setActionType(selected.action_type);
    }
  }, [templateId, templates]);

  async function loadTemplates(nextDomainId = domainId) {
    const loaded = await runAction(
      () => omniaFetch<DomainActionTemplate[]>(`/v1/domains/${nextDomainId}/actions`),
      "Domain action templates loaded."
    );
    if (loaded) {
      setTemplates(loaded);
      if (loaded[0]) {
        setTemplateId(loaded[0].id);
        setActionType(loaded[0].action_type);
      }
    }
  }

  async function createAction() {
    if (!identity) {
      return;
    }
    const response = await runAction(
      () =>
        omniaFetch<DomainActionResponse>(`/v1/domains/${domainId}/actions`, {
          method: "POST",
          body: JSON.stringify({
            actor: identity.id,
            target,
            action_type: actionType,
            template_id: templateId || null,
            payload: parseJsonField(payloadJson, {}),
          }),
        }),
      "Domain action created with backing PACT."
    );
    if (response) {
      setDomainAction(response);
      setPact(response.pact);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={Network} title="Civilization Domains" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {domains.map((domain) => (
          <button
            key={domain.id}
            className={`rounded border p-4 text-left transition ${
              domain.id === domainId ? "border-ink bg-ink text-white" : "border-ink/10 hover:border-ink/30"
            }`}
            onClick={() => {
              setDomainId(domain.id);
              void loadTemplates(domain.id);
            }}
          >
            <p className="font-semibold">{domain.label}</p>
            <p className={`mt-2 text-xs ${domain.id === domainId ? "text-white/70" : "text-ink/55"}`}>
              {domain.description}
            </p>
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Domain">
          <select
            className="input"
            value={domainId}
            onChange={(event) => {
              setDomainId(event.target.value);
              void loadTemplates(event.target.value);
            }}
          >
            {domains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {domain.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Template">
          <select className="input" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            <option value="">Custom action</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Action type">
          <input className="input" value={actionType} onChange={(event) => setActionType(event.target.value)} />
        </Field>
        <Field label="Target">
          <input className="input" value={target} onChange={(event) => setTarget(event.target.value)} />
        </Field>
      </div>
      <Field label="Domain payload JSON">
        <textarea className="textarea" value={payloadJson} onChange={(event) => setPayloadJson(event.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <button className="secondary-button" onClick={() => void loadTemplates()}>
          <RefreshCw size={16} />
          Load templates
        </button>
        <button className="primary-button" onClick={() => void createAction()} disabled={!identity}>
          <SquarePen size={16} />
          Create domain action
        </button>
      </div>
      {domainAction ? <JsonBlock value={domainAction} /> : null}
    </div>
  );
}

function LedgerPanel({
  identity,
  pact,
  accounts,
  assets,
  statement,
  hold,
  transfer,
  tokenIssuance,
  setAccounts,
  setStatement,
  setHold,
  setTransfer,
  setTokenIssuance,
  runAction,
}: {
  identity: Identity | null;
  pact: Pact | null;
  accounts: LedgerAccount[];
  assets: LedgerAsset[];
  statement: LedgerStatement | null;
  hold: LedgerHold | null;
  transfer: LedgerTransferResponse | null;
  tokenIssuance: TokenIssuanceResponse | null;
  setAccounts: (accounts: LedgerAccount[]) => void;
  setStatement: (statement: LedgerStatement) => void;
  setHold: (hold: LedgerHold) => void;
  setTransfer: (transfer: LedgerTransferResponse) => void;
  setTokenIssuance: (issuance: TokenIssuanceResponse) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [label, setLabel] = useState("main");
  const [initialBalance, setInitialBalance] = useState(100000);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [creditAccount, setCreditAccount] = useState("");
  const [advancedAmount, setAdvancedAmount] = useState(100);
  const [holdReason, setHoldReason] = useState("escrow for signed PACT");

  useEffect(() => {
    if (!selectedAccount && accounts[0]?.id) {
      setSelectedAccount(accounts[0].id);
    }
    if (!creditAccount && accounts[1]?.id) {
      setCreditAccount(accounts[1].id);
    }
  }, [accounts, creditAccount, selectedAccount]);

  async function createAccount() {
    if (!identity) {
      return;
    }
    const account = await runAction(
      () =>
        omniaFetch<LedgerAccount>("/v1/ledger/accounts", {
          method: "POST",
          body: JSON.stringify({
            owner: identity.id,
            asset_id: "asset:omn",
            label,
            initial_balance: initialBalance,
          }),
        }),
      "Ledger account created."
    );
    if (account) {
      setAccounts([account, ...accounts]);
    }
  }

  async function refreshAccounts() {
    const loaded = await runAction(
      () => omniaFetch<LedgerAccount[]>("/v1/ledger/accounts?limit=30"),
      "Ledger accounts refreshed."
    );
    if (loaded) {
      setAccounts(loaded);
    }
  }

  async function loadStatement(accountId = selectedAccount) {
    if (!accountId) {
      return;
    }
    const loaded = await runAction(
      () => omniaFetch<LedgerStatement>(`/v1/ledger/accounts/${accountId}/statement?limit=40`),
      "Ledger statement loaded."
    );
    if (loaded) {
      setStatement(loaded);
      setSelectedAccount(loaded.account.id);
    }
  }

  async function issueSandboxToken() {
    if (!identity || !selectedAccount) {
      return;
    }
    const issued = await runAction(
      () =>
        omniaFetch<TokenIssuanceResponse>("/v1/token/issue", {
          method: "POST",
          body: JSON.stringify({
            issuer: identity.id,
            account_id: selectedAccount,
            amount: advancedAmount,
            memo: "dashboard sandbox issuance",
          }),
        }),
      "Sandbox OMN issued."
    );
    if (issued) {
      setTokenIssuance(issued);
      setAccounts(accounts.map((account) => (account.id === issued.account.id ? issued.account : account)));
    }
  }

  async function createHold() {
    if (!pact || !selectedAccount) {
      return;
    }
    const created = await runAction(
      () =>
        omniaFetch<LedgerHold>("/v1/ledger/holds", {
          method: "POST",
          body: JSON.stringify({
            account_id: selectedAccount,
            pact_id: pact.id,
            amount: advancedAmount,
            reason: holdReason,
          }),
        }),
      "Ledger hold created."
    );
    if (created) {
      setHold(created);
    }
  }

  async function releaseHold() {
    if (!hold) {
      return;
    }
    const released = await runAction(
      () => omniaFetch<LedgerHold>(`/v1/ledger/holds/${hold.id}/release`, { method: "POST" }),
      "Ledger hold released."
    );
    if (released) {
      setHold(released);
    }
  }

  async function createTransfer() {
    if (!pact || !selectedAccount || !creditAccount) {
      return;
    }
    const response = await runAction(
      () =>
        omniaFetch<LedgerTransferResponse>("/v1/ledger/transfers", {
          method: "POST",
          body: JSON.stringify({
            debit_account_id: selectedAccount,
            credit_account_id: creditAccount,
            pact_id: pact.id,
            amount: advancedAmount,
            memo: "dashboard direct transfer",
          }),
        }),
      "Double-entry transfer posted."
    );
    if (response) {
      setTransfer(response);
      setAccounts(
        accounts.map((account) => {
          if (account.id === response.debit_statement.account.id) return response.debit_statement.account;
          if (account.id === response.credit_statement.account.id) return response.credit_statement.account;
          return account;
        })
      );
      setStatement(response.debit_statement);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={BadgeCheck} title="OMNIA Ledger" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Owner">
          <input className="input" value={identity?.id ?? ""} readOnly />
        </Field>
        <Field label="Label">
          <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
        </Field>
        <Field label="Initial OMN">
          <input
            className="input"
            type="number"
            value={initialBalance}
            onChange={(event) => setInitialBalance(Number(event.target.value))}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void createAccount()} disabled={!identity}>
          <BadgeCheck size={16} />
          Create account
        </button>
        <button className="secondary-button" onClick={() => void refreshAccounts()}>
          <RefreshCw size={16} />
          Refresh
        </button>
        <button className="secondary-button" onClick={() => void loadStatement()} disabled={!selectedAccount}>
          <FileCheck2 size={16} />
          Statement
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {assets.map((asset) => (
          <div key={asset.id} className="rounded border border-ink/10 p-4">
            <p className="text-[11px] uppercase text-ink/45">{asset.symbol}</p>
            <p className="mt-1 font-semibold text-ink">{asset.name}</p>
            <p className="mt-2 text-xs text-ink/55">{asset.sandbox ? "sandbox asset" : "external asset"}</p>
          </div>
        ))}
      </div>
      <section className="rounded border border-ink/10 p-4">
        <h3 className="font-semibold text-ink">Advanced Sandbox Ledger</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Debit / escrow account">
            <select className="input" value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}>
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label} - {account.balance} OMN
                </option>
              ))}
            </select>
          </Field>
          <Field label="Credit account">
            <select className="input" value={creditAccount} onChange={(event) => setCreditAccount(event.target.value)}>
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label} - {account.owner}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Signed PACT">
            <input className="input" value={pact?.id ?? ""} readOnly />
          </Field>
          <Field label="Amount">
            <input className="input" type="number" value={advancedAmount} onChange={(event) => setAdvancedAmount(Number(event.target.value))} />
          </Field>
        </div>
        <Field label="Hold reason">
          <input className="input" value={holdReason} onChange={(event) => setHoldReason(event.target.value)} />
        </Field>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="secondary-button" onClick={() => void issueSandboxToken()} disabled={!identity || !selectedAccount}>
            <BadgeCheck size={16} />
            Issue OMN
          </button>
          <button className="secondary-button" onClick={() => void createHold()} disabled={!pact || !selectedAccount}>
            <ShieldCheck size={16} />
            Create hold
          </button>
          <button className="secondary-button" onClick={() => void releaseHold()} disabled={!hold}>
            <RefreshCw size={16} />
            Release hold
          </button>
          <button className="primary-button" onClick={() => void createTransfer()} disabled={!pact || !selectedAccount || !creditAccount}>
            <BadgeCheck size={16} />
            Transfer
          </button>
        </div>
      </section>
      {hold ? <JsonBlock value={hold} /> : null}
      {tokenIssuance ? <JsonBlock value={tokenIssuance} /> : null}
      {transfer ? <JsonBlock value={transfer} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((account) => (
          <button
            key={account.id}
            className={`rounded border p-4 text-left transition ${
              selectedAccount === account.id ? "border-signal bg-signal/5" : "border-ink/10 hover:border-ink/30"
            }`}
            onClick={() => void loadStatement(account.id)}
          >
            <p className="font-medium text-ink">{account.label}</p>
            <p className="mt-1 break-all font-mono text-xs text-ink/50">{account.id}</p>
            <p className="mt-3 text-3xl font-semibold text-signal">{account.balance} OMN</p>
            <p className="mt-1 break-all text-xs text-ink/55">{account.owner}</p>
          </button>
        ))}
      </div>
      {statement ? (
        <div className="space-y-3 rounded border border-ink/10 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Credits" value={statement.credits} compact />
            <Metric label="Debits" value={statement.debits} compact />
            <Metric label="Net" value={statement.net} compact />
          </div>
          <div className="space-y-2">
            {statement.entries.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-ink/[0.03] px-3 py-2">
                <div>
                  <p className="font-medium text-ink">{entry.direction}</p>
                  <p className="break-all font-mono text-xs text-ink/45">{entry.transfer_id ?? "initial-credit"}</p>
                </div>
                <p className={entry.direction === "credit" ? "font-semibold text-signal" : "font-semibold text-ember"}>
                  {entry.direction === "credit" ? "+" : "-"}
                  {entry.amount} OMN
                </p>
              </div>
            ))}
            {!statement.entries.length ? <p className="text-sm text-ink/60">No ledger entries yet.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PaymentsPanel({
  pact,
  accounts,
  payment,
  payments,
  executedPayment,
  setPayment,
  setPayments,
  setExecutedPayment,
  runAction,
}: {
  pact: Pact | null;
  accounts: LedgerAccount[];
  payment: PaymentIntent | null;
  payments: PaymentIntent[];
  executedPayment: ExecutePaymentResponse | null;
  setPayment: (payment: PaymentIntent) => void;
  setPayments: (payments: PaymentIntent[]) => void;
  setExecutedPayment: (response: ExecutePaymentResponse) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [payer, setPayer] = useState("");
  const [payee, setPayee] = useState("");
  const [amount, setAmount] = useState(250);

  useEffect(() => {
    if (!payer && accounts[0]?.id) setPayer(accounts[0].id);
    if (!payee && accounts[1]?.id) setPayee(accounts[1].id);
  }, [accounts, payee, payer]);

  async function createIntent() {
    if (!pact) {
      return;
    }
    const created = await runAction(
      () =>
        omniaFetch<PaymentIntent>("/v1/payments/intents", {
          method: "POST",
          body: JSON.stringify({
            payer_account_id: payer,
            payee_account_id: payee,
            pact_id: pact.id,
            amount,
            memo: "OMNIA v0.5 sandbox settlement",
          }),
        }),
      "Payment intent created."
    );
    if (created) {
      setPayment(created);
      setPayments([created, ...payments]);
    }
  }

  async function executeIntent() {
    if (!payment) {
      return;
    }
    const response = await runAction(
      () => omniaFetch<ExecutePaymentResponse>(`/v1/payments/${payment.id}/execute`, { method: "POST" }),
      "Sandbox payment executed."
    );
    if (response) {
      setExecutedPayment(response);
      setPayment(response.payment);
      setPayments(payments.map((item) => (item.id === response.payment.id ? response.payment : item)));
    }
  }

  async function rejectIntent() {
    if (!payment) {
      return;
    }
    const response = await runAction(
      () =>
        omniaFetch<ExecutePaymentResponse>(`/v1/payments/${payment.id}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason: "rejected from dashboard" }),
        }),
      "Sandbox payment rejected."
    );
    if (response) {
      setExecutedPayment(response);
      setPayment(response.payment);
      setPayments(payments.map((item) => (item.id === response.payment.id ? response.payment : item)));
    }
  }

  async function refreshPayments() {
    const loaded = await runAction(
      () => omniaFetch<PaymentIntent[]>("/v1/payments/intents?limit=30"),
      "Payment intents refreshed."
    );
    if (loaded) {
      setPayments(loaded);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle icon={ShieldCheck} title="Sandbox Payments" />
        <button className="secondary-button" onClick={() => void refreshPayments()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Payer account">
          <select className="input" value={payer} onChange={(event) => setPayer(event.target.value)}>
            <option value="">Select payer</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label} - {account.balance} OMN
              </option>
            ))}
          </select>
        </Field>
        <Field label="Payee account">
          <select className="input" value={payee} onChange={(event) => setPayee(event.target.value)}>
            <option value="">Select payee</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label} - {account.owner}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Signed PACT">
          <input className="input" value={pact?.id ?? ""} readOnly />
        </Field>
        <Field label="Amount">
          <input className="input" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void createIntent()} disabled={!pact || !payer || !payee}>
          <SquarePen size={16} />
          Create intent
        </button>
        <button className="secondary-button" onClick={() => void executeIntent()} disabled={!payment}>
          <BadgeCheck size={16} />
          Execute
        </button>
        <button className="danger-button" onClick={() => void rejectIntent()} disabled={!payment}>
          <XCircle size={16} />
          Reject
        </button>
      </div>
      {payment ? <JsonBlock value={payment} /> : null}
      {executedPayment ? <JsonBlock value={executedPayment} /> : null}
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">Payment Intents</h3>
        <ObjectList
          empty="No payment intents yet."
          items={payments}
          getTitle={(intent) => `${intent.status} / ${intent.amount} ${intent.asset_id}`}
          getSubtitle={(intent) => intent.id}
        />
      </div>
    </div>
  );
}

function AgentsPanel({
  identity,
  mandates,
  agents,
  tasks,
  agentRun,
  agentTask,
  agentTaskRun,
  agentRuns,
  setAgents,
  setMandates,
  setAgentRuns,
  setAgentRun,
  setTasks,
  setAgentTask,
  setAgentTaskRun,
  runAction,
}: {
  identity: Identity | null;
  mandates: Mandate[];
  agents: AgentProfile[];
  tasks: AgentTask[];
  agentRun: AgentRunResponse | null;
  agentTask: AgentTaskResponse | null;
  agentTaskRun: AgentTaskRunResponse | null;
  agentRuns: AgentRun[];
  setAgents: (agents: AgentProfile[]) => void;
  setMandates: (mandates: Mandate[]) => void;
  setAgentRuns: (runs: AgentRun[]) => void;
  setAgentRun: (response: AgentRunResponse) => void;
  setTasks: (tasks: AgentTask[]) => void;
  setAgentTask: (response: AgentTaskResponse) => void;
  setAgentTaskRun: (response: AgentTaskRunResponse) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [agentId, setAgentId] = useState("");
  const [mandateId, setMandateId] = useState("");
  const [action, setAction] = useState("compare_prices");
  const [taskId, setTaskId] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(true);

  useEffect(() => {
    if (!agentId && agents[0]?.id) setAgentId(agents[0].id);
    if (!mandateId && mandates[0]?.id) setMandateId(mandates[0].id);
    if (!taskId && tasks[0]?.id) setTaskId(tasks[0].id);
  }, [agentId, agents, mandateId, mandates, taskId, tasks]);

  async function createAgentWithMandate() {
    if (!identity) return;
    const agent = await runAction(
      () =>
        omniaFetch<AgentProfile>("/v1/agents", {
          method: "POST",
          body: JSON.stringify({
            label: "OMNIA Civilization Agent",
            model: "omnia-policy-agent-v0.5",
            capabilities: { can: ["compare_prices", "negotiate_terms"] },
          }),
        }),
      "Agent profile created."
    );
    if (!agent) return;
    setAgents([agent, ...agents]);
    setAgentId(agent.id);

    const mandate = await runAction(
      () =>
        omniaFetch<Mandate>("/v1/mandates", {
          method: "POST",
          body: JSON.stringify({
            principal: identity.id,
            agent: agent.identity_id,
            scope: { can: ["compare_prices", "negotiate_terms"], cannot: ["sign_contract"] },
            expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          }),
        }),
      "Agent mandate created."
    );
    if (mandate) {
      setMandates([mandate, ...mandates]);
      setMandateId(mandate.id);
    }
  }

  async function runAgent() {
    const response = await runAction(
      () =>
        omniaFetch<AgentRunResponse>(`/v1/agents/${agentId}/runs`, {
          method: "POST",
          body: JSON.stringify({
            mandate_id: mandateId,
            action,
            input: { risk: action === "sign_contract" ? "high" : "low", surface: "dashboard" },
          }),
        }),
      "Agent run evaluated."
    );
    if (response) {
      setAgentRun(response);
      setAgentRuns([response.run, ...agentRuns]);
    }
  }

  async function refreshRuns() {
    const [runs, loadedTasks] = await Promise.allSettled([
      runAction(() => omniaFetch<AgentRun[]>("/v1/ops/agent-runs?limit=30"), "Agent runs refreshed."),
      runAction(() => omniaFetch<AgentTask[]>("/v1/agent-tasks?limit=30"), "Agent tasks refreshed."),
    ]);
    if (runs.status === "fulfilled" && runs.value) {
      setAgentRuns(runs.value);
    }
    if (loadedTasks.status === "fulfilled" && loadedTasks.value) {
      setTasks(loadedTasks.value);
    }
  }

  async function createTask() {
    const response = await runAction(
      () =>
        omniaFetch<AgentTaskResponse>("/v1/agent-tasks", {
          method: "POST",
          body: JSON.stringify({
            agent_id: agentId,
            mandate_id: mandateId,
            action,
            input: {
              surface: "dashboard",
              risk: action.includes("sign") || action.includes("transfer") ? "high" : "low",
            },
            requires_approval: requiresApproval,
          }),
        }),
      "Agent task queued."
    );
    if (response) {
      setAgentTask(response);
      setTasks([response.task, ...tasks.filter((task) => task.id !== response.task.id)]);
      setTaskId(response.task.id);
    }
  }

  async function approveTask() {
    if (!identity || !taskId) {
      return;
    }
    const response = await runAction(
      () =>
        omniaFetch<AgentTask>(`/v1/agent-tasks/${taskId}/approve`, {
          method: "POST",
          body: JSON.stringify({ approved_by: identity.id }),
        }),
      "Agent task approved."
    );
    if (response) {
      setTasks(tasks.map((task) => (task.id === response.id ? response : task)));
    }
  }

  async function runTask() {
    if (!taskId) {
      return;
    }
    const response = await runAction(
      () => omniaFetch<AgentTaskRunResponse>(`/v1/agent-tasks/${taskId}/run`, { method: "POST" }),
      "Agent task executed under supervision."
    );
    if (response) {
      setAgentTaskRun(response);
      setTasks(tasks.map((task) => (task.id === response.task.id ? response.task : task)));
      setAgentRuns([response.run, ...agentRuns]);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle icon={Bot} title="Mandated Agents" />
        <button className="secondary-button" onClick={() => void refreshRuns()}>
          <RefreshCw size={16} />
          Refresh runs
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Agent">
          <select className="input" value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            <option value="">Select agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mandate">
          <select className="input" value={mandateId} onChange={(event) => setMandateId(event.target.value)}>
            <option value="">Select mandate</option>
            {mandates.map((mandate) => (
              <option key={mandate.id} value={mandate.id}>
                {mandate.id}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Action">
          <input className="input" value={action} onChange={(event) => setAction(event.target.value)} />
        </Field>
        <Field label="Queued task">
          <select className="input" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
            <option value="">Select task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.action} / {task.status}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input type="checkbox" checked={requiresApproval} onChange={(event) => setRequiresApproval(event.target.checked)} />
        Require human approval before execution
      </label>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void createAgentWithMandate()} disabled={!identity}>
          <Bot size={16} />
          Create agent + mandate
        </button>
        <button className="secondary-button" onClick={() => void runAgent()} disabled={!agentId || !mandateId}>
          <ShieldCheck size={16} />
          Run agent
        </button>
        <button className="secondary-button" onClick={() => void createTask()} disabled={!agentId || !mandateId}>
          <SquarePen size={16} />
          Queue task
        </button>
        <button className="secondary-button" onClick={() => void approveTask()} disabled={!identity || !taskId}>
          <BadgeCheck size={16} />
          Approve task
        </button>
        <button className="primary-button" onClick={() => void runTask()} disabled={!taskId}>
          <Activity size={16} />
          Run task
        </button>
      </div>
      {agentRun ? <JsonBlock value={agentRun} /> : null}
      {agentTask ? <JsonBlock value={agentTask} /> : null}
      {agentTaskRun ? <JsonBlock value={agentTaskRun} /> : null}
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">Supervised Task Queue</h3>
        <ObjectList
          empty="No agent tasks yet."
          items={tasks}
          getTitle={(task) => `${task.action} / ${task.status} / ${task.policy_decision}`}
          getSubtitle={(task) => task.id}
        />
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold text-ink">Run History</h3>
        <ObjectList
          empty="No agent runs yet."
          items={agentRuns}
          getTitle={(run) => `${run.action} / ${run.status} / ${run.policy_decision}`}
          getSubtitle={(run) => run.id}
        />
      </div>
    </div>
  );
}

function SecurityPanel({
  identity,
  challenge,
  credential,
  credentials,
  authSession,
  signedVerification,
  policyDecision,
  auditEvents,
  setChallenge,
  setCredential,
  setCredentials,
  setAuthSession,
  setSignedVerification,
  setPolicyDecision,
  runAction,
}: {
  identity: Identity | null;
  challenge: AuthChallenge | null;
  credential: Credential | null;
  credentials: Credential[];
  authSession: AuthSession | null;
  signedVerification: SignedRequestVerification | null;
  policyDecision: PolicyDecision | null;
  auditEvents: AuditEvent[];
  setChallenge: (challenge: AuthChallenge) => void;
  setCredential: (credential: Credential) => void;
  setCredentials: (credentials: Credential[]) => void;
  setAuthSession: (session: AuthSession) => void;
  setSignedVerification: (verification: SignedRequestVerification) => void;
  setPolicyDecision: (decision: PolicyDecision) => void;
  runAction: <T>(action: () => Promise<T>, success: string) => Promise<T | null>;
}) {
  const [policyAction, setPolicyAction] = useState("compare_prices");
  const [deleteCredentialId, setDeleteCredentialId] = useState("");

  async function startPasskey() {
    if (!identity) return;
    const response = await runAction(
      () =>
        omniaFetch<AuthChallenge>("/v1/auth/passkeys/register/start", {
          method: "POST",
          body: JSON.stringify({ identity_id: identity.id }),
        }),
      "Passkey registration challenge created."
    );
    if (response) {
      setChallenge(response);
    }
  }

  async function finishPasskey() {
    if (!identity || !challenge) return;
    const response = await runAction(
      () =>
        omniaFetch<Credential>("/v1/auth/passkeys/register/finish", {
          method: "POST",
          body: JSON.stringify({
            challenge_id: challenge.id,
            identity_id: identity.id,
            credential_id: `passkey-${identity.id.slice(-8)}-${Date.now()}`,
            public_key: identity.public_key,
            transports: ["internal", "dev-sandbox"],
          }),
        }),
      "Passkey credential stored."
    );
    if (response) {
      setCredential(response);
    }
  }

  async function evaluateSecurityPolicy() {
    const decision = await runAction(
      () =>
        omniaFetch<PolicyDecision>("/v1/policies/evaluate", {
          method: "POST",
          body: JSON.stringify({
            subject_id: identity?.id ?? "omnia:anonymous",
            action: policyAction,
            resource: "omnia:v0.5",
            context: {
              risk: policyAction === "sign_contract" ? "high" : "low",
              sensitivity: policyAction === "health.raw" ? "medical_raw" : "standard",
            },
          }),
        }),
      "Security policy evaluated."
    );
    if (decision) {
      setPolicyDecision(decision);
    }
  }

  async function createDevSession() {
    if (!identity) return;
    const session = await runAction(
      () =>
        omniaFetch<AuthSession>("/v1/auth/sessions/dev", {
          method: "POST",
          body: JSON.stringify({ identity_id: identity.id, ttl_seconds: 86_400 }),
        }),
      "Dev session created."
    );
    if (session) {
      setAuthSession(session);
    }
  }

  async function refreshCredentials() {
    const loaded = await runAction(
      () =>
        omniaFetch<Credential[]>(
          `/v1/auth/credentials${identity?.id ? `?identity=${encodeURIComponent(identity.id)}` : ""}`
        ),
      "Credentials refreshed."
    );
    if (loaded) {
      setCredentials(loaded);
      if (loaded[0]) {
        setDeleteCredentialId(loaded[0].id);
      }
    }
  }

  async function deleteCredential() {
    if (!deleteCredentialId) return;
    await runAction(
      () => omniaFetch<{ deleted: boolean; id: string }>(`/v1/auth/credentials/${deleteCredentialId}`, { method: "DELETE" }),
      "Credential revoked."
    );
    setCredentials(credentials.filter((item) => item.id !== deleteCredentialId));
    setDeleteCredentialId("");
  }

  async function verifySignedRequestDemo() {
    if (!identity) return;
    const verification = await runAction(
      () =>
        omniaFetch<SignedRequestVerification>("/v1/auth/signed-requests/verify", {
          method: "POST",
          body: JSON.stringify({
            identity_id: identity.id,
            nonce: `dashboard-${Date.now()}`,
            payload: { action: policyAction, resource: "omnia:v0.7" },
            signature: "dev-demo-invalid-signature",
            created_at: new Date().toISOString(),
          }),
        }),
      "Signed request checked."
    );
    if (verification) {
      setSignedVerification(verification);
    }
  }

  return (
    <div className="space-y-5">
      <PanelTitle icon={KeyRound} title="Security And Audit" />
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" onClick={() => void startPasskey()} disabled={!identity}>
          <KeyRound size={16} />
          Start passkey
        </button>
        <button className="secondary-button" onClick={() => void finishPasskey()} disabled={!identity || !challenge}>
          <BadgeCheck size={16} />
          Finish passkey
        </button>
        <button className="secondary-button" onClick={() => void createDevSession()} disabled={!identity}>
          <Activity size={16} />
          Dev session
        </button>
        <button className="secondary-button" onClick={() => void refreshCredentials()}>
          <RefreshCw size={16} />
          Credentials
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Policy action">
          <input className="input" value={policyAction} onChange={(event) => setPolicyAction(event.target.value)} />
        </Field>
      </div>
      <button className="secondary-button" onClick={() => void evaluateSecurityPolicy()}>
        <ShieldCheck size={16} />
        Evaluate policy
      </button>
      <div className="flex flex-wrap gap-3">
        <button className="secondary-button" onClick={() => void verifySignedRequestDemo()} disabled={!identity}>
          <ShieldCheck size={16} />
          Verify signed request
        </button>
        <select className="input max-w-md" value={deleteCredentialId} onChange={(event) => setDeleteCredentialId(event.target.value)}>
          <option value="">Select credential to revoke</option>
          {credentials.map((item) => (
            <option key={item.id} value={item.id}>
              {item.credential_id}
            </option>
          ))}
        </select>
        <button className="danger-button" onClick={() => void deleteCredential()} disabled={!deleteCredentialId}>
          <XCircle size={16} />
          Revoke credential
        </button>
      </div>
      {challenge ? <JsonBlock value={challenge} /> : null}
      {credential ? <JsonBlock value={credential} /> : null}
      {authSession ? <JsonBlock value={authSession} /> : null}
      {signedVerification ? <JsonBlock value={signedVerification} /> : null}
      <ObjectList
        empty="No credentials yet."
        items={credentials}
        getTitle={(item) => `${item.credential_type} / ${item.credential_id}`}
        getSubtitle={(item) => item.id}
      />
      {policyDecision ? <JsonBlock value={policyDecision} /> : null}
      <ObjectList
        empty="No audit events yet."
        items={auditEvents}
        getTitle={(event) => `${event.event_type} ${event.decision ? `(${event.decision})` : ""}`}
        getSubtitle={(event) => event.subject_id}
      />
    </div>
  );
}

function TrustGraphPanel({
  graph,
  refreshTrustGraph,
}: {
  graph: TrustGraph | null;
  refreshTrustGraph: () => Promise<void>;
}) {
  const nodesById = useMemo(() => {
    const map = new Map<string, string>();
    graph?.nodes.forEach((node) => map.set(node.id, node.label));
    return map;
  }, [graph]);
  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    graph?.nodes.forEach((node) => counts.set(node.type, (counts.get(node.type) ?? 0) + 1));
    return Array.from(counts.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [graph]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle icon={Network} title="Trust Graph" />
        <button className="secondary-button" onClick={() => void refreshTrustGraph()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {graph ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Nodes" value={graph.nodes.length} />
            <Metric label="Edges" value={graph.edges.length} />
            <Metric label="Types" value={typeCounts.length} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {typeCounts.map(([type, count]) => (
              <div key={type} className="rounded border border-ink/10 p-4">
                <p className="text-[11px] uppercase text-ink/45">{type}</p>
                <p className="mt-1 text-2xl font-semibold text-ink">{count}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {graph.edges.slice(0, 18).map((edge, index) => (
              <div key={`${edge.from}-${edge.to}-${index}`} className="rounded border border-ink/10 p-4">
                <p className="text-sm font-medium text-ink">{edge.type}</p>
                <p className="mt-2 break-all font-mono text-xs text-ink/55">
                  {nodesById.get(edge.from) ?? edge.from}
                  {" -> "}
                  {nodesById.get(edge.to) ?? edge.to}
                </p>
              </div>
            ))}
            {!graph.edges.length ? <p className="text-sm text-ink/60">No graph edges yet.</p> : null}
          </div>
          <JsonBlock value={graph} />
        </div>
      ) : (
        <p className="text-sm text-ink/60">Trust graph unavailable.</p>
      )}
    </div>
  );
}

function EventsPanel({ events, refreshEvents }: { events: EventLog[]; refreshEvents: () => Promise<void> }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <PanelTitle icon={History} title="Protocol Event Log" />
        <button className="secondary-button" onClick={() => void refreshEvents()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="rounded border border-ink/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium text-ink">{event.event_type}</p>
              <p className="text-xs text-ink/50">{new Date(event.created_at).toLocaleString()}</p>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-ink/50">{event.subject_id}</p>
          </div>
        ))}
        {!events.length ? <p className="text-sm text-ink/60">No events yet.</p> : null}
      </div>
    </div>
  );
}

function ProtocolState({
  identity,
  pact,
  verification,
  network,
  trustGraph,
}: {
  identity: Identity | null;
  pact: Pact | null;
  verification: VerifyPactResponse | null;
  network: NetworkStatus | null;
  trustGraph: TrustGraph | null;
}) {
  const status = verification?.status ?? pact?.status ?? "draft";
  const stateColor = useMemo(() => {
    if (status === "active") return "text-signal";
    if (status === "revoked" || status === "invalid") return "text-red-700";
    if (status === "expired") return "text-ember";
    return "text-ink/60";
  }, [status]);

  return (
    <aside className="rounded border border-ink/10 bg-white p-5 shadow-panel">
      <h2 className="text-lg font-semibold text-ink">Live Protocol State</h2>
      <div className="mt-5 space-y-4">
        <StateLine label="Identity" value={identity?.id ?? "not created"} />
        <StateLine label="PACT" value={pact?.id ?? "not created"} />
        <StateLine label="Signature" value={pact?.signature ? "present" : "missing"} />
        <div className="rounded border border-ink/10 p-4">
          <p className="text-xs uppercase text-ink/50">Status</p>
          <p className={`mt-1 text-2xl font-semibold ${stateColor}`}>{status}</p>
        </div>
        {verification ? <VerificationResult verification={verification} compact /> : null}
        {network ? (
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Identities" value={network.identities} compact />
            <Metric label="PACTs" value={network.pacts} compact />
            <Metric label="Proofs" value={network.proofs} compact />
            <Metric label="Events" value={network.events} compact />
          </div>
        ) : null}
        {trustGraph ? (
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Graph nodes" value={trustGraph.nodes.length} compact />
            <Metric label="Graph edges" value={trustGraph.edges.length} compact />
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function VerificationResult({
  verification,
  compact = false,
}: {
  verification: VerifyPactResponse;
  compact?: boolean;
}) {
  return (
    <div className="rounded border border-ink/10 bg-ink/[0.03] p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className={verification.valid ? "text-signal" : "text-ember"} />
        <p className="font-medium text-ink">{verification.valid ? "Valid PACT" : "Not valid"}</p>
      </div>
      <div className={`mt-4 grid gap-2 ${compact ? "text-xs" : "sm:grid-cols-2 text-sm"}`}>
        <StatusBit label="Status" value={verification.status} />
        <StatusBit label="Hash" value={verification.hash_matches ? "match" : "mismatch"} />
        <StatusBit label="Signature" value={verification.signature_valid ? "valid" : "invalid"} />
        <StatusBit label="Revoked" value={verification.revoked ? "yes" : "no"} />
      </div>
      {verification.reasons.length ? (
        <ul className="mt-3 list-disc pl-5 text-sm text-ink/65">
          {verification.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ObjectList<T>({
  items,
  empty,
  getTitle,
  getSubtitle,
}: {
  items: T[];
  empty: string;
  getTitle: (item: T) => string;
  getSubtitle: (item: T) => string;
}) {
  if (!items.length) {
    return <p className="text-sm text-ink/60">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${getSubtitle(item)}-${index}`} className="rounded border border-ink/10 p-4">
          <p className="break-all font-medium text-ink">{getTitle(item)}</p>
          <p className="mt-1 break-all font-mono text-xs text-ink/50">{getSubtitle(item)}</p>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: number; compact?: boolean }) {
  return (
    <div className={`rounded border border-ink/10 bg-white ${compact ? "p-3" : "p-4"}`}>
      <p className="text-[11px] uppercase text-ink/45">{label}</p>
      <p className={`${compact ? "text-lg" : "text-3xl"} mt-1 font-semibold text-ink`}>{value}</p>
    </div>
  );
}

function PanelTitle({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded bg-signal/10 text-signal">
        <Icon size={19} />
      </span>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink/70">{label}</span>
      {children}
    </label>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded border border-ink/10 bg-ink p-4 text-xs leading-relaxed text-white">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function StateLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-ink/10 p-4">
      <p className="text-xs uppercase text-ink/50">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-ink/75">{value}</p>
    </div>
  );
}

function StatusBit({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white px-3 py-2">
      <p className="text-[11px] uppercase text-ink/45">{label}</p>
      <p className="font-medium text-ink">{value}</p>
    </div>
  );
}
