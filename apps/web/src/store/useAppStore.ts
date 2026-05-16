import { create } from "zustand";
import type { 
  Identity, Pact, VerifyPactResponse, EventLog, Proof, Genome, 
  Mandate, NetworkStatus, DidDocument, PactBundle, BundleVerificationResponse,
  TrustGraph, DomainModule, DomainActionTemplate, DomainActionResponse,
  LedgerAccount, LedgerAsset, LedgerStatement, LedgerHold, LedgerTransferResponse,
  TokenIssuanceResponse, PaymentIntent, ExecutePaymentResponse, AgentProfile,
  AgentRun, AgentRunResponse, AgentTask, AgentTaskResponse, AgentTaskRunResponse,
  PolicyDecision, PolicyRule, AuditEvent, OperationalOverview, RuntimeHealth,
  AuthChallenge, Credential, AuthSession, SignedRequestVerification,
  MandateCheckResponse, WorkflowTemplate, DomainWorkflow, WorkflowResponse,
  ReputationResponse, SearchResponse, WorldScenario, ScenarioRun, RuntimeCommand,
  AgentCrewResponse, CrewRunResponse, RuntimeTimelineItem
} from "@/lib/pactara-api";

export type View =
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

export type DataGroup =
  | "events"
  | "proofs"
  | "genomes"
  | "mandates"
  | "network"
  | "trustGraph"
  | "domains"
  | "ledger"
  | "agents"
  | "audit"
  | "payments"
  | "ops"
  | "agentRuns"
  | "workflowTemplates"
  | "workflows"
  | "agentTasks"
  | "policyRules"
  | "worldScenarios"
  | "runtimeCommands"
  | "agentCrews"
  | "timeline"
  | "credentials";

interface AppState {
  // Global UI State
  view: View;
  setView: (view: View) => void;
  message: string;
  setMessage: (msg: string) => void;
  health: string;
  setHealth: (status: string) => void;
  qr: string;
  setQr: (qr: string) => void;
  loadedGroups: Set<DataGroup>;
  markLoaded: (group: DataGroup) => void;
  clearLoadedGroup: (group: DataGroup) => void;

  // Domain Data States
  identity: Identity | null;
  setIdentity: (identity: Identity | null) => void;
  
  pact: Pact | null;
  setPact: (pact: Pact | null) => void;

  verification: VerifyPactResponse | null;
  setVerification: (v: VerifyPactResponse | null) => void;

  events: EventLog[];
  setEvents: (events: EventLog[]) => void;

  proofs: Proof[];
  setProofs: (proofs: Proof[]) => void;

  genomes: Genome[];
  setGenomes: (genomes: Genome[]) => void;

  mandates: Mandate[];
  setMandates: (mandates: Mandate[]) => void;

  network: NetworkStatus | null;
  setNetwork: (network: NetworkStatus | null) => void;

  did: DidDocument | null;
  setDid: (did: DidDocument | null) => void;

  bundle: PactBundle | null;
  setBundle: (bundle: PactBundle | null) => void;

  offlineVerification: BundleVerificationResponse | null;
  setOfflineVerification: (v: BundleVerificationResponse | null) => void;

  trustGraph: TrustGraph | null;
  setTrustGraph: (graph: TrustGraph | null) => void;

  domains: DomainModule[];
  setDomains: (domains: DomainModule[]) => void;

  domainTemplates: DomainActionTemplate[];
  setDomainTemplates: (templates: DomainActionTemplate[]) => void;

  domainAction: DomainActionResponse | null;
  setDomainAction: (action: DomainActionResponse | null) => void;

  ledgerAccounts: LedgerAccount[];
  setLedgerAccounts: (accounts: LedgerAccount[]) => void;

  ledgerAssets: LedgerAsset[];
  setLedgerAssets: (assets: LedgerAsset[]) => void;

  ledgerStatement: LedgerStatement | null;
  setLedgerStatement: (statement: LedgerStatement | null) => void;

  ledgerHold: LedgerHold | null;
  setLedgerHold: (hold: LedgerHold | null) => void;

  ledgerTransfer: LedgerTransferResponse | null;
  setLedgerTransfer: (transfer: LedgerTransferResponse | null) => void;

  tokenIssuance: TokenIssuanceResponse | null;
  setTokenIssuance: (issuance: TokenIssuanceResponse | null) => void;

  payment: PaymentIntent | null;
  setPayment: (payment: PaymentIntent | null) => void;

  payments: PaymentIntent[];
  setPayments: (payments: PaymentIntent[]) => void;

  executedPayment: ExecutePaymentResponse | null;
  setExecutedPayment: (executed: ExecutePaymentResponse | null) => void;

  agents: AgentProfile[];
  setAgents: (agents: AgentProfile[]) => void;

  agentRuns: AgentRun[];
  setAgentRuns: (runs: AgentRun[]) => void;

  agentRun: AgentRunResponse | null;
  setAgentRun: (run: AgentRunResponse | null) => void;

  agentTasks: AgentTask[];
  setAgentTasks: (tasks: AgentTask[]) => void;

  agentTask: AgentTaskResponse | null;
  setAgentTask: (task: AgentTaskResponse | null) => void;

  agentTaskRun: AgentTaskRunResponse | null;
  setAgentTaskRun: (run: AgentTaskRunResponse | null) => void;

  policyDecision: PolicyDecision | null;
  setPolicyDecision: (decision: PolicyDecision | null) => void;

  policyRules: PolicyRule[];
  setPolicyRules: (rules: PolicyRule[]) => void;

  auditEvents: AuditEvent[];
  setAuditEvents: (events: AuditEvent[]) => void;

  opsOverview: OperationalOverview | null;
  setOpsOverview: (overview: OperationalOverview | null) => void;

  runtimeHealth: RuntimeHealth | null;
  setRuntimeHealth: (health: RuntimeHealth | null) => void;

  authChallenge: AuthChallenge | null;
  setAuthChallenge: (challenge: AuthChallenge | null) => void;

  credential: Credential | null;
  setCredential: (credential: Credential | null) => void;

  credentials: Credential[];
  setCredentials: (credentials: Credential[]) => void;

  authSession: AuthSession | null;
  setAuthSession: (session: AuthSession | null) => void;

  signedVerification: SignedRequestVerification | null;
  setSignedVerification: (v: SignedRequestVerification | null) => void;

  mandateCheck: MandateCheckResponse | null;
  setMandateCheck: (check: MandateCheckResponse | null) => void;

  workflowTemplates: WorkflowTemplate[];
  setWorkflowTemplates: (templates: WorkflowTemplate[]) => void;

  workflows: DomainWorkflow[];
  setWorkflows: (workflows: DomainWorkflow[]) => void;

  workflowResult: WorkflowResponse | null;
  setWorkflowResult: (result: WorkflowResponse | null) => void;

  reputation: ReputationResponse | null;
  setReputation: (rep: ReputationResponse | null) => void;

  searchResponse: SearchResponse | null;
  setSearchResponse: (res: SearchResponse | null) => void;

  worldScenarios: WorldScenario[];
  setWorldScenarios: (scenarios: WorldScenario[]) => void;

  worldScenario: WorldScenario | null;
  setWorldScenario: (scenario: WorldScenario | null) => void;

  scenarioRun: ScenarioRun | null;
  setScenarioRun: (run: ScenarioRun | null) => void;

  runtimeCommands: RuntimeCommand[];
  setRuntimeCommands: (commands: RuntimeCommand[]) => void;

  runtimeCommand: RuntimeCommand | null;
  setRuntimeCommand: (command: RuntimeCommand | null) => void;

  agentCrews: AgentCrewResponse[];
  setAgentCrews: (crews: AgentCrewResponse[]) => void;

  agentCrew: AgentCrewResponse | null;
  setAgentCrew: (crew: AgentCrewResponse | null) => void;

  crewRun: CrewRunResponse | null;
  setCrewRun: (run: CrewRunResponse | null) => void;

  timelineItems: RuntimeTimelineItem[];
  setTimelineItems: (items: RuntimeTimelineItem[]) => void;

  streamSnapshot: string;
  setStreamSnapshot: (snapshot: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "identity",
  setView: (view) => set({ view }),
  message: "",
  setMessage: (message) => set({ message }),
  health: "checking",
  setHealth: (health) => set({ health }),
  qr: "",
  setQr: (qr) => set({ qr }),
  
  loadedGroups: new Set(),
  markLoaded: (group) => set((state) => {
    const next = new Set(state.loadedGroups);
    next.add(group);
    return { loadedGroups: next };
  }),
  clearLoadedGroup: (group) => set((state) => {
    const next = new Set(state.loadedGroups);
    next.delete(group);
    return { loadedGroups: next };
  }),

  identity: null,
  setIdentity: (identity) => set({ identity }),
  pact: null,
  setPact: (pact) => set({ pact }),
  verification: null,
  setVerification: (verification) => set({ verification }),
  events: [],
  setEvents: (events) => set({ events }),
  proofs: [],
  setProofs: (proofs) => set({ proofs }),
  genomes: [],
  setGenomes: (genomes) => set({ genomes }),
  mandates: [],
  setMandates: (mandates) => set({ mandates }),
  network: null,
  setNetwork: (network) => set({ network }),
  did: null,
  setDid: (did) => set({ did }),
  bundle: null,
  setBundle: (bundle) => set({ bundle }),
  offlineVerification: null,
  setOfflineVerification: (offlineVerification) => set({ offlineVerification }),
  trustGraph: null,
  setTrustGraph: (trustGraph) => set({ trustGraph }),
  domains: [],
  setDomains: (domains) => set({ domains }),
  domainTemplates: [],
  setDomainTemplates: (domainTemplates) => set({ domainTemplates }),
  domainAction: null,
  setDomainAction: (domainAction) => set({ domainAction }),
  ledgerAccounts: [],
  setLedgerAccounts: (ledgerAccounts) => set({ ledgerAccounts }),
  ledgerAssets: [],
  setLedgerAssets: (ledgerAssets) => set({ ledgerAssets }),
  ledgerStatement: null,
  setLedgerStatement: (ledgerStatement) => set({ ledgerStatement }),
  ledgerHold: null,
  setLedgerHold: (ledgerHold) => set({ ledgerHold }),
  ledgerTransfer: null,
  setLedgerTransfer: (ledgerTransfer) => set({ ledgerTransfer }),
  tokenIssuance: null,
  setTokenIssuance: (tokenIssuance) => set({ tokenIssuance }),
  payment: null,
  setPayment: (payment) => set({ payment }),
  payments: [],
  setPayments: (payments) => set({ payments }),
  executedPayment: null,
  setExecutedPayment: (executedPayment) => set({ executedPayment }),
  agents: [],
  setAgents: (agents) => set({ agents }),
  agentRuns: [],
  setAgentRuns: (agentRuns) => set({ agentRuns }),
  agentRun: null,
  setAgentRun: (agentRun) => set({ agentRun }),
  agentTasks: [],
  setAgentTasks: (agentTasks) => set({ agentTasks }),
  agentTask: null,
  setAgentTask: (agentTask) => set({ agentTask }),
  agentTaskRun: null,
  setAgentTaskRun: (agentTaskRun) => set({ agentTaskRun }),
  policyDecision: null,
  setPolicyDecision: (policyDecision) => set({ policyDecision }),
  policyRules: [],
  setPolicyRules: (policyRules) => set({ policyRules }),
  auditEvents: [],
  setAuditEvents: (auditEvents) => set({ auditEvents }),
  opsOverview: null,
  setOpsOverview: (opsOverview) => set({ opsOverview }),
  runtimeHealth: null,
  setRuntimeHealth: (runtimeHealth) => set({ runtimeHealth }),
  authChallenge: null,
  setAuthChallenge: (authChallenge) => set({ authChallenge }),
  credential: null,
  setCredential: (credential) => set({ credential }),
  credentials: [],
  setCredentials: (credentials) => set({ credentials }),
  authSession: null,
  setAuthSession: (authSession) => set({ authSession }),
  signedVerification: null,
  setSignedVerification: (signedVerification) => set({ signedVerification }),
  mandateCheck: null,
  setMandateCheck: (mandateCheck) => set({ mandateCheck }),
  workflowTemplates: [],
  setWorkflowTemplates: (workflowTemplates) => set({ workflowTemplates }),
  workflows: [],
  setWorkflows: (workflows) => set({ workflows }),
  workflowResult: null,
  setWorkflowResult: (workflowResult) => set({ workflowResult }),
  reputation: null,
  setReputation: (reputation) => set({ reputation }),
  searchResponse: null,
  setSearchResponse: (searchResponse) => set({ searchResponse }),
  worldScenarios: [],
  setWorldScenarios: (worldScenarios) => set({ worldScenarios }),
  worldScenario: null,
  setWorldScenario: (worldScenario) => set({ worldScenario }),
  scenarioRun: null,
  setScenarioRun: (scenarioRun) => set({ scenarioRun }),
  runtimeCommands: [],
  setRuntimeCommands: (runtimeCommands) => set({ runtimeCommands }),
  runtimeCommand: null,
  setRuntimeCommand: (runtimeCommand) => set({ runtimeCommand }),
  agentCrews: [],
  setAgentCrews: (agentCrews) => set({ agentCrews }),
  agentCrew: null,
  setAgentCrew: (agentCrew) => set({ agentCrew }),
  crewRun: null,
  setCrewRun: (crewRun) => set({ crewRun }),
  timelineItems: [],
  setTimelineItems: (timelineItems) => set({ timelineItems }),
  streamSnapshot: "",
  setStreamSnapshot: (streamSnapshot) => set({ streamSnapshot }),
}));
