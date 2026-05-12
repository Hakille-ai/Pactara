export const API_BASE =
  process.env.NEXT_PUBLIC_PACTARA_API_URL?.replace(/\/$/, "") ?? "http://localhost:8080";

export type IdentityKind =
  | "person"
  | "organization"
  | "agent"
  | "machine"
  | "product"
  | "place";

export type Identity = {
  id: string;
  label: string;
  kind: IdentityKind;
  public_key: string;
  private_key?: string | null;
  created_at: string;
};

export type PactStatus = "draft" | "active" | "expired" | "revoked" | "invalid";

export type Pact = {
  id: string;
  actor: string;
  intent: string;
  object: unknown;
  target: string;
  terms: unknown;
  consent: unknown;
  proof: unknown;
  created_at: string;
  expires_at: string;
  signature?: string | null;
  hash: string;
  status: PactStatus;
};

export type VerifyPactResponse = {
  pact_id: string;
  valid: boolean;
  status: PactStatus;
  hash_matches: boolean;
  signature_valid: boolean;
  revoked: boolean;
  expired: boolean;
  reasons: string[];
};

export type EventLog = {
  id: string;
  event_type: string;
  subject_id: string;
  payload: unknown;
  created_at: string;
};

export type Proof = {
  id: string;
  pact_id?: string | null;
  proof_type: string;
  payload: unknown;
  created_at: string;
};

export type Mandate = {
  id: string;
  principal: string;
  agent: string;
  scope: unknown;
  expires_at: string;
  created_at: string;
};

export type Genome = {
  id: string;
  subject: string;
  origin: unknown;
  history: unknown;
  rights: unknown;
  created_at: string;
};

export type NetworkStatus = {
  identities: number;
  pacts: number;
  active_pacts: number;
  revoked_pacts: number;
  proofs: number;
  mandates: number;
  genomes: number;
  events: number;
  domains: number;
  ledger_accounts: number;
  payment_intents: number;
  agents: number;
  audit_events: number;
};

export type DidDocument = {
  "@context": string[];
  id: string;
  controller: string;
  verification_method: Array<{
    id: string;
    type: string;
    controller: string;
    public_key_multibase: string;
  }>;
  authentication: string[];
  assertion_method: string[];
  service: Array<{
    id: string;
    type: string;
    service_endpoint: string;
  }>;
};

export type PactBundle = {
  protocol: string;
  bundle_version: string;
  generated_at: string;
  pact: Pact;
  actor: Omit<Identity, "private_key">;
  proofs: Proof[];
  revocation?: unknown | null;
  verification: VerifyPactResponse;
  timeline: EventLog[];
};

export type BundleVerificationResponse = VerifyPactResponse & {
  proofs_count: number;
  timeline_events: number;
};

export type MandateCheckResponse = {
  mandate_id: string;
  allowed: boolean;
  active: boolean;
  principal: string;
  agent: string;
  action: string;
  intent?: string | null;
  reasons: string[];
};

export type TrustGraphNode = {
  id: string;
  label: string;
  type: string;
  metadata: unknown;
};

export type TrustGraphEdge = {
  from: string;
  to: string;
  type: string;
  metadata: unknown;
};

export type TrustGraph = {
  generated_at: string;
  nodes: TrustGraphNode[];
  edges: TrustGraphEdge[];
};

export type DomainModule = {
  id: string;
  label: string;
  domain_kind: string;
  description: string;
  enabled: boolean;
  capabilities: unknown;
  created_at: string;
};

export type DomainActionTemplate = {
  id: string;
  domain_id: string;
  action_type: string;
  label: string;
  schema: unknown;
  default_terms: unknown;
  risk_level: string;
  created_at: string;
};

export type DomainAction = {
  id: string;
  domain_id: string;
  template_id?: string | null;
  actor: string;
  pact_id: string;
  action_type: string;
  payload: unknown;
  status: string;
  created_at: string;
};

export type DomainActionResponse = {
  action: DomainAction;
  pact: Pact;
  audit: AuditEvent;
};

export type LedgerAccount = {
  id: string;
  owner: string;
  asset_id: string;
  label: string;
  balance: number;
  created_at: string;
};

export type PaymentIntent = {
  id: string;
  payer_account_id: string;
  payee_account_id: string;
  pact_id: string;
  amount: number;
  asset_id: string;
  status: string;
  memo?: string | null;
  created_at: string;
  executed_at?: string | null;
};

export type ExecutePaymentResponse = {
  payment: PaymentIntent;
  transfer: LedgerTransfer;
  audit: AuditEvent;
};

export type LedgerTransfer = {
  id: string;
  payment_intent_id?: string | null;
  asset_id: string;
  amount: number;
  debit_account_id: string;
  credit_account_id: string;
  status: string;
  created_at: string;
};

export type LedgerEntry = {
  id: string;
  transfer_id?: string | null;
  account_id: string;
  direction: string;
  amount: number;
  asset_id: string;
  created_at: string;
};

export type LedgerStatement = {
  account: LedgerAccount;
  entries: LedgerEntry[];
  credits: number;
  debits: number;
  net: number;
};

export type AgentProfile = {
  id: string;
  identity_id: string;
  label: string;
  model: string;
  capabilities: unknown;
  created_at: string;
};

export type AgentRun = {
  id: string;
  agent_id: string;
  mandate_id: string;
  pact_id?: string | null;
  action: string;
  input: unknown;
  output: unknown;
  policy_decision: string;
  status: string;
  created_at: string;
};

export type AgentRunResponse = {
  run: AgentRun;
  policy: PolicyDecision;
};

export type PolicyDecision = {
  id: string;
  subject_id: string;
  action: string;
  resource: string;
  decision: string;
  reasons: string[];
  context: unknown;
  created_at: string;
};

export type AuditEvent = {
  id: string;
  event_type: string;
  actor?: string | null;
  subject_id: string;
  decision?: string | null;
  payload: unknown;
  created_at: string;
};

export type AuthChallenge = {
  id: string;
  identity_id?: string | null;
  purpose: string;
  challenge: string;
  expires_at: string;
  consumed_at?: string | null;
  created_at: string;
};

export type Credential = {
  id: string;
  identity_id: string;
  credential_type: string;
  credential_id: string;
  public_key: string;
  transports: unknown;
  created_at: string;
  last_used_at?: string | null;
};

export type AuthSession = {
  id: string;
  identity_id: string;
  session_token: string;
  issued_by: string;
  expires_at: string;
  revoked_at?: string | null;
  created_at: string;
};

export type SignedRequestVerification = {
  valid: boolean;
  hash_matches: boolean;
  signature_valid: boolean;
  nonce: string;
  reasons: string[];
};

export type LedgerAsset = {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  sandbox: boolean;
  metadata: unknown;
  created_at: string;
};

export type LedgerTransferResponse = {
  transfer: LedgerTransfer;
  debit_statement: LedgerStatement;
  credit_statement: LedgerStatement;
  audit: AuditEvent;
};

export type LedgerHold = {
  id: string;
  account_id: string;
  pact_id: string;
  amount: number;
  asset_id: string;
  status: string;
  reason?: string | null;
  created_at: string;
  released_at?: string | null;
};

export type TokenIssuanceEvent = {
  id: string;
  asset_id: string;
  account_id: string;
  issuer: string;
  amount: number;
  memo?: string | null;
  created_at: string;
};

export type TokenIssuanceResponse = {
  issuance: TokenIssuanceEvent;
  account: LedgerAccount;
  audit: AuditEvent;
};

export type PaymentStatusCounts = {
  pending: number;
  executed: number;
  rejected: number;
};

export type RuntimeQueueStats = {
  active_workflows: number;
  needs_review_workflows: number;
  held_ledger_funds: number;
  pending_agent_tasks: number;
  unread_notifications: number;
  reputation_scores: number;
  high_risk_assessments: number;
  world_scenarios: number;
  scenario_runs: number;
  runtime_commands: number;
  agent_crews: number;
  civilization_signals: number;
};

export type OperationalOverview = {
  generated_at: string;
  network: NetworkStatus;
  payments: PaymentStatusCounts;
  runtime: RuntimeQueueStats;
  recent_events: EventLog[];
  recent_audit: AuditEvent[];
  recent_domain_actions: DomainAction[];
  recent_agent_runs: AgentRun[];
};

export type RuntimeHealth = {
  status: string;
  database: boolean;
  generated_at: string;
  checks: unknown;
};

export type WorkflowTemplate = {
  id: string;
  domain_id: string;
  label: string;
  action_type: string;
  steps: unknown;
  risk_model: unknown;
  created_at: string;
};

export type DomainWorkflow = {
  id: string;
  domain_id: string;
  template_id?: string | null;
  actor: string;
  target: string;
  title: string;
  status: string;
  current_step: number;
  pact_id?: string | null;
  risk_id?: string | null;
  payload: unknown;
  created_at: string;
  updated_at: string;
};

export type WorkflowStep = {
  id: string;
  workflow_id: string;
  step_order: number;
  label: string;
  status: string;
  output: unknown;
  pact_id?: string | null;
  created_at: string;
  completed_at?: string | null;
};

export type WorkflowReview = {
  id: string;
  workflow_id: string;
  reviewer: string;
  decision: string;
  notes?: string | null;
  created_at: string;
};

export type RiskAssessment = {
  id: string;
  subject_id: string;
  risk_level: string;
  score: number;
  reasons: string[];
  created_at: string;
};

export type WorkflowResponse = {
  workflow: DomainWorkflow;
  steps: WorkflowStep[];
  reviews: WorkflowReview[];
  risk?: RiskAssessment | null;
  pact?: Pact | null;
};

export type AgentTask = {
  id: string;
  agent_id: string;
  mandate_id: string;
  pact_id?: string | null;
  action: string;
  input: unknown;
  status: string;
  policy_decision: string;
  requires_approval: boolean;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentRunLog = {
  id: string;
  task_id?: string | null;
  run_id?: string | null;
  level: string;
  message: string;
  payload: unknown;
  created_at: string;
};

export type AgentTaskResponse = {
  task: AgentTask;
  policy: PolicyDecision;
  logs: AgentRunLog[];
};

export type AgentTaskRunResponse = {
  task: AgentTask;
  run: AgentRun;
  logs: AgentRunLog[];
};

export type PolicyRule = {
  id: string;
  name: string;
  effect: string;
  action: string;
  resource: string;
  priority: number;
  condition: unknown;
  created_at: string;
};

export type ReputationScore = {
  identity_id: string;
  score: number;
  tier: string;
  factors: unknown;
  updated_at: string;
};

export type ReputationEvent = {
  id: string;
  identity_id: string;
  delta: number;
  reason: string;
  source_id?: string | null;
  created_at: string;
};

export type ReputationResponse = {
  score: ReputationScore;
  events: ReputationEvent[];
};

export type SearchResult = {
  category: string;
  id: string;
  label: string;
  summary: string;
  metadata: unknown;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
};

export type ScenarioNode = {
  id: string;
  label: string;
  type: string;
  domain_id?: string | null;
  metadata: unknown;
};

export type ScenarioEdge = {
  from: string;
  to: string;
  relation: string;
  weight: number;
  metadata: unknown;
};

export type WorldScenario = {
  id: string;
  actor: string;
  domain_id: string;
  title: string;
  summary: string;
  status: string;
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  payload: unknown;
  created_at: string;
  updated_at: string;
};

export type ScenarioRun = {
  id: string;
  scenario_id: string;
  status: string;
  impact_score: number;
  risk_level: string;
  recommended_actions: unknown;
  generated_objects: unknown;
  output: unknown;
  created_at: string;
};

export type CommandResult = {
  status: string;
  summary: string;
  generated_objects: unknown;
  next_actions: unknown;
};

export type RuntimeCommand = {
  id: string;
  actor: string;
  domain_id: string;
  intent: string;
  target: string;
  command_text: string;
  payload: unknown;
  status: string;
  result: CommandResult;
  pact_id?: string | null;
  workflow_id?: string | null;
  created_at: string;
};

export type AgentCrew = {
  id: string;
  actor: string;
  label: string;
  objective: string;
  status: string;
  policy_decision: string;
  created_at: string;
  updated_at: string;
};

export type AgentCrewMember = {
  id: string;
  crew_id: string;
  agent_id: string;
  mandate_id: string;
  role: string;
  created_at: string;
};

export type AgentCrewResponse = {
  crew: AgentCrew;
  members: AgentCrewMember[];
};

export type CrewRun = {
  id: string;
  crew_id: string;
  status: string;
  policy_decision: string;
  requires_review: boolean;
  output: unknown;
  created_at: string;
};

export type CrewRunResponse = {
  run: CrewRun;
  crew: AgentCrew;
  members: AgentCrewMember[];
};

export type CivilizationSignal = {
  id: string;
  domain_id: string;
  actor?: string | null;
  signal_type: string;
  severity: number;
  title: string;
  payload: unknown;
  status: string;
  created_at: string;
};

export type RuntimeTimelineItem = {
  id: string;
  item_type: string;
  title: string;
  status: string;
  actor?: string | null;
  domain_id?: string | null;
  metadata: unknown;
  created_at: string;
};

export async function pactaraFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? `PACTARA API error ${response.status}`);
  }

  return data as T;
}

export function parseJsonField(value: string, fallback: unknown) {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  return JSON.parse(trimmed);
}
