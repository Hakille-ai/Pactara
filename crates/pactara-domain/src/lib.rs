use chrono::Utc;
use pactara_core::{CreateDomainActionRequest, CreatePactRequest, DomainModule};
use serde_json::{json, Value};

pub const BUILTIN_DOMAINS: [&str; 8] = [
    "economy",
    "knowledge",
    "health",
    "governance",
    "energy",
    "link",
    "space",
    "transport",
];

pub fn domain_label(id: &str) -> &'static str {
    match id {
        "economy" => "Economy",
        "knowledge" => "Knowledge",
        "health" => "Health",
        "governance" => "Governance",
        "energy" => "Energy",
        "link" => "Link",
        "space" => "Space",
        "transport" => "Transport",
        _ => "Unknown",
    }
}

pub fn domain_description(id: &str) -> &'static str {
    match id {
        "economy" => "Trade, value exchange, settlement, risk and market actions.",
        "knowledge" => "Learning, research, provenance, claims and knowledge rights.",
        "health" => "Consent, care coordination and privacy-preserving health actions.",
        "governance" => "Proposals, votes, delegation and institutional accountability.",
        "energy" => "Energy usage, production, credits and climate-positive incentives.",
        "link" => "Human relationships, consent, communication and creative exchange.",
        "space" => "Places, resources, territory, infrastructure and physical-world state.",
        "transport" => "Movement of goods, routing, chain of custody and delivery.",
        _ => "External PACTARA domain.",
    }
}

pub fn builtin_domain_modules() -> Vec<DomainModule> {
    BUILTIN_DOMAINS
        .into_iter()
        .map(|id| DomainModule {
            id: id.to_string(),
            label: domain_label(id).to_string(),
            domain_kind: "civilization".to_string(),
            description: domain_description(id).to_string(),
            enabled: true,
            capabilities: default_capabilities(id),
            created_at: Utc::now(),
        })
        .collect()
}

pub fn action_to_pact_request(
    domain_id: &str,
    request: &CreateDomainActionRequest,
    default_terms: Value,
) -> CreatePactRequest {
    CreatePactRequest {
        actor: request.actor.clone(),
        intent: format!("domain.{}.{}", domain_id, request.action_type),
        object: json!({
            "domain": domain_id,
            "action_type": request.action_type,
            "payload": request.payload
        }),
        target: request.target.clone(),
        terms: default_terms,
        consent: json!({
            "mode": "explicit",
            "revocable": true,
            "surface": "pactara-domain"
        }),
        proof: json!({
            "domain": domain_id,
            "template_id": request.template_id,
            "protocol": "PACTARA v0.5"
        }),
        expires_at: request.expires_at,
    }
}

fn default_capabilities(id: &str) -> Value {
    match id {
        "economy" => {
            json!({"actions": ["trade.create", "payment.request"], "requires_payment": true})
        }
        "knowledge" => {
            json!({"actions": ["knowledge.claim", "learning.path"], "privacy": "public_or_private"})
        }
        "health" => {
            json!({"actions": ["consent.grant", "care.request"], "raw_medical_data": false})
        }
        "governance" => json!({"actions": ["proposal.create", "vote.cast"], "audit": "mandatory"}),
        "energy" => json!({"actions": ["usage.report", "credit.issue"], "asset": "energy_credit"}),
        "link" => {
            json!({"actions": ["relationship.consent", "creative.license"], "surveillance": false})
        }
        "space" => json!({"actions": ["place.register", "resource.claim"], "geospatial": true}),
        "transport" => {
            json!({"actions": ["shipment.create", "custody.transfer"], "tracking": true})
        }
        _ => json!({}),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn ships_eight_builtin_domains() {
        assert_eq!(builtin_domain_modules().len(), 8);
        assert!(BUILTIN_DOMAINS.contains(&"health"));
    }

    #[test]
    fn domain_action_maps_to_pact_intent() {
        let request = CreateDomainActionRequest {
            actor: "pactara:person:a".to_string(),
            target: "pactara:org:b".to_string(),
            action_type: "trade.create".to_string(),
            template_id: None,
            payload: json!({"amount": 100}),
            expires_at: None,
        };
        let pact = action_to_pact_request("economy", &request, json!({"settlement": "sandbox"}));

        assert_eq!(pact.intent, "domain.economy.trade.create");
        assert_eq!(pact.object["domain"], "economy");
    }
}
