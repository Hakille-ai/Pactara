use chrono::Utc;
use omnia_core::{BundleVerificationResponse, PactBundle, PactStatus};
use omnia_crypto::{hash_value, verify_value};

pub fn verify_bundle(bundle: &PactBundle) -> BundleVerificationResponse {
    let pact = &bundle.pact;
    let expected_hash = hash_value(&pact.signing_payload());
    let hash_matches = expected_hash == pact.hash;
    let signature_valid = pact
        .signature
        .as_deref()
        .map(|signature| {
            verify_value(&bundle.actor.public_key, signature, &pact.signing_payload())
                .unwrap_or(false)
        })
        .unwrap_or(false);
    let revoked = bundle.revocation.is_some() || pact.status == PactStatus::Revoked;
    let expired = pact.is_expired_at(Utc::now());

    let mut reasons = Vec::new();
    let status = if revoked {
        reasons.push("PACT has a revocation record in the bundle".to_string());
        PactStatus::Revoked
    } else if expired {
        reasons.push("PACT is expired at verification time".to_string());
        PactStatus::Expired
    } else if pact.signature.is_none() {
        reasons.push("PACT bundle has no signature".to_string());
        PactStatus::Draft
    } else if !hash_matches {
        reasons.push("PACT hash does not match canonical signing payload".to_string());
        PactStatus::Invalid
    } else if !signature_valid {
        reasons.push("PACT signature does not verify with actor public key".to_string());
        PactStatus::Invalid
    } else {
        reasons.push("PACT bundle verifies offline".to_string());
        PactStatus::Active
    };

    BundleVerificationResponse {
        pact_id: pact.id,
        valid: status == PactStatus::Active,
        status,
        hash_matches,
        signature_valid,
        revoked,
        expired,
        proofs_count: bundle.proofs.len(),
        timeline_events: bundle.timeline.len(),
        reasons,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};
    use omnia_core::{
        CreatePactRequest, EventLog, IdentityPublic, Pact, PactBundle, Proof, VerifyPactResponse,
    };
    use omnia_crypto::{generate_key_material, hash_value, sign_value};
    use serde_json::json;
    use uuid::Uuid;

    fn signed_bundle() -> PactBundle {
        let keys = generate_key_material();
        let mut pact = Pact::new(CreatePactRequest {
            actor: "omnia:person:alice".to_string(),
            intent: "trade.sell".to_string(),
            object: json!({"batch": "cacao-001"}),
            target: "omnia:org:buyer".to_string(),
            terms: json!({"price": "index"}),
            consent: json!({"mode": "explicit"}),
            proof: json!({"origin": "field"}),
            expires_at: Some(Utc::now() + Duration::days(1)),
        });
        let signed = sign_value(&keys.private_key, &pact.signing_payload()).unwrap();
        pact.hash = signed.hash;
        pact.signature = Some(signed.signature);
        pact.status = PactStatus::Active;

        PactBundle {
            protocol: "OMNIA".to_string(),
            bundle_version: "0.4".to_string(),
            generated_at: Utc::now(),
            actor: IdentityPublic {
                id: pact.actor.clone(),
                label: "Alice".to_string(),
                kind: omnia_core::IdentityKind::Person,
                public_key: keys.public_key,
                created_at: Utc::now(),
            },
            proofs: vec![Proof {
                id: Uuid::new_v4(),
                pact_id: Some(pact.id),
                proof_type: "origin.certificate".to_string(),
                payload: json!({"issuer": "demo"}),
                created_at: Utc::now(),
            }],
            revocation: None,
            verification: VerifyPactResponse {
                pact_id: pact.id,
                valid: true,
                status: PactStatus::Active,
                hash_matches: true,
                signature_valid: true,
                revoked: false,
                expired: false,
                reasons: Vec::new(),
            },
            timeline: vec![EventLog {
                id: Uuid::new_v4(),
                event_type: "pact.signed".to_string(),
                subject_id: pact.id.to_string(),
                payload: json!({}),
                created_at: Utc::now(),
            }],
            pact,
        }
    }

    #[test]
    fn verifies_valid_bundle_offline() {
        let response = verify_bundle(&signed_bundle());
        assert!(response.valid);
        assert_eq!(response.status, PactStatus::Active);
        assert_eq!(response.proofs_count, 1);
        assert_eq!(response.timeline_events, 1);
    }

    #[test]
    fn rejects_tampered_bundle() {
        let mut bundle = signed_bundle();
        bundle.pact.terms = json!({"price": "tampered"});

        let response = verify_bundle(&bundle);
        assert!(!response.valid);
        assert_eq!(response.status, PactStatus::Invalid);
        assert!(!response.hash_matches);
        assert!(!response.signature_valid);
    }

    #[test]
    fn detects_hash_mismatch_without_signature_failure() {
        let mut bundle = signed_bundle();
        bundle.pact.hash = hash_value(&json!({"wrong": true}));

        let response = verify_bundle(&bundle);
        assert!(!response.valid);
        assert_eq!(response.status, PactStatus::Invalid);
        assert!(!response.hash_matches);
        assert!(response.signature_valid);
    }
}
