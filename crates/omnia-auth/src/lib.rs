use chrono::{DateTime, Duration, Utc};
use omnia_core::{
    AuthChallenge, SignedRequest, SignedRequestVerification,
};
use omnia_crypto::{hash_value, verify_value};
use serde_json::{json, Value};
use uuid::Uuid;

pub fn create_challenge(
    identity_id: Option<String>,
    purpose: impl Into<String>,
    ttl_seconds: i64,
) -> AuthChallenge {
    let now = Utc::now();
    AuthChallenge {
        id: Uuid::new_v4(),
        identity_id,
        purpose: purpose.into(),
        challenge: Uuid::new_v4().to_string(),
        expires_at: now + Duration::seconds(ttl_seconds.clamp(30, 900)),
        consumed_at: None,
        created_at: now,
    }
}

pub fn challenge_is_usable(challenge: &AuthChallenge, now: DateTime<Utc>) -> bool {
    challenge.consumed_at.is_none() && challenge.expires_at > now
}

pub fn signed_request_payload(request: &SignedRequest) -> Value {
    json!({
        "identity_id": request.identity_id,
        "nonce": request.nonce,
        "payload": request.payload,
        "created_at": request.created_at
    })
}

pub fn verify_signed_request(
    public_key: &str,
    request: &SignedRequest,
    seen_nonce: bool,
) -> SignedRequestVerification {
    let payload = signed_request_payload(request);
    let hash_matches = hash_value(&payload) == hash_value(&payload);
    let signature_valid = verify_value(public_key, &request.signature, &payload).unwrap_or(false);
    let mut reasons = Vec::new();

    if seen_nonce {
        reasons.push("nonce has already been used".to_string());
    }
    if !signature_valid {
        reasons.push("request signature is invalid".to_string());
    }
    if !seen_nonce && signature_valid {
        reasons.push("signed request is valid".to_string());
    }

    SignedRequestVerification {
        valid: !seen_nonce && signature_valid,
        hash_matches,
        signature_valid,
        nonce: request.nonce.clone(),
        reasons,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use omnia_core::SignedRequest;
    use omnia_crypto::{generate_key_material, sign_value};
    use serde_json::json;

    #[test]
    fn expired_challenge_is_not_usable() {
        let challenge = AuthChallenge {
            expires_at: Utc::now() - Duration::seconds(1),
            ..create_challenge(Some("omnia:person:a".to_string()), "login", 60)
        };

        assert!(!challenge_is_usable(&challenge, Utc::now()));
    }

    #[test]
    fn consumed_challenge_is_not_usable() {
        let challenge = AuthChallenge {
            consumed_at: Some(Utc::now()),
            ..create_challenge(Some("omnia:person:a".to_string()), "login", 60)
        };

        assert!(!challenge_is_usable(&challenge, Utc::now()));
    }

    #[test]
    fn signed_request_rejects_replayed_nonce() {
        let keys = generate_key_material();
        let mut request = SignedRequest {
            identity_id: "omnia:person:a".to_string(),
            nonce: "nonce-1".to_string(),
            payload: json!({"action": "domain.create"}),
            signature: String::new(),
            created_at: Utc::now(),
        };
        let signed = sign_value(&keys.private_key, &signed_request_payload(&request)).unwrap();
        request.signature = signed.signature;

        let response = verify_signed_request(&keys.public_key, &request, true);
        assert!(!response.valid);
        assert!(response.signature_valid);
    }

    #[test]
    fn signed_request_accepts_valid_signature() {
        let keys = generate_key_material();
        let mut request = SignedRequest {
            identity_id: "omnia:person:a".to_string(),
            nonce: "nonce-2".to_string(),
            payload: json!({"action": "domain.create"}),
            signature: String::new(),
            created_at: Utc::now(),
        };
        let signed = sign_value(&keys.private_key, &signed_request_payload(&request)).unwrap();
        request.signature = signed.signature;

        let response = verify_signed_request(&keys.public_key, &request, false);
        assert!(response.valid);
    }
}
