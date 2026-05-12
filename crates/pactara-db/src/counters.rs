use sqlx::{PgPool, Row};

use crate::DbError;

pub(crate) enum CountTable {
    Identities,
    Pacts,
    Proofs,
    Mandates,
    Genomes,
    EventLog,
    DomainModules,
    LedgerAccounts,
    PaymentIntents,
    AgentProfiles,
    AuditEvents,
    ReputationScores,
    WorldScenarios,
    ScenarioRuns,
    RuntimeCommands,
    AgentCrews,
    CivilizationSignals,
}

impl CountTable {
    fn sql_name(&self) -> &'static str {
        match self {
            Self::Identities => "identities",
            Self::Pacts => "pacts",
            Self::Proofs => "proofs",
            Self::Mandates => "mandates",
            Self::Genomes => "genomes",
            Self::EventLog => "event_log",
            Self::DomainModules => "domain_modules",
            Self::LedgerAccounts => "ledger_accounts",
            Self::PaymentIntents => "payment_intents",
            Self::AgentProfiles => "agent_profiles",
            Self::AuditEvents => "audit_events",
            Self::ReputationScores => "reputation_scores",
            Self::WorldScenarios => "world_scenarios",
            Self::ScenarioRuns => "scenario_runs",
            Self::RuntimeCommands => "runtime_commands",
            Self::AgentCrews => "agent_crews",
            Self::CivilizationSignals => "civilization_signals",
        }
    }
}

pub(crate) enum CountPredicate {
    ActivePacts,
    RevokedPacts,
    PendingPayments,
    ExecutedPayments,
    RejectedPayments,
    ActiveWorkflows,
    NeedsReviewWorkflows,
    HeldLedgerFunds,
    RunnableAgentTasks,
    UnreadNotifications,
    HighRiskAssessments,
}

impl CountPredicate {
    fn table_name(&self) -> &'static str {
        match self {
            Self::ActivePacts | Self::RevokedPacts => "pacts",
            Self::PendingPayments | Self::ExecutedPayments | Self::RejectedPayments => {
                "payment_intents"
            }
            Self::ActiveWorkflows | Self::NeedsReviewWorkflows => "domain_workflows",
            Self::HeldLedgerFunds => "ledger_holds",
            Self::RunnableAgentTasks => "agent_tasks",
            Self::UnreadNotifications => "system_notifications",
            Self::HighRiskAssessments => "risk_assessments",
        }
    }

    fn where_sql(&self) -> &'static str {
        match self {
            Self::ActivePacts => "status = 'active'",
            Self::RevokedPacts => "status = 'revoked'",
            Self::PendingPayments => "status = 'pending'",
            Self::ExecutedPayments => "status = 'executed'",
            Self::RejectedPayments => "status = 'rejected'",
            Self::ActiveWorkflows => "status = 'active'",
            Self::NeedsReviewWorkflows => "status = 'needs_review'",
            Self::HeldLedgerFunds => "status = 'held'",
            Self::RunnableAgentTasks => "status IN ('ready', 'awaiting_approval', 'approved')",
            Self::UnreadNotifications => "read_at IS NULL",
            Self::HighRiskAssessments => "risk_level IN ('high', 'critical')",
        }
    }
}

pub(crate) async fn count_table(pool: &PgPool, table: CountTable) -> Result<i64, DbError> {
    // The table name is selected from CountTable, never from caller-provided text.
    let sql = format!("SELECT COUNT(*) AS count FROM {}", table.sql_name());
    let row = sqlx::query(&sql).fetch_one(pool).await?;
    Ok(row.try_get("count")?)
}

pub(crate) async fn count_where(pool: &PgPool, predicate: CountPredicate) -> Result<i64, DbError> {
    // The predicate SQL is selected from CountPredicate, never from caller-provided text.
    let sql = format!(
        "SELECT COUNT(*) AS count FROM {} WHERE {}",
        predicate.table_name(),
        predicate.where_sql()
    );
    let row = sqlx::query(&sql).fetch_one(pool).await?;
    Ok(row.try_get("count")?)
}

pub(crate) async fn count_pacts_for_actor_status(
    pool: &PgPool,
    actor: &str,
    status: &str,
) -> Result<i64, DbError> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) AS count
        FROM pacts
        WHERE actor = $1 AND status = $2
        "#,
    )
    .bind(actor)
    .bind(status)
    .fetch_one(pool)
    .await?;
    Ok(row.try_get("count")?)
}

pub(crate) async fn count_audit_denies_for_actor(
    pool: &PgPool,
    actor: &str,
) -> Result<i64, DbError> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) AS count
        FROM audit_events
        WHERE actor = $1 AND decision = 'deny'
        "#,
    )
    .bind(actor)
    .fetch_one(pool)
    .await?;
    Ok(row.try_get("count")?)
}

pub(crate) async fn count_proofs_for_identity(
    pool: &PgPool,
    identity_id: &str,
) -> Result<i64, DbError> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) AS count
        FROM proofs pr
        JOIN pacts pa ON pa.id = pr.pact_id
        WHERE pa.actor = $1
        "#,
    )
    .bind(identity_id)
    .fetch_one(pool)
    .await?;
    Ok(row.try_get("count")?)
}
