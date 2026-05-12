use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand_core::OsRng;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyMaterial {
    pub public_key: String,
    pub private_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignedPayload {
    pub hash: String,
    pub signature: String,
}

#[derive(Debug, thiserror::Error)]
pub enum CryptoError {
    #[error("invalid base64 key or signature")]
    InvalidBase64(#[from] base64::DecodeError),
    #[error("invalid key length: expected {expected}, got {actual}")]
    InvalidLength { expected: usize, actual: usize },
    #[error("invalid Ed25519 key")]
    InvalidKey,
    #[error("invalid Ed25519 signature")]
    InvalidSignature,
}

pub fn generate_key_material() -> KeyMaterial {
    let signing_key = SigningKey::generate(&mut OsRng);
    let verifying_key = signing_key.verifying_key();

    KeyMaterial {
        public_key: encode_bytes(&verifying_key.to_bytes()),
        private_key: encode_bytes(&signing_key.to_bytes()),
    }
}

pub fn canonicalize_value(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(v) => v.to_string(),
        Value::Number(v) => v.to_string(),
        Value::String(v) => {
            serde_json::to_string(v).expect("serializing a JSON string cannot fail")
        }
        Value::Array(items) => {
            let inner = items
                .iter()
                .map(canonicalize_value)
                .collect::<Vec<_>>()
                .join(",");
            format!("[{}]", inner)
        }
        Value::Object(map) => canonicalize_object(map),
    }
}

pub fn hash_value(value: &Value) -> String {
    let canonical = canonicalize_value(value);
    blake3::hash(canonical.as_bytes()).to_hex().to_string()
}

pub fn sign_value(private_key: &str, value: &Value) -> Result<SignedPayload, CryptoError> {
    let signing_key = signing_key_from_base64(private_key)?;
    let canonical = canonicalize_value(value);
    let signature = signing_key.sign(canonical.as_bytes());

    Ok(SignedPayload {
        hash: blake3::hash(canonical.as_bytes()).to_hex().to_string(),
        signature: encode_bytes(&signature.to_bytes()),
    })
}

pub fn verify_value(public_key: &str, signature: &str, value: &Value) -> Result<bool, CryptoError> {
    let verifying_key = verifying_key_from_base64(public_key)?;
    let signature_bytes = decode_fixed::<64>(signature)?;
    let signature = Signature::from_bytes(&signature_bytes);
    let canonical = canonicalize_value(value);

    match verifying_key.verify(canonical.as_bytes(), &signature) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

fn canonicalize_object(map: &Map<String, Value>) -> String {
    let mut keys = map.keys().collect::<Vec<_>>();
    keys.sort();

    let inner = keys
        .into_iter()
        .map(|key| {
            let encoded_key =
                serde_json::to_string(key).expect("serializing a JSON key cannot fail");
            let encoded_value = canonicalize_value(&map[key]);
            format!("{}:{}", encoded_key, encoded_value)
        })
        .collect::<Vec<_>>()
        .join(",");

    format!("{{{}}}", inner)
}

fn signing_key_from_base64(value: &str) -> Result<SigningKey, CryptoError> {
    let bytes = decode_fixed::<32>(value)?;
    Ok(SigningKey::from_bytes(&bytes))
}

fn verifying_key_from_base64(value: &str) -> Result<VerifyingKey, CryptoError> {
    let bytes = decode_fixed::<32>(value)?;
    VerifyingKey::from_bytes(&bytes).map_err(|_| CryptoError::InvalidKey)
}

fn encode_bytes(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

fn decode_fixed<const N: usize>(value: &str) -> Result<[u8; N], CryptoError> {
    let bytes = URL_SAFE_NO_PAD.decode(value)?;
    let actual = bytes.len();
    bytes.try_into().map_err(|_| CryptoError::InvalidLength {
        expected: N,
        actual,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn canonicalization_sorts_object_keys() {
        let value = json!({"b": 2, "a": 1});
        assert_eq!(canonicalize_value(&value), r#"{"a":1,"b":2}"#);
    }

    #[test]
    fn generated_keys_can_sign_and_verify() {
        let keys = generate_key_material();
        let payload = json!({"intent": "trade.sell", "terms": {"quantity": "500kg"}});
        let signed = sign_value(&keys.private_key, &payload).unwrap();

        assert!(verify_value(&keys.public_key, &signed.signature, &payload).unwrap());
    }

    #[test]
    fn tampered_payload_fails_signature_verification() {
        let keys = generate_key_material();
        let payload = json!({"intent": "trade.sell"});
        let tampered = json!({"intent": "trade.buy"});
        let signed = sign_value(&keys.private_key, &payload).unwrap();

        assert!(!verify_value(&keys.public_key, &signed.signature, &tampered).unwrap());
    }
}
