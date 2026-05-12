use chrono::Utc;
use pactara_core::{
    CreateAgentCrewRequest, CreateAgentProfileRequest, CreateAgentRunRequest,
    CreateAgentTaskRequest, CreateLedgerAccountRequest, CreateLedgerHoldRequest,
    CreateLedgerTransferRequest, CreateMandateRequest, CreatePactRequest,
    CreatePaymentIntentRequest, CreatePolicyRuleRequest, CreateRuntimeCommandRequest,
    CreateTokenIssuanceRequest, CreateWorkflowRequest, CreateWorldScenarioRequest,
    PolicyEvaluateRequest,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct ValidationError {
    message: String,
}

impl ValidationError {
    pub(crate) fn message(self) -> String {
        self.message
    }
}

fn invalid(message: impl Into<String>) -> ValidationError {
    ValidationError {
        message: message.into(),
    }
}

fn require_text(value: &str, message: &'static str) -> Result<(), ValidationError> {
    if value.trim().is_empty() {
        Err(invalid(message))
    } else {
        Ok(())
    }
}

fn require_optional_text(
    value: Option<&String>,
    message: &'static str,
) -> Result<(), ValidationError> {
    if value.is_some_and(|value| value.trim().is_empty()) {
        Err(invalid(message))
    } else {
        Ok(())
    }
}

pub(crate) fn validate_positive_amount(
    amount: i64,
    label: &'static str,
) -> Result<(), ValidationError> {
    if amount <= 0 {
        Err(invalid(format!("{} must be positive", label)))
    } else {
        Ok(())
    }
}

pub(crate) fn validate_pact_request(payload: &CreatePactRequest) -> Result<(), ValidationError> {
    require_text(&payload.actor, "PACT actor is required")?;
    require_text(&payload.intent, "PACT intent is required")?;
    require_text(&payload.target, "PACT target is required")?;
    if payload
        .expires_at
        .as_ref()
        .is_some_and(|expires_at| *expires_at <= Utc::now())
    {
        return Err(invalid("PACT expires_at must be in the future"));
    }
    Ok(())
}

pub(crate) fn validate_mandate_request(
    payload: &CreateMandateRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.principal, "mandate principal is required")?;
    require_text(&payload.agent, "mandate agent is required")?;
    if payload.expires_at <= Utc::now() {
        return Err(invalid("mandate expires_at must be in the future"));
    }
    Ok(())
}

pub(crate) fn validate_ledger_account_request(
    payload: &CreateLedgerAccountRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.owner, "ledger account owner is required")?;
    require_optional_text(
        payload.asset_id.as_ref(),
        "ledger account asset_id cannot be empty",
    )?;
    require_optional_text(
        payload.label.as_ref(),
        "ledger account label cannot be empty",
    )?;
    if payload.initial_balance.is_some_and(|amount| amount < 0) {
        return Err(invalid("initial balance cannot be negative"));
    }
    Ok(())
}

pub(crate) fn validate_ledger_transfer_request(
    payload: &CreateLedgerTransferRequest,
) -> Result<(), ValidationError> {
    validate_positive_amount(payload.amount, "transfer amount")
}

pub(crate) fn validate_ledger_hold_request(
    payload: &CreateLedgerHoldRequest,
) -> Result<(), ValidationError> {
    validate_positive_amount(payload.amount, "hold amount")
}

pub(crate) fn validate_payment_intent_request(
    payload: &CreatePaymentIntentRequest,
) -> Result<(), ValidationError> {
    validate_positive_amount(payload.amount, "payment amount")
}

pub(crate) fn validate_token_issuance_request(
    payload: &CreateTokenIssuanceRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.issuer, "token issuer is required")?;
    validate_positive_amount(payload.amount, "issuance amount")
}

pub(crate) fn validate_agent_profile_request(
    payload: &CreateAgentProfileRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.label, "agent label is required")?;
    require_optional_text(
        payload.identity_id.as_ref(),
        "agent identity_id cannot be empty",
    )?;
    require_optional_text(payload.model.as_ref(), "agent model cannot be empty")?;
    Ok(())
}

pub(crate) fn validate_agent_run_request(
    payload: &CreateAgentRunRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.action, "agent action is required")
}

pub(crate) fn validate_agent_task_request(
    payload: &CreateAgentTaskRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.action, "agent task action is required")
}

pub(crate) fn validate_policy_evaluate_request(
    payload: &PolicyEvaluateRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.subject_id, "policy subject_id is required")?;
    require_text(&payload.action, "policy action is required")?;
    require_text(&payload.resource, "policy resource is required")?;
    Ok(())
}

pub(crate) fn validate_policy_rule_request(
    payload: &CreatePolicyRuleRequest,
) -> Result<(), ValidationError> {
    if !matches!(payload.effect.as_str(), "allow" | "deny" | "needs_review") {
        return Err(invalid(
            "policy rule effect must be allow, deny, or needs_review",
        ));
    }
    require_text(&payload.name, "policy rule name is required")?;
    require_text(&payload.action, "policy rule action is required")?;
    require_text(&payload.resource, "policy rule resource is required")?;
    Ok(())
}

pub(crate) fn validate_workflow_request(
    payload: &CreateWorkflowRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.domain_id, "workflow domain_id is required")?;
    require_text(&payload.actor, "workflow actor is required")?;
    require_text(&payload.target, "workflow target is required")?;
    require_text(&payload.title, "workflow title is required")?;
    Ok(())
}

pub(crate) fn validate_world_scenario_request(
    payload: &CreateWorldScenarioRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.actor, "world scenario actor is required")?;
    require_text(&payload.domain_id, "world scenario domain_id is required")?;
    require_text(&payload.title, "world scenario title is required")?;
    Ok(())
}

pub(crate) fn validate_runtime_command_request(
    payload: &CreateRuntimeCommandRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.actor, "runtime command actor is required")?;
    require_text(&payload.domain_id, "runtime command domain_id is required")?;
    require_text(&payload.target, "runtime command target is required")?;
    require_text(&payload.intent, "runtime command intent is required")?;
    require_text(
        &payload.command_text,
        "runtime command command_text is required",
    )?;
    Ok(())
}

pub(crate) fn validate_agent_crew_request(
    payload: &CreateAgentCrewRequest,
) -> Result<(), ValidationError> {
    require_text(&payload.actor, "agent crew actor is required")?;
    require_text(&payload.label, "agent crew label is required")?;
    require_text(&payload.objective, "agent crew objective is required")?;
    for member in &payload.members {
        require_text(&member.role, "agent crew member role is required")?;
    }
    Ok(())
}
