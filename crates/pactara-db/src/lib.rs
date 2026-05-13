mod counters;

use std::collections::BTreeMap;

use chrono::{DateTime, Utc};
use moka::future::Cache;
use counters::{
    count_audit_denies_for_actor, count_pacts_for_actor_status, count_proofs_for_identity,
    count_table, count_where, CountPredicate, CountTable,
};
use pactara_core::{
    AgentCrew, AgentCrewMember, AgentCrewResponse, AgentProfile, AgentRun, AgentRunLog, AgentTask,
    AuditEvent, AuthChallenge, AuthSession, CivilizationSignal, CommandResult, Credential, CrewRun,
    DomainAction, DomainActionTemplate, DomainModule, DomainWorkflow, EventLog, Genome, Identity,
    IdentityKind, LedgerAccount, LedgerAsset, LedgerEntry, LedgerHold, LedgerStatement,
    LedgerTransfer, Mandate, NetworkStats, OperationalOverview, Pact, PactStatus, PaymentIntent,
    PaymentStatusCounts, PolicyDecision, PolicyRule, Proof, ReputationEvent, ReputationResponse,
    ReputationScore, Revocation, RiskAssessment, RuntimeCommand, RuntimeQueueStats,
    RuntimeTimelineItem, ScenarioEdge, ScenarioNode, ScenarioRun, SearchResponse, SearchResult,
    TokenIssuanceEvent, TrustGraph, TrustGraphEdge, TrustGraphNode, WorkflowResponse,
    WorkflowReview, WorkflowStep, WorkflowTemplate, WorldScenario,
};
use serde_json::{json, Value};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
    #[error(transparent)]
    Migration(#[from] sqlx::migrate::MigrateError),
    #[error("record not found")]
    NotFound,
    #[error("identity does not have a private key in developer custody")]
    MissingPrivateKey,
    #[error("invalid operation: {0}")]
    InvalidOperation(String),
    #[error(transparent)]
    Core(#[from] pactara_core::PactaraCoreError),
}

#[derive(Clone)]
pub struct Db {
    pool: PgPool,
    identity_cache: Cache<String, Identity>,
}

impl Db {
    pub async fn connect(database_url: &str) -> Result<Self, DbError> {
        let pool = PgPoolOptions::new()
            .max_connections(10)
            .connect(database_url)
            .await?;

        let identity_cache = Cache::builder()
            .max_capacity(10_000)
            .time_to_live(std::time::Duration::from_secs(600))
            .build();

        Ok(Self {
            pool,
            identity_cache,
        })
    }

    pub async fn migrate(&self) -> Result<(), DbError> {
        sqlx::migrate!("../../migrations").run(&self.pool).await?;
        Ok(())
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn ready(&self) -> Result<(), DbError> {
        sqlx::query("SELECT 1").execute(&self.pool).await?;
        Ok(())
    }

    pub async fn create_identity(&self, identity: Identity) -> Result<Identity, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO identities (id, label, kind, public_key, private_key, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, label, kind, public_key, private_key, created_at
            "#,
        )
        .bind(&identity.id)
        .bind(&identity.label)
        .bind(identity_kind_to_str(&identity.kind))
        .bind(&identity.public_key)
        .bind(&identity.private_key)
        .bind(identity.created_at)
        .fetch_one(&self.pool)
        .await?;

        let identity = row_to_identity(row)?;
        self.identity_cache
            .insert(identity.id.clone(), identity.clone())
            .await;

        self.append_event(
            "identity.created",
            &identity.id,
            json!({
                "id": identity.id.clone(),
                "kind": identity.kind.clone(),
                "label": identity.label.clone()
            }),
        )
        .await?;

        Ok(identity)
    }

    pub async fn get_identity(&self, id: &str) -> Result<Identity, DbError> {
        if let Some(identity) = self.identity_cache.get(id).await {
            return Ok(identity);
        }

        let row = sqlx::query(
            r#"
            SELECT id, label, kind, public_key, private_key, created_at
            FROM identities
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        let identity = row_to_identity(row)?;
        self.identity_cache
            .insert(identity.id.clone(), identity.clone())
            .await;
        Ok(identity)
    }

    pub async fn create_pact(&self, pact: Pact) -> Result<Pact, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO pacts (
              id, actor, intent, object, target, terms, consent, proof,
              created_at, expires_at, signature, hash, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, actor, intent, object, target, terms, consent, proof,
              created_at, expires_at, signature, hash, status
            "#,
        )
        .bind(pact.id)
        .bind(&pact.actor)
        .bind(&pact.intent)
        .bind(&pact.object)
        .bind(&pact.target)
        .bind(&pact.terms)
        .bind(&pact.consent)
        .bind(&pact.proof)
        .bind(pact.created_at)
        .bind(pact.expires_at)
        .bind(&pact.signature)
        .bind(&pact.hash)
        .bind(pact.status.as_str())
        .fetch_one(&self.pool)
        .await?;

        let pact = row_to_pact(row)?;
        self.append_event(
            "pact.created",
            &pact.id.to_string(),
            json!({
                "pact_id": pact.id,
                "actor": pact.actor.clone(),
                "intent": pact.intent.clone()
            }),
        )
        .await?;

        Ok(pact)
    }

    pub async fn get_pact(&self, id: Uuid) -> Result<Pact, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, actor, intent, object, target, terms, consent, proof,
              created_at, expires_at, signature, hash, status
            FROM pacts
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_pact(row)
    }

    pub async fn sign_pact(
        &self,
        id: Uuid,
        signature: String,
        hash: String,
    ) -> Result<Pact, DbError> {
        let row = sqlx::query(
            r#"
            UPDATE pacts
            SET signature = $2, hash = $3, status = 'active'
            WHERE id = $1 AND status != 'revoked'
            RETURNING id, actor, intent, object, target, terms, consent, proof,
              created_at, expires_at, signature, hash, status
            "#,
        )
        .bind(id)
        .bind(signature)
        .bind(hash)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        let pact = row_to_pact(row)?;
        self.append_event(
            "pact.signed",
            &pact.id.to_string(),
            json!({
                "pact_id": pact.id,
                "actor": pact.actor.clone(),
                "hash": pact.hash.clone()
            }),
        )
        .await?;

        Ok(pact)
    }

    pub async fn mark_pact_status(&self, id: Uuid, status: PactStatus) -> Result<Pact, DbError> {
        let row = sqlx::query(
            r#"
            UPDATE pacts
            SET status = $2
            WHERE id = $1
            RETURNING id, actor, intent, object, target, terms, consent, proof,
              created_at, expires_at, signature, hash, status
            "#,
        )
        .bind(id)
        .bind(status.as_str())
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_pact(row)
    }

    pub async fn revoke_pact(
        &self,
        pact_id: Uuid,
        revoked_by: String,
        reason: String,
    ) -> Result<Revocation, DbError> {
        let revocation_id = Uuid::new_v4();
        let mut tx = self.pool.begin().await?;

        let row = sqlx::query(
            r#"
            INSERT INTO revocations (id, pact_id, revoked_by, reason)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (pact_id) DO UPDATE
              SET revoked_by = EXCLUDED.revoked_by,
                  reason = EXCLUDED.reason,
                  created_at = now()
            RETURNING id, pact_id, revoked_by, reason, created_at
            "#,
        )
        .bind(revocation_id)
        .bind(pact_id)
        .bind(&revoked_by)
        .bind(&reason)
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query("UPDATE pacts SET status = 'revoked' WHERE id = $1")
            .bind(pact_id)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        let revocation = row_to_revocation(row)?;
        self.append_event(
            "pact.revoked",
            &pact_id.to_string(),
            json!({"pact_id": pact_id, "revoked_by": revoked_by, "reason": reason}),
        )
        .await?;

        Ok(revocation)
    }

    pub async fn is_pact_revoked(&self, pact_id: Uuid) -> Result<bool, DbError> {
        let row =
            sqlx::query("SELECT EXISTS(SELECT 1 FROM revocations WHERE pact_id = $1) AS exists")
                .bind(pact_id)
                .fetch_one(&self.pool)
                .await?;

        Ok(row.try_get::<bool, _>("exists")?)
    }

    pub async fn get_revocation(&self, pact_id: Uuid) -> Result<Option<Revocation>, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, pact_id, revoked_by, reason, created_at
            FROM revocations
            WHERE pact_id = $1
            "#,
        )
        .bind(pact_id)
        .fetch_optional(&self.pool)
        .await?;

        row.map(row_to_revocation).transpose()
    }

    pub async fn create_proof(&self, proof: Proof) -> Result<Proof, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO proofs (id, pact_id, proof_type, payload, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, pact_id, proof_type, payload, created_at
            "#,
        )
        .bind(proof.id)
        .bind(proof.pact_id)
        .bind(&proof.proof_type)
        .bind(&proof.payload)
        .bind(proof.created_at)
        .fetch_one(&self.pool)
        .await?;

        let proof = row_to_proof(row)?;
        self.append_event(
            "proof.created",
            &proof.id.to_string(),
            json!({
                "proof_id": proof.id,
                "pact_id": proof.pact_id,
                "proof_type": proof.proof_type.clone()
            }),
        )
        .await?;

        Ok(proof)
    }

    pub async fn list_proofs(
        &self,
        pact_id: Option<Uuid>,
        limit: i64,
    ) -> Result<Vec<Proof>, DbError> {
        let rows = if let Some(pact_id) = pact_id {
            sqlx::query(
                r#"
                SELECT id, pact_id, proof_type, payload, created_at
                FROM proofs
                WHERE pact_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(pact_id)
            .bind(limit.clamp(1, 200))
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                r#"
                SELECT id, pact_id, proof_type, payload, created_at
                FROM proofs
                ORDER BY created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit.clamp(1, 200))
            .fetch_all(&self.pool)
            .await?
        };

        rows.into_iter().map(row_to_proof).collect()
    }

    pub async fn create_mandate(&self, mandate: Mandate) -> Result<Mandate, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO mandates (id, principal, agent, scope, expires_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, principal, agent, scope, expires_at, created_at
            "#,
        )
        .bind(mandate.id)
        .bind(&mandate.principal)
        .bind(&mandate.agent)
        .bind(&mandate.scope)
        .bind(mandate.expires_at)
        .bind(mandate.created_at)
        .fetch_one(&self.pool)
        .await?;

        let mandate = row_to_mandate(row)?;
        self.append_event(
            "mandate.created",
            &mandate.id.to_string(),
            json!({
                "mandate_id": mandate.id,
                "principal": mandate.principal.clone(),
                "agent": mandate.agent.clone(),
                "expires_at": mandate.expires_at
            }),
        )
        .await?;

        Ok(mandate)
    }

    pub async fn list_mandates(&self, limit: i64) -> Result<Vec<Mandate>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, principal, agent, scope, expires_at, created_at
            FROM mandates
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_mandate).collect()
    }

    pub async fn get_mandate(&self, id: Uuid) -> Result<Mandate, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, principal, agent, scope, expires_at, created_at
            FROM mandates
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_mandate(row)
    }

    pub async fn create_genome(&self, genome: Genome) -> Result<Genome, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO genomes (id, subject, origin, history, rights, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, subject, origin, history, rights, created_at
            "#,
        )
        .bind(genome.id)
        .bind(&genome.subject)
        .bind(&genome.origin)
        .bind(&genome.history)
        .bind(&genome.rights)
        .bind(genome.created_at)
        .fetch_one(&self.pool)
        .await?;

        let genome = row_to_genome(row)?;
        self.append_event(
            "genome.created",
            &genome.id.to_string(),
            json!({
                "genome_id": genome.id,
                "subject": genome.subject.clone()
            }),
        )
        .await?;

        Ok(genome)
    }

    pub async fn list_genomes(&self, limit: i64) -> Result<Vec<Genome>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, subject, origin, history, rights, created_at
            FROM genomes
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_genome).collect()
    }

    pub async fn network_stats(&self) -> Result<NetworkStats, DbError> {
        Ok(NetworkStats {
            identities: count_table(&self.pool, CountTable::Identities).await?,
            pacts: count_table(&self.pool, CountTable::Pacts).await?,
            active_pacts: count_where(&self.pool, CountPredicate::ActivePacts).await?,
            revoked_pacts: count_where(&self.pool, CountPredicate::RevokedPacts).await?,
            proofs: count_table(&self.pool, CountTable::Proofs).await?,
            mandates: count_table(&self.pool, CountTable::Mandates).await?,
            genomes: count_table(&self.pool, CountTable::Genomes).await?,
            events: count_table(&self.pool, CountTable::EventLog).await?,
            domains: count_table(&self.pool, CountTable::DomainModules).await?,
            ledger_accounts: count_table(&self.pool, CountTable::LedgerAccounts).await?,
            payment_intents: count_table(&self.pool, CountTable::PaymentIntents).await?,
            agents: count_table(&self.pool, CountTable::AgentProfiles).await?,
            audit_events: count_table(&self.pool, CountTable::AuditEvents).await?,
        })
    }

    pub async fn trust_graph(&self, limit: i64) -> Result<TrustGraph, DbError> {
        let limit = limit.clamp(1, 200);
        let mut nodes = BTreeMap::<String, TrustGraphNode>::new();
        let mut edges = Vec::<TrustGraphEdge>::new();

        let identity_rows = sqlx::query(
            r#"
            SELECT id, label, kind, public_key, created_at
            FROM identities
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        for row in identity_rows {
            let id: String = row.try_get("id")?;
            let label: String = row.try_get("label")?;
            let kind: String = row.try_get("kind")?;
            let public_key: String = row.try_get("public_key")?;
            let created_at: DateTime<Utc> = row.try_get("created_at")?;
            add_graph_node(
                &mut nodes,
                TrustGraphNode {
                    id,
                    label,
                    node_type: "identity".to_string(),
                    metadata: json!({
                        "kind": kind,
                        "public_key": public_key,
                        "created_at": created_at
                    }),
                },
            );
        }

        let pact_rows = sqlx::query(
            r#"
            SELECT id, actor, intent, target, status, created_at, expires_at
            FROM pacts
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        for row in pact_rows {
            let id: Uuid = row.try_get("id")?;
            let node_id = id.to_string();
            let actor: String = row.try_get("actor")?;
            let intent: String = row.try_get("intent")?;
            let target: String = row.try_get("target")?;
            let status: String = row.try_get("status")?;
            let created_at: DateTime<Utc> = row.try_get("created_at")?;
            let expires_at: DateTime<Utc> = row.try_get("expires_at")?;

            ensure_external_node(&mut nodes, &actor, "identity_ref");
            ensure_external_node(&mut nodes, &target, "target_ref");
            add_graph_node(
                &mut nodes,
                TrustGraphNode {
                    id: node_id.clone(),
                    label: intent.clone(),
                    node_type: "pact".to_string(),
                    metadata: json!({
                        "intent": intent,
                        "status": status,
                        "created_at": created_at,
                        "expires_at": expires_at
                    }),
                },
            );
            edges.push(TrustGraphEdge {
                from: actor,
                to: node_id.clone(),
                edge_type: "acts".to_string(),
                metadata: json!({}),
            });
            edges.push(TrustGraphEdge {
                from: node_id,
                to: target,
                edge_type: "targets".to_string(),
                metadata: json!({}),
            });
        }

        let proof_rows = sqlx::query(
            r#"
            SELECT id, pact_id, proof_type, created_at
            FROM proofs
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        for row in proof_rows {
            let id: Uuid = row.try_get("id")?;
            let node_id = id.to_string();
            let pact_id: Option<Uuid> = row.try_get("pact_id")?;
            let proof_type: String = row.try_get("proof_type")?;
            let created_at: DateTime<Utc> = row.try_get("created_at")?;
            add_graph_node(
                &mut nodes,
                TrustGraphNode {
                    id: node_id.clone(),
                    label: proof_type.clone(),
                    node_type: "proof".to_string(),
                    metadata: json!({
                        "proof_type": proof_type,
                        "pact_id": pact_id,
                        "created_at": created_at
                    }),
                },
            );
            if let Some(pact_id) = pact_id {
                edges.push(TrustGraphEdge {
                    from: node_id,
                    to: pact_id.to_string(),
                    edge_type: "proves".to_string(),
                    metadata: json!({}),
                });
            }
        }

        let mandate_rows = sqlx::query(
            r#"
            SELECT id, principal, agent, scope, expires_at, created_at
            FROM mandates
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        for row in mandate_rows {
            let id: Uuid = row.try_get("id")?;
            let node_id = id.to_string();
            let principal: String = row.try_get("principal")?;
            let agent: String = row.try_get("agent")?;
            let scope: Value = row.try_get("scope")?;
            let expires_at: DateTime<Utc> = row.try_get("expires_at")?;
            let created_at: DateTime<Utc> = row.try_get("created_at")?;
            ensure_external_node(&mut nodes, &principal, "identity_ref");
            ensure_external_node(&mut nodes, &agent, "identity_ref");
            add_graph_node(
                &mut nodes,
                TrustGraphNode {
                    id: node_id.clone(),
                    label: format!("{} -> {}", principal, agent),
                    node_type: "mandate".to_string(),
                    metadata: json!({
                        "scope": scope,
                        "expires_at": expires_at,
                        "created_at": created_at
                    }),
                },
            );
            edges.push(TrustGraphEdge {
                from: principal,
                to: node_id.clone(),
                edge_type: "delegates".to_string(),
                metadata: json!({}),
            });
            edges.push(TrustGraphEdge {
                from: node_id,
                to: agent,
                edge_type: "authorizes".to_string(),
                metadata: json!({}),
            });
        }

        let genome_rows = sqlx::query(
            r#"
            SELECT id, subject, origin, rights, created_at
            FROM genomes
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        for row in genome_rows {
            let id: Uuid = row.try_get("id")?;
            let node_id = id.to_string();
            let subject: String = row.try_get("subject")?;
            let origin: Value = row.try_get("origin")?;
            let rights: Value = row.try_get("rights")?;
            let created_at: DateTime<Utc> = row.try_get("created_at")?;
            ensure_external_node(&mut nodes, &subject, "subject_ref");
            add_graph_node(
                &mut nodes,
                TrustGraphNode {
                    id: node_id.clone(),
                    label: subject.clone(),
                    node_type: "genome".to_string(),
                    metadata: json!({
                        "origin": origin,
                        "rights": rights,
                        "created_at": created_at
                    }),
                },
            );
            edges.push(TrustGraphEdge {
                from: node_id,
                to: subject,
                edge_type: "describes".to_string(),
                metadata: json!({}),
            });
        }

        Ok(TrustGraph {
            generated_at: Utc::now(),
            nodes: nodes.into_values().collect(),
            edges,
        })
    }

    pub async fn create_auth_challenge(
        &self,
        challenge: AuthChallenge,
    ) -> Result<AuthChallenge, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO auth_challenges (
              id, identity_id, purpose, challenge, expires_at, consumed_at, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, identity_id, purpose, challenge, expires_at, consumed_at, created_at
            "#,
        )
        .bind(challenge.id)
        .bind(&challenge.identity_id)
        .bind(&challenge.purpose)
        .bind(&challenge.challenge)
        .bind(challenge.expires_at)
        .bind(challenge.consumed_at)
        .bind(challenge.created_at)
        .fetch_one(&self.pool)
        .await?;

        row_to_auth_challenge(row)
    }

    pub async fn consume_auth_challenge(&self, id: Uuid) -> Result<AuthChallenge, DbError> {
        let row = sqlx::query(
            r#"
            UPDATE auth_challenges
            SET consumed_at = now()
            WHERE id = $1 AND consumed_at IS NULL AND expires_at > now()
            RETURNING id, identity_id, purpose, challenge, expires_at, consumed_at, created_at
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_auth_challenge(row)
    }

    pub async fn create_credential(&self, credential: Credential) -> Result<Credential, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO auth_credentials (
              id, identity_id, credential_type, credential_id, public_key, transports,
              created_at, last_used_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, identity_id, credential_type, credential_id, public_key, transports,
              created_at, last_used_at
            "#,
        )
        .bind(credential.id)
        .bind(&credential.identity_id)
        .bind(&credential.credential_type)
        .bind(&credential.credential_id)
        .bind(&credential.public_key)
        .bind(&credential.transports)
        .bind(credential.created_at)
        .bind(credential.last_used_at)
        .fetch_one(&self.pool)
        .await?;

        let credential = row_to_credential(row)?;
        self.append_event(
            "auth.credential.created",
            &credential.identity_id,
            json!({
                "credential_id": credential.credential_id.clone(),
                "credential_type": credential.credential_type.clone()
            }),
        )
        .await?;

        Ok(credential)
    }

    pub async fn get_credential_by_public_id(
        &self,
        credential_id: &str,
    ) -> Result<Credential, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, identity_id, credential_type, credential_id, public_key, transports,
              created_at, last_used_at
            FROM auth_credentials
            WHERE credential_id = $1
            "#,
        )
        .bind(credential_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_credential(row)
    }

    pub async fn touch_credential(&self, credential_id: &str) -> Result<Credential, DbError> {
        let row = sqlx::query(
            r#"
            UPDATE auth_credentials
            SET last_used_at = now()
            WHERE credential_id = $1
            RETURNING id, identity_id, credential_type, credential_id, public_key, transports,
              created_at, last_used_at
            "#,
        )
        .bind(credential_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_credential(row)
    }

    pub async fn list_credentials(
        &self,
        identity_id: Option<String>,
        limit: i64,
    ) -> Result<Vec<Credential>, DbError> {
        let rows = if let Some(identity_id) = identity_id {
            sqlx::query(
                r#"
                SELECT id, identity_id, credential_type, credential_id, public_key, transports,
                  created_at, last_used_at
                FROM auth_credentials
                WHERE identity_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(identity_id)
            .bind(limit.clamp(1, 200))
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                r#"
                SELECT id, identity_id, credential_type, credential_id, public_key, transports,
                  created_at, last_used_at
                FROM auth_credentials
                ORDER BY created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit.clamp(1, 200))
            .fetch_all(&self.pool)
            .await?
        };

        rows.into_iter().map(row_to_credential).collect()
    }

    pub async fn delete_credential(&self, id: Uuid) -> Result<Credential, DbError> {
        let row = sqlx::query(
            r#"
            DELETE FROM auth_credentials
            WHERE id = $1
            RETURNING id, identity_id, credential_type, credential_id, public_key, transports,
              created_at, last_used_at
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        let credential = row_to_credential(row)?;
        self.append_event(
            "auth.credential.revoked",
            &credential.identity_id,
            json!({"credential_id": credential.credential_id.clone()}),
        )
        .await?;
        Ok(credential)
    }

    pub async fn create_auth_session(&self, session: AuthSession) -> Result<AuthSession, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO auth_sessions (
              id, identity_id, session_token, issued_by, expires_at, revoked_at, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, identity_id, session_token, issued_by, expires_at, revoked_at, created_at
            "#,
        )
        .bind(session.id)
        .bind(&session.identity_id)
        .bind(&session.session_token)
        .bind(&session.issued_by)
        .bind(session.expires_at)
        .bind(session.revoked_at)
        .bind(session.created_at)
        .fetch_one(&self.pool)
        .await?;

        let session = row_to_auth_session(row)?;
        self.append_event(
            "auth.session.created",
            &session.identity_id,
            json!({"session_id": session.id, "issued_by": session.issued_by.clone()}),
        )
        .await?;
        Ok(session)
    }

    pub async fn session_is_valid(&self, token: &str) -> Result<bool, DbError> {
        let row = sqlx::query(
            r#"
            SELECT EXISTS(
              SELECT 1 FROM auth_sessions
              WHERE session_token = $1 AND revoked_at IS NULL AND expires_at > now()
            ) AS valid
            "#,
        )
        .bind(token)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.try_get("valid")?)
    }

    pub async fn nonce_seen(&self, nonce: &str) -> Result<bool, DbError> {
        let row = sqlx::query(
            r#"
            SELECT EXISTS(
              SELECT 1 FROM request_nonces WHERE nonce = $1 AND expires_at > now()
            ) AS seen
            "#,
        )
        .bind(nonce)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.try_get("seen")?)
    }

    pub async fn record_nonce(
        &self,
        identity_id: &str,
        nonce: &str,
        expires_at: DateTime<Utc>,
    ) -> Result<(), DbError> {
        sqlx::query(
            r#"
            INSERT INTO request_nonces (nonce, identity_id, expires_at)
            VALUES ($1, $2, $3)
            "#,
        )
        .bind(nonce)
        .bind(identity_id)
        .bind(expires_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn list_domain_modules(&self) -> Result<Vec<DomainModule>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, label, domain_kind, description, enabled, capabilities, created_at
            FROM domain_modules
            ORDER BY id ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_domain_module).collect()
    }

    pub async fn list_domain_templates(
        &self,
        domain_id: &str,
    ) -> Result<Vec<DomainActionTemplate>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, domain_id, action_type, label, schema, default_terms, risk_level, created_at
            FROM domain_action_templates
            WHERE domain_id = $1
            ORDER BY action_type ASC
            "#,
        )
        .bind(domain_id)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_domain_template).collect()
    }

    pub async fn get_domain_template(&self, id: Uuid) -> Result<DomainActionTemplate, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, domain_id, action_type, label, schema, default_terms, risk_level, created_at
            FROM domain_action_templates
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_domain_template(row)
    }

    pub async fn create_domain_action(
        &self,
        action: DomainAction,
    ) -> Result<DomainAction, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO domain_actions (
              id, domain_id, template_id, actor, pact_id, action_type, payload, status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, domain_id, template_id, actor, pact_id, action_type, payload, status, created_at
            "#,
        )
        .bind(action.id)
        .bind(&action.domain_id)
        .bind(action.template_id)
        .bind(&action.actor)
        .bind(action.pact_id)
        .bind(&action.action_type)
        .bind(&action.payload)
        .bind(&action.status)
        .bind(action.created_at)
        .fetch_one(&self.pool)
        .await?;

        let action = row_to_domain_action(row)?;
        self.append_event(
            "domain.action.created",
            &action.id.to_string(),
            json!({
                "domain_id": action.domain_id.clone(),
                "actor": action.actor.clone(),
                "pact_id": action.pact_id,
                "action_type": action.action_type.clone()
            }),
        )
        .await?;

        Ok(action)
    }

    pub async fn list_recent_domain_actions(
        &self,
        limit: i64,
    ) -> Result<Vec<DomainAction>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, domain_id, template_id, actor, pact_id, action_type, payload, status, created_at
            FROM domain_actions
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_domain_action).collect()
    }

    pub async fn list_workflow_templates(
        &self,
        domain_id: Option<String>,
    ) -> Result<Vec<WorkflowTemplate>, DbError> {
        let rows = if let Some(domain_id) = domain_id {
            sqlx::query(
                r#"
                SELECT id, domain_id, label, action_type, steps, risk_model, created_at
                FROM workflow_templates
                WHERE domain_id = $1
                ORDER BY action_type ASC
                "#,
            )
            .bind(domain_id)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                r#"
                SELECT id, domain_id, label, action_type, steps, risk_model, created_at
                FROM workflow_templates
                ORDER BY domain_id ASC, action_type ASC
                "#,
            )
            .fetch_all(&self.pool)
            .await?
        };

        rows.into_iter().map(row_to_workflow_template).collect()
    }

    pub async fn get_workflow_template(&self, id: Uuid) -> Result<WorkflowTemplate, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, domain_id, label, action_type, steps, risk_model, created_at
            FROM workflow_templates
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_workflow_template(row)
    }

    pub async fn create_risk_assessment(
        &self,
        risk: RiskAssessment,
    ) -> Result<RiskAssessment, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO risk_assessments (id, subject_id, risk_level, score, reasons, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, subject_id, risk_level, score, reasons, created_at
            "#,
        )
        .bind(risk.id)
        .bind(&risk.subject_id)
        .bind(&risk.risk_level)
        .bind(risk.score)
        .bind(json!(risk.reasons))
        .bind(risk.created_at)
        .fetch_one(&self.pool)
        .await?;

        row_to_risk_assessment(row)
    }

    pub async fn get_risk_assessment(&self, id: Uuid) -> Result<RiskAssessment, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, subject_id, risk_level, score, reasons, created_at
            FROM risk_assessments
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_risk_assessment(row)
    }

    pub async fn create_domain_workflow(
        &self,
        workflow: DomainWorkflow,
        step_labels: Vec<String>,
    ) -> Result<WorkflowResponse, DbError> {
        let mut tx = self.pool.begin().await?;
        let row = sqlx::query(
            r#"
            INSERT INTO domain_workflows (
              id, domain_id, template_id, actor, target, title, status, current_step,
              pact_id, risk_id, payload, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, domain_id, template_id, actor, target, title, status, current_step,
              pact_id, risk_id, payload, created_at, updated_at
            "#,
        )
        .bind(workflow.id)
        .bind(&workflow.domain_id)
        .bind(workflow.template_id)
        .bind(&workflow.actor)
        .bind(&workflow.target)
        .bind(&workflow.title)
        .bind(&workflow.status)
        .bind(workflow.current_step)
        .bind(workflow.pact_id)
        .bind(workflow.risk_id)
        .bind(&workflow.payload)
        .bind(workflow.created_at)
        .bind(workflow.updated_at)
        .fetch_one(&mut *tx)
        .await?;

        for (index, label) in step_labels.iter().enumerate() {
            let step_order = (index + 1) as i32;
            sqlx::query(
                r#"
                INSERT INTO workflow_steps (
                  id, workflow_id, step_order, label, status, output, pact_id, created_at, completed_at
                )
                VALUES ($1, $2, $3, $4, $5, '{}'::jsonb, NULL, now(), NULL)
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(workflow.id)
            .bind(step_order)
            .bind(label)
            .bind(if step_order == 1 { "active" } else { "pending" })
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;

        let workflow = row_to_domain_workflow(row)?;
        self.append_event(
            "workflow.created",
            &workflow.id.to_string(),
            json!({
                "domain_id": workflow.domain_id.clone(),
                "actor": workflow.actor.clone(),
                "pact_id": workflow.pact_id
            }),
        )
        .await?;

        self.workflow_response(workflow.id).await
    }

    pub async fn workflow_response(&self, id: Uuid) -> Result<WorkflowResponse, DbError> {
        let workflow = self.get_workflow(id).await?;
        let steps = self.list_workflow_steps(id).await?;
        let reviews = self.list_workflow_reviews(id).await?;
        let risk = match workflow.risk_id {
            Some(id) => Some(self.get_risk_assessment(id).await?),
            None => None,
        };
        let pact = match workflow.pact_id {
            Some(id) => Some(self.get_pact(id).await?),
            None => None,
        };

        Ok(WorkflowResponse {
            workflow,
            steps,
            reviews,
            risk,
            pact,
        })
    }

    pub async fn get_workflow(&self, id: Uuid) -> Result<DomainWorkflow, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, domain_id, template_id, actor, target, title, status, current_step,
              pact_id, risk_id, payload, created_at, updated_at
            FROM domain_workflows
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_domain_workflow(row)
    }

    pub async fn list_workflows(&self, limit: i64) -> Result<Vec<DomainWorkflow>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, domain_id, template_id, actor, target, title, status, current_step,
              pact_id, risk_id, payload, created_at, updated_at
            FROM domain_workflows
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_domain_workflow).collect()
    }

    pub async fn list_workflow_steps(
        &self,
        workflow_id: Uuid,
    ) -> Result<Vec<WorkflowStep>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, workflow_id, step_order, label, status, output, pact_id, created_at, completed_at
            FROM workflow_steps
            WHERE workflow_id = $1
            ORDER BY step_order ASC
            "#,
        )
        .bind(workflow_id)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_workflow_step).collect()
    }

    pub async fn list_workflow_reviews(
        &self,
        workflow_id: Uuid,
    ) -> Result<Vec<WorkflowReview>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, workflow_id, reviewer, decision, notes, created_at
            FROM workflow_reviews
            WHERE workflow_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(workflow_id)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_workflow_review).collect()
    }

    pub async fn advance_workflow(
        &self,
        workflow_id: Uuid,
        output: Value,
    ) -> Result<WorkflowResponse, DbError> {
        let workflow = self.get_workflow(workflow_id).await?;
        if workflow.status == "completed" || workflow.status == "cancelled" {
            return Err(DbError::InvalidOperation(
                "workflow cannot be advanced from its current status".to_string(),
            ));
        }

        let steps = self.list_workflow_steps(workflow_id).await?;
        let active_step = steps
            .iter()
            .find(|step| step.status == "active")
            .cloned()
            .ok_or_else(|| DbError::InvalidOperation("workflow has no active step".to_string()))?;
        let next_order = active_step.step_order + 1;
        let has_next = steps.iter().any(|step| step.step_order == next_order);

        let mut tx = self.pool.begin().await?;
        sqlx::query(
            r#"
            UPDATE workflow_steps
            SET status = 'completed', output = $2, completed_at = now()
            WHERE id = $1 AND status = 'active'
            "#,
        )
        .bind(active_step.id)
        .bind(output)
        .execute(&mut *tx)
        .await?;

        if has_next {
            sqlx::query(
                r#"
                UPDATE workflow_steps
                SET status = 'active'
                WHERE workflow_id = $1 AND step_order = $2
                "#,
            )
            .bind(workflow_id)
            .bind(next_order)
            .execute(&mut *tx)
            .await?;
        }

        sqlx::query(
            r#"
            UPDATE domain_workflows
            SET current_step = $2, status = $3, updated_at = now()
            WHERE id = $1
            "#,
        )
        .bind(workflow_id)
        .bind(if has_next {
            next_order
        } else {
            active_step.step_order
        })
        .bind(if has_next { "active" } else { "completed" })
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;
        self.append_event(
            "workflow.advanced",
            &workflow_id.to_string(),
            json!({"completed_step": active_step.step_order, "next_step": next_order, "completed": !has_next}),
        )
        .await?;

        self.workflow_response(workflow_id).await
    }

    pub async fn create_workflow_review(
        &self,
        review: WorkflowReview,
    ) -> Result<WorkflowResponse, DbError> {
        sqlx::query(
            r#"
            INSERT INTO workflow_reviews (id, workflow_id, reviewer, decision, notes, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(review.id)
        .bind(review.workflow_id)
        .bind(&review.reviewer)
        .bind(&review.decision)
        .bind(&review.notes)
        .bind(review.created_at)
        .execute(&self.pool)
        .await?;

        let status = match review.decision.as_str() {
            "approve" => "active",
            "reject" => "cancelled",
            _ => "needs_review",
        };
        sqlx::query("UPDATE domain_workflows SET status = $2, updated_at = now() WHERE id = $1")
            .bind(review.workflow_id)
            .bind(status)
            .execute(&self.pool)
            .await?;

        self.append_event(
            "workflow.reviewed",
            &review.workflow_id.to_string(),
            json!({"reviewer": review.reviewer, "decision": review.decision}),
        )
        .await?;

        self.workflow_response(review.workflow_id).await
    }

    pub async fn create_ledger_account(
        &self,
        account: LedgerAccount,
        initial_balance: i64,
    ) -> Result<LedgerAccount, DbError> {
        if initial_balance < 0 {
            return Err(DbError::InvalidOperation(
                "initial balance cannot be negative".to_string(),
            ));
        }

        let row = sqlx::query(
            r#"
            INSERT INTO ledger_accounts (id, owner, asset_id, label, created_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, owner, asset_id, label, created_at
            "#,
        )
        .bind(account.id)
        .bind(&account.owner)
        .bind(&account.asset_id)
        .bind(&account.label)
        .bind(account.created_at)
        .fetch_one(&self.pool)
        .await?;

        if initial_balance > 0 {
            sqlx::query(
                r#"
                INSERT INTO ledger_entries (id, transfer_id, account_id, direction, amount, asset_id)
                VALUES ($1, NULL, $2, 'credit', $3, $4)
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(account.id)
            .bind(initial_balance)
            .bind(&account.asset_id)
            .execute(&self.pool)
            .await?;
        }

        let mut account = row_to_ledger_account_base(row)?;
        account.balance = self.ledger_balance(account.id).await?;
        self.append_event(
            "ledger.account.created",
            &account.id.to_string(),
            json!({
                "owner": account.owner.clone(),
                "asset_id": account.asset_id.clone(),
                "initial_balance": initial_balance
            }),
        )
        .await?;

        Ok(account)
    }

    pub async fn list_ledger_accounts(
        &self,
        owner: Option<String>,
        limit: i64,
    ) -> Result<Vec<LedgerAccount>, DbError> {
        let rows = if let Some(owner) = owner {
            sqlx::query(
                r#"
                SELECT id, owner, asset_id, label, created_at
                FROM ledger_accounts
                WHERE owner = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(owner)
            .bind(limit.clamp(1, 200))
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                r#"
                SELECT id, owner, asset_id, label, created_at
                FROM ledger_accounts
                ORDER BY created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit.clamp(1, 200))
            .fetch_all(&self.pool)
            .await?
        };

        let mut accounts = Vec::new();
        for row in rows {
            let mut account = row_to_ledger_account_base(row)?;
            account.balance = self.ledger_balance(account.id).await?;
            accounts.push(account);
        }
        Ok(accounts)
    }

    pub async fn get_ledger_account(&self, id: Uuid) -> Result<LedgerAccount, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, owner, asset_id, label, created_at
            FROM ledger_accounts
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        let mut account = row_to_ledger_account_base(row)?;
        account.balance = self.ledger_balance(account.id).await?;
        Ok(account)
    }

    pub async fn ledger_statement(
        &self,
        account_id: Uuid,
        limit: i64,
    ) -> Result<LedgerStatement, DbError> {
        let account = self.get_ledger_account(account_id).await?;
        let totals = sqlx::query(
            r#"
            SELECT
              COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0)::BIGINT AS credits,
              COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0)::BIGINT AS debits
            FROM ledger_entries
            WHERE account_id = $1
            "#,
        )
        .bind(account_id)
        .fetch_one(&self.pool)
        .await?;
        let credits: i64 = totals.try_get("credits")?;
        let debits: i64 = totals.try_get("debits")?;

        let rows = sqlx::query(
            r#"
            SELECT id, transfer_id, account_id, direction, amount, asset_id, created_at
            FROM ledger_entries
            WHERE account_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(account_id)
        .bind(limit.clamp(1, 500))
        .fetch_all(&self.pool)
        .await?;

        Ok(LedgerStatement {
            account,
            entries: rows
                .into_iter()
                .map(row_to_ledger_entry)
                .collect::<Result<_, _>>()?,
            credits,
            debits,
            net: credits - debits,
        })
    }

    pub async fn list_ledger_assets(&self) -> Result<Vec<LedgerAsset>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, symbol, name, decimals, sandbox, metadata, created_at
            FROM ledger_assets
            ORDER BY symbol ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_ledger_asset).collect()
    }

    pub async fn active_holds_total(&self, account_id: Uuid) -> Result<i64, DbError> {
        let row = sqlx::query(
            r#"
            SELECT COALESCE(SUM(amount), 0)::BIGINT AS held
            FROM ledger_holds
            WHERE account_id = $1 AND status = 'held'
            "#,
        )
        .bind(account_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.try_get("held")?)
    }

    pub async fn create_ledger_transfer(
        &self,
        pact: &Pact,
        debit_account_id: Uuid,
        credit_account_id: Uuid,
        amount: i64,
        memo: Option<String>,
    ) -> Result<(LedgerTransfer, AuditEvent), DbError> {
        if amount <= 0 {
            return Err(DbError::InvalidOperation(
                "transfer amount must be positive".to_string(),
            ));
        }
        if pact.status != PactStatus::Active || pact.signature.is_none() {
            return Err(DbError::InvalidOperation(
                "transfer requires a signed active PACT".to_string(),
            ));
        }
        let debit = self.get_ledger_account(debit_account_id).await?;
        let credit = self.get_ledger_account(credit_account_id).await?;
        if debit.asset_id != credit.asset_id {
            return Err(DbError::InvalidOperation(
                "transfer accounts must use the same asset".to_string(),
            ));
        }
        let held = self.active_holds_total(debit.id).await?;
        if debit.balance - held < amount {
            return Err(DbError::InvalidOperation(
                "debit account has insufficient available balance".to_string(),
            ));
        }

        let transfer_id = Uuid::new_v4();
        let mut tx = self.pool.begin().await?;
        let transfer_row = sqlx::query(
            r#"
            INSERT INTO ledger_transfers (
              id, payment_intent_id, asset_id, amount, debit_account_id, credit_account_id, status
            )
            VALUES ($1, NULL, $2, $3, $4, $5, 'posted')
            RETURNING id, payment_intent_id, asset_id, amount, debit_account_id,
              credit_account_id, status, created_at
            "#,
        )
        .bind(transfer_id)
        .bind(&debit.asset_id)
        .bind(amount)
        .bind(debit.id)
        .bind(credit.id)
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ledger_entries (id, transfer_id, account_id, direction, amount, asset_id)
            VALUES
              ($1, $2, $3, 'debit', $5, $6),
              ($4, $2, $7, 'credit', $5, $6)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(transfer_id)
        .bind(debit.id)
        .bind(Uuid::new_v4())
        .bind(amount)
        .bind(&debit.asset_id)
        .bind(credit.id)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;

        let transfer = row_to_ledger_transfer(transfer_row)?;
        let audit = self
            .create_audit_event(AuditEvent {
                id: Uuid::new_v4(),
                event_type: "ledger.transfer.posted".to_string(),
                actor: Some(pact.actor.clone()),
                subject_id: transfer.id.to_string(),
                decision: Some("allow".to_string()),
                payload: json!({
                    "pact_id": pact.id,
                    "amount": amount,
                    "asset_id": debit.asset_id,
                    "memo": memo
                }),
                created_at: Utc::now(),
            })
            .await?;
        self.append_event(
            "ledger.transfer.posted",
            &transfer.id.to_string(),
            json!({"pact_id": pact.id, "amount": amount}),
        )
        .await?;

        Ok((transfer, audit))
    }

    pub async fn create_ledger_hold(&self, hold: LedgerHold) -> Result<LedgerHold, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO ledger_holds (
              id, account_id, pact_id, amount, asset_id, status, reason, created_at, released_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, account_id, pact_id, amount, asset_id, status, reason, created_at, released_at
            "#,
        )
        .bind(hold.id)
        .bind(hold.account_id)
        .bind(hold.pact_id)
        .bind(hold.amount)
        .bind(&hold.asset_id)
        .bind(&hold.status)
        .bind(&hold.reason)
        .bind(hold.created_at)
        .bind(hold.released_at)
        .fetch_one(&self.pool)
        .await?;

        let hold = row_to_ledger_hold(row)?;
        self.append_event(
            "ledger.hold.created",
            &hold.id.to_string(),
            json!({"account_id": hold.account_id, "amount": hold.amount, "pact_id": hold.pact_id}),
        )
        .await?;
        Ok(hold)
    }

    pub async fn release_ledger_hold(&self, id: Uuid) -> Result<LedgerHold, DbError> {
        let row = sqlx::query(
            r#"
            UPDATE ledger_holds
            SET status = 'released', released_at = now()
            WHERE id = $1 AND status = 'held'
            RETURNING id, account_id, pact_id, amount, asset_id, status, reason, created_at, released_at
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        let hold = row_to_ledger_hold(row)?;
        self.append_event(
            "ledger.hold.released",
            &hold.id.to_string(),
            json!({"account_id": hold.account_id, "amount": hold.amount}),
        )
        .await?;
        Ok(hold)
    }

    pub async fn create_payment_intent(
        &self,
        payment: PaymentIntent,
    ) -> Result<PaymentIntent, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO payment_intents (
              id, payer_account_id, payee_account_id, pact_id, amount, asset_id, status,
              memo, created_at, executed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, payer_account_id, payee_account_id, pact_id, amount, asset_id,
              status, memo, created_at, executed_at
            "#,
        )
        .bind(payment.id)
        .bind(payment.payer_account_id)
        .bind(payment.payee_account_id)
        .bind(payment.pact_id)
        .bind(payment.amount)
        .bind(&payment.asset_id)
        .bind(&payment.status)
        .bind(&payment.memo)
        .bind(payment.created_at)
        .bind(payment.executed_at)
        .fetch_one(&self.pool)
        .await?;

        let payment = row_to_payment_intent(row)?;
        self.append_event(
            "payment.intent.created",
            &payment.id.to_string(),
            json!({
                "pact_id": payment.pact_id,
                "amount": payment.amount,
                "asset_id": payment.asset_id.clone()
            }),
        )
        .await?;
        Ok(payment)
    }

    pub async fn execute_payment_intent(
        &self,
        payment_id: Uuid,
    ) -> Result<(PaymentIntent, LedgerTransfer, AuditEvent), DbError> {
        let payment = self.get_payment_intent(payment_id).await?;
        if payment.status != "pending" {
            return Err(DbError::InvalidOperation(
                "payment intent is not pending".to_string(),
            ));
        }

        let pact = self.get_pact(payment.pact_id).await?;
        if pact.status != PactStatus::Active || pact.signature.is_none() {
            return Err(DbError::InvalidOperation(
                "payment requires a signed active PACT".to_string(),
            ));
        }

        let payer = self.get_ledger_account(payment.payer_account_id).await?;
        let payee = self.get_ledger_account(payment.payee_account_id).await?;
        if payer.asset_id != payee.asset_id || payer.asset_id != payment.asset_id {
            return Err(DbError::InvalidOperation(
                "ledger accounts must use the same asset".to_string(),
            ));
        }
        if payer.balance < payment.amount {
            return Err(DbError::InvalidOperation(
                "payer account has insufficient balance".to_string(),
            ));
        }

        let transfer_id = Uuid::new_v4();
        let mut tx = self.pool.begin().await?;
        let transfer_row = sqlx::query(
            r#"
            INSERT INTO ledger_transfers (
              id, payment_intent_id, asset_id, amount, debit_account_id, credit_account_id, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'posted')
            RETURNING id, payment_intent_id, asset_id, amount, debit_account_id,
              credit_account_id, status, created_at
            "#,
        )
        .bind(transfer_id)
        .bind(payment.id)
        .bind(&payment.asset_id)
        .bind(payment.amount)
        .bind(payment.payer_account_id)
        .bind(payment.payee_account_id)
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ledger_entries (id, transfer_id, account_id, direction, amount, asset_id)
            VALUES
              ($1, $2, $3, 'debit', $5, $6),
              ($4, $2, $7, 'credit', $5, $6)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(transfer_id)
        .bind(payment.payer_account_id)
        .bind(Uuid::new_v4())
        .bind(payment.amount)
        .bind(&payment.asset_id)
        .bind(payment.payee_account_id)
        .execute(&mut *tx)
        .await?;

        let payment_row = sqlx::query(
            r#"
            UPDATE payment_intents
            SET status = 'executed', executed_at = now()
            WHERE id = $1
            RETURNING id, payer_account_id, payee_account_id, pact_id, amount, asset_id,
              status, memo, created_at, executed_at
            "#,
        )
        .bind(payment.id)
        .fetch_one(&mut *tx)
        .await?;

        tx.commit().await?;

        let payment = row_to_payment_intent(payment_row)?;
        let transfer = row_to_ledger_transfer(transfer_row)?;
        let audit = self
            .create_audit_event(AuditEvent {
                id: Uuid::new_v4(),
                event_type: "payment.executed".to_string(),
                actor: Some(pact.actor.clone()),
                subject_id: payment.id.to_string(),
                decision: Some("allow".to_string()),
                payload: json!({
                    "transfer_id": transfer.id,
                    "pact_id": payment.pact_id,
                    "amount": payment.amount,
                    "asset_id": payment.asset_id.clone()
                }),
                created_at: Utc::now(),
            })
            .await?;
        self.append_event(
            "payment.executed",
            &payment.id.to_string(),
            json!({"transfer_id": transfer.id, "pact_id": payment.pact_id}),
        )
        .await?;

        Ok((payment, transfer, audit))
    }

    pub async fn get_payment_intent(&self, id: Uuid) -> Result<PaymentIntent, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, payer_account_id, payee_account_id, pact_id, amount, asset_id,
              status, memo, created_at, executed_at
            FROM payment_intents
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_payment_intent(row)
    }

    pub async fn list_payment_intents(&self, limit: i64) -> Result<Vec<PaymentIntent>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, payer_account_id, payee_account_id, pact_id, amount, asset_id,
              status, memo, created_at, executed_at
            FROM payment_intents
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_payment_intent).collect()
    }

    pub async fn reject_payment_intent(
        &self,
        payment_id: Uuid,
        reason: String,
    ) -> Result<(PaymentIntent, AuditEvent), DbError> {
        let row = sqlx::query(
            r#"
            UPDATE payment_intents
            SET status = 'rejected'
            WHERE id = $1 AND status = 'pending'
            RETURNING id, payer_account_id, payee_account_id, pact_id, amount, asset_id,
              status, memo, created_at, executed_at
            "#,
        )
        .bind(payment_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        let payment = row_to_payment_intent(row)?;
        let audit = self
            .create_audit_event(AuditEvent {
                id: Uuid::new_v4(),
                event_type: "payment.rejected".to_string(),
                actor: None,
                subject_id: payment.id.to_string(),
                decision: Some("deny".to_string()),
                payload: json!({"reason": reason, "pact_id": payment.pact_id}),
                created_at: Utc::now(),
            })
            .await?;
        self.append_event(
            "payment.rejected",
            &payment.id.to_string(),
            json!({"reason": reason, "pact_id": payment.pact_id}),
        )
        .await?;

        Ok((payment, audit))
    }

    pub async fn issue_token(
        &self,
        issuance: TokenIssuanceEvent,
    ) -> Result<(TokenIssuanceEvent, LedgerAccount, AuditEvent), DbError> {
        if issuance.amount <= 0 {
            return Err(DbError::InvalidOperation(
                "issuance amount must be positive".to_string(),
            ));
        }
        let account = self.get_ledger_account(issuance.account_id).await?;
        if account.asset_id != issuance.asset_id {
            return Err(DbError::InvalidOperation(
                "issuance asset must match account asset".to_string(),
            ));
        }

        let mut tx = self.pool.begin().await?;
        let row = sqlx::query(
            r#"
            INSERT INTO token_issuance_events (id, asset_id, account_id, issuer, amount, memo, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, asset_id, account_id, issuer, amount, memo, created_at
            "#,
        )
        .bind(issuance.id)
        .bind(&issuance.asset_id)
        .bind(issuance.account_id)
        .bind(&issuance.issuer)
        .bind(issuance.amount)
        .bind(&issuance.memo)
        .bind(issuance.created_at)
        .fetch_one(&mut *tx)
        .await?;

        sqlx::query(
            r#"
            INSERT INTO ledger_entries (id, transfer_id, account_id, direction, amount, asset_id)
            VALUES ($1, NULL, $2, 'credit', $3, $4)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(issuance.account_id)
        .bind(issuance.amount)
        .bind(&issuance.asset_id)
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;

        let issuance = row_to_token_issuance(row)?;
        let account = self.get_ledger_account(issuance.account_id).await?;
        let audit = self
            .create_audit_event(AuditEvent {
                id: Uuid::new_v4(),
                event_type: "token.issued".to_string(),
                actor: Some(issuance.issuer.clone()),
                subject_id: issuance.id.to_string(),
                decision: Some("allow".to_string()),
                payload: json!({
                    "account_id": issuance.account_id,
                    "asset_id": issuance.asset_id.clone(),
                    "amount": issuance.amount
                }),
                created_at: Utc::now(),
            })
            .await?;
        self.append_event(
            "token.issued",
            &issuance.id.to_string(),
            json!({"account_id": issuance.account_id, "amount": issuance.amount}),
        )
        .await?;

        Ok((issuance, account, audit))
    }

    pub async fn create_agent_profile(&self, agent: AgentProfile) -> Result<AgentProfile, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO agent_profiles (id, identity_id, label, model, capabilities, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, identity_id, label, model, capabilities, created_at
            "#,
        )
        .bind(agent.id)
        .bind(&agent.identity_id)
        .bind(&agent.label)
        .bind(&agent.model)
        .bind(&agent.capabilities)
        .bind(agent.created_at)
        .fetch_one(&self.pool)
        .await?;

        let agent = row_to_agent_profile(row)?;
        self.append_event(
            "agent.created",
            &agent.id.to_string(),
            json!({"identity_id": agent.identity_id.clone(), "model": agent.model.clone()}),
        )
        .await?;
        Ok(agent)
    }

    pub async fn get_agent_profile(&self, id: Uuid) -> Result<AgentProfile, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, identity_id, label, model, capabilities, created_at
            FROM agent_profiles
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_agent_profile(row)
    }

    pub async fn list_agent_profiles(&self, limit: i64) -> Result<Vec<AgentProfile>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, identity_id, label, model, capabilities, created_at
            FROM agent_profiles
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_agent_profile).collect()
    }

    pub async fn create_agent_run(&self, run: AgentRun) -> Result<AgentRun, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO agent_runs (
              id, agent_id, mandate_id, pact_id, action, input, output,
              policy_decision, status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, agent_id, mandate_id, pact_id, action, input, output,
              policy_decision, status, created_at
            "#,
        )
        .bind(run.id)
        .bind(run.agent_id)
        .bind(run.mandate_id)
        .bind(run.pact_id)
        .bind(&run.action)
        .bind(&run.input)
        .bind(&run.output)
        .bind(&run.policy_decision)
        .bind(&run.status)
        .bind(run.created_at)
        .fetch_one(&self.pool)
        .await?;

        let run = row_to_agent_run(row)?;
        self.append_event(
            "agent.run.created",
            &run.id.to_string(),
            json!({
                "agent_id": run.agent_id,
                "mandate_id": run.mandate_id,
                "policy_decision": run.policy_decision.clone(),
                "status": run.status.clone()
            }),
        )
        .await?;
        Ok(run)
    }

    pub async fn list_agent_runs(&self, limit: i64) -> Result<Vec<AgentRun>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, agent_id, mandate_id, pact_id, action, input, output,
              policy_decision, status, created_at
            FROM agent_runs
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_agent_run).collect()
    }

    pub async fn create_agent_task(&self, task: AgentTask) -> Result<AgentTask, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO agent_tasks (
              id, agent_id, mandate_id, pact_id, action, input, status, policy_decision,
              requires_approval, approved_by, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, agent_id, mandate_id, pact_id, action, input, status, policy_decision,
              requires_approval, approved_by, created_at, updated_at
            "#,
        )
        .bind(task.id)
        .bind(task.agent_id)
        .bind(task.mandate_id)
        .bind(task.pact_id)
        .bind(&task.action)
        .bind(&task.input)
        .bind(&task.status)
        .bind(&task.policy_decision)
        .bind(task.requires_approval)
        .bind(&task.approved_by)
        .bind(task.created_at)
        .bind(task.updated_at)
        .fetch_one(&self.pool)
        .await?;

        let task = row_to_agent_task(row)?;
        self.append_event(
            "agent.task.created",
            &task.id.to_string(),
            json!({
                "agent_id": task.agent_id,
                "policy_decision": task.policy_decision.clone(),
                "status": task.status.clone()
            }),
        )
        .await?;
        Ok(task)
    }

    pub async fn list_agent_tasks(&self, limit: i64) -> Result<Vec<AgentTask>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, agent_id, mandate_id, pact_id, action, input, status, policy_decision,
              requires_approval, approved_by, created_at, updated_at
            FROM agent_tasks
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_agent_task).collect()
    }

    pub async fn get_agent_task(&self, id: Uuid) -> Result<AgentTask, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, agent_id, mandate_id, pact_id, action, input, status, policy_decision,
              requires_approval, approved_by, created_at, updated_at
            FROM agent_tasks
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_agent_task(row)
    }

    pub async fn approve_agent_task(
        &self,
        id: Uuid,
        approved_by: String,
    ) -> Result<AgentTask, DbError> {
        let row = sqlx::query(
            r#"
            UPDATE agent_tasks
            SET status = 'approved', approved_by = $2, updated_at = now()
            WHERE id = $1 AND status IN ('awaiting_approval', 'ready')
            RETURNING id, agent_id, mandate_id, pact_id, action, input, status, policy_decision,
              requires_approval, approved_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(approved_by)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        let task = row_to_agent_task(row)?;
        self.append_event(
            "agent.task.approved",
            &task.id.to_string(),
            json!({"approved_by": task.approved_by.clone()}),
        )
        .await?;
        Ok(task)
    }

    pub async fn update_agent_task_status(
        &self,
        id: Uuid,
        status: &str,
    ) -> Result<AgentTask, DbError> {
        let row = sqlx::query(
            r#"
            UPDATE agent_tasks
            SET status = $2, updated_at = now()
            WHERE id = $1
            RETURNING id, agent_id, mandate_id, pact_id, action, input, status, policy_decision,
              requires_approval, approved_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(status)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_agent_task(row)
    }

    pub async fn create_agent_run_log(&self, log: AgentRunLog) -> Result<AgentRunLog, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO agent_run_logs (id, task_id, run_id, level, message, payload, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, task_id, run_id, level, message, payload, created_at
            "#,
        )
        .bind(log.id)
        .bind(log.task_id)
        .bind(log.run_id)
        .bind(&log.level)
        .bind(&log.message)
        .bind(&log.payload)
        .bind(log.created_at)
        .fetch_one(&self.pool)
        .await?;

        row_to_agent_run_log(row)
    }

    pub async fn list_agent_run_logs(
        &self,
        task_id: Option<Uuid>,
        limit: i64,
    ) -> Result<Vec<AgentRunLog>, DbError> {
        let rows = if let Some(task_id) = task_id {
            sqlx::query(
                r#"
                SELECT id, task_id, run_id, level, message, payload, created_at
                FROM agent_run_logs
                WHERE task_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(task_id)
            .bind(limit.clamp(1, 200))
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query(
                r#"
                SELECT id, task_id, run_id, level, message, payload, created_at
                FROM agent_run_logs
                ORDER BY created_at DESC
                LIMIT $1
                "#,
            )
            .bind(limit.clamp(1, 200))
            .fetch_all(&self.pool)
            .await?
        };

        rows.into_iter().map(row_to_agent_run_log).collect()
    }

    pub async fn create_policy_decision(
        &self,
        decision: PolicyDecision,
    ) -> Result<PolicyDecision, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO policy_decisions (
              id, subject_id, action, resource, decision, reasons, context, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, subject_id, action, resource, decision, reasons, context, created_at
            "#,
        )
        .bind(decision.id)
        .bind(&decision.subject_id)
        .bind(&decision.action)
        .bind(&decision.resource)
        .bind(&decision.decision)
        .bind(json!(decision.reasons))
        .bind(&decision.context)
        .bind(decision.created_at)
        .fetch_one(&self.pool)
        .await?;

        row_to_policy_decision(row)
    }

    pub async fn create_policy_rule(&self, rule: PolicyRule) -> Result<PolicyRule, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO policy_rules (id, name, effect, action, resource, priority, condition, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (name) DO UPDATE
              SET effect = EXCLUDED.effect,
                  action = EXCLUDED.action,
                  resource = EXCLUDED.resource,
                  priority = EXCLUDED.priority,
                  condition = EXCLUDED.condition
            RETURNING id, name, effect, action, resource, priority, condition, created_at
            "#,
        )
        .bind(rule.id)
        .bind(&rule.name)
        .bind(&rule.effect)
        .bind(&rule.action)
        .bind(&rule.resource)
        .bind(rule.priority)
        .bind(&rule.condition)
        .bind(rule.created_at)
        .fetch_one(&self.pool)
        .await?;

        row_to_policy_rule(row)
    }

    pub async fn list_policy_rules(&self, limit: i64) -> Result<Vec<PolicyRule>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, effect, action, resource, priority, condition, created_at
            FROM policy_rules
            ORDER BY priority ASC, created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_policy_rule).collect()
    }

    pub async fn matching_policy_rules(
        &self,
        action: &str,
        resource: &str,
    ) -> Result<Vec<PolicyRule>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, effect, action, resource, priority, condition, created_at
            FROM policy_rules
            WHERE (action = $1 OR action = '*') AND (resource = $2 OR resource = '*')
            ORDER BY priority ASC, created_at DESC
            "#,
        )
        .bind(action)
        .bind(resource)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_policy_rule).collect()
    }

    pub async fn create_audit_event(&self, audit: AuditEvent) -> Result<AuditEvent, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO audit_events (id, event_type, actor, subject_id, decision, payload, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, event_type, actor, subject_id, decision, payload, created_at
            "#,
        )
        .bind(audit.id)
        .bind(&audit.event_type)
        .bind(&audit.actor)
        .bind(&audit.subject_id)
        .bind(&audit.decision)
        .bind(&audit.payload)
        .bind(audit.created_at)
        .fetch_one(&self.pool)
        .await?;

        row_to_audit_event(row)
    }

    pub async fn list_audit_events(&self, limit: i64) -> Result<Vec<AuditEvent>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, event_type, actor, subject_id, decision, payload, created_at
            FROM audit_events
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_audit_event).collect()
    }

    pub async fn payment_status_counts(&self) -> Result<PaymentStatusCounts, DbError> {
        Ok(PaymentStatusCounts {
            pending: count_where(&self.pool, CountPredicate::PendingPayments).await?,
            executed: count_where(&self.pool, CountPredicate::ExecutedPayments).await?,
            rejected: count_where(&self.pool, CountPredicate::RejectedPayments).await?,
        })
    }

    pub async fn operational_overview(&self) -> Result<OperationalOverview, DbError> {
        Ok(OperationalOverview {
            generated_at: Utc::now(),
            network: self.network_stats().await?,
            payments: self.payment_status_counts().await?,
            runtime: self.runtime_queue_stats().await?,
            recent_events: self.list_events(12).await?,
            recent_audit: self.list_audit_events(12).await?,
            recent_domain_actions: self.list_recent_domain_actions(12).await?,
            recent_agent_runs: self.list_agent_runs(12).await?,
        })
    }

    pub async fn runtime_queue_stats(&self) -> Result<RuntimeQueueStats, DbError> {
        Ok(RuntimeQueueStats {
            active_workflows: count_where(&self.pool, CountPredicate::ActiveWorkflows).await?,
            needs_review_workflows: count_where(&self.pool, CountPredicate::NeedsReviewWorkflows)
                .await?,
            held_ledger_funds: count_where(&self.pool, CountPredicate::HeldLedgerFunds).await?,
            pending_agent_tasks: count_where(&self.pool, CountPredicate::RunnableAgentTasks)
                .await?,
            unread_notifications: count_where(&self.pool, CountPredicate::UnreadNotifications)
                .await?,
            reputation_scores: count_table(&self.pool, CountTable::ReputationScores).await?,
            high_risk_assessments: count_where(&self.pool, CountPredicate::HighRiskAssessments)
                .await?,
            world_scenarios: count_table(&self.pool, CountTable::WorldScenarios).await?,
            scenario_runs: count_table(&self.pool, CountTable::ScenarioRuns).await?,
            runtime_commands: count_table(&self.pool, CountTable::RuntimeCommands).await?,
            agent_crews: count_table(&self.pool, CountTable::AgentCrews).await?,
            civilization_signals: count_table(&self.pool, CountTable::CivilizationSignals).await?,
        })
    }

    pub async fn recompute_reputation(
        &self,
        identity_id: &str,
    ) -> Result<ReputationResponse, DbError> {
        self.get_identity(identity_id).await?;
        let signed_pacts = count_pacts_for_actor_status(&self.pool, identity_id, "active").await?;
        let revoked_pacts =
            count_pacts_for_actor_status(&self.pool, identity_id, "revoked").await?;
        let proofs = count_proofs_for_identity(&self.pool, identity_id).await?;
        let executed_payments = self.executed_payments_for_owner(identity_id).await?;
        let audit_denies = count_audit_denies_for_actor(&self.pool, identity_id).await?;

        let score =
            (500 + signed_pacts as i32 * 10 + proofs as i32 * 4 + executed_payments as i32 * 15
                - revoked_pacts as i32 * 40
                - audit_denies as i32 * 25)
                .clamp(0, 1000);
        let tier = if score >= 800 {
            "prime"
        } else if score >= 650 {
            "trusted"
        } else if score >= 450 {
            "standard"
        } else {
            "watch"
        };

        let row = sqlx::query(
            r#"
            INSERT INTO reputation_scores (identity_id, score, tier, factors, updated_at)
            VALUES ($1, $2, $3, $4, now())
            ON CONFLICT (identity_id) DO UPDATE
              SET score = EXCLUDED.score,
                  tier = EXCLUDED.tier,
                  factors = EXCLUDED.factors,
                  updated_at = now()
            RETURNING identity_id, score, tier, factors, updated_at
            "#,
        )
        .bind(identity_id)
        .bind(score)
        .bind(tier)
        .bind(json!({
            "signed_pacts": signed_pacts,
            "revoked_pacts": revoked_pacts,
            "proofs": proofs,
            "executed_payments": executed_payments,
            "audit_denies": audit_denies
        }))
        .fetch_one(&self.pool)
        .await?;

        let event = ReputationEvent {
            id: Uuid::new_v4(),
            identity_id: identity_id.to_string(),
            delta: score - 500,
            reason: "reputation recomputed from protocol activity".to_string(),
            source_id: None,
            created_at: Utc::now(),
        };
        sqlx::query(
            r#"
            INSERT INTO reputation_events (id, identity_id, delta, reason, source_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(event.id)
        .bind(&event.identity_id)
        .bind(event.delta)
        .bind(&event.reason)
        .bind(&event.source_id)
        .bind(event.created_at)
        .execute(&self.pool)
        .await?;

        Ok(ReputationResponse {
            score: row_to_reputation_score(row)?,
            events: self.list_reputation_events(identity_id, 20).await?,
        })
    }

    pub async fn get_reputation(&self, identity_id: &str) -> Result<ReputationResponse, DbError> {
        let row = sqlx::query(
            r#"
            SELECT identity_id, score, tier, factors, updated_at
            FROM reputation_scores
            WHERE identity_id = $1
            "#,
        )
        .bind(identity_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            Ok(ReputationResponse {
                score: row_to_reputation_score(row)?,
                events: self.list_reputation_events(identity_id, 20).await?,
            })
        } else {
            self.recompute_reputation(identity_id).await
        }
    }

    pub async fn list_reputation_events(
        &self,
        identity_id: &str,
        limit: i64,
    ) -> Result<Vec<ReputationEvent>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, identity_id, delta, reason, source_id, created_at
            FROM reputation_events
            WHERE identity_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(identity_id)
        .bind(limit.clamp(1, 100))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_reputation_event).collect()
    }

    async fn executed_payments_for_owner(&self, identity_id: &str) -> Result<i64, DbError> {
        let row = sqlx::query(
            r#"
            SELECT COUNT(*) AS count
            FROM payment_intents pi
            JOIN ledger_accounts la ON la.id = pi.payee_account_id OR la.id = pi.payer_account_id
            WHERE la.owner = $1 AND pi.status = 'executed'
            "#,
        )
        .bind(identity_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.try_get("count")?)
    }

    pub async fn search(&self, query: &str, limit: i64) -> Result<SearchResponse, DbError> {
        let like = format!("%{}%", query);
        let per_kind = (limit.clamp(1, 50) / 5).max(3);
        let mut results = Vec::new();

        for row in sqlx::query(
            r#"
            SELECT id, label, kind, created_at
            FROM identities
            WHERE id ILIKE $1 OR label ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(&like)
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?
        {
            let id: String = row.try_get("id")?;
            let label: String = row.try_get("label")?;
            let kind: String = row.try_get("kind")?;
            results.push(SearchResult {
                category: "identity".to_string(),
                id: id.clone(),
                label,
                summary: kind,
                metadata: json!({"id": id}),
            });
        }

        for row in sqlx::query(
            r#"
            SELECT id, actor, intent, target, status
            FROM pacts
            WHERE id::TEXT ILIKE $1 OR actor ILIKE $1 OR target ILIKE $1 OR intent ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(&like)
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?
        {
            let id: Uuid = row.try_get("id")?;
            let intent: String = row.try_get("intent")?;
            let status: String = row.try_get("status")?;
            results.push(SearchResult {
                category: "pact".to_string(),
                id: id.to_string(),
                label: intent,
                summary: status,
                metadata: json!({"actor": row.try_get::<String, _>("actor")?, "target": row.try_get::<String, _>("target")?}),
            });
        }

        for row in sqlx::query(
            r#"
            SELECT id, label, description
            FROM domain_modules
            WHERE id ILIKE $1 OR label ILIKE $1 OR description ILIKE $1
            ORDER BY id ASC
            LIMIT $2
            "#,
        )
        .bind(&like)
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?
        {
            let id: String = row.try_get("id")?;
            results.push(SearchResult {
                category: "domain".to_string(),
                id: id.clone(),
                label: row.try_get("label")?,
                summary: row.try_get("description")?,
                metadata: json!({"domain_id": id}),
            });
        }

        for row in sqlx::query(
            r#"
            SELECT id, amount, asset_id, status, memo
            FROM payment_intents
            WHERE id::TEXT ILIKE $1 OR status ILIKE $1 OR COALESCE(memo, '') ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(&like)
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?
        {
            let id: Uuid = row.try_get("id")?;
            let amount: i64 = row.try_get("amount")?;
            let asset_id: String = row.try_get("asset_id")?;
            results.push(SearchResult {
                category: "payment".to_string(),
                id: id.to_string(),
                label: format!("{} {}", amount, asset_id),
                summary: row.try_get("status")?,
                metadata: json!({"memo": row.try_get::<Option<String>, _>("memo")?}),
            });
        }

        for row in sqlx::query(
            r#"
            SELECT id, label, model
            FROM agent_profiles
            WHERE id::TEXT ILIKE $1 OR label ILIKE $1 OR model ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(&like)
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?
        {
            let id: Uuid = row.try_get("id")?;
            results.push(SearchResult {
                category: "agent".to_string(),
                id: id.to_string(),
                label: row.try_get("label")?,
                summary: row.try_get("model")?,
                metadata: json!({}),
            });
        }

        for row in sqlx::query(
            r#"
            SELECT id, domain_id, title, summary, status
            FROM world_scenarios
            WHERE id::TEXT ILIKE $1 OR domain_id ILIKE $1 OR title ILIKE $1 OR summary ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(&like)
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?
        {
            let id: Uuid = row.try_get("id")?;
            let domain_id: String = row.try_get("domain_id")?;
            results.push(SearchResult {
                category: "scenario".to_string(),
                id: id.to_string(),
                label: row.try_get("title")?,
                summary: row.try_get("status")?,
                metadata: json!({
                    "domain_id": domain_id,
                    "summary": row.try_get::<String, _>("summary")?
                }),
            });
        }

        for row in sqlx::query(
            r#"
            SELECT id, domain_id, intent, command_text, status
            FROM runtime_commands
            WHERE id::TEXT ILIKE $1 OR domain_id ILIKE $1 OR intent ILIKE $1 OR command_text ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(&like)
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?
        {
            let id: Uuid = row.try_get("id")?;
            results.push(SearchResult {
                category: "command".to_string(),
                id: id.to_string(),
                label: row.try_get("command_text")?,
                summary: row.try_get("status")?,
                metadata: json!({
                    "domain_id": row.try_get::<String, _>("domain_id")?,
                    "intent": row.try_get::<String, _>("intent")?
                }),
            });
        }

        for row in sqlx::query(
            r#"
            SELECT id, label, objective, status
            FROM agent_crews
            WHERE id::TEXT ILIKE $1 OR label ILIKE $1 OR objective ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(&like)
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?
        {
            let id: Uuid = row.try_get("id")?;
            results.push(SearchResult {
                category: "crew".to_string(),
                id: id.to_string(),
                label: row.try_get("label")?,
                summary: row.try_get("status")?,
                metadata: json!({"objective": row.try_get::<String, _>("objective")?}),
            });
        }

        Ok(SearchResponse {
            query: query.to_string(),
            results,
        })
    }

    pub async fn create_world_scenario(
        &self,
        scenario: WorldScenario,
    ) -> Result<WorldScenario, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO world_scenarios (
              id, actor, domain_id, title, summary, status, nodes, edges, payload, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, actor, domain_id, title, summary, status, nodes, edges, payload, created_at, updated_at
            "#,
        )
        .bind(scenario.id)
        .bind(&scenario.actor)
        .bind(&scenario.domain_id)
        .bind(&scenario.title)
        .bind(&scenario.summary)
        .bind(&scenario.status)
        .bind(json!(scenario.nodes))
        .bind(json!(scenario.edges))
        .bind(&scenario.payload)
        .bind(scenario.created_at)
        .bind(scenario.updated_at)
        .fetch_one(&self.pool)
        .await?;

        let scenario = row_to_world_scenario(row)?;
        self.append_event(
            "world.scenario.created",
            &scenario.id.to_string(),
            json!({
                "actor": scenario.actor.clone(),
                "domain_id": scenario.domain_id.clone(),
                "title": scenario.title.clone()
            }),
        )
        .await?;

        Ok(scenario)
    }

    pub async fn list_world_scenarios(&self, limit: i64) -> Result<Vec<WorldScenario>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, actor, domain_id, title, summary, status, nodes, edges, payload, created_at, updated_at
            FROM world_scenarios
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_world_scenario).collect()
    }

    pub async fn get_world_scenario(&self, id: Uuid) -> Result<WorldScenario, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, actor, domain_id, title, summary, status, nodes, edges, payload, created_at, updated_at
            FROM world_scenarios
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        row_to_world_scenario(row)
    }

    pub async fn create_scenario_run(&self, run: ScenarioRun) -> Result<ScenarioRun, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO scenario_runs (
              id, scenario_id, status, impact_score, risk_level, recommended_actions,
              generated_objects, output, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, scenario_id, status, impact_score, risk_level, recommended_actions,
              generated_objects, output, created_at
            "#,
        )
        .bind(run.id)
        .bind(run.scenario_id)
        .bind(&run.status)
        .bind(run.impact_score)
        .bind(&run.risk_level)
        .bind(&run.recommended_actions)
        .bind(&run.generated_objects)
        .bind(&run.output)
        .bind(run.created_at)
        .fetch_one(&self.pool)
        .await?;

        let run = row_to_scenario_run(row)?;
        self.append_event(
            "world.scenario.run",
            &run.id.to_string(),
            json!({
                "scenario_id": run.scenario_id,
                "impact_score": run.impact_score,
                "risk_level": run.risk_level.clone()
            }),
        )
        .await?;

        Ok(run)
    }

    pub async fn create_runtime_command(
        &self,
        command: RuntimeCommand,
    ) -> Result<RuntimeCommand, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO runtime_commands (
              id, actor, domain_id, intent, target, command_text, payload, status,
              result, pact_id, workflow_id, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, actor, domain_id, intent, target, command_text, payload, status,
              result, pact_id, workflow_id, created_at
            "#,
        )
        .bind(command.id)
        .bind(&command.actor)
        .bind(&command.domain_id)
        .bind(&command.intent)
        .bind(&command.target)
        .bind(&command.command_text)
        .bind(&command.payload)
        .bind(&command.status)
        .bind(json!(command.result))
        .bind(command.pact_id)
        .bind(command.workflow_id)
        .bind(command.created_at)
        .fetch_one(&self.pool)
        .await?;

        let command = row_to_runtime_command(row)?;
        self.append_event(
            "runtime.command.created",
            &command.id.to_string(),
            json!({
                "actor": command.actor.clone(),
                "domain_id": command.domain_id.clone(),
                "intent": command.intent.clone(),
                "status": command.status.clone()
            }),
        )
        .await?;

        Ok(command)
    }

    pub async fn list_runtime_commands(&self, limit: i64) -> Result<Vec<RuntimeCommand>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, actor, domain_id, intent, target, command_text, payload, status,
              result, pact_id, workflow_id, created_at
            FROM runtime_commands
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_runtime_command).collect()
    }

    pub async fn create_agent_crew(
        &self,
        crew: AgentCrew,
        members: Vec<AgentCrewMember>,
    ) -> Result<AgentCrewResponse, DbError> {
        let mut tx = self.pool.begin().await?;
        let row = sqlx::query(
            r#"
            INSERT INTO agent_crews (id, actor, label, objective, status, policy_decision, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, actor, label, objective, status, policy_decision, created_at, updated_at
            "#,
        )
        .bind(crew.id)
        .bind(&crew.actor)
        .bind(&crew.label)
        .bind(&crew.objective)
        .bind(&crew.status)
        .bind(&crew.policy_decision)
        .bind(crew.created_at)
        .bind(crew.updated_at)
        .fetch_one(&mut *tx)
        .await?;

        for member in &members {
            sqlx::query(
                r#"
                INSERT INTO agent_crew_members (id, crew_id, agent_id, mandate_id, role, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                "#,
            )
            .bind(member.id)
            .bind(member.crew_id)
            .bind(member.agent_id)
            .bind(member.mandate_id)
            .bind(&member.role)
            .bind(member.created_at)
            .execute(&mut *tx)
            .await?;
        }

        tx.commit().await?;
        let crew = row_to_agent_crew(row)?;
        self.append_event(
            "agent.crew.created",
            &crew.id.to_string(),
            json!({
                "actor": crew.actor.clone(),
                "label": crew.label.clone(),
                "member_count": members.len(),
                "policy_decision": crew.policy_decision.clone()
            }),
        )
        .await?;

        Ok(AgentCrewResponse { crew, members })
    }

    pub async fn list_agent_crews(&self, limit: i64) -> Result<Vec<AgentCrewResponse>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, actor, label, objective, status, policy_decision, created_at, updated_at
            FROM agent_crews
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        let mut crews = Vec::new();
        for row in rows {
            let crew = row_to_agent_crew(row)?;
            let members = self.list_agent_crew_members(crew.id).await?;
            crews.push(AgentCrewResponse { crew, members });
        }
        Ok(crews)
    }

    pub async fn get_agent_crew(&self, id: Uuid) -> Result<AgentCrewResponse, DbError> {
        let row = sqlx::query(
            r#"
            SELECT id, actor, label, objective, status, policy_decision, created_at, updated_at
            FROM agent_crews
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or(DbError::NotFound)?;

        let crew = row_to_agent_crew(row)?;
        let members = self.list_agent_crew_members(crew.id).await?;
        Ok(AgentCrewResponse { crew, members })
    }

    pub async fn list_agent_crew_members(
        &self,
        crew_id: Uuid,
    ) -> Result<Vec<AgentCrewMember>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, crew_id, agent_id, mandate_id, role, created_at
            FROM agent_crew_members
            WHERE crew_id = $1
            ORDER BY created_at ASC
            "#,
        )
        .bind(crew_id)
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_agent_crew_member).collect()
    }

    pub async fn create_crew_run(&self, run: CrewRun) -> Result<CrewRun, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO crew_runs (id, crew_id, status, policy_decision, requires_review, output, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, crew_id, status, policy_decision, requires_review, output, created_at
            "#,
        )
        .bind(run.id)
        .bind(run.crew_id)
        .bind(&run.status)
        .bind(&run.policy_decision)
        .bind(run.requires_review)
        .bind(&run.output)
        .bind(run.created_at)
        .fetch_one(&self.pool)
        .await?;

        let run = row_to_crew_run(row)?;
        self.append_event(
            "agent.crew.run",
            &run.id.to_string(),
            json!({
                "crew_id": run.crew_id,
                "status": run.status.clone(),
                "policy_decision": run.policy_decision.clone()
            }),
        )
        .await?;
        Ok(run)
    }

    pub async fn create_civilization_signal(
        &self,
        signal: CivilizationSignal,
    ) -> Result<CivilizationSignal, DbError> {
        let row = sqlx::query(
            r#"
            INSERT INTO civilization_signals (
              id, domain_id, actor, signal_type, severity, title, payload, status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, domain_id, actor, signal_type, severity, title, payload, status, created_at
            "#,
        )
        .bind(signal.id)
        .bind(&signal.domain_id)
        .bind(&signal.actor)
        .bind(&signal.signal_type)
        .bind(signal.severity)
        .bind(&signal.title)
        .bind(&signal.payload)
        .bind(&signal.status)
        .bind(signal.created_at)
        .fetch_one(&self.pool)
        .await?;

        let signal = row_to_civilization_signal(row)?;
        self.append_event(
            "civilization.signal.created",
            &signal.id.to_string(),
            json!({
                "domain_id": signal.domain_id.clone(),
                "severity": signal.severity,
                "signal_type": signal.signal_type.clone()
            }),
        )
        .await?;
        Ok(signal)
    }

    pub async fn runtime_timeline(&self, limit: i64) -> Result<Vec<RuntimeTimelineItem>, DbError> {
        let per_kind = limit.clamp(1, 200);
        let mut items = Vec::new();

        for event in self.list_events(per_kind).await? {
            items.push(RuntimeTimelineItem {
                id: event.id.to_string(),
                item_type: "event".to_string(),
                title: event.event_type,
                status: "recorded".to_string(),
                actor: None,
                domain_id: None,
                metadata: json!({
                    "subject_id": event.subject_id,
                    "payload": event.payload
                }),
                created_at: event.created_at,
            });
        }

        for scenario in self.list_world_scenarios(per_kind).await? {
            items.push(RuntimeTimelineItem {
                id: scenario.id.to_string(),
                item_type: "scenario".to_string(),
                title: scenario.title,
                status: scenario.status,
                actor: Some(scenario.actor),
                domain_id: Some(scenario.domain_id),
                metadata: json!({
                    "summary": scenario.summary,
                    "nodes": scenario.nodes.len(),
                    "edges": scenario.edges.len()
                }),
                created_at: scenario.created_at,
            });
        }

        let run_rows = sqlx::query(
            r#"
            SELECT id, scenario_id, status, impact_score, risk_level, recommended_actions,
              generated_objects, output, created_at
            FROM scenario_runs
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?;
        for row in run_rows {
            let run = row_to_scenario_run(row)?;
            items.push(RuntimeTimelineItem {
                id: run.id.to_string(),
                item_type: "scenario_run".to_string(),
                title: format!("Scenario run: {}", run.risk_level),
                status: run.status,
                actor: None,
                domain_id: None,
                metadata: json!({
                    "scenario_id": run.scenario_id,
                    "impact_score": run.impact_score,
                    "generated_objects": run.generated_objects
                }),
                created_at: run.created_at,
            });
        }

        for command in self.list_runtime_commands(per_kind).await? {
            items.push(RuntimeTimelineItem {
                id: command.id.to_string(),
                item_type: "command".to_string(),
                title: command.command_text,
                status: command.status,
                actor: Some(command.actor),
                domain_id: Some(command.domain_id),
                metadata: json!({
                    "intent": command.intent,
                    "result": command.result,
                    "pact_id": command.pact_id,
                    "workflow_id": command.workflow_id
                }),
                created_at: command.created_at,
            });
        }

        for crew_response in self.list_agent_crews(per_kind).await? {
            items.push(RuntimeTimelineItem {
                id: crew_response.crew.id.to_string(),
                item_type: "crew".to_string(),
                title: crew_response.crew.label,
                status: crew_response.crew.status,
                actor: Some(crew_response.crew.actor),
                domain_id: None,
                metadata: json!({
                    "objective": crew_response.crew.objective,
                    "policy_decision": crew_response.crew.policy_decision,
                    "member_count": crew_response.members.len()
                }),
                created_at: crew_response.crew.created_at,
            });
        }

        let crew_run_rows = sqlx::query(
            r#"
            SELECT id, crew_id, status, policy_decision, requires_review, output, created_at
            FROM crew_runs
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?;
        for row in crew_run_rows {
            let run = row_to_crew_run(row)?;
            items.push(RuntimeTimelineItem {
                id: run.id.to_string(),
                item_type: "crew_run".to_string(),
                title: format!("Crew run: {}", run.policy_decision),
                status: run.status,
                actor: None,
                domain_id: None,
                metadata: json!({
                    "crew_id": run.crew_id,
                    "requires_review": run.requires_review,
                    "output": run.output
                }),
                created_at: run.created_at,
            });
        }

        let signal_rows = sqlx::query(
            r#"
            SELECT id, domain_id, actor, signal_type, severity, title, payload, status, created_at
            FROM civilization_signals
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(per_kind)
        .fetch_all(&self.pool)
        .await?;
        for row in signal_rows {
            let signal = row_to_civilization_signal(row)?;
            items.push(RuntimeTimelineItem {
                id: signal.id.to_string(),
                item_type: "signal".to_string(),
                title: signal.title,
                status: signal.status,
                actor: signal.actor,
                domain_id: Some(signal.domain_id),
                metadata: json!({
                    "signal_type": signal.signal_type,
                    "severity": signal.severity,
                    "payload": signal.payload
                }),
                created_at: signal.created_at,
            });
        }

        items.sort_by(|left, right| right.created_at.cmp(&left.created_at));
        items.truncate(limit.clamp(1, 200) as usize);
        Ok(items)
    }

    async fn ledger_balance(&self, account_id: Uuid) -> Result<i64, DbError> {
        let row = sqlx::query(
            r#"
            SELECT COALESCE(SUM(
              CASE WHEN direction = 'credit' THEN amount ELSE -amount END
            ), 0)::BIGINT AS balance
            FROM ledger_entries
            WHERE account_id = $1
            "#,
        )
        .bind(account_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.try_get("balance")?)
    }

    pub async fn list_events(&self, limit: i64) -> Result<Vec<EventLog>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, event_type, subject_id, payload, created_at
            FROM event_log
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit.clamp(1, 200))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_event).collect()
    }

    pub async fn list_events_for_subject(
        &self,
        subject_id: &str,
        limit: i64,
    ) -> Result<Vec<EventLog>, DbError> {
        let rows = sqlx::query(
            r#"
            SELECT id, event_type, subject_id, payload, created_at
            FROM event_log
            WHERE subject_id = $1 OR payload->>'pact_id' = $1
            ORDER BY created_at ASC
            LIMIT $2
            "#,
        )
        .bind(subject_id)
        .bind(limit.clamp(1, 500))
        .fetch_all(&self.pool)
        .await?;

        rows.into_iter().map(row_to_event).collect()
    }

    async fn append_event(
        &self,
        event_type: &str,
        subject_id: &str,
        payload: Value,
    ) -> Result<(), DbError> {
        sqlx::query(
            r#"
            INSERT INTO event_log (id, event_type, subject_id, payload)
            VALUES ($1, $2, $3, $4)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(event_type)
        .bind(subject_id)
        .bind(payload)
        .execute(&self.pool)
        .await?;

        Ok(())
    }
}

fn add_graph_node(nodes: &mut BTreeMap<String, TrustGraphNode>, node: TrustGraphNode) {
    nodes.entry(node.id.clone()).or_insert(node);
}

fn ensure_external_node(nodes: &mut BTreeMap<String, TrustGraphNode>, id: &str, node_type: &str) {
    if nodes.contains_key(id) {
        return;
    }

    add_graph_node(
        nodes,
        TrustGraphNode {
            id: id.to_string(),
            label: id.to_string(),
            node_type: node_type.to_string(),
            metadata: json!({"external": true}),
        },
    );
}

fn row_to_identity(row: sqlx::postgres::PgRow) -> Result<Identity, DbError> {
    Ok(Identity {
        id: row.try_get("id")?,
        label: row.try_get("label")?,
        kind: identity_kind_from_str(row.try_get::<String, _>("kind")?.as_str()),
        public_key: row.try_get("public_key")?,
        private_key: row.try_get("private_key")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_pact(row: sqlx::postgres::PgRow) -> Result<Pact, DbError> {
    let status: String = row.try_get("status")?;
    Ok(Pact {
        id: row.try_get("id")?,
        actor: row.try_get("actor")?,
        intent: row.try_get("intent")?,
        object: row.try_get("object")?,
        target: row.try_get("target")?,
        terms: row.try_get("terms")?,
        consent: row.try_get("consent")?,
        proof: row.try_get("proof")?,
        created_at: row.try_get("created_at")?,
        expires_at: row.try_get("expires_at")?,
        signature: row.try_get("signature")?,
        hash: row.try_get("hash")?,
        status: PactStatus::try_from(status.as_str())?,
    })
}

fn row_to_revocation(row: sqlx::postgres::PgRow) -> Result<Revocation, DbError> {
    Ok(Revocation {
        id: row.try_get("id")?,
        pact_id: row.try_get("pact_id")?,
        revoked_by: row.try_get("revoked_by")?,
        reason: row.try_get("reason")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_proof(row: sqlx::postgres::PgRow) -> Result<Proof, DbError> {
    Ok(Proof {
        id: row.try_get("id")?,
        pact_id: row.try_get("pact_id")?,
        proof_type: row.try_get("proof_type")?,
        payload: row.try_get("payload")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_mandate(row: sqlx::postgres::PgRow) -> Result<Mandate, DbError> {
    Ok(Mandate {
        id: row.try_get("id")?,
        principal: row.try_get("principal")?,
        agent: row.try_get("agent")?,
        scope: row.try_get("scope")?,
        expires_at: row.try_get("expires_at")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_genome(row: sqlx::postgres::PgRow) -> Result<Genome, DbError> {
    Ok(Genome {
        id: row.try_get("id")?,
        subject: row.try_get("subject")?,
        origin: row.try_get("origin")?,
        history: row.try_get("history")?,
        rights: row.try_get("rights")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_event(row: sqlx::postgres::PgRow) -> Result<EventLog, DbError> {
    Ok(EventLog {
        id: row.try_get("id")?,
        event_type: row.try_get("event_type")?,
        subject_id: row.try_get("subject_id")?,
        payload: row.try_get("payload")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_auth_challenge(row: sqlx::postgres::PgRow) -> Result<AuthChallenge, DbError> {
    Ok(AuthChallenge {
        id: row.try_get("id")?,
        identity_id: row.try_get("identity_id")?,
        purpose: row.try_get("purpose")?,
        challenge: row.try_get("challenge")?,
        expires_at: row.try_get("expires_at")?,
        consumed_at: row.try_get("consumed_at")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_credential(row: sqlx::postgres::PgRow) -> Result<Credential, DbError> {
    Ok(Credential {
        id: row.try_get("id")?,
        identity_id: row.try_get("identity_id")?,
        credential_type: row.try_get("credential_type")?,
        credential_id: row.try_get("credential_id")?,
        public_key: row.try_get("public_key")?,
        transports: row.try_get("transports")?,
        created_at: row.try_get("created_at")?,
        last_used_at: row.try_get("last_used_at")?,
    })
}

fn row_to_auth_session(row: sqlx::postgres::PgRow) -> Result<AuthSession, DbError> {
    Ok(AuthSession {
        id: row.try_get("id")?,
        identity_id: row.try_get("identity_id")?,
        session_token: row.try_get("session_token")?,
        issued_by: row.try_get("issued_by")?,
        expires_at: row.try_get("expires_at")?,
        revoked_at: row.try_get("revoked_at")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_domain_module(row: sqlx::postgres::PgRow) -> Result<DomainModule, DbError> {
    Ok(DomainModule {
        id: row.try_get("id")?,
        label: row.try_get("label")?,
        domain_kind: row.try_get("domain_kind")?,
        description: row.try_get("description")?,
        enabled: row.try_get("enabled")?,
        capabilities: row.try_get("capabilities")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_domain_template(row: sqlx::postgres::PgRow) -> Result<DomainActionTemplate, DbError> {
    Ok(DomainActionTemplate {
        id: row.try_get("id")?,
        domain_id: row.try_get("domain_id")?,
        action_type: row.try_get("action_type")?,
        label: row.try_get("label")?,
        schema: row.try_get("schema")?,
        default_terms: row.try_get("default_terms")?,
        risk_level: row.try_get("risk_level")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_domain_action(row: sqlx::postgres::PgRow) -> Result<DomainAction, DbError> {
    Ok(DomainAction {
        id: row.try_get("id")?,
        domain_id: row.try_get("domain_id")?,
        template_id: row.try_get("template_id")?,
        actor: row.try_get("actor")?,
        pact_id: row.try_get("pact_id")?,
        action_type: row.try_get("action_type")?,
        payload: row.try_get("payload")?,
        status: row.try_get("status")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_workflow_template(row: sqlx::postgres::PgRow) -> Result<WorkflowTemplate, DbError> {
    Ok(WorkflowTemplate {
        id: row.try_get("id")?,
        domain_id: row.try_get("domain_id")?,
        label: row.try_get("label")?,
        action_type: row.try_get("action_type")?,
        steps: row.try_get("steps")?,
        risk_model: row.try_get("risk_model")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_domain_workflow(row: sqlx::postgres::PgRow) -> Result<DomainWorkflow, DbError> {
    Ok(DomainWorkflow {
        id: row.try_get("id")?,
        domain_id: row.try_get("domain_id")?,
        template_id: row.try_get("template_id")?,
        actor: row.try_get("actor")?,
        target: row.try_get("target")?,
        title: row.try_get("title")?,
        status: row.try_get("status")?,
        current_step: row.try_get("current_step")?,
        pact_id: row.try_get("pact_id")?,
        risk_id: row.try_get("risk_id")?,
        payload: row.try_get("payload")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    })
}

fn row_to_workflow_step(row: sqlx::postgres::PgRow) -> Result<WorkflowStep, DbError> {
    Ok(WorkflowStep {
        id: row.try_get("id")?,
        workflow_id: row.try_get("workflow_id")?,
        step_order: row.try_get("step_order")?,
        label: row.try_get("label")?,
        status: row.try_get("status")?,
        output: row.try_get("output")?,
        pact_id: row.try_get("pact_id")?,
        created_at: row.try_get("created_at")?,
        completed_at: row.try_get("completed_at")?,
    })
}

fn row_to_workflow_review(row: sqlx::postgres::PgRow) -> Result<WorkflowReview, DbError> {
    Ok(WorkflowReview {
        id: row.try_get("id")?,
        workflow_id: row.try_get("workflow_id")?,
        reviewer: row.try_get("reviewer")?,
        decision: row.try_get("decision")?,
        notes: row.try_get("notes")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_risk_assessment(row: sqlx::postgres::PgRow) -> Result<RiskAssessment, DbError> {
    let reasons: Value = row.try_get("reasons")?;
    Ok(RiskAssessment {
        id: row.try_get("id")?,
        subject_id: row.try_get("subject_id")?,
        risk_level: row.try_get("risk_level")?,
        score: row.try_get("score")?,
        reasons: value_to_string_vec(&reasons),
        mitigation_strategy: row.try_get("mitigation_strategy")?,
        confidence_score: row.try_get("confidence_score")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_ledger_account_base(row: sqlx::postgres::PgRow) -> Result<LedgerAccount, DbError> {
    Ok(LedgerAccount {
        id: row.try_get("id")?,
        owner: row.try_get("owner")?,
        asset_id: row.try_get("asset_id")?,
        label: row.try_get("label")?,
        balance: 0,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_ledger_asset(row: sqlx::postgres::PgRow) -> Result<LedgerAsset, DbError> {
    Ok(LedgerAsset {
        id: row.try_get("id")?,
        symbol: row.try_get("symbol")?,
        name: row.try_get("name")?,
        decimals: row.try_get("decimals")?,
        sandbox: row.try_get("sandbox")?,
        metadata: row.try_get("metadata")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_payment_intent(row: sqlx::postgres::PgRow) -> Result<PaymentIntent, DbError> {
    Ok(PaymentIntent {
        id: row.try_get("id")?,
        payer_account_id: row.try_get("payer_account_id")?,
        payee_account_id: row.try_get("payee_account_id")?,
        pact_id: row.try_get("pact_id")?,
        amount: row.try_get("amount")?,
        asset_id: row.try_get("asset_id")?,
        status: row.try_get("status")?,
        memo: row.try_get("memo")?,
        created_at: row.try_get("created_at")?,
        executed_at: row.try_get("executed_at")?,
    })
}

fn row_to_ledger_hold(row: sqlx::postgres::PgRow) -> Result<LedgerHold, DbError> {
    Ok(LedgerHold {
        id: row.try_get("id")?,
        account_id: row.try_get("account_id")?,
        pact_id: row.try_get("pact_id")?,
        amount: row.try_get("amount")?,
        asset_id: row.try_get("asset_id")?,
        status: row.try_get("status")?,
        reason: row.try_get("reason")?,
        created_at: row.try_get("created_at")?,
        released_at: row.try_get("released_at")?,
    })
}

fn row_to_token_issuance(row: sqlx::postgres::PgRow) -> Result<TokenIssuanceEvent, DbError> {
    Ok(TokenIssuanceEvent {
        id: row.try_get("id")?,
        asset_id: row.try_get("asset_id")?,
        account_id: row.try_get("account_id")?,
        issuer: row.try_get("issuer")?,
        amount: row.try_get("amount")?,
        memo: row.try_get("memo")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_ledger_transfer(row: sqlx::postgres::PgRow) -> Result<LedgerTransfer, DbError> {
    Ok(LedgerTransfer {
        id: row.try_get("id")?,
        payment_intent_id: row.try_get("payment_intent_id")?,
        asset_id: row.try_get("asset_id")?,
        amount: row.try_get("amount")?,
        debit_account_id: row.try_get("debit_account_id")?,
        credit_account_id: row.try_get("credit_account_id")?,
        status: row.try_get("status")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_ledger_entry(row: sqlx::postgres::PgRow) -> Result<LedgerEntry, DbError> {
    Ok(LedgerEntry {
        id: row.try_get("id")?,
        transfer_id: row.try_get("transfer_id")?,
        account_id: row.try_get("account_id")?,
        direction: row.try_get("direction")?,
        amount: row.try_get("amount")?,
        asset_id: row.try_get("asset_id")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_agent_profile(row: sqlx::postgres::PgRow) -> Result<AgentProfile, DbError> {
    Ok(AgentProfile {
        id: row.try_get("id")?,
        identity_id: row.try_get("identity_id")?,
        label: row.try_get("label")?,
        model: row.try_get("model")?,
        capabilities: row.try_get("capabilities")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_agent_run(row: sqlx::postgres::PgRow) -> Result<AgentRun, DbError> {
    Ok(AgentRun {
        id: row.try_get("id")?,
        agent_id: row.try_get("agent_id")?,
        mandate_id: row.try_get("mandate_id")?,
        pact_id: row.try_get("pact_id")?,
        action: row.try_get("action")?,
        input: row.try_get("input")?,
        output: row.try_get("output")?,
        policy_decision: row.try_get("policy_decision")?,
        status: row.try_get("status")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_agent_task(row: sqlx::postgres::PgRow) -> Result<AgentTask, DbError> {
    Ok(AgentTask {
        id: row.try_get("id")?,
        agent_id: row.try_get("agent_id")?,
        mandate_id: row.try_get("mandate_id")?,
        pact_id: row.try_get("pact_id")?,
        action: row.try_get("action")?,
        input: row.try_get("input")?,
        status: row.try_get("status")?,
        policy_decision: row.try_get("policy_decision")?,
        requires_approval: row.try_get("requires_approval")?,
        approved_by: row.try_get("approved_by")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    })
}

fn row_to_agent_run_log(row: sqlx::postgres::PgRow) -> Result<AgentRunLog, DbError> {
    Ok(AgentRunLog {
        id: row.try_get("id")?,
        task_id: row.try_get("task_id")?,
        run_id: row.try_get("run_id")?,
        level: row.try_get("level")?,
        message: row.try_get("message")?,
        payload: row.try_get("payload")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_audit_event(row: sqlx::postgres::PgRow) -> Result<AuditEvent, DbError> {
    Ok(AuditEvent {
        id: row.try_get("id")?,
        event_type: row.try_get("event_type")?,
        actor: row.try_get("actor")?,
        subject_id: row.try_get("subject_id")?,
        decision: row.try_get("decision")?,
        payload: row.try_get("payload")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_policy_decision(row: sqlx::postgres::PgRow) -> Result<PolicyDecision, DbError> {
    let reasons: Value = row.try_get("reasons")?;
    Ok(PolicyDecision {
        id: row.try_get("id")?,
        subject_id: row.try_get("subject_id")?,
        action: row.try_get("action")?,
        resource: row.try_get("resource")?,
        decision: row.try_get("decision")?,
        reasons: value_to_string_vec(&reasons),
        context: row.try_get("context")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_policy_rule(row: sqlx::postgres::PgRow) -> Result<PolicyRule, DbError> {
    Ok(PolicyRule {
        id: row.try_get("id")?,
        name: row.try_get("name")?,
        effect: row.try_get("effect")?,
        action: row.try_get("action")?,
        resource: row.try_get("resource")?,
        priority: row.try_get("priority")?,
        condition: row.try_get("condition")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_reputation_score(row: sqlx::postgres::PgRow) -> Result<ReputationScore, DbError> {
    Ok(ReputationScore {
        identity_id: row.try_get("identity_id")?,
        score: row.try_get("score")?,
        tier: row.try_get("tier")?,
        factors: row.try_get("factors")?,
        updated_at: row.try_get("updated_at")?,
    })
}

fn row_to_reputation_event(row: sqlx::postgres::PgRow) -> Result<ReputationEvent, DbError> {
    Ok(ReputationEvent {
        id: row.try_get("id")?,
        identity_id: row.try_get("identity_id")?,
        delta: row.try_get("delta")?,
        reason: row.try_get("reason")?,
        source_id: row.try_get("source_id")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_world_scenario(row: sqlx::postgres::PgRow) -> Result<WorldScenario, DbError> {
    let nodes: Value = row.try_get("nodes")?;
    let edges: Value = row.try_get("edges")?;
    Ok(WorldScenario {
        id: row.try_get("id")?,
        actor: row.try_get("actor")?,
        domain_id: row.try_get("domain_id")?,
        title: row.try_get("title")?,
        summary: row.try_get("summary")?,
        status: row.try_get("status")?,
        nodes: serde_json::from_value::<Vec<ScenarioNode>>(nodes).unwrap_or_default(),
        edges: serde_json::from_value::<Vec<ScenarioEdge>>(edges).unwrap_or_default(),
        payload: row.try_get("payload")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    })
}

fn row_to_scenario_run(row: sqlx::postgres::PgRow) -> Result<ScenarioRun, DbError> {
    Ok(ScenarioRun {
        id: row.try_get("id")?,
        scenario_id: row.try_get("scenario_id")?,
        status: row.try_get("status")?,
        impact_score: row.try_get("impact_score")?,
        risk_level: row.try_get("risk_level")?,
        recommended_actions: row.try_get("recommended_actions")?,
        generated_objects: row.try_get("generated_objects")?,
        output: row.try_get("output")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_runtime_command(row: sqlx::postgres::PgRow) -> Result<RuntimeCommand, DbError> {
    let result: Value = row.try_get("result")?;
    Ok(RuntimeCommand {
        id: row.try_get("id")?,
        actor: row.try_get("actor")?,
        domain_id: row.try_get("domain_id")?,
        intent: row.try_get("intent")?,
        target: row.try_get("target")?,
        command_text: row.try_get("command_text")?,
        payload: row.try_get("payload")?,
        status: row.try_get("status")?,
        result: serde_json::from_value::<CommandResult>(result).unwrap_or_else(|_| CommandResult {
            status: "invalid".to_string(),
            summary: "stored command result could not be decoded".to_string(),
            generated_objects: json!({}),
            next_actions: json!([]),
        }),
        pact_id: row.try_get("pact_id")?,
        workflow_id: row.try_get("workflow_id")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_agent_crew(row: sqlx::postgres::PgRow) -> Result<AgentCrew, DbError> {
    Ok(AgentCrew {
        id: row.try_get("id")?,
        actor: row.try_get("actor")?,
        label: row.try_get("label")?,
        objective: row.try_get("objective")?,
        status: row.try_get("status")?,
        policy_decision: row.try_get("policy_decision")?,
        created_at: row.try_get("created_at")?,
        updated_at: row.try_get("updated_at")?,
    })
}

fn row_to_agent_crew_member(row: sqlx::postgres::PgRow) -> Result<AgentCrewMember, DbError> {
    Ok(AgentCrewMember {
        id: row.try_get("id")?,
        crew_id: row.try_get("crew_id")?,
        agent_id: row.try_get("agent_id")?,
        mandate_id: row.try_get("mandate_id")?,
        role: row.try_get("role")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_crew_run(row: sqlx::postgres::PgRow) -> Result<CrewRun, DbError> {
    Ok(CrewRun {
        id: row.try_get("id")?,
        crew_id: row.try_get("crew_id")?,
        status: row.try_get("status")?,
        policy_decision: row.try_get("policy_decision")?,
        requires_review: row.try_get("requires_review")?,
        output: row.try_get("output")?,
        created_at: row.try_get("created_at")?,
    })
}

fn row_to_civilization_signal(row: sqlx::postgres::PgRow) -> Result<CivilizationSignal, DbError> {
    Ok(CivilizationSignal {
        id: row.try_get("id")?,
        domain_id: row.try_get("domain_id")?,
        actor: row.try_get("actor")?,
        signal_type: row.try_get("signal_type")?,
        severity: row.try_get("severity")?,
        title: row.try_get("title")?,
        payload: row.try_get("payload")?,
        status: row.try_get("status")?,
        tags: row.try_get("tags")?,
        correlation_id: row.try_get("correlation_id")?,
        created_at: row.try_get("created_at")?,
    })
}

fn value_to_string_vec(value: &Value) -> Vec<String> {
    value
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(ToString::to_string)
                .collect()
        })
        .unwrap_or_default()
}

fn identity_kind_to_str(kind: &IdentityKind) -> &'static str {
    match kind {
        IdentityKind::Person => "person",
        IdentityKind::Organization => "organization",
        IdentityKind::Agent => "agent",
        IdentityKind::Machine => "machine",
        IdentityKind::Product => "product",
        IdentityKind::Place => "place",
    }
}

fn identity_kind_from_str(value: &str) -> IdentityKind {
    match value {
        "organization" => IdentityKind::Organization,
        "agent" => IdentityKind::Agent,
        "machine" => IdentityKind::Machine,
        "product" => IdentityKind::Product,
        "place" => IdentityKind::Place,
        _ => IdentityKind::Person,
    }
}

#[allow(dead_code)]
fn _assert_datetime_send_sync(_: DateTime<Utc>) {}
