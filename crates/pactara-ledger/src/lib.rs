use pactara_core::{LedgerAccount, Pact, PactStatus};

pub const PACT_ASSET_ID: &str = "asset:pact";
pub const PACT_SYMBOL: &str = "PACT";

pub fn validate_double_entry(debit_amount: i64, credit_amount: i64) -> bool {
    debit_amount > 0 && debit_amount == credit_amount
}

pub fn can_execute_payment(payer: &LedgerAccount, payee: &LedgerAccount, amount: i64) -> bool {
    amount > 0 && payer.asset_id == payee.asset_id && payer.balance >= amount
}

pub fn pact_allows_payment(pact: &Pact) -> bool {
    pact.status == PactStatus::Active && pact.signature.is_some()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use pactara_core::{LedgerAccount, Pact, PactStatus};
    use serde_json::json;
    use uuid::Uuid;

    #[test]
    fn double_entry_must_balance() {
        assert!(validate_double_entry(100, 100));
        assert!(!validate_double_entry(100, 90));
        assert!(!validate_double_entry(0, 0));
    }

    #[test]
    fn payment_requires_matching_assets_and_balance() {
        let payer = account(100);
        let payee = account(0);

        assert!(can_execute_payment(&payer, &payee, 90));
        assert!(!can_execute_payment(&payer, &payee, 101));
    }

    #[test]
    fn payment_requires_signed_active_pact() {
        let pact = Pact {
            id: Uuid::new_v4(),
            actor: "pactara:person:a".to_string(),
            intent: "domain.economy.payment.request".to_string(),
            object: json!({}),
            target: "pactara:person:b".to_string(),
            terms: json!({}),
            consent: json!({}),
            proof: json!({}),
            created_at: Utc::now(),
            expires_at: Utc::now(),
            signature: None,
            hash: "hash".to_string(),
            status: PactStatus::Active,
        };

        assert!(!pact_allows_payment(&pact));
    }

    fn account(balance: i64) -> LedgerAccount {
        LedgerAccount {
            id: Uuid::new_v4(),
            owner: "pactara:person:a".to_string(),
            asset_id: PACT_ASSET_ID.to_string(),
            label: "main".to_string(),
            balance,
            created_at: Utc::now(),
        }
    }
}
