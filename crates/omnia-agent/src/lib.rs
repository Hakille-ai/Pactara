use chrono::Utc;
use omnia_core::{Mandate, PolicyDecision, PolicyEvaluateRequest};
use serde_json::Value;
use uuid::Uuid;

pub fn evaluate_policy(request: PolicyEvaluateRequest) -> PolicyDecision {
    let mut reasons = Vec::new();
    let action = request.action.trim().to_string();
    let decision = if action.contains("sign_contract")
        || request
            .context
            .get("sensitivity")
            .and_then(Value::as_str)
            == Some("medical_raw")
    {
        reasons.push("action requires stronger human authorization".to_string());
        "deny"
    } else if request
        .context
        .get("risk")
        .and_then(Value::as_str)
        == Some("high")
        || request
            .context
            .get("amount")
            .and_then(Value::as_i64)
            .is_some_and(|amount| amount > 10_000)
    {
        reasons.push("action is high risk and needs review".to_string());
        "needs_review"
    } else {
        reasons.push("action is allowed by default v0.5 policy".to_string());
        "allow"
    };

    PolicyDecision {
        id: Uuid::new_v4(),
        subject_id: request.subject_id,
        action,
        resource: request.resource,
        decision: decision.to_string(),
        reasons,
        context: request.context,
        created_at: Utc::now(),
    }
}

pub fn mandate_allows_agent_run(mandate: &Mandate, action: &str) -> bool {
    if mandate.expires_at <= Utc::now() {
        return false;
    }

    let denied = scope_contains(&mandate.scope, "cannot", action);
    let allowed = scope_contains(&mandate.scope, "can", action);
    allowed && !denied
}

fn scope_contains(scope: &Value, key: &str, needle: &str) -> bool {
    scope
        .get(key)
        .and_then(Value::as_array)
        .is_some_and(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .any(|item| item == needle)
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;
    use omnia_core::Mandate;
    use serde_json::json;

    #[test]
    fn policy_can_allow_deny_or_need_review() {
        assert_eq!(decision("compare_prices", json!({})), "allow");
        assert_eq!(decision("sign_contract", json!({})), "deny");
        assert_eq!(decision("compare_prices", json!({"risk": "high"})), "needs_review");
    }

    #[test]
    fn agent_requires_valid_mandate_scope() {
        let mandate = Mandate {
            id: Uuid::new_v4(),
            principal: "omnia:person:a".to_string(),
            agent: "omnia:agent:b".to_string(),
            scope: json!({"can": ["compare_prices"], "cannot": ["sign_contract"]}),
            expires_at: Utc::now() + Duration::hours(1),
            created_at: Utc::now(),
        };

        assert!(mandate_allows_agent_run(&mandate, "compare_prices"));
        assert!(!mandate_allows_agent_run(&mandate, "sign_contract"));
    }

    fn decision(action: &str, context: Value) -> String {
        evaluate_policy(PolicyEvaluateRequest {
            subject_id: "omnia:agent:a".to_string(),
            action: action.to_string(),
            resource: "omnia:test".to_string(),
            context,
        })
        .decision
    }
}
