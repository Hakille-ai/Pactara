use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

pub type PactaraId = String;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum IdentityKind {
    Person,
    Organization,
    Agent,
    Machine,
    Product,
    Place,
}

impl Default for IdentityKind {
    fn default() -> Self {
        Self::Person
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PactStatus {
    Draft,
    Active,
    Expired,
    Revoked,
    Invalid,
}

impl PactStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Draft => "draft",
            Self::Active => "active",
            Self::Expired => "expired",
            Self::Revoked => "revoked",
            Self::Invalid => "invalid",
        }
    }
}

impl TryFrom<&str> for PactStatus {
    type Error = PactaraCoreError;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "draft" => Ok(Self::Draft),
            "active" => Ok(Self::Active),
            "expired" => Ok(Self::Expired),
            "revoked" => Ok(Self::Revoked),
            "invalid" => Ok(Self::Invalid),
            other => Err(PactaraCoreError::UnknownStatus(other.to_string())),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Identity {
    pub id: PactaraId,
    pub label: String,
    pub kind: IdentityKind,
    pub public_key: String,
    pub private_key: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl Identity {
    pub fn without_private_key(mut self) -> Self {
        self.private_key = None;
        self
    }

    pub fn public_view(&self) -> IdentityPublic {
        IdentityPublic {
            id: self.id.clone(),
            label: self.label.clone(),
            kind: self.kind.clone(),
            public_key: self.public_key.clone(),
            created_at: self.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentityPublic {
    pub id: PactaraId,
    pub label: String,
    pub kind: IdentityKind,
    pub public_key: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIdentityRequest {
    pub label: String,
    #[serde(default)]
    pub kind: IdentityKind,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pact {
    pub id: Uuid,
    pub actor: PactaraId,
    pub intent: String,
    pub object: Value,
    pub target: PactaraId,
    pub terms: Value,
    pub consent: Value,
    pub proof: Value,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub signature: Option<String>,
    pub hash: String,
    pub status: PactStatus,
}

impl Pact {
    pub fn new(request: CreatePactRequest) -> Self {
        let now = Utc::now();
        let expires_at = request
            .expires_at
            .unwrap_or_else(|| now + Duration::days(30));
        Self {
            id: Uuid::new_v4(),
            actor: request.actor,
            intent: request.intent,
            object: request.object,
            target: request.target,
            terms: request.terms,
            consent: request.consent,
            proof: request.proof,
            created_at: now,
            expires_at,
            signature: None,
            hash: String::new(),
            status: PactStatus::Draft,
        }
    }

    pub fn signing_payload(&self) -> Value {
        json!({
            "id": self.id,
            "actor": self.actor,
            "intent": self.intent,
            "object": self.object,
            "target": self.target,
            "terms": self.terms,
            "consent": self.consent,
            "proof": self.proof,
            "created_at": self.created_at,
            "expires_at": self.expires_at
        })
    }

    pub fn is_expired_at(&self, now: DateTime<Utc>) -> bool {
        now > self.expires_at
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePactRequest {
    pub actor: PactaraId,
    pub intent: String,
    pub object: Value,
    pub target: PactaraId,
    pub terms: Value,
    pub consent: Value,
    pub proof: Value,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyPactResponse {
    pub pact_id: Uuid,
    pub valid: bool,
    pub status: PactStatus,
    pub hash_matches: bool,
    pub signature_valid: bool,
    pub revoked: bool,
    pub expired: bool,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevokePactRequest {
    pub reason: String,
    pub revoked_by: PactaraId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Revocation {
    pub id: Uuid,
    pub pact_id: Uuid,
    pub revoked_by: PactaraId,
    pub reason: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Proof {
    pub id: Uuid,
    pub pact_id: Option<Uuid>,
    pub proof_type: String,
    pub payload: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProofRequest {
    pub pact_id: Option<Uuid>,
    pub proof_type: String,
    pub payload: Value,
}

impl Proof {
    pub fn new(request: CreateProofRequest) -> Self {
        Self {
            id: Uuid::new_v4(),
            pact_id: request.pact_id,
            proof_type: request.proof_type,
            payload: request.payload,
            created_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mandate {
    pub id: Uuid,
    pub principal: PactaraId,
    pub agent: PactaraId,
    pub scope: Value,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMandateRequest {
    pub principal: PactaraId,
    pub agent: PactaraId,
    pub scope: Value,
    pub expires_at: DateTime<Utc>,
}

impl Mandate {
    pub fn new(request: CreateMandateRequest) -> Self {
        Self {
            id: Uuid::new_v4(),
            principal: request.principal,
            agent: request.agent,
            scope: request.scope,
            expires_at: request.expires_at,
            created_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Genome {
    pub id: Uuid,
    pub subject: String,
    pub origin: Value,
    pub history: Value,
    pub rights: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateGenomeRequest {
    pub subject: String,
    pub origin: Value,
    pub history: Value,
    pub rights: Value,
}

impl Genome {
    pub fn new(request: CreateGenomeRequest) -> Self {
        Self {
            id: Uuid::new_v4(),
            subject: request.subject,
            origin: request.origin,
            history: request.history,
            rights: request.rights,
            created_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventLog {
    pub id: Uuid,
    pub event_type: String,
    pub subject_id: String,
    pub payload: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkStats {
    pub identities: i64,
    pub pacts: i64,
    pub active_pacts: i64,
    pub revoked_pacts: i64,
    pub proofs: i64,
    pub mandates: i64,
    pub genomes: i64,
    pub events: i64,
    pub domains: i64,
    pub ledger_accounts: i64,
    pub payment_intents: i64,
    pub agents: i64,
    pub audit_events: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DidDocument {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: PactaraId,
    pub controller: PactaraId,
    pub verification_method: Vec<DidVerificationMethod>,
    pub authentication: Vec<String>,
    pub assertion_method: Vec<String>,
    pub service: Vec<DidService>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DidVerificationMethod {
    pub id: String,
    #[serde(rename = "type")]
    pub method_type: String,
    pub controller: PactaraId,
    pub public_key_multibase: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DidService {
    pub id: String,
    #[serde(rename = "type")]
    pub service_type: String,
    pub service_endpoint: String,
}

impl DidDocument {
    pub fn from_identity(identity: &Identity) -> Self {
        let key_id = format!("{}#ed25519-0", identity.id);
        Self {
            context: vec![
                "https://www.w3.org/ns/did/v1".to_string(),
                "https://pactara.protocol/ns/v0.3".to_string(),
            ],
            id: identity.id.clone(),
            controller: identity.id.clone(),
            verification_method: vec![DidVerificationMethod {
                id: key_id.clone(),
                method_type: "Multikey".to_string(),
                controller: identity.id.clone(),
                public_key_multibase: format!("z{}", identity.public_key),
            }],
            authentication: vec![key_id.clone()],
            assertion_method: vec![key_id],
            service: vec![DidService {
                id: format!("{}#pactara-api", identity.id),
                service_type: "PactaraProtocolAPI".to_string(),
                service_endpoint: "/v1".to_string(),
            }],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PactBundle {
    pub protocol: String,
    pub bundle_version: String,
    pub generated_at: DateTime<Utc>,
    pub pact: Pact,
    pub actor: IdentityPublic,
    pub proofs: Vec<Proof>,
    pub revocation: Option<Revocation>,
    pub verification: VerifyPactResponse,
    pub timeline: Vec<EventLog>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleVerificationResponse {
    pub pact_id: Uuid,
    pub valid: bool,
    pub status: PactStatus,
    pub hash_matches: bool,
    pub signature_valid: bool,
    pub revoked: bool,
    pub expired: bool,
    pub proofs_count: usize,
    pub timeline_events: usize,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MandateCheckRequest {
    pub action: String,
    pub intent: Option<String>,
    #[serde(default)]
    pub context: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MandateCheckResponse {
    pub mandate_id: Uuid,
    pub allowed: bool,
    pub active: bool,
    pub principal: PactaraId,
    pub agent: PactaraId,
    pub action: String,
    pub intent: Option<String>,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustGraph {
    pub generated_at: DateTime<Utc>,
    pub nodes: Vec<TrustGraphNode>,
    pub edges: Vec<TrustGraphEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustGraphNode {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub node_type: String,
    #[serde(default)]
    pub metadata: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustGraphEdge {
    pub from: String,
    pub to: String,
    #[serde(rename = "type")]
    pub edge_type: String,
    #[serde(default)]
    pub metadata: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainModule {
    pub id: String,
    pub label: String,
    pub domain_kind: String,
    pub description: String,
    pub enabled: bool,
    pub capabilities: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainActionTemplate {
    pub id: Uuid,
    pub domain_id: String,
    pub action_type: String,
    pub label: String,
    pub schema: Value,
    pub default_terms: Value,
    pub risk_level: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainAction {
    pub id: Uuid,
    pub domain_id: String,
    pub template_id: Option<Uuid>,
    pub actor: PactaraId,
    pub pact_id: Uuid,
    pub action_type: String,
    pub payload: Value,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDomainActionRequest {
    pub actor: PactaraId,
    pub target: PactaraId,
    pub action_type: String,
    pub template_id: Option<Uuid>,
    #[serde(default)]
    pub payload: Value,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainActionResponse {
    pub action: DomainAction,
    pub pact: Pact,
    pub audit: AuditEvent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credential {
    pub id: Uuid,
    pub identity_id: PactaraId,
    pub credential_type: String,
    pub credential_id: String,
    pub public_key: String,
    #[serde(default)]
    pub transports: Value,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthChallenge {
    pub id: Uuid,
    pub identity_id: Option<PactaraId>,
    pub purpose: String,
    pub challenge: String,
    pub expires_at: DateTime<Utc>,
    pub consumed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAuthChallengeRequest {
    pub identity_id: Option<PactaraId>,
    pub purpose: Option<String>,
    pub ttl_seconds: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasskeyRegisterStartRequest {
    pub identity_id: PactaraId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasskeyRegisterFinishRequest {
    pub challenge_id: Uuid,
    pub identity_id: PactaraId,
    pub credential_id: String,
    pub public_key: String,
    #[serde(default)]
    pub transports: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasskeyLoginStartRequest {
    pub identity_id: Option<PactaraId>,
    pub credential_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PasskeyLoginFinishRequest {
    pub challenge_id: Uuid,
    pub credential_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSessionResponse {
    pub authenticated: bool,
    pub identity_id: PactaraId,
    pub credential_id: String,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthSession {
    pub id: Uuid,
    pub identity_id: PactaraId,
    pub session_token: String,
    pub issued_by: String,
    pub expires_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDevSessionRequest {
    pub identity_id: PactaraId,
    pub ttl_seconds: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedRequest {
    pub identity_id: PactaraId,
    pub nonce: String,
    pub payload: Value,
    pub signature: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedRequestVerification {
    pub valid: bool,
    pub hash_matches: bool,
    pub signature_valid: bool,
    pub nonce: String,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerAsset {
    pub id: String,
    pub symbol: String,
    pub name: String,
    pub decimals: i32,
    pub sandbox: bool,
    #[serde(default)]
    pub metadata: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerAccount {
    pub id: Uuid,
    pub owner: PactaraId,
    pub asset_id: String,
    pub label: String,
    pub balance: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLedgerAccountRequest {
    pub owner: PactaraId,
    pub asset_id: Option<String>,
    pub label: Option<String>,
    pub initial_balance: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentIntent {
    pub id: Uuid,
    pub payer_account_id: Uuid,
    pub payee_account_id: Uuid,
    pub pact_id: Uuid,
    pub amount: i64,
    pub asset_id: String,
    pub status: String,
    pub memo: Option<String>,
    pub created_at: DateTime<Utc>,
    pub executed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentIntentRequest {
    pub payer_account_id: Uuid,
    pub payee_account_id: Uuid,
    pub pact_id: Uuid,
    pub amount: i64,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerTransfer {
    pub id: Uuid,
    pub payment_intent_id: Option<Uuid>,
    pub asset_id: String,
    pub amount: i64,
    pub debit_account_id: Uuid,
    pub credit_account_id: Uuid,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerEntry {
    pub id: Uuid,
    pub transfer_id: Option<Uuid>,
    pub account_id: Uuid,
    pub direction: String,
    pub amount: i64,
    pub asset_id: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerStatement {
    pub account: LedgerAccount,
    pub entries: Vec<LedgerEntry>,
    pub credits: i64,
    pub debits: i64,
    pub net: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLedgerTransferRequest {
    pub debit_account_id: Uuid,
    pub credit_account_id: Uuid,
    pub pact_id: Uuid,
    pub amount: i64,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerTransferResponse {
    pub transfer: LedgerTransfer,
    pub debit_statement: LedgerStatement,
    pub credit_statement: LedgerStatement,
    pub audit: AuditEvent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerHold {
    pub id: Uuid,
    pub account_id: Uuid,
    pub pact_id: Uuid,
    pub amount: i64,
    pub asset_id: String,
    pub status: String,
    pub reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub released_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateLedgerHoldRequest {
    pub account_id: Uuid,
    pub pact_id: Uuid,
    pub amount: i64,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenIssuanceEvent {
    pub id: Uuid,
    pub asset_id: String,
    pub account_id: Uuid,
    pub issuer: PactaraId,
    pub amount: i64,
    pub memo: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTokenIssuanceRequest {
    pub issuer: PactaraId,
    pub account_id: Uuid,
    pub amount: i64,
    pub memo: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenIssuanceResponse {
    pub issuance: TokenIssuanceEvent,
    pub account: LedgerAccount,
    pub audit: AuditEvent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutePaymentResponse {
    pub payment: PaymentIntent,
    pub transfer: LedgerTransfer,
    pub audit: AuditEvent,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentProfile {
    pub id: Uuid,
    pub identity_id: PactaraId,
    pub label: String,
    pub model: String,
    #[serde(default)]
    pub capabilities: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAgentProfileRequest {
    pub identity_id: Option<PactaraId>,
    pub label: String,
    pub model: Option<String>,
    #[serde(default)]
    pub capabilities: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRun {
    pub id: Uuid,
    pub agent_id: Uuid,
    pub mandate_id: Uuid,
    pub pact_id: Option<Uuid>,
    pub action: String,
    #[serde(default)]
    pub input: Value,
    #[serde(default)]
    pub output: Value,
    pub policy_decision: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAgentRunRequest {
    pub mandate_id: Uuid,
    pub pact_id: Option<Uuid>,
    pub action: String,
    #[serde(default)]
    pub input: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTask {
    pub id: Uuid,
    pub agent_id: Uuid,
    pub mandate_id: Uuid,
    pub pact_id: Option<Uuid>,
    pub action: String,
    #[serde(default)]
    pub input: Value,
    pub status: String,
    pub policy_decision: String,
    pub requires_approval: bool,
    pub approved_by: Option<PactaraId>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAgentTaskRequest {
    pub agent_id: Uuid,
    pub mandate_id: Uuid,
    pub pact_id: Option<Uuid>,
    pub action: String,
    #[serde(default)]
    pub input: Value,
    pub requires_approval: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApproveAgentTaskRequest {
    pub approved_by: PactaraId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRunLog {
    pub id: Uuid,
    pub task_id: Option<Uuid>,
    pub run_id: Option<Uuid>,
    pub level: String,
    pub message: String,
    #[serde(default)]
    pub payload: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTaskResponse {
    pub task: AgentTask,
    pub policy: PolicyDecision,
    pub logs: Vec<AgentRunLog>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTaskRunResponse {
    pub task: AgentTask,
    pub run: AgentRun,
    pub logs: Vec<AgentRunLog>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRunResponse {
    pub run: AgentRun,
    pub policy: PolicyDecision,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRule {
    pub id: Uuid,
    pub name: String,
    pub effect: String,
    pub action: String,
    pub resource: String,
    pub priority: i32,
    #[serde(default)]
    pub condition: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePolicyRuleRequest {
    pub name: String,
    pub effect: String,
    pub action: String,
    pub resource: String,
    pub priority: Option<i32>,
    #[serde(default)]
    pub condition: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyDecision {
    pub id: Uuid,
    pub subject_id: String,
    pub action: String,
    pub resource: String,
    pub decision: String,
    pub reasons: Vec<String>,
    #[serde(default)]
    pub context: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyEvaluateRequest {
    pub subject_id: String,
    pub action: String,
    pub resource: String,
    #[serde(default)]
    pub context: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub id: Uuid,
    pub event_type: String,
    pub actor: Option<PactaraId>,
    pub subject_id: String,
    pub decision: Option<String>,
    #[serde(default)]
    pub payload: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentStatusCounts {
    pub pending: i64,
    pub executed: i64,
    pub rejected: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeQueueStats {
    pub active_workflows: i64,
    pub needs_review_workflows: i64,
    pub held_ledger_funds: i64,
    pub pending_agent_tasks: i64,
    pub unread_notifications: i64,
    pub reputation_scores: i64,
    pub high_risk_assessments: i64,
    pub world_scenarios: i64,
    pub scenario_runs: i64,
    pub runtime_commands: i64,
    pub agent_crews: i64,
    pub civilization_signals: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OperationalOverview {
    pub generated_at: DateTime<Utc>,
    pub network: NetworkStats,
    pub payments: PaymentStatusCounts,
    pub runtime: RuntimeQueueStats,
    pub recent_events: Vec<EventLog>,
    pub recent_audit: Vec<AuditEvent>,
    pub recent_domain_actions: Vec<DomainAction>,
    pub recent_agent_runs: Vec<AgentRun>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeHealth {
    pub status: String,
    pub database: bool,
    pub generated_at: DateTime<Utc>,
    #[serde(default)]
    pub checks: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowTemplate {
    pub id: Uuid,
    pub domain_id: String,
    pub label: String,
    pub action_type: String,
    #[serde(default)]
    pub steps: Value,
    #[serde(default)]
    pub risk_model: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainWorkflow {
    pub id: Uuid,
    pub domain_id: String,
    pub template_id: Option<Uuid>,
    pub actor: PactaraId,
    pub target: PactaraId,
    pub title: String,
    pub status: String,
    pub current_step: i32,
    pub pact_id: Option<Uuid>,
    pub risk_id: Option<Uuid>,
    #[serde(default)]
    pub payload: Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub step_order: i32,
    pub label: String,
    pub status: String,
    #[serde(default)]
    pub output: Value,
    pub pact_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowReview {
    pub id: Uuid,
    pub workflow_id: Uuid,
    pub reviewer: PactaraId,
    pub decision: String,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub id: Uuid,
    pub subject_id: String,
    pub risk_level: String,
    pub score: i32,
    pub reasons: Vec<String>,
    pub mitigation_strategy: Option<String>,
    pub confidence_score: Option<f32>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflowRequest {
    pub domain_id: String,
    pub template_id: Option<Uuid>,
    pub actor: PactaraId,
    pub target: PactaraId,
    pub title: String,
    #[serde(default)]
    pub payload: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvanceWorkflowRequest {
    #[serde(default)]
    pub output: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewWorkflowRequest {
    pub reviewer: PactaraId,
    pub decision: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowResponse {
    pub workflow: DomainWorkflow,
    pub steps: Vec<WorkflowStep>,
    pub reviews: Vec<WorkflowReview>,
    pub risk: Option<RiskAssessment>,
    pub pact: Option<Pact>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReputationScore {
    pub identity_id: PactaraId,
    pub score: i32,
    pub tier: String,
    #[serde(default)]
    pub factors: Value,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReputationEvent {
    pub id: Uuid,
    pub identity_id: PactaraId,
    pub delta: i32,
    pub reason: String,
    pub source_id: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReputationResponse {
    pub score: ReputationScore,
    pub events: Vec<ReputationEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub category: String,
    pub id: String,
    pub label: String,
    pub summary: String,
    #[serde(default)]
    pub metadata: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub query: String,
    pub results: Vec<SearchResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioNode {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub domain_id: Option<String>,
    #[serde(default)]
    pub metadata: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioEdge {
    pub from: String,
    pub to: String,
    pub relation: String,
    pub weight: i32,
    #[serde(default)]
    pub metadata: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldScenario {
    pub id: Uuid,
    pub actor: PactaraId,
    pub domain_id: String,
    pub title: String,
    pub summary: String,
    pub status: String,
    pub nodes: Vec<ScenarioNode>,
    pub edges: Vec<ScenarioEdge>,
    #[serde(default)]
    pub payload: Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorldScenarioRequest {
    pub actor: PactaraId,
    pub domain_id: String,
    pub title: String,
    pub summary: Option<String>,
    #[serde(default)]
    pub nodes: Vec<ScenarioNode>,
    #[serde(default)]
    pub edges: Vec<ScenarioEdge>,
    #[serde(default)]
    pub payload: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunWorldScenarioRequest {
    #[serde(default)]
    pub parameters: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioRun {
    pub id: Uuid,
    pub scenario_id: Uuid,
    pub status: String,
    pub impact_score: i32,
    pub risk_level: String,
    #[serde(default)]
    pub recommended_actions: Value,
    #[serde(default)]
    pub generated_objects: Value,
    #[serde(default)]
    pub output: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandResult {
    pub status: String,
    pub summary: String,
    #[serde(default)]
    pub generated_objects: Value,
    #[serde(default)]
    pub next_actions: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeCommand {
    pub id: Uuid,
    pub actor: PactaraId,
    pub domain_id: String,
    pub intent: String,
    pub target: PactaraId,
    pub command_text: String,
    #[serde(default)]
    pub payload: Value,
    pub status: String,
    pub result: CommandResult,
    pub pact_id: Option<Uuid>,
    pub workflow_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRuntimeCommandRequest {
    pub actor: PactaraId,
    pub domain_id: String,
    pub intent: String,
    pub target: PactaraId,
    pub command_text: String,
    #[serde(default)]
    pub payload: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCrew {
    pub id: Uuid,
    pub actor: PactaraId,
    pub label: String,
    pub objective: String,
    pub status: String,
    #[serde(default)]
    pub policy_decision: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCrewMember {
    pub id: Uuid,
    pub crew_id: Uuid,
    pub agent_id: Uuid,
    pub mandate_id: Uuid,
    pub role: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAgentCrewMemberRequest {
    pub agent_id: Uuid,
    pub mandate_id: Uuid,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAgentCrewRequest {
    pub actor: PactaraId,
    pub label: String,
    pub objective: String,
    #[serde(default)]
    pub members: Vec<CreateAgentCrewMemberRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrewRun {
    pub id: Uuid,
    pub crew_id: Uuid,
    pub status: String,
    pub policy_decision: String,
    pub requires_review: bool,
    #[serde(default)]
    pub output: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunAgentCrewRequest {
    #[serde(default)]
    pub input: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentCrewResponse {
    pub crew: AgentCrew,
    pub members: Vec<AgentCrewMember>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrewRunResponse {
    pub run: CrewRun,
    pub crew: AgentCrew,
    pub members: Vec<AgentCrewMember>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CivilizationSignal {
    pub id: Uuid,
    pub domain_id: String,
    pub actor: Option<PactaraId>,
    pub signal_type: String,
    pub severity: i32,
    pub title: String,
    #[serde(default)]
    pub payload: Value,
    pub status: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub correlation_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeTimelineItem {
    pub id: String,
    pub item_type: String,
    pub title: String,
    pub status: String,
    pub actor: Option<PactaraId>,
    pub domain_id: Option<String>,
    #[serde(default)]
    pub metadata: Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, thiserror::Error)]
pub enum PactaraCoreError {
    #[error("unknown PACT status: {0}")]
    UnknownStatus(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pact_signing_payload_excludes_mutable_verification_fields() {
        let pact = Pact::new(CreatePactRequest {
            actor: "pactara:person:a".to_string(),
            intent: "trade.sell".to_string(),
            object: json!({"batch": "cacao-1"}),
            target: "pactara:org:b".to_string(),
            terms: json!({"quantity": "500kg"}),
            consent: json!({"mode": "explicit"}),
            proof: json!({"origin": "farm"}),
            expires_at: None,
        });

        let payload = pact.signing_payload();
        assert!(payload.get("signature").is_none());
        assert!(payload.get("hash").is_none());
        assert!(payload.get("status").is_none());
        assert_eq!(payload["intent"], "trade.sell");
    }

    #[test]
    fn status_round_trip_uses_protocol_values() {
        assert_eq!(PactStatus::try_from("active").unwrap(), PactStatus::Active);
        assert_eq!(PactStatus::Revoked.as_str(), "revoked");
        assert!(PactStatus::try_from("unknown").is_err());
    }
}
