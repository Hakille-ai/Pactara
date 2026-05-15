mod validation;

use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::sse::{Event, Sse},
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use chrono::{Duration, Utc};
use futures_util::stream;
use pactara_agent::{evaluate_policy as evaluate_policy_decision, mandate_allows_agent_run};
use pactara_auth::{
    create_challenge as create_auth_challenge_value,
    verify_signed_request as verify_signed_request_value,
};
use pactara_core::{
    AdvanceWorkflowRequest, AgentCrew, AgentCrewMember, AgentCrewResponse, AgentProfile, AgentRun,
    AgentRunResponse, AgentTask, AgentTaskResponse, AgentTaskRunResponse, ApproveAgentTaskRequest,
    AuditEvent, AuthChallenge, AuthSession, AuthSessionResponse, BundleVerificationResponse,
    CivilizationSignal, CommandResult, CreateAgentCrewRequest, CreateAgentProfileRequest,
    CreateAgentRunRequest, CreateAgentTaskRequest, CreateAuthChallengeRequest,
    CreateDevSessionRequest, CreateDomainActionRequest, CreateGenomeRequest, CreateIdentityRequest,
    CreateLedgerAccountRequest, CreateLedgerHoldRequest, CreateLedgerTransferRequest,
    CreateMandateRequest, CreateNotificationRequest, CreatePactRequest, CreatePaymentIntentRequest,
    CreatePolicyRuleRequest, CreateProofRequest, CreateRuntimeCommandRequest,
    CreateTokenIssuanceRequest, CreateWorkflowRequest, CreateWorldScenarioRequest, Credential,
    CrewRun, CrewRunResponse, DidDocument, DomainAction, DomainActionResponse,
    DomainActionTemplate, DomainModule, DomainWorkflow, ExecutePaymentResponse, Genome, Identity,
    IdentityKind, LedgerAccount, LedgerAsset, LedgerHold, LedgerLimit, LedgerStatement,
    LedgerTransferResponse, Mandate, MandateCheckRequest, MandateCheckResponse,
    OperationalOverview, Pact, PactBundle, PactStatus, PasskeyLoginFinishRequest,
    PasskeyLoginStartRequest, PasskeyRegisterFinishRequest, PasskeyRegisterStartRequest,
    PaymentIntent, PolicyDecision, PolicyEvaluateRequest, PolicyRule, Proof, ReputationResponse,
    ReviewWorkflowRequest, RevokePactRequest, RunAgentCrewRequest, RunWorldScenarioRequest,
    RuntimeCommand, RuntimeHealth, RuntimeTimelineItem, ScenarioEdge, ScenarioNode, ScenarioRun,
    SearchResponse, SignedRequest, SignedRequestVerification, TokenIssuanceEvent,
    TokenIssuanceResponse, TrustGraph, UpsertLedgerLimitRequest, VerifyPactResponse,
    WorkflowResponse, WorkflowTemplate, WorldScenario,
};
use pactara_crypto::{generate_key_material, hash_value, sign_value, verify_value};
use pactara_db::{Db, DbError};
use pactara_domain::action_to_pact_request;
use pactara_ledger::PACT_ASSET_ID;
use pactara_verifier::verify_bundle as verify_bundle_portable;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::convert::Infallible;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use uuid::Uuid;
use validation::{
    validate_agent_crew_request, validate_agent_profile_request, validate_agent_run_request,
    validate_agent_task_request, validate_ledger_account_request, validate_ledger_hold_request,
    validate_ledger_limit_request, validate_ledger_transfer_request, validate_mandate_request,
    validate_notification_request, validate_pact_request, validate_payment_intent_request,
    validate_policy_evaluate_request, validate_policy_rule_request,
    validate_runtime_command_request, validate_token_issuance_request, validate_workflow_request,
    validate_world_scenario_request,
};

#[derive(Clone)]
pub struct AppState {
    pub db: Db,
    pub auth_required: bool,
}

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/ready", get(ready))
        .route("/v1/identities", post(create_identity))
        .route("/v1/identities/:id", get(get_identity))
        .route("/v1/identities/:id/did", get(get_identity_did))
        .route("/v1/pacts", post(create_pact))
        .route("/v1/pacts/:id", get(get_pact))
        .route("/v1/pacts/:id/bundle", get(get_pact_bundle))
        .route("/v1/pacts/:id/timeline", get(get_pact_timeline))
        .route("/v1/pacts/:id/sign", post(sign_pact))
        .route("/v1/pacts/:id/verify", post(verify_pact))
        .route("/v1/pacts/:id/revoke", post(revoke_pact))
        .route("/v1/bundles/verify", post(verify_bundle))
        .route("/v1/proofs", get(list_proofs).post(create_proof))
        .route("/v1/mandates", get(list_mandates).post(create_mandate))
        .route("/v1/mandates/:id/check", post(check_mandate))
        .route("/v1/genomes", get(list_genomes).post(create_genome))
        .route("/v1/network/status", get(network_status))
        .route("/v1/graph/trust", get(trust_graph))
        .route("/v1/domains", get(list_domains))
        .route(
            "/v1/domains/:id/actions",
            get(list_domain_actions).post(create_domain_action),
        )
        .route("/v1/auth/challenges", post(create_auth_challenge))
        .route(
            "/v1/auth/passkeys/register/start",
            post(passkey_register_start),
        )
        .route(
            "/v1/auth/passkeys/register/finish",
            post(passkey_register_finish),
        )
        .route("/v1/auth/passkeys/login/start", post(passkey_login_start))
        .route("/v1/auth/passkeys/login/finish", post(passkey_login_finish))
        .route(
            "/v1/auth/signed-requests/verify",
            post(verify_signed_request),
        )
        .route("/v1/auth/credentials", get(list_credentials))
        .route("/v1/auth/credentials/:id", delete(delete_credential))
        .route("/v1/auth/sessions/dev", post(create_dev_session))
        .route("/v1/ledger/assets", get(list_ledger_assets))
        .route(
            "/v1/ledger/accounts",
            get(list_ledger_accounts).post(create_ledger_account),
        )
        .route("/v1/ledger/accounts/:id/statement", get(ledger_statement))
        .route("/v1/ledger/transfers", post(create_ledger_transfer))
        .route("/v1/ledger/holds", post(create_ledger_hold))
        .route("/v1/ledger/holds/:id/release", post(release_ledger_hold))
        .route(
            "/v1/ledger/accounts/:id/limit",
            get(get_ledger_limit).post(upsert_ledger_limit),
        )
        .route(
            "/v1/payments/intents",
            get(list_payment_intents).post(create_payment_intent),
        )
        .route("/v1/payments/:id/execute", post(execute_payment))
        .route("/v1/payments/:id/reject", post(reject_payment))
        .route("/v1/token/issue", post(issue_token))
        .route("/v1/agents", get(list_agents).post(create_agent))
        .route("/v1/agents/:id/runs", post(create_agent_run))
        .route(
            "/v1/agent-tasks",
            get(list_agent_tasks).post(create_agent_task),
        )
        .route("/v1/agent-tasks/:id/approve", post(approve_agent_task))
        .route("/v1/agent-tasks/:id/run", post(run_agent_task))
        .route("/v1/policies/evaluate", post(evaluate_policy))
        .route(
            "/v1/policies/rules",
            get(list_policy_rules).post(create_policy_rule),
        )
        .route("/v1/workflows", get(list_workflows).post(create_workflow))
        .route("/v1/workflows/templates", get(list_workflow_templates))
        .route("/v1/workflows/:id", get(get_workflow))
        .route("/v1/workflows/:id/advance", post(advance_workflow))
        .route("/v1/workflows/:id/review", post(review_workflow))
        .route("/v1/workflows/:id/timeline", get(get_workflow_timeline))
        .route("/v1/reputation/:identity", get(get_reputation))
        .route("/v1/reputation/recompute", post(recompute_reputation))
        .route("/v1/search", get(search))
        .route(
            "/v1/world/scenarios",
            get(list_world_scenarios).post(create_world_scenario),
        )
        .route("/v1/world/scenarios/:id", get(get_world_scenario))
        .route("/v1/world/scenarios/:id/run", post(run_world_scenario))
        .route(
            "/v1/runtime/commands",
            get(list_runtime_commands).post(create_runtime_command),
        )
        .route("/v1/runtime/timeline", get(runtime_timeline))
        .route(
            "/v1/agent-crews",
            get(list_agent_crews).post(create_agent_crew),
        )
        .route("/v1/agent-crews/:id/run", post(run_agent_crew))
        .route("/v1/ops/overview", get(ops_overview))
        .route("/v1/ops/domain-actions", get(list_recent_domain_actions))
        .route("/v1/ops/agent-runs", get(list_recent_agent_runs))
        .route("/v1/ops/stream", get(ops_stream))
        .route("/v1/audit/events", get(list_audit_events))
        .route("/v1/events", get(list_events))
        .route("/v1/notifications", get(list_notifications).post(create_notification))
        .route("/v1/notifications/:id/read", post(mark_notification_as_read))
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: &'static str,
    protocol: &'static str,
    version: &'static str,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        protocol: "PACTARA",
        version: env!("CARGO_PKG_VERSION"),
    })
}

async fn ready(State(state): State<AppState>) -> Result<Json<RuntimeHealth>, ApiError> {
    state.db.ready().await?;
    Ok(Json(RuntimeHealth {
        status: "ready".to_string(),
        database: true,
        generated_at: Utc::now(),
        checks: json!({
            "postgres": "ok",
            "protocol": "PACTARA",
            "version": env!("CARGO_PKG_VERSION")
        }),
    }))
}

async fn create_identity(
    State(state): State<AppState>,
    Json(payload): Json<CreateIdentityRequest>,
) -> Result<Json<Identity>, ApiError> {
    if payload.label.trim().is_empty() {
        return Err(ApiError::bad_request("identity label is required"));
    }

    let keys = generate_key_material();
    let identity = Identity {
        id: format!(
            "pactara:{}:{}",
            identity_segment(&payload.kind),
            Uuid::new_v4()
        ),
        label: payload.label.trim().to_string(),
        kind: payload.kind,
        public_key: keys.public_key,
        private_key: Some(keys.private_key),
        created_at: Utc::now(),
    };

    Ok(Json(
        state
            .db
            .create_identity(identity)
            .await?
            .without_private_key(),
    ))
}

async fn get_identity(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Identity>, ApiError> {
    Ok(Json(
        state.db.get_identity(&id).await?.without_private_key(),
    ))
}

async fn get_identity_did(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<DidDocument>, ApiError> {
    let identity = state.db.get_identity(&id).await?;
    Ok(Json(DidDocument::from_identity(&identity)))
}

async fn create_pact(
    State(state): State<AppState>,
    Json(payload): Json<CreatePactRequest>,
) -> Result<Json<Pact>, ApiError> {
    validate_pact_request(&payload)?;
    state.db.get_identity(&payload.actor).await?;

    let mut pact = Pact::new(payload);
    pact.hash = hash_value(&pact.signing_payload());

    Ok(Json(state.db.create_pact(pact).await?))
}

async fn get_pact(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Pact>, ApiError> {
    Ok(Json(state.db.get_pact(id).await?))
}

async fn get_pact_bundle(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<PactBundle>, ApiError> {
    let pact = state.db.get_pact(id).await?;
    let actor = state.db.get_identity(&pact.actor).await?;
    let proofs = state.db.list_proofs(Some(id), 200).await?;
    let revocation = state.db.get_revocation(id).await?;
    let timeline = state
        .db
        .list_events_for_subject(&id.to_string(), 500)
        .await?;
    let verification = verify_pact_inner(&state, &pact, &actor).await?;

    Ok(Json(PactBundle {
        protocol: "PACTARA".to_string(),
        bundle_version: "0.4".to_string(),
        generated_at: Utc::now(),
        pact,
        actor: actor.public_view(),
        proofs,
        revocation,
        verification,
        timeline,
    }))
}

async fn verify_bundle(
    Json(payload): Json<PactBundle>,
) -> Result<Json<BundleVerificationResponse>, ApiError> {
    Ok(Json(verify_bundle_portable(&payload)))
}

async fn get_pact_timeline(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<pactara_core::EventLog>>, ApiError> {
    state.db.get_pact(id).await?;
    Ok(Json(
        state
            .db
            .list_events_for_subject(&id.to_string(), 500)
            .await?,
    ))
}

async fn sign_pact(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Pact>, ApiError> {
    let pact = state.db.get_pact(id).await?;
    if pact.status == PactStatus::Revoked {
        return Err(ApiError::bad_request("revoked PACTs cannot be signed"));
    }
    if pact.is_expired_at(Utc::now()) {
        return Err(ApiError::bad_request("expired PACTs cannot be signed"));
    }

    let actor = state.db.get_identity(&pact.actor).await?;
    let private_key = actor.private_key.ok_or(DbError::MissingPrivateKey)?;
    let signed = sign_value(&private_key, &pact.signing_payload())?;

    Ok(Json(
        state
            .db
            .sign_pact(pact.id, signed.signature, signed.hash)
            .await?,
    ))
}

async fn verify_pact(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<VerifyPactResponse>, ApiError> {
    let pact = state.db.get_pact(id).await?;
    let actor = state.db.get_identity(&pact.actor).await?;
    let response = verify_pact_inner(&state, &pact, &actor).await?;

    if response.status != pact.status && response.status != PactStatus::Draft {
        let _ = state
            .db
            .mark_pact_status(pact.id, response.status.clone())
            .await;
    }

    Ok(Json(response))
}

async fn verify_pact_inner(
    state: &AppState,
    pact: &Pact,
    actor: &Identity,
) -> Result<VerifyPactResponse, ApiError> {
    let revoked = state.db.is_pact_revoked(pact.id).await?;
    let expired = pact.is_expired_at(Utc::now());
    let expected_hash = hash_value(&pact.signing_payload());
    let hash_matches = expected_hash == pact.hash;
    let signature_valid = match pact.signature.as_deref() {
        Some(signature) => verify_value(&actor.public_key, signature, &pact.signing_payload())?,
        None => false,
    };

    let mut reasons = Vec::new();
    let status = if revoked || pact.status == PactStatus::Revoked {
        reasons.push("PACT has been revoked".to_string());
        PactStatus::Revoked
    } else if expired {
        reasons.push("PACT is expired".to_string());
        PactStatus::Expired
    } else if pact.signature.is_none() {
        reasons.push("PACT is not signed".to_string());
        PactStatus::Draft
    } else if !hash_matches {
        reasons.push("PACT hash does not match signing payload".to_string());
        PactStatus::Invalid
    } else if !signature_valid {
        reasons.push("PACT signature is invalid".to_string());
        PactStatus::Invalid
    } else {
        PactStatus::Active
    };

    Ok(VerifyPactResponse {
        pact_id: pact.id,
        valid: status == PactStatus::Active,
        status,
        hash_matches,
        signature_valid,
        revoked,
        expired,
        reasons,
    })
}

async fn revoke_pact(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RevokePactRequest>,
) -> Result<Json<pactara_core::Revocation>, ApiError> {
    if payload.reason.trim().is_empty() {
        return Err(ApiError::bad_request("revocation reason is required"));
    }

    state.db.get_pact(id).await?;
    Ok(Json(
        state
            .db
            .revoke_pact(id, payload.revoked_by, payload.reason)
            .await?,
    ))
}

async fn create_proof(
    State(state): State<AppState>,
    Json(payload): Json<CreateProofRequest>,
) -> Result<Json<Proof>, ApiError> {
    if payload.proof_type.trim().is_empty() {
        return Err(ApiError::bad_request("proof_type is required"));
    }
    if let Some(pact_id) = payload.pact_id {
        state.db.get_pact(pact_id).await?;
    }

    Ok(Json(state.db.create_proof(Proof::new(payload)).await?))
}

#[derive(Debug, Deserialize)]
struct ProofsQuery {
    pact_id: Option<Uuid>,
    limit: Option<i64>,
}

async fn list_proofs(
    State(state): State<AppState>,
    Query(query): Query<ProofsQuery>,
) -> Result<Json<Vec<Proof>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_proofs(query.pact_id, query.limit.unwrap_or(50))
            .await?,
    ))
}

async fn create_mandate(
    State(state): State<AppState>,
    Json(payload): Json<CreateMandateRequest>,
) -> Result<Json<Mandate>, ApiError> {
    validate_mandate_request(&payload)?;
    state.db.get_identity(&payload.principal).await?;
    state.db.get_identity(&payload.agent).await?;

    Ok(Json(state.db.create_mandate(Mandate::new(payload)).await?))
}

async fn list_mandates(State(state): State<AppState>) -> Result<Json<Vec<Mandate>>, ApiError> {
    Ok(Json(state.db.list_mandates(50).await?))
}

async fn check_mandate(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<MandateCheckRequest>,
) -> Result<Json<MandateCheckResponse>, ApiError> {
    if payload.action.trim().is_empty() {
        return Err(ApiError::bad_request("mandate check action is required"));
    }

    let mandate = state.db.get_mandate(id).await?;
    Ok(Json(evaluate_mandate(&mandate, payload)))
}

async fn create_genome(
    State(state): State<AppState>,
    Json(payload): Json<CreateGenomeRequest>,
) -> Result<Json<Genome>, ApiError> {
    if payload.subject.trim().is_empty() {
        return Err(ApiError::bad_request("genome subject is required"));
    }

    Ok(Json(state.db.create_genome(Genome::new(payload)).await?))
}

#[derive(Debug, Deserialize)]
struct ListQuery {
    limit: Option<i64>,
}

async fn list_genomes(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<Genome>>, ApiError> {
    Ok(Json(
        state.db.list_genomes(query.limit.unwrap_or(50)).await?,
    ))
}

async fn network_status(
    State(state): State<AppState>,
) -> Result<Json<pactara_core::NetworkStats>, ApiError> {
    Ok(Json(state.db.network_stats().await?))
}

async fn trust_graph(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<TrustGraph>, ApiError> {
    Ok(Json(state.db.trust_graph(query.limit.unwrap_or(80)).await?))
}

async fn list_domains(State(state): State<AppState>) -> Result<Json<Vec<DomainModule>>, ApiError> {
    Ok(Json(state.db.list_domain_modules().await?))
}

async fn list_domain_actions(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Vec<DomainActionTemplate>>, ApiError> {
    Ok(Json(state.db.list_domain_templates(&id).await?))
}

async fn create_domain_action(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(domain_id): Path<String>,
    Json(payload): Json<CreateDomainActionRequest>,
) -> Result<Json<DomainActionResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    if payload.actor.trim().is_empty() || payload.target.trim().is_empty() {
        return Err(ApiError::bad_request(
            "domain action actor and target are required",
        ));
    }
    state.db.get_identity(&payload.actor).await?;

    let templates = state.db.list_domain_templates(&domain_id).await?;
    let selected_template = match payload.template_id {
        Some(id) => Some(state.db.get_domain_template(id).await?),
        None => templates
            .iter()
            .find(|template| template.action_type == payload.action_type)
            .cloned(),
    };
    let default_terms = selected_template
        .as_ref()
        .map(|template| template.default_terms.clone())
        .unwrap_or_else(|| json!({"execution": "pactara-domain"}));
    let action_type = if payload.action_type.trim().is_empty() {
        selected_template
            .as_ref()
            .map(|template| template.action_type.clone())
            .unwrap_or_else(|| "custom.action".to_string())
    } else {
        payload.action_type.trim().to_string()
    };
    let action_request = CreateDomainActionRequest {
        action_type: action_type.clone(),
        ..payload
    };
    let mut pact = Pact::new(action_to_pact_request(
        &domain_id,
        &action_request,
        default_terms,
    ));
    pact.hash = hash_value(&pact.signing_payload());
    let pact = state.db.create_pact(pact).await?;

    let action = state
        .db
        .create_domain_action(DomainAction {
            id: Uuid::new_v4(),
            domain_id,
            template_id: selected_template.map(|template| template.id),
            actor: action_request.actor.clone(),
            pact_id: pact.id,
            action_type,
            payload: action_request.payload.clone(),
            status: "created".to_string(),
            created_at: Utc::now(),
        })
        .await?;
    let audit = state
        .db
        .create_audit_event(AuditEvent {
            id: Uuid::new_v4(),
            event_type: "domain.action.created".to_string(),
            actor: Some(action.actor.clone()),
            subject_id: action.id.to_string(),
            decision: Some("allow".to_string()),
            payload: json!({"pact_id": pact.id, "domain_id": action.domain_id.clone()}),
            created_at: Utc::now(),
        })
        .await?;

    Ok(Json(DomainActionResponse {
        action,
        pact,
        audit,
    }))
}

async fn create_auth_challenge(
    State(state): State<AppState>,
    Json(payload): Json<CreateAuthChallengeRequest>,
) -> Result<Json<AuthChallenge>, ApiError> {
    if let Some(identity_id) = payload.identity_id.as_deref() {
        state.db.get_identity(identity_id).await?;
    }
    let challenge = create_auth_challenge_value(
        payload.identity_id,
        payload.purpose.unwrap_or_else(|| "generic".to_string()),
        payload.ttl_seconds.unwrap_or(300),
    );
    Ok(Json(state.db.create_auth_challenge(challenge).await?))
}

async fn passkey_register_start(
    State(state): State<AppState>,
    Json(payload): Json<PasskeyRegisterStartRequest>,
) -> Result<Json<AuthChallenge>, ApiError> {
    state.db.get_identity(&payload.identity_id).await?;
    let challenge = create_auth_challenge_value(Some(payload.identity_id), "passkey.register", 300);
    Ok(Json(state.db.create_auth_challenge(challenge).await?))
}

async fn passkey_register_finish(
    State(state): State<AppState>,
    Json(payload): Json<PasskeyRegisterFinishRequest>,
) -> Result<Json<Credential>, ApiError> {
    let challenge = state
        .db
        .consume_auth_challenge(payload.challenge_id)
        .await?;
    if challenge.identity_id.as_deref() != Some(payload.identity_id.as_str()) {
        return Err(ApiError::bad_request("challenge does not match identity"));
    }
    state.db.get_identity(&payload.identity_id).await?;

    Ok(Json(
        state
            .db
            .create_credential(Credential {
                id: Uuid::new_v4(),
                identity_id: payload.identity_id,
                credential_type: "passkey".to_string(),
                credential_id: payload.credential_id,
                public_key: payload.public_key,
                transports: payload.transports,
                created_at: Utc::now(),
                last_used_at: None,
            })
            .await?,
    ))
}

async fn passkey_login_start(
    State(state): State<AppState>,
    Json(payload): Json<PasskeyLoginStartRequest>,
) -> Result<Json<AuthChallenge>, ApiError> {
    let identity_id = if let Some(credential_id) = payload.credential_id.as_deref() {
        Some(
            state
                .db
                .get_credential_by_public_id(credential_id)
                .await?
                .identity_id,
        )
    } else {
        payload.identity_id
    };
    if let Some(identity_id) = identity_id.as_deref() {
        state.db.get_identity(identity_id).await?;
    }
    let challenge = create_auth_challenge_value(identity_id, "passkey.login", 300);
    Ok(Json(state.db.create_auth_challenge(challenge).await?))
}

async fn passkey_login_finish(
    State(state): State<AppState>,
    Json(payload): Json<PasskeyLoginFinishRequest>,
) -> Result<Json<AuthSessionResponse>, ApiError> {
    let challenge = state
        .db
        .consume_auth_challenge(payload.challenge_id)
        .await?;
    let credential = state.db.touch_credential(&payload.credential_id).await?;
    if let Some(identity_id) = challenge.identity_id.as_deref() {
        if identity_id != credential.identity_id {
            return Err(ApiError::bad_request(
                "challenge does not match credential identity",
            ));
        }
    }

    Ok(Json(AuthSessionResponse {
        authenticated: true,
        identity_id: credential.identity_id,
        credential_id: credential.credential_id,
        reasons: vec!["passkey challenge consumed in v0.5 sandbox mode".to_string()],
    }))
}

async fn verify_signed_request(
    State(state): State<AppState>,
    Json(payload): Json<SignedRequest>,
) -> Result<Json<SignedRequestVerification>, ApiError> {
    let identity = state.db.get_identity(&payload.identity_id).await?;
    let seen_nonce = state.db.nonce_seen(&payload.nonce).await?;
    let verification = verify_signed_request_value(&identity.public_key, &payload, seen_nonce);
    if verification.valid {
        state
            .db
            .record_nonce(
                &payload.identity_id,
                &payload.nonce,
                Utc::now() + Duration::minutes(10),
            )
            .await?;
        state
            .db
            .create_audit_event(AuditEvent {
                id: Uuid::new_v4(),
                event_type: "auth.signed_request.verified".to_string(),
                actor: Some(payload.identity_id.clone()),
                subject_id: payload.nonce.clone(),
                decision: Some("allow".to_string()),
                payload: json!({"request": payload.payload}),
                created_at: Utc::now(),
            })
            .await?;
    }
    Ok(Json(verification))
}

#[derive(Debug, Deserialize)]
struct CredentialsQuery {
    identity: Option<String>,
    limit: Option<i64>,
}

async fn list_credentials(
    State(state): State<AppState>,
    Query(query): Query<CredentialsQuery>,
) -> Result<Json<Vec<Credential>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_credentials(query.identity, query.limit.unwrap_or(50))
            .await?,
    ))
}

async fn delete_credential(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Credential>, ApiError> {
    ensure_auth(&state, &headers).await?;
    Ok(Json(state.db.delete_credential(id).await?))
}

async fn create_dev_session(
    State(state): State<AppState>,
    Json(payload): Json<CreateDevSessionRequest>,
) -> Result<Json<AuthSession>, ApiError> {
    state.db.get_identity(&payload.identity_id).await?;
    let session = AuthSession {
        id: Uuid::new_v4(),
        identity_id: payload.identity_id,
        session_token: format!("pactara_dev_{}", Uuid::new_v4()),
        issued_by: "dev".to_string(),
        expires_at: Utc::now()
            + Duration::seconds(payload.ttl_seconds.unwrap_or(3600).clamp(60, 86_400)),
        revoked_at: None,
        created_at: Utc::now(),
    };
    Ok(Json(state.db.create_auth_session(session).await?))
}

#[derive(Debug, Deserialize)]
struct AccountsQuery {
    owner: Option<String>,
    limit: Option<i64>,
}

async fn create_ledger_account(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateLedgerAccountRequest>,
) -> Result<Json<LedgerAccount>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_ledger_account_request(&payload)?;
    state.db.get_identity(&payload.owner).await?;
    let asset_id = payload
        .asset_id
        .unwrap_or_else(|| PACT_ASSET_ID.to_string());
    let label = payload.label.unwrap_or_else(|| "main".to_string());
    Ok(Json(
        state
            .db
            .create_ledger_account(
                LedgerAccount {
                    id: Uuid::new_v4(),
                    owner: payload.owner,
                    asset_id,
                    label,
                    balance: 0,
                    created_at: Utc::now(),
                },
                payload.initial_balance.unwrap_or(0),
            )
            .await?,
    ))
}

async fn list_ledger_accounts(
    State(state): State<AppState>,
    Query(query): Query<AccountsQuery>,
) -> Result<Json<Vec<LedgerAccount>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_ledger_accounts(query.owner, query.limit.unwrap_or(50))
            .await?,
    ))
}

async fn list_ledger_assets(
    State(state): State<AppState>,
) -> Result<Json<Vec<LedgerAsset>>, ApiError> {
    Ok(Json(state.db.list_ledger_assets().await?))
}

async fn ledger_statement(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(query): Query<ListQuery>,
) -> Result<Json<LedgerStatement>, ApiError> {
    Ok(Json(
        state
            .db
            .ledger_statement(id, query.limit.unwrap_or(80))
            .await?,
    ))
}

async fn create_ledger_transfer(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateLedgerTransferRequest>,
) -> Result<Json<LedgerTransferResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_ledger_transfer_request(&payload)?;
    let pact = state.db.get_pact(payload.pact_id).await?;
    let (transfer, audit) = state
        .db
        .create_ledger_transfer(
            &pact,
            payload.debit_account_id,
            payload.credit_account_id,
            payload.amount,
            payload.memo,
        )
        .await?;
    let debit_statement = state
        .db
        .ledger_statement(transfer.debit_account_id, 20)
        .await?;
    let credit_statement = state
        .db
        .ledger_statement(transfer.credit_account_id, 20)
        .await?;
    Ok(Json(LedgerTransferResponse {
        transfer,
        debit_statement,
        credit_statement,
        audit,
    }))
}

async fn create_ledger_hold(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateLedgerHoldRequest>,
) -> Result<Json<LedgerHold>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_ledger_hold_request(&payload)?;
    let account = state.db.get_ledger_account(payload.account_id).await?;
    let pact = state.db.get_pact(payload.pact_id).await?;
    if pact.status != PactStatus::Active || pact.signature.is_none() {
        return Err(ApiError::bad_request("hold requires a signed active PACT"));
    }
    let held = state.db.active_holds_total(account.id).await?;
    if account.balance - held < payload.amount {
        return Err(ApiError::bad_request(
            "account has insufficient available balance",
        ));
    }

    Ok(Json(
        state
            .db
            .create_ledger_hold(LedgerHold {
                id: Uuid::new_v4(),
                account_id: account.id,
                pact_id: pact.id,
                amount: payload.amount,
                asset_id: account.asset_id,
                status: "held".to_string(),
                reason: payload.reason,
                created_at: Utc::now(),
                released_at: None,
            })
            .await?,
    ))
}

async fn release_ledger_hold(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<LedgerHold>, ApiError> {
    ensure_auth(&state, &headers).await?;
    Ok(Json(state.db.release_ledger_hold(id).await?))
}

async fn create_payment_intent(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreatePaymentIntentRequest>,
) -> Result<Json<PaymentIntent>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_payment_intent_request(&payload)?;
    let payer = state
        .db
        .get_ledger_account(payload.payer_account_id)
        .await?;
    let payee = state
        .db
        .get_ledger_account(payload.payee_account_id)
        .await?;
    if payer.asset_id != payee.asset_id {
        return Err(ApiError::bad_request(
            "payment accounts must use the same asset",
        ));
    }
    state.db.get_pact(payload.pact_id).await?;

    Ok(Json(
        state
            .db
            .create_payment_intent(PaymentIntent {
                id: Uuid::new_v4(),
                payer_account_id: payload.payer_account_id,
                payee_account_id: payload.payee_account_id,
                pact_id: payload.pact_id,
                amount: payload.amount,
                asset_id: payer.asset_id,
                status: "pending".to_string(),
                memo: payload.memo,
                created_at: Utc::now(),
                executed_at: None,
            })
            .await?,
    ))
}

async fn list_payment_intents(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<PaymentIntent>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_payment_intents(query.limit.unwrap_or(50))
            .await?,
    ))
}

async fn execute_payment(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ExecutePaymentResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    let (payment, transfer, audit) = state.db.execute_payment_intent(id).await?;
    Ok(Json(ExecutePaymentResponse {
        payment,
        transfer,
        audit,
    }))
}

#[derive(Debug, Deserialize)]
struct RejectPaymentRequest {
    reason: Option<String>,
}

async fn reject_payment(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    payload: Option<Json<RejectPaymentRequest>>,
) -> Result<Json<ExecutePaymentResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    let reason = payload
        .and_then(|Json(payload)| payload.reason)
        .unwrap_or_else(|| "rejected by operator".to_string());
    let (payment, audit) = state.db.reject_payment_intent(id, reason).await?;
    let transfer = pactara_core::LedgerTransfer {
        id: Uuid::nil(),
        payment_intent_id: Some(payment.id),
        asset_id: payment.asset_id.clone(),
        amount: payment.amount,
        debit_account_id: payment.payer_account_id,
        credit_account_id: payment.payee_account_id,
        status: "rejected".to_string(),
        created_at: Utc::now(),
    };
    Ok(Json(ExecutePaymentResponse {
        payment,
        transfer,
        audit,
    }))
}

async fn issue_token(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateTokenIssuanceRequest>,
) -> Result<Json<TokenIssuanceResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_token_issuance_request(&payload)?;
    state.db.get_identity(&payload.issuer).await?;
    let account = state.db.get_ledger_account(payload.account_id).await?;
    let (issuance, account, audit) = state
        .db
        .issue_token(TokenIssuanceEvent {
            id: Uuid::new_v4(),
            asset_id: account.asset_id,
            account_id: account.id,
            issuer: payload.issuer,
            amount: payload.amount,
            memo: payload.memo,
            created_at: Utc::now(),
        })
        .await?;
    Ok(Json(TokenIssuanceResponse {
        issuance,
        account,
        audit,
    }))
}

async fn create_agent(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateAgentProfileRequest>,
) -> Result<Json<AgentProfile>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_agent_profile_request(&payload)?;
    let identity_id = if let Some(identity_id) = payload.identity_id {
        state.db.get_identity(&identity_id).await?;
        identity_id
    } else {
        let keys = generate_key_material();
        let identity = state
            .db
            .create_identity(Identity {
                id: format!("pactara:agent:{}", Uuid::new_v4()),
                label: payload.label.clone(),
                kind: IdentityKind::Agent,
                public_key: keys.public_key,
                private_key: Some(keys.private_key),
                created_at: Utc::now(),
            })
            .await?;
        identity.id
    };

    Ok(Json(
        state
            .db
            .create_agent_profile(AgentProfile {
                id: Uuid::new_v4(),
                identity_id,
                label: payload.label,
                model: payload
                    .model
                    .unwrap_or_else(|| "pactara-policy-agent-v0.5".to_string()),
                capabilities: payload.capabilities,
                created_at: Utc::now(),
            })
            .await?,
    ))
}

async fn list_agents(State(state): State<AppState>) -> Result<Json<Vec<AgentProfile>>, ApiError> {
    Ok(Json(state.db.list_agent_profiles(50).await?))
}

async fn create_agent_run(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateAgentRunRequest>,
) -> Result<Json<AgentRunResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_agent_run_request(&payload)?;
    let agent = state.db.get_agent_profile(id).await?;
    let mandate = state.db.get_mandate(payload.mandate_id).await?;
    if mandate.agent != agent.identity_id {
        return Err(ApiError::bad_request(
            "mandate does not authorize this agent",
        ));
    }

    let mut policy = evaluate_policy_inner(
        &state,
        PolicyEvaluateRequest {
            subject_id: agent.identity_id.clone(),
            action: payload.action.clone(),
            resource: mandate.principal.clone(),
            context: payload.input.clone(),
        },
    )
    .await?;
    if !mandate_allows_agent_run(&mandate, &payload.action) {
        policy.decision = "deny".to_string();
        policy
            .reasons
            .push("mandate does not allow this agent action".to_string());
    }
    let policy = state.db.create_policy_decision(policy).await?;

    let pact_id = if let Some(pact_id) = payload.pact_id {
        Some(pact_id)
    } else {
        let mut pact = Pact::new(CreatePactRequest {
            actor: agent.identity_id.clone(),
            intent: format!("agent.{}", payload.action),
            object: json!({"agent_id": agent.id, "input": payload.input.clone()}),
            target: mandate.principal.clone(),
            terms: json!({"mandate_id": mandate.id, "policy": policy.decision.clone()}),
            consent: json!({"mode": "delegated", "mandate_id": mandate.id}),
            proof: json!({"agent_run": true, "protocol": "PACTARA v0.5"}),
            expires_at: None,
        });
        pact.hash = hash_value(&pact.signing_payload());
        Some(state.db.create_pact(pact).await?.id)
    };
    let status = match policy.decision.as_str() {
        "allow" => "completed",
        "needs_review" => "needs_review",
        _ => "denied",
    }
    .to_string();
    let run = state
        .db
        .create_agent_run(AgentRun {
            id: Uuid::new_v4(),
            agent_id: agent.id,
            mandate_id: mandate.id,
            pact_id,
            action: payload.action,
            input: payload.input,
            output: json!({
                "status": status,
                "policy_decision": policy.decision,
                "agent": agent.label
            }),
            policy_decision: policy.decision.clone(),
            status,
            created_at: Utc::now(),
        })
        .await?;
    state
        .db
        .create_audit_event(AuditEvent {
            id: Uuid::new_v4(),
            event_type: "agent.run.evaluated".to_string(),
            actor: Some(agent.identity_id),
            subject_id: run.id.to_string(),
            decision: Some(policy.decision.clone()),
            payload: json!({"agent_id": agent.id, "mandate_id": mandate.id}),
            created_at: Utc::now(),
        })
        .await?;

    Ok(Json(AgentRunResponse { run, policy }))
}

async fn list_agent_tasks(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<AgentTask>>, ApiError> {
    Ok(Json(
        state.db.list_agent_tasks(query.limit.unwrap_or(50)).await?,
    ))
}

async fn create_agent_task(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateAgentTaskRequest>,
) -> Result<Json<AgentTaskResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_agent_task_request(&payload)?;
    let agent = state.db.get_agent_profile(payload.agent_id).await?;
    let mandate = state.db.get_mandate(payload.mandate_id).await?;
    if mandate.agent != agent.identity_id {
        return Err(ApiError::bad_request(
            "mandate does not authorize this agent",
        ));
    }

    let mut policy = evaluate_policy_inner(
        &state,
        PolicyEvaluateRequest {
            subject_id: agent.identity_id.clone(),
            action: payload.action.clone(),
            resource: mandate.principal.clone(),
            context: payload.input.clone(),
        },
    )
    .await?;
    if !mandate_allows_agent_run(&mandate, &payload.action) {
        policy.decision = "deny".to_string();
        policy
            .reasons
            .push("mandate does not allow this agent action".to_string());
    }
    let policy = state.db.create_policy_decision(policy).await?;
    let requires_approval = payload.requires_approval.unwrap_or(false)
        || policy.decision == "needs_review"
        || payload.action.contains("sign");
    let status = match policy.decision.as_str() {
        "deny" => "denied",
        "needs_review" => "awaiting_approval",
        _ if requires_approval => "awaiting_approval",
        _ => "ready",
    };
    let task = state
        .db
        .create_agent_task(AgentTask {
            id: Uuid::new_v4(),
            agent_id: payload.agent_id,
            mandate_id: payload.mandate_id,
            pact_id: payload.pact_id,
            action: payload.action,
            input: payload.input,
            status: status.to_string(),
            policy_decision: policy.decision.clone(),
            requires_approval,
            approved_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        })
        .await?;
    let log = state
        .db
        .create_agent_run_log(pactara_core::AgentRunLog {
            id: Uuid::new_v4(),
            task_id: Some(task.id),
            run_id: None,
            level: "info".to_string(),
            message: format!("task created with policy {}", policy.decision),
            payload: json!({"status": task.status.clone()}),
            created_at: Utc::now(),
        })
        .await?;

    Ok(Json(AgentTaskResponse {
        task,
        policy,
        logs: vec![log],
    }))
}

async fn approve_agent_task(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ApproveAgentTaskRequest>,
) -> Result<Json<AgentTask>, ApiError> {
    ensure_auth(&state, &headers).await?;
    state.db.get_identity(&payload.approved_by).await?;
    Ok(Json(
        state.db.approve_agent_task(id, payload.approved_by).await?,
    ))
}

async fn run_agent_task(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<AgentTaskRunResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    let task = state.db.get_agent_task(id).await?;
    if task.policy_decision != "allow" {
        return Err(ApiError::bad_request(
            "agent task policy must be allow before run",
        ));
    }
    if task.requires_approval && task.status != "approved" {
        return Err(ApiError::bad_request(
            "agent task requires approval before run",
        ));
    }
    if !matches!(task.status.as_str(), "ready" | "approved") {
        return Err(ApiError::bad_request("agent task is not runnable"));
    }
    let agent = state.db.get_agent_profile(task.agent_id).await?;
    let mandate = state.db.get_mandate(task.mandate_id).await?;
    if !mandate_allows_agent_run(&mandate, &task.action) {
        return Err(ApiError::bad_request(
            "mandate does not allow this agent action",
        ));
    }
    state
        .db
        .update_agent_task_status(task.id, "running")
        .await?;
    let run = state
        .db
        .create_agent_run(AgentRun {
            id: Uuid::new_v4(),
            agent_id: agent.id,
            mandate_id: mandate.id,
            pact_id: task.pact_id,
            action: task.action.clone(),
            input: task.input.clone(),
            output: json!({"status": "completed", "task_id": task.id, "agent": agent.label}),
            policy_decision: task.policy_decision.clone(),
            status: "completed".to_string(),
            created_at: Utc::now(),
        })
        .await?;
    let task = state
        .db
        .update_agent_task_status(task.id, "completed")
        .await?;
    let log = state
        .db
        .create_agent_run_log(pactara_core::AgentRunLog {
            id: Uuid::new_v4(),
            task_id: Some(task.id),
            run_id: Some(run.id),
            level: "info".to_string(),
            message: "agent task completed".to_string(),
            payload: json!({"run_id": run.id}),
            created_at: Utc::now(),
        })
        .await?;

    Ok(Json(AgentTaskRunResponse {
        task,
        run,
        logs: vec![log],
    }))
}

async fn evaluate_policy(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<PolicyEvaluateRequest>,
) -> Result<Json<PolicyDecision>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_policy_evaluate_request(&payload)?;
    let decision = state
        .db
        .create_policy_decision(evaluate_policy_inner(&state, payload).await?)
        .await?;
    state
        .db
        .create_audit_event(AuditEvent {
            id: Uuid::new_v4(),
            event_type: "policy.evaluated".to_string(),
            actor: None,
            subject_id: decision.subject_id.clone(),
            decision: Some(decision.decision.clone()),
            payload: json!({
                "action": decision.action.clone(),
                "resource": decision.resource.clone(),
                "reasons": decision.reasons.clone()
            }),
            created_at: Utc::now(),
        })
        .await?;
    Ok(Json(decision))
}

async fn list_policy_rules(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<PolicyRule>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_policy_rules(query.limit.unwrap_or(50))
            .await?,
    ))
}

async fn create_policy_rule(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreatePolicyRuleRequest>,
) -> Result<Json<PolicyRule>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_policy_rule_request(&payload)?;
    Ok(Json(
        state
            .db
            .create_policy_rule(PolicyRule {
                id: Uuid::new_v4(),
                name: payload.name,
                effect: payload.effect,
                action: payload.action,
                resource: payload.resource,
                priority: payload.priority.unwrap_or(100),
                condition: payload.condition,
                created_at: Utc::now(),
            })
            .await?,
    ))
}

async fn evaluate_policy_inner(
    state: &AppState,
    payload: PolicyEvaluateRequest,
) -> Result<PolicyDecision, ApiError> {
    let mut decision = evaluate_policy_decision(payload);
    let rules = state
        .db
        .matching_policy_rules(&decision.action, &decision.resource)
        .await?;
    if rules.iter().any(|rule| rule.effect == "deny") {
        decision.decision = "deny".to_string();
        decision
            .reasons
            .push("matched persistent deny policy rule".to_string());
    } else if rules.iter().any(|rule| rule.effect == "needs_review") {
        decision.decision = "needs_review".to_string();
        decision
            .reasons
            .push("matched persistent needs_review policy rule".to_string());
    } else if rules.iter().any(|rule| rule.effect == "allow") {
        decision.decision = "allow".to_string();
        decision
            .reasons
            .push("matched persistent allow policy rule".to_string());
    }
    Ok(decision)
}

#[derive(Debug, Deserialize)]
struct WorkflowTemplatesQuery {
    domain: Option<String>,
}

async fn list_workflow_templates(
    State(state): State<AppState>,
    Query(query): Query<WorkflowTemplatesQuery>,
) -> Result<Json<Vec<WorkflowTemplate>>, ApiError> {
    Ok(Json(state.db.list_workflow_templates(query.domain).await?))
}

async fn list_workflows(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<DomainWorkflow>>, ApiError> {
    Ok(Json(
        state.db.list_workflows(query.limit.unwrap_or(50)).await?,
    ))
}

async fn get_workflow(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorkflowResponse>, ApiError> {
    Ok(Json(state.db.workflow_response(id).await?))
}

async fn create_workflow(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateWorkflowRequest>,
) -> Result<Json<WorkflowResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_workflow_request(&payload)?;
    state.db.get_identity(&payload.actor).await?;
    let templates = state
        .db
        .list_workflow_templates(Some(payload.domain_id.clone()))
        .await?;
    let template = match payload.template_id {
        Some(id) => Some(state.db.get_workflow_template(id).await?),
        None => templates.first().cloned(),
    };
    let step_labels = template
        .as_ref()
        .and_then(|template| template.steps.as_array().cloned())
        .map(|items| {
            items
                .into_iter()
                .filter_map(|item| item.as_str().map(ToString::to_string))
                .collect::<Vec<_>>()
        })
        .filter(|items| !items.is_empty())
        .unwrap_or_else(|| {
            vec![
                "Draft intent".to_string(),
                "Create PACT".to_string(),
                "Attach proof".to_string(),
                "Complete workflow".to_string(),
            ]
        });
    let risk = risk_from_workflow(&payload);
    let risk = state.db.create_risk_assessment(risk).await?;
    let action_type = template
        .as_ref()
        .map(|template| template.action_type.clone())
        .unwrap_or_else(|| "workflow.custom".to_string());
    let mut pact = Pact::new(CreatePactRequest {
        actor: payload.actor.clone(),
        intent: format!("workflow.{}.{}", payload.domain_id, action_type),
        object: json!({"workflow_title": payload.title, "payload": payload.payload.clone()}),
        target: payload.target.clone(),
        terms: json!({"runtime": "PACTARA v0.7", "risk": risk.risk_level.clone()}),
        consent: json!({"mode": "workflow", "revocable": true}),
        proof: json!({"workflow": true, "domain": payload.domain_id.clone()}),
        expires_at: None,
    });
    pact.hash = hash_value(&pact.signing_payload());
    let pact = state.db.create_pact(pact).await?;
    let proof = Proof::new(CreateProofRequest {
        pact_id: Some(pact.id),
        proof_type: "workflow.created".to_string(),
        payload: json!({"risk_id": risk.id, "domain_id": payload.domain_id.clone()}),
    });
    let _ = state.db.create_proof(proof).await?;

    let workflow = DomainWorkflow {
        id: Uuid::new_v4(),
        domain_id: payload.domain_id,
        template_id: template.map(|template| template.id),
        actor: payload.actor,
        target: payload.target,
        title: payload.title,
        status: if risk.risk_level == "high" || risk.risk_level == "critical" {
            "needs_review".to_string()
        } else {
            "active".to_string()
        },
        current_step: 1,
        pact_id: Some(pact.id),
        risk_id: Some(risk.id),
        payload: payload.payload,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };
    Ok(Json(
        state
            .db
            .create_domain_workflow(workflow, step_labels)
            .await?,
    ))
}

async fn advance_workflow(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<AdvanceWorkflowRequest>,
) -> Result<Json<WorkflowResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    Ok(Json(state.db.advance_workflow(id, payload.output).await?))
}

async fn review_workflow(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<ReviewWorkflowRequest>,
) -> Result<Json<WorkflowResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    state.db.get_identity(&payload.reviewer).await?;
    if !matches!(
        payload.decision.as_str(),
        "approve" | "reject" | "needs_changes"
    ) {
        return Err(ApiError::bad_request("workflow review decision is invalid"));
    }
    Ok(Json(
        state
            .db
            .create_workflow_review(pactara_core::WorkflowReview {
                id: Uuid::new_v4(),
                workflow_id: id,
                reviewer: payload.reviewer,
                decision: payload.decision,
                notes: payload.notes,
                created_at: Utc::now(),
            })
            .await?,
    ))
}

async fn get_workflow_timeline(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<pactara_core::EventLog>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_events_for_subject(&id.to_string(), 200)
            .await?,
    ))
}

fn risk_from_workflow(payload: &CreateWorkflowRequest) -> pactara_core::RiskAssessment {
    let amount = payload
        .payload
        .get("amount")
        .and_then(serde_json::Value::as_i64)
        .unwrap_or_default();
    let sensitive = payload.domain_id == "health"
        || payload
            .payload
            .get("sensitivity")
            .and_then(serde_json::Value::as_str)
            == Some("high");
    let (risk_level, score, reason) = if sensitive || amount > 10_000 {
        ("high", 80, "sensitive or high-value workflow")
    } else if amount > 1_000 || payload.domain_id == "governance" {
        ("medium", 50, "moderate workflow risk")
    } else {
        ("low", 20, "standard workflow risk")
    };
    pactara_core::RiskAssessment {
        id: Uuid::new_v4(),
        subject_id: format!("workflow:{}:{}", payload.domain_id, payload.actor),
        risk_level: risk_level.to_string(),
        score,
        reasons: vec![reason.to_string()],
        mitigation_strategy: None,
        confidence_score: Some(0.85),
        created_at: Utc::now(),
    }
}

async fn get_reputation(
    State(state): State<AppState>,
    Path(identity): Path<String>,
) -> Result<Json<ReputationResponse>, ApiError> {
    Ok(Json(state.db.get_reputation(&identity).await?))
}

#[derive(Debug, Deserialize)]
struct RecomputeReputationRequest {
    identity_id: String,
}

async fn recompute_reputation(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<RecomputeReputationRequest>,
) -> Result<Json<ReputationResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    Ok(Json(
        state.db.recompute_reputation(&payload.identity_id).await?,
    ))
}

#[derive(Debug, Deserialize)]
struct SearchQuery {
    q: String,
    limit: Option<i64>,
}

async fn search(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, ApiError> {
    if query.q.trim().is_empty() {
        return Err(ApiError::bad_request("search query is required"));
    }
    Ok(Json(
        state
            .db
            .search(query.q.trim(), query.limit.unwrap_or(25))
            .await?,
    ))
}

async fn list_world_scenarios(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<WorldScenario>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_world_scenarios(query.limit.unwrap_or(50))
            .await?,
    ))
}

async fn create_world_scenario(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateWorldScenarioRequest>,
) -> Result<Json<WorldScenario>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_world_scenario_request(&payload)?;
    state.db.get_identity(&payload.actor).await?;
    ensure_domain_exists(&state, &payload.domain_id).await?;

    let nodes = if payload.nodes.is_empty() {
        default_scenario_nodes(&payload.actor, &payload.domain_id)
    } else {
        payload.nodes
    };
    let edges = if payload.edges.is_empty() {
        default_scenario_edges()
    } else {
        payload.edges
    };
    let now = Utc::now();
    let scenario = state
        .db
        .create_world_scenario(WorldScenario {
            id: Uuid::new_v4(),
            actor: payload.actor,
            domain_id: payload.domain_id,
            title: payload.title.trim().to_string(),
            summary: payload.summary.unwrap_or_else(|| {
                "multi-domain civilization scenario prepared for deterministic sandbox simulation"
                    .to_string()
            }),
            status: "active".to_string(),
            nodes,
            edges,
            payload: payload.payload,
            created_at: now,
            updated_at: now,
        })
        .await?;
    state
        .db
        .create_audit_event(AuditEvent {
            id: Uuid::new_v4(),
            event_type: "world.scenario.created".to_string(),
            actor: Some(scenario.actor.clone()),
            subject_id: scenario.id.to_string(),
            decision: Some("allow".to_string()),
            payload: json!({
                "domain_id": scenario.domain_id.clone(),
                "nodes": scenario.nodes.len(),
                "edges": scenario.edges.len()
            }),
            created_at: Utc::now(),
        })
        .await?;

    Ok(Json(scenario))
}

async fn get_world_scenario(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<WorldScenario>, ApiError> {
    Ok(Json(state.db.get_world_scenario(id).await?))
}

async fn run_world_scenario(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RunWorldScenarioRequest>,
) -> Result<Json<ScenarioRun>, ApiError> {
    ensure_auth(&state, &headers).await?;
    let scenario = state.db.get_world_scenario(id).await?;
    let impact_score = scenario_impact_score(&scenario, &payload.parameters);
    let risk_level = risk_level_from_score(impact_score);
    let recommended_actions = scenario_recommendations(&scenario.domain_id, risk_level);

    let risk = state
        .db
        .create_risk_assessment(pactara_core::RiskAssessment {
            id: Uuid::new_v4(),
            subject_id: scenario.id.to_string(),
            risk_level: risk_level.to_string(),
            score: impact_score,
            reasons: vec![
                format!("{} scenario nodes observed", scenario.nodes.len()),
                format!("{} dependency edges observed", scenario.edges.len()),
                "deterministic v0.8 sandbox impact model".to_string(),
            ],
            mitigation_strategy: Some("Simulate counter-measures in sandbox".to_string()),
            confidence_score: Some(0.92),
            created_at: Utc::now(),
        })
        .await?;
    let pact = create_signed_runtime_pact(
        &state,
        &scenario.actor,
        &scenario.actor,
        &format!("world.scenario.{}.run", scenario.domain_id),
        json!({
            "scenario_id": scenario.id,
            "title": scenario.title,
            "parameters": payload.parameters.clone()
        }),
        json!({"runtime": "PACTARA v0.8", "risk_level": risk_level, "impact_score": impact_score}),
        json!({"mode": "simulation", "revocable": true}),
        json!({"scenario_run": true, "risk_id": risk.id}),
    )
    .await?;
    let workflow = state
        .db
        .create_domain_workflow(
            DomainWorkflow {
                id: Uuid::new_v4(),
                domain_id: scenario.domain_id.clone(),
                template_id: None,
                actor: scenario.actor.clone(),
                target: scenario.actor.clone(),
                title: format!("Respond to {}", scenario.title),
                status: if risk_level == "high" {
                    "needs_review".to_string()
                } else {
                    "active".to_string()
                },
                current_step: 1,
                pact_id: Some(pact.id),
                risk_id: Some(risk.id),
                payload: json!({
                    "scenario_id": scenario.id,
                    "impact_score": impact_score,
                    "recommended_actions": recommended_actions
                }),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            vec![
                "Sense signals".to_string(),
                "Simulate impact".to_string(),
                "Prepare response".to_string(),
                "Human review or execution".to_string(),
            ],
        )
        .await?;
    let signal = state
        .db
        .create_civilization_signal(CivilizationSignal {
            id: Uuid::new_v4(),
            domain_id: scenario.domain_id.clone(),
            actor: Some(scenario.actor.clone()),
            signal_type: "scenario.shock".to_string(),
            severity: impact_score.clamp(1, 100),
            title: format!("{} risk detected", risk_level),
            payload: json!({
                "scenario_id": scenario.id,
                "risk_id": risk.id,
                "impact_score": impact_score
            }),
            status: if risk_level == "high" {
                "needs_review".to_string()
            } else {
                "open".to_string()
            },
            tags: vec!["simulation".to_string(), scenario.domain_id.clone()],
            correlation_id: Some(risk.id),
            created_at: Utc::now(),
        })
        .await?;
    let command_result = CommandResult {
        status: "completed".to_string(),
        summary: format!(
            "Scenario simulation produced {} risk with impact score {}",
            risk_level, impact_score
        ),
        generated_objects: json!({
            "pact_id": pact.id,
            "workflow_id": workflow.workflow.id,
            "risk_id": risk.id,
            "signal_id": signal.id
        }),
        next_actions: recommended_actions.clone(),
    };
    let command = state
        .db
        .create_runtime_command(RuntimeCommand {
            id: Uuid::new_v4(),
            actor: scenario.actor.clone(),
            domain_id: scenario.domain_id.clone(),
            intent: "world.simulate".to_string(),
            target: scenario.actor.clone(),
            command_text: format!("Run scenario simulation: {}", scenario.title),
            payload: payload.parameters.clone(),
            status: "completed".to_string(),
            result: command_result,
            pact_id: Some(pact.id),
            workflow_id: Some(workflow.workflow.id),
            created_at: Utc::now(),
        })
        .await?;
    let generated_objects = json!({
        "pact_id": pact.id,
        "workflow_id": workflow.workflow.id,
        "risk_id": risk.id,
        "signal_id": signal.id,
        "command_id": command.id
    });
    let run = state
        .db
        .create_scenario_run(ScenarioRun {
            id: Uuid::new_v4(),
            scenario_id: scenario.id,
            status: if risk_level == "high" {
                "needs_review".to_string()
            } else {
                "completed".to_string()
            },
            impact_score,
            risk_level: risk_level.to_string(),
            recommended_actions,
            generated_objects,
            output: json!({
                "cause": payload.parameters.get("shock").cloned().unwrap_or_else(|| json!("multi-domain shock")),
                "decision": if risk_level == "high" { "route to review" } else { "prepare automated response" },
                "impact": impact_score,
                "status": "visible in runtime timeline"
            }),
            created_at: Utc::now(),
        })
        .await?;
    state
        .db
        .create_audit_event(AuditEvent {
            id: Uuid::new_v4(),
            event_type: "world.scenario.run".to_string(),
            actor: Some(scenario.actor),
            subject_id: run.id.to_string(),
            decision: Some(run.status.clone()),
            payload: json!({
                "scenario_id": scenario.id,
                "impact_score": run.impact_score,
                "risk_level": run.risk_level,
                "generated_objects": run.generated_objects
            }),
            created_at: Utc::now(),
        })
        .await?;

    Ok(Json(run))
}

async fn list_runtime_commands(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<RuntimeCommand>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_runtime_commands(query.limit.unwrap_or(50))
            .await?,
    ))
}

async fn create_runtime_command(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateRuntimeCommandRequest>,
) -> Result<Json<RuntimeCommand>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_runtime_command_request(&payload)?;
    state.db.get_identity(&payload.actor).await?;
    ensure_domain_exists(&state, &payload.domain_id).await?;
    let risk = risk_from_command(&payload);
    let risk = state.db.create_risk_assessment(risk).await?;
    let pact = create_signed_runtime_pact(
        &state,
        &payload.actor,
        &payload.target,
        &format!("runtime.command.{}.{}", payload.domain_id, payload.intent),
        json!({
            "command": payload.command_text.clone(),
            "payload": payload.payload.clone()
        }),
        json!({"runtime": "PACTARA v0.8", "risk": risk.risk_level.clone()}),
        json!({"mode": "runtime_command", "revocable": true}),
        json!({"command": true, "domain_id": payload.domain_id.clone(), "risk_id": risk.id}),
    )
    .await?;
    let workflow = state
        .db
        .create_domain_workflow(
            DomainWorkflow {
                id: Uuid::new_v4(),
                domain_id: payload.domain_id.clone(),
                template_id: None,
                actor: payload.actor.clone(),
                target: payload.target.clone(),
                title: payload.command_text.clone(),
                status: if risk.risk_level == "high" || risk.risk_level == "critical" {
                    "needs_review".to_string()
                } else {
                    "active".to_string()
                },
                current_step: 1,
                pact_id: Some(pact.id),
                risk_id: Some(risk.id),
                payload: payload.payload.clone(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            vec![
                "Interpret command".to_string(),
                "Bind protocol object".to_string(),
                "Evaluate policy".to_string(),
                "Execute or review".to_string(),
            ],
        )
        .await?;
    let result = CommandResult {
        status: workflow.workflow.status.clone(),
        summary: format!(
            "Command transformed into signed PACT {} and workflow {}",
            pact.id, workflow.workflow.id
        ),
        generated_objects: json!({
            "pact_id": pact.id,
            "workflow_id": workflow.workflow.id,
            "risk_id": risk.id
        }),
        next_actions: json!([
            "inspect generated PACT",
            "advance workflow",
            "review risk if needed"
        ]),
    };
    let command = state
        .db
        .create_runtime_command(RuntimeCommand {
            id: Uuid::new_v4(),
            actor: payload.actor,
            domain_id: payload.domain_id,
            intent: payload.intent,
            target: payload.target,
            command_text: payload.command_text,
            payload: payload.payload,
            status: result.status.clone(),
            result: result.clone(),
            pact_id: Some(pact.id),
            workflow_id: Some(workflow.workflow.id),
            created_at: Utc::now(),
        })
        .await?;
    state
        .db
        .create_audit_event(AuditEvent {
            id: Uuid::new_v4(),
            event_type: "runtime.command.created".to_string(),
            actor: Some(command.actor.clone()),
            subject_id: command.id.to_string(),
            decision: Some(command.status.clone()),
            payload: json!({
                "domain_id": command.domain_id.clone(),
                "intent": command.intent.clone(),
                "result": result
            }),
            created_at: Utc::now(),
        })
        .await?;

    Ok(Json(command))
}

async fn runtime_timeline(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<RuntimeTimelineItem>>, ApiError> {
    Ok(Json(
        state.db.runtime_timeline(query.limit.unwrap_or(80)).await?,
    ))
}

async fn list_agent_crews(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<AgentCrewResponse>>, ApiError> {
    Ok(Json(
        state.db.list_agent_crews(query.limit.unwrap_or(50)).await?,
    ))
}

async fn create_agent_crew(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateAgentCrewRequest>,
) -> Result<Json<AgentCrewResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_agent_crew_request(&payload)?;
    state.db.get_identity(&payload.actor).await?;

    let mut members = Vec::new();
    for member in payload.members {
        let agent = state.db.get_agent_profile(member.agent_id).await?;
        let mandate = state.db.get_mandate(member.mandate_id).await?;
        if mandate.agent != agent.identity_id {
            return Err(ApiError::bad_request(
                "mandate does not authorize crew agent",
            ));
        }
        members.push(AgentCrewMember {
            id: Uuid::new_v4(),
            crew_id: Uuid::nil(),
            agent_id: member.agent_id,
            mandate_id: member.mandate_id,
            role: member.role,
            created_at: Utc::now(),
        });
    }
    let policy = state
        .db
        .create_policy_decision(
            evaluate_policy_inner(
                &state,
                PolicyEvaluateRequest {
                    subject_id: payload.actor.clone(),
                    action: "agent_crew.coordinate".to_string(),
                    resource: "runtime".to_string(),
                    context: json!({
                        "objective": payload.objective.clone(),
                        "risk": inferred_risk_from_text(&payload.objective)
                    }),
                },
            )
            .await?,
        )
        .await?;
    let status = match policy.decision.as_str() {
        "deny" => "denied",
        "needs_review" => "needs_review",
        _ => "active",
    }
    .to_string();
    let crew_id = Uuid::new_v4();
    for member in &mut members {
        member.crew_id = crew_id;
    }
    let response = state
        .db
        .create_agent_crew(
            AgentCrew {
                id: crew_id,
                actor: payload.actor,
                label: payload.label,
                objective: payload.objective,
                status,
                policy_decision: policy.decision.clone(),
                created_at: Utc::now(),
                updated_at: Utc::now(),
            },
            members,
        )
        .await?;
    state
        .db
        .create_audit_event(AuditEvent {
            id: Uuid::new_v4(),
            event_type: "agent.crew.created".to_string(),
            actor: Some(response.crew.actor.clone()),
            subject_id: response.crew.id.to_string(),
            decision: Some(policy.decision),
            payload: json!({
                "member_count": response.members.len(),
                "objective": response.crew.objective.clone()
            }),
            created_at: Utc::now(),
        })
        .await?;

    Ok(Json(response))
}

async fn run_agent_crew(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<RunAgentCrewRequest>,
) -> Result<Json<CrewRunResponse>, ApiError> {
    ensure_auth(&state, &headers).await?;
    let response = state.db.get_agent_crew(id).await?;
    if response.members.is_empty() {
        return Err(ApiError::bad_request("agent crew has no members"));
    }
    let action = payload
        .input
        .get("action")
        .and_then(Value::as_str)
        .unwrap_or("compare_prices")
        .to_string();
    let mut policy = evaluate_policy_inner(
        &state,
        PolicyEvaluateRequest {
            subject_id: response.crew.actor.clone(),
            action: action.clone(),
            resource: response.crew.id.to_string(),
            context: payload.input.clone(),
        },
    )
    .await?;
    for member in &response.members {
        let mandate = state.db.get_mandate(member.mandate_id).await?;
        if !mandate_allows_agent_run(&mandate, &action) {
            policy.decision = "deny".to_string();
            policy.reasons.push(format!(
                "member role {} lacks mandate for {}",
                member.role, action
            ));
        }
    }
    let policy = state.db.create_policy_decision(policy).await?;
    let requires_review = policy.decision == "needs_review";
    let status = match policy.decision.as_str() {
        "deny" => "denied",
        "needs_review" => "needs_review",
        _ => "completed",
    };
    let run = state
        .db
        .create_crew_run(CrewRun {
            id: Uuid::new_v4(),
            crew_id: response.crew.id,
            status: status.to_string(),
            policy_decision: policy.decision.clone(),
            requires_review,
            output: json!({
                "objective": response.crew.objective.clone(),
                "action": action,
                "members": response.members.len(),
                "decision": policy.decision.clone(),
                "reasons": policy.reasons.clone(),
                "result": if status == "completed" { "supervised crew completed sandbox orchestration" } else { "crew run stopped before automatic execution" }
            }),
            created_at: Utc::now(),
        })
        .await?;
    state
        .db
        .create_audit_event(AuditEvent {
            id: Uuid::new_v4(),
            event_type: "agent.crew.run".to_string(),
            actor: Some(response.crew.actor.clone()),
            subject_id: run.id.to_string(),
            decision: Some(run.policy_decision.clone()),
            payload: json!({
                "crew_id": response.crew.id,
                "requires_review": run.requires_review,
                "output": run.output
            }),
            created_at: Utc::now(),
        })
        .await?;

    Ok(Json(CrewRunResponse {
        run,
        crew: response.crew,
        members: response.members,
    }))
}

async fn ensure_domain_exists(state: &AppState, domain_id: &str) -> Result<(), ApiError> {
    let exists = state
        .db
        .list_domain_modules()
        .await?
        .into_iter()
        .any(|domain| domain.id == domain_id);
    if exists {
        Ok(())
    } else {
        Err(ApiError::bad_request("unknown PACTARA domain"))
    }
}

fn default_scenario_nodes(actor: &str, domain_id: &str) -> Vec<ScenarioNode> {
    vec![
        ScenarioNode {
            id: "actor".to_string(),
            label: actor.to_string(),
            node_type: "actor".to_string(),
            domain_id: Some(domain_id.to_string()),
            metadata: json!({"role": "initiator"}),
        },
        ScenarioNode {
            id: "domain".to_string(),
            label: domain_id.to_string(),
            node_type: "domain".to_string(),
            domain_id: Some(domain_id.to_string()),
            metadata: json!({"layer": "civilization_domain"}),
        },
        ScenarioNode {
            id: "resource".to_string(),
            label: "shared resource".to_string(),
            node_type: "resource".to_string(),
            domain_id: Some(domain_id.to_string()),
            metadata: json!({"managed_by": "runtime"}),
        },
        ScenarioNode {
            id: "risk".to_string(),
            label: "shock vector".to_string(),
            node_type: "risk".to_string(),
            domain_id: Some(domain_id.to_string()),
            metadata: json!({"model": "v0.8 deterministic"}),
        },
    ]
}

fn default_scenario_edges() -> Vec<ScenarioEdge> {
    vec![
        ScenarioEdge {
            from: "actor".to_string(),
            to: "domain".to_string(),
            relation: "operates_in".to_string(),
            weight: 30,
            metadata: json!({}),
        },
        ScenarioEdge {
            from: "domain".to_string(),
            to: "risk".to_string(),
            relation: "monitors".to_string(),
            weight: 25,
            metadata: json!({}),
        },
        ScenarioEdge {
            from: "risk".to_string(),
            to: "resource".to_string(),
            relation: "impacts".to_string(),
            weight: 35,
            metadata: json!({}),
        },
    ]
}

fn scenario_impact_score(scenario: &WorldScenario, parameters: &Value) -> i32 {
    let node_score = (scenario.nodes.len() as i32 * 8).min(32);
    let edge_score = scenario
        .edges
        .iter()
        .map(|edge| edge.weight.clamp(1, 100))
        .sum::<i32>()
        .saturating_div(2)
        .min(40);
    let shock_text = parameters
        .get("shock")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_ascii_lowercase();
    let shock_score = if shock_text.contains("climate")
        || shock_text.contains("shock")
        || shock_text.contains("critical")
    {
        28
    } else if shock_text.contains("delay") || shock_text.contains("risk") {
        18
    } else {
        8
    };
    (node_score + edge_score + shock_score).clamp(1, 100)
}

fn risk_level_from_score(score: i32) -> &'static str {
    if score >= 75 {
        "high"
    } else if score >= 45 {
        "medium"
    } else {
        "low"
    }
}

fn scenario_recommendations(domain_id: &str, risk_level: &str) -> Value {
    let first = match domain_id {
        "economy" => "open settlement workflow and protect liquidity",
        "knowledge" => "publish provenance proof and notify reviewers",
        "health" => "request consent-only review without sensitive data",
        "governance" => "prepare transparent proposal and impact note",
        "energy" => "rebalance energy credits and monitor consumption",
        "link" => "verify relationship consent and communication scope",
        "space" => "attach place genome and resource impact proof",
        "transport" => "reroute shipment and reserve escrow capacity",
        _ => "open multi-domain response workflow",
    };
    json!([
        first,
        if risk_level == "high" {
            "require human review before execution"
        } else {
            "advance workflow automatically"
        },
        "write audit trail and timeline signal"
    ])
}

async fn create_signed_runtime_pact(
    state: &AppState,
    actor_id: &str,
    target: &str,
    intent: &str,
    object: Value,
    terms: Value,
    consent: Value,
    proof: Value,
) -> Result<Pact, ApiError> {
    let actor = state.db.get_identity(actor_id).await?;
    let mut pact = Pact::new(CreatePactRequest {
        actor: actor_id.to_string(),
        intent: intent.to_string(),
        object,
        target: target.to_string(),
        terms,
        consent,
        proof,
        expires_at: None,
    });
    pact.hash = hash_value(&pact.signing_payload());
    let pact = state.db.create_pact(pact).await?;
    if let Some(private_key) = actor.private_key {
        let signed = sign_value(&private_key, &pact.signing_payload())?;
        Ok(state
            .db
            .sign_pact(pact.id, signed.signature, signed.hash)
            .await?)
    } else {
        Ok(pact)
    }
}

fn risk_from_command(payload: &CreateRuntimeCommandRequest) -> pactara_core::RiskAssessment {
    let amount = payload
        .payload
        .get("amount")
        .and_then(Value::as_i64)
        .unwrap_or_default();
    let text_risk = inferred_risk_from_text(&payload.command_text);
    let (risk_level, score, reason) = if text_risk == "high" || amount > 10_000 {
        ("high", 82, "high-risk command or high-value payload")
    } else if payload.domain_id == "governance" || payload.domain_id == "health" || amount > 1_000 {
        ("medium", 55, "regulated domain or moderate-value command")
    } else {
        ("low", 22, "standard runtime command")
    };
    pactara_core::RiskAssessment {
        id: Uuid::new_v4(),
        subject_id: format!("runtime.command:{}:{}", payload.domain_id, payload.actor),
        risk_level: risk_level.to_string(),
        score,
        reasons: vec![reason.to_string()],
        mitigation_strategy: None,
        confidence_score: Some(0.75),
        created_at: Utc::now(),
    }
}

fn inferred_risk_from_text(text: &str) -> &'static str {
    let lowered = text.to_ascii_lowercase();
    if lowered.contains("medical")
        || lowered.contains("sant")
        || lowered.contains("sign_contract")
        || lowered.contains("critical")
        || lowered.contains("transfer")
        || lowered.contains("payment")
    {
        "high"
    } else if lowered.contains("vote") || lowered.contains("policy") || lowered.contains("review") {
        "medium"
    } else {
        "low"
    }
}

async fn ops_overview(
    State(state): State<AppState>,
) -> Result<Json<OperationalOverview>, ApiError> {
    Ok(Json(state.db.operational_overview().await?))
}

async fn list_recent_domain_actions(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<DomainAction>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_recent_domain_actions(query.limit.unwrap_or(50))
            .await?,
    ))
}

async fn list_recent_agent_runs(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<AgentRun>>, ApiError> {
    Ok(Json(
        state.db.list_agent_runs(query.limit.unwrap_or(50)).await?,
    ))
}

async fn ops_stream(
    State(state): State<AppState>,
) -> Result<Sse<impl futures_util::Stream<Item = Result<Event, Infallible>>>, ApiError> {
    let overview = state.db.operational_overview().await?;
    let payload = serde_json::to_string(&overview)
        .map_err(|error| ApiError::bad_request(error.to_string()))?;
    let event = Event::default().event("overview").data(payload);
    Ok(Sse::new(stream::once(async move { Ok(event) })))
}

async fn list_audit_events(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<AuditEvent>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_audit_events(query.limit.unwrap_or(50))
            .await?,
    ))
}

#[derive(Debug, Deserialize)]
struct EventsQuery {
    limit: Option<i64>,
}

async fn list_events(
    State(state): State<AppState>,
    Query(query): Query<EventsQuery>,
) -> Result<Json<Vec<pactara_core::EventLog>>, ApiError> {
    Ok(Json(state.db.list_events(query.limit.unwrap_or(50)).await?))
}

#[derive(Debug, Deserialize)]
struct NotificationsQuery {
    unread_only: Option<bool>,
    limit: Option<i64>,
}

async fn list_notifications(
    State(state): State<AppState>,
    Query(query): Query<NotificationsQuery>,
) -> Result<Json<Vec<pactara_core::SystemNotification>>, ApiError> {
    Ok(Json(
        state
            .db
            .list_notifications(query.unread_only.unwrap_or(false), query.limit.unwrap_or(50))
            .await?,
    ))
}

async fn create_notification(
    headers: HeaderMap,
    State(state): State<AppState>,
    Json(payload): Json<CreateNotificationRequest>,
) -> Result<Json<pactara_core::SystemNotification>, ApiError> {
    ensure_auth(&state, &headers).await?;
    validate_notification_request(&payload)?;
    let notification = pactara_core::SystemNotification {
        id: Uuid::new_v4(),
        channel: payload.channel,
        severity: payload.severity.unwrap_or_else(|| "info".to_string()),
        title: payload.title,
        payload: payload.payload,
        created_at: Utc::now(),
        read_at: None,
    };
    Ok(Json(state.db.create_notification(notification).await?))
}

async fn mark_notification_as_read(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<pactara_core::SystemNotification>, ApiError> {
    ensure_auth(&state, &headers).await?;
    Ok(Json(state.db.mark_notification_as_read(id).await?))
}

async fn get_ledger_limit(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Option<LedgerLimit>>, ApiError> {
    Ok(Json(state.db.get_ledger_limit(id).await?))
}

async fn upsert_ledger_limit(
    headers: HeaderMap,
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpsertLedgerLimitRequest>,
) -> Result<Json<LedgerLimit>, ApiError> {
    ensure_auth(&state, &headers).await?;
    if payload.account_id != id {
        return Err(ApiError::bad_request("account_id in path and body must match"));
    }
    validate_ledger_limit_request(&payload)?;
    Ok(Json(state.db.upsert_ledger_limit(payload).await?))
}

async fn ensure_auth(state: &AppState, headers: &HeaderMap) -> Result<(), ApiError> {
    if !state.auth_required {
        return Ok(());
    }

    // SECURITY: Previously we allowed a spoofable header 'x-pactara-authenticated'
    // to bypass auth. This has been removed to ensure all requests are properly
    // verified via session tokens or signed requests.

    if let Some(token) = headers
        .get("x-pactara-session")
        .and_then(|value| value.to_str().ok())
    {
        if state.db.session_is_valid(token).await? {
            return Ok(());
        }
    }

    // SECURITY: Previously we also allowed 'x-pactara-signed-request' header
    // without verification. This has been removed. Valid signed requests should
    // be verified using the appropriate cryptographic endpoints or middleware.

    Err(ApiError::unauthorized(
        "PACTARA authentication is required in this environment",
    ))
}

fn evaluate_mandate(mandate: &Mandate, request: MandateCheckRequest) -> MandateCheckResponse {
    let mut reasons = Vec::new();
    let active = mandate.expires_at > Utc::now();
    if !active {
        reasons.push("mandate is expired".to_string());
    }

    let action = request.action.trim().to_string();
    let intent = request
        .intent
        .as_ref()
        .map(|value| value.trim().to_string());
    let denied = scope_contains(&mandate.scope, "cannot", &action)
        || intent
            .as_deref()
            .is_some_and(|value| scope_contains(&mandate.scope, "cannot", value));
    if denied {
        reasons.push("action is explicitly denied by mandate scope".to_string());
    }

    let allowed_by_scope = scope_contains(&mandate.scope, "can", &action)
        || intent
            .as_deref()
            .is_some_and(|value| scope_contains(&mandate.scope, "can", value));
    if !allowed_by_scope {
        reasons.push("action is not allowed by mandate scope".to_string());
    }

    let allowed = active && allowed_by_scope && !denied;
    if allowed {
        reasons.push("action is allowed by active mandate".to_string());
    }

    MandateCheckResponse {
        mandate_id: mandate.id,
        allowed,
        active,
        principal: mandate.principal.clone(),
        agent: mandate.agent.clone(),
        action,
        intent,
        reasons,
    }
}

fn scope_contains(scope: &serde_json::Value, key: &str, needle: &str) -> bool {
    scope
        .get(key)
        .and_then(|value| value.as_array())
        .is_some_and(|items| {
            items
                .iter()
                .filter_map(|item| item.as_str())
                .any(|item| item == needle)
        })
}

fn identity_segment(kind: &IdentityKind) -> &'static str {
    match kind {
        IdentityKind::Person => "person",
        IdentityKind::Organization => "org",
        IdentityKind::Agent => "agent",
        IdentityKind::Machine => "machine",
        IdentityKind::Product => "product",
        IdentityKind::Place => "place",
    }
}

#[derive(Debug)]
pub struct ApiError {
    status: StatusCode,
    message: String,
}

impl ApiError {
    fn bad_request(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: message.into(),
        }
    }

    fn unauthorized(message: impl Into<String>) -> Self {
        Self {
            status: StatusCode::UNAUTHORIZED,
            message: message.into(),
        }
    }
}

impl From<DbError> for ApiError {
    fn from(value: DbError) -> Self {
        match value {
            DbError::NotFound => Self {
                status: StatusCode::NOT_FOUND,
                message: "record not found".to_string(),
            },
            DbError::MissingPrivateKey => Self {
                status: StatusCode::CONFLICT,
                message: value.to_string(),
            },
            DbError::InvalidOperation(message) => Self {
                status: StatusCode::BAD_REQUEST,
                message,
            },
            other => Self {
                status: StatusCode::INTERNAL_SERVER_ERROR,
                message: other.to_string(),
            },
        }
    }
}

impl From<pactara_crypto::CryptoError> for ApiError {
    fn from(value: pactara_crypto::CryptoError) -> Self {
        Self {
            status: StatusCode::BAD_REQUEST,
            message: value.to_string(),
        }
    }
}

impl From<validation::ValidationError> for ApiError {
    fn from(value: validation::ValidationError) -> Self {
        Self::bad_request(value.message())
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let body = Json(json!({
            "error": self.message,
            "status": self.status.as_u16()
        }));
        (self.status, body).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn validates_required_pact_fields() {
        let request = CreatePactRequest {
            actor: String::new(),
            intent: "trade.sell".to_string(),
            object: json!({"batch": "cacao"}),
            target: "pactara:org:buyer".to_string(),
            terms: json!({}),
            consent: json!({}),
            proof: json!({}),
            expires_at: None,
        };

        assert!(validate_pact_request(&request).is_err());
    }

    #[test]
    fn rejects_expired_mandate_requests() {
        let request = CreateMandateRequest {
            principal: "pactara:person:a".to_string(),
            agent: "pactara:agent:b".to_string(),
            scope: json!({"can": ["negotiate"]}),
            expires_at: Utc::now() - chrono::Duration::minutes(1),
        };

        assert!(validate_mandate_request(&request).is_err());
    }

    #[test]
    fn rejects_non_positive_ledger_amounts() {
        let transfer = CreateLedgerTransferRequest {
            debit_account_id: Uuid::new_v4(),
            credit_account_id: Uuid::new_v4(),
            pact_id: Uuid::new_v4(),
            amount: 0,
            memo: None,
        };
        let payment = CreatePaymentIntentRequest {
            payer_account_id: Uuid::new_v4(),
            payee_account_id: Uuid::new_v4(),
            pact_id: Uuid::new_v4(),
            amount: -1,
            memo: None,
        };

        assert!(validate_ledger_transfer_request(&transfer).is_err());
        assert!(validate_payment_intent_request(&payment).is_err());
    }

    #[test]
    fn rejects_invalid_policy_requests() {
        let evaluation = PolicyEvaluateRequest {
            subject_id: "pactara:agent:a".to_string(),
            action: String::new(),
            resource: "runtime".to_string(),
            context: json!({}),
        };
        let rule = CreatePolicyRuleRequest {
            name: "bad rule".to_string(),
            effect: "block".to_string(),
            action: "agent.run".to_string(),
            resource: "runtime".to_string(),
            priority: None,
            condition: json!({}),
        };

        assert!(validate_policy_evaluate_request(&evaluation).is_err());
        assert!(validate_policy_rule_request(&rule).is_err());
    }

    #[test]
    fn rejects_blank_runtime_command_fields() {
        let request = CreateRuntimeCommandRequest {
            actor: "pactara:person:a".to_string(),
            domain_id: "economy".to_string(),
            intent: "settle".to_string(),
            target: "pactara:org:b".to_string(),
            command_text: "  ".to_string(),
            payload: json!({}),
        };

        assert!(validate_runtime_command_request(&request).is_err());
    }

    #[test]
    fn mandate_check_allows_scoped_action() {
        let mandate = Mandate {
            id: Uuid::new_v4(),
            principal: "pactara:person:a".to_string(),
            agent: "pactara:agent:b".to_string(),
            scope: json!({"can": ["negotiate_terms"], "cannot": ["sign_contract"]}),
            expires_at: Utc::now() + chrono::Duration::hours(1),
            created_at: Utc::now(),
        };
        let response = evaluate_mandate(
            &mandate,
            MandateCheckRequest {
                action: "negotiate_terms".to_string(),
                intent: None,
                context: json!({}),
            },
        );

        assert!(response.allowed);
    }

    #[test]
    fn mandate_check_rejects_explicit_denial() {
        let mandate = Mandate {
            id: Uuid::new_v4(),
            principal: "pactara:person:a".to_string(),
            agent: "pactara:agent:b".to_string(),
            scope: json!({"can": ["negotiate_terms"], "cannot": ["sign_contract"]}),
            expires_at: Utc::now() + chrono::Duration::hours(1),
            created_at: Utc::now(),
        };
        let response = evaluate_mandate(
            &mandate,
            MandateCheckRequest {
                action: "sign_contract".to_string(),
                intent: None,
                context: json!({}),
            },
        );

        assert!(!response.allowed);
    }

    #[tokio::test]
    async fn ensure_auth_rejects_spoofed_headers() {
        let db = Db::mock();
        let state = AppState {
            db,
            auth_required: true,
        };

        let mut headers = HeaderMap::new();
        headers.insert("x-pactara-authenticated", "true".parse().unwrap());

        let result = ensure_auth(&state, &headers).await;
        assert!(result.is_err(), "Authentication should NOT be bypassed by spoofed header");

        let mut headers = HeaderMap::new();
        headers.insert("x-pactara-signed-request", "1".parse().unwrap());

        let result = ensure_auth(&state, &headers).await;
        assert!(result.is_err(), "Authentication should NOT be bypassed by spoofed signed-request header");
    }
}
