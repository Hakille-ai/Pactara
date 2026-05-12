# OMNIA Protocol Spec v0.1

## PACT

A PACT is a signed action envelope.

Required fields:

- `id`
- `actor`
- `intent`
- `object`
- `target`
- `terms`
- `consent`
- `proof`
- `created_at`
- `expires_at`
- `signature`
- `hash`

Draft PACTs may have `signature = null`.

## Status

- `draft`: created but not signed
- `active`: signed and not expired or revoked
- `expired`: current time is after `expires_at`
- `revoked`: explicitly revoked
- `invalid`: signature or hash mismatch

## Signing Payload

The signature and hash are computed over canonical JSON containing:

- `id`
- `actor`
- `intent`
- `object`
- `target`
- `terms`
- `consent`
- `proof`
- `created_at`
- `expires_at`

The fields `signature`, `hash`, and `status` are deliberately excluded.

## Proof

A Proof is a verifiable claim attached to a PACT or protocol object.

Required fields:

- `id`
- `pact_id`
- `proof_type`
- `payload`
- `created_at`

Examples: origin certificate, inspection report, compliance evidence, identity attestation.

## Genome

A Genome describes the portable memory of an object, product, dataset, place, or knowledge unit.

Required fields:

- `id`
- `subject`
- `origin`
- `history`
- `rights`
- `created_at`

## Mandate

A Mandate lets one identity delegate limited authority to another identity, especially an AI agent.

Required fields:

- `id`
- `principal`
- `agent`
- `scope`
- `expires_at`
- `created_at`

Mandates must expire in the future. Production deployments should require the principal to sign the mandate.

## DID Document

An OMNIA identity can be rendered as a DID-like public document:

- public key only
- authentication method
- assertion method
- protocol service endpoint

Private keys must never appear in DID documents.

## PACT Bundle

A PACT Bundle is the portable verification package for offline or external verification.

It contains:

- the PACT
- actor public identity
- attached proofs
- revocation state
- verification result
- chronological timeline

## Offline Bundle Verification

An OMNIA verifier can validate a PACT Bundle without reading the database.

The verifier must:

- recompute the PACT hash from canonical signing payload
- verify the Ed25519 signature with the actor public key embedded in the bundle
- mark the PACT revoked if the bundle contains a revocation record
- mark the PACT expired if current time is after `expires_at`
- return `invalid` if hash or signature verification fails

The result contains:

- `valid`
- `status`
- `hash_matches`
- `signature_valid`
- `revoked`
- `expired`
- `proofs_count`
- `timeline_events`
- `reasons`

## Mandate Check

Mandate checks are deny-by-default:

- expired mandates are denied
- actions in `scope.cannot` are denied
- actions absent from `scope.can` are denied
- actions present in `scope.can` and absent from `scope.cannot` are allowed

## Trust Graph

The Trust Graph is a projection of protocol relationships.

Initial node types:

- `identity`
- `identity_ref`
- `target_ref`
- `subject_ref`
- `pact`
- `proof`
- `mandate`
- `genome`

Initial edge types:

- `acts`: identity to PACT
- `targets`: PACT to target
- `proves`: proof to PACT
- `delegates`: principal identity to mandate
- `authorizes`: mandate to agent identity
- `describes`: genome to subject

## Civilization Domains

OMNIA v0.5 defines eight seeded operating domains:

- economy
- knowledge
- health
- governance
- energy
- link
- space
- transport

Each domain exposes action templates. Creating a domain action creates a backing PACT and audit event.

## Auth Layer

The v0.5 auth layer introduces passkey-ready structures:

- credentials
- challenges
- request nonces
- signed request verification

Local development keeps auth optional. Production can require auth with `OMNIA_AUTH_REQUIRED=true`.

## Ledger And Payments

The v0.5 ledger is sandbox-only and uses the `OMN` internal unit.

Rules:

- ledger accounts are owned by OMNIA identities
- payment intents must reference a PACT
- executing payment requires the PACT to be signed and active
- every transfer writes balanced debit and credit entries

## Agents And Policy

Agents are OMNIA identities with an `AgentProfile`.

Rules:

- every agent run requires a valid mandate
- policy can return `allow`, `deny`, or `needs_review`
- denied or review-required runs are recorded instead of silently dropped
- agent runs create audit events

## Mission Control

OMNIA v0.6 adds an operational plane for running the protocol as infrastructure.

Runtime readiness:

- `GET /ready` must prove the API can reach PostgreSQL
- readiness responses include status, database state, generation time, and structured checks

Operational overview:

- `generated_at`
- `network`
- `payments`
- `recent_events`
- `recent_audit`
- `recent_domain_actions`
- `recent_agent_runs`

The operational plane is read-only in v0.6. It does not change protocol state; it exposes enough state for operators, dashboards, monitors, and future autonomous supervisors to understand the runtime.

## Ledger Statements

Every ledger account can produce a statement:

- account metadata
- recent entries
- total credits
- total debits
- net balance

Ledger entries are append-only facts. Credit entries increase account balance; debit entries decrease account balance. Statement totals are computed from the ledger entries, not trusted from client input.

## Payment Intent History

Payment intents can be listed as protocol objects.

Statuses:

- `pending`: created but not executed
- `executed`: posted into the double-entry ledger
- `rejected`: explicitly refused before settlement

Payment execution remains sandbox-only and still requires a signed active PACT.

## Sovereign Runtime

OMNIA v0.7 turns the operating layer into a stateful sovereign runtime.

Runtime objects:

- `auth_sessions`: local development sessions and future production session records
- `policy_decisions`: immutable outcomes produced by policy evaluation
- `workflow_templates`: seeded guided flows for the eight civilization domains
- `domain_workflows`: runtime instances that create PACTs, proofs, risk assessments, reviews, and steps
- `ledger_holds`: escrow-like reservations over sandbox funds
- `token_issuance_events`: audited sandbox `OMN` issuance records
- `agent_tasks`: supervised agent work queue
- `reputation_scores` and `reputation_events`: derived trust state
- `system_notifications`: runtime notification queue

## Auth Sessions And Signed Requests

Production deployments can require authenticated mutations with `OMNIA_AUTH_REQUIRED=true`.

Accepted mutation credentials:

- a valid `x-omnia-session` token
- a verified signed request pathway
- local development fallback when auth is not required

Signed request verification must reject replayed nonces. A nonce that verifies successfully is persisted in `request_nonces` and cannot be reused.

Credentials can be listed by identity and revoked. Revocation sets credential state so future session or passkey flows can refuse it.

## Guided Workflows

Each of the eight seeded domains can produce guided workflows:

- economy
- knowledge
- health consent-only
- governance
- energy
- link
- space
- transport

A workflow has ordered steps. Only the active step can be advanced. Advancing a workflow completes the active step, activates the next step, and completes the workflow when there is no next step.

Workflow creation also creates:

- a draft PACT
- a workflow proof
- a risk assessment
- event log entries

High and critical risk workflows start in `needs_review`.

## Advanced Ledger

The ledger remains sandbox-only.

New v0.7 rules:

- assets are listable
- direct transfers require a signed active PACT
- holds require a signed active PACT
- releasing a hold marks it released without moving external money
- sandbox token issuance is audited
- every transfer must remain double-entry: debit amount equals credit amount
- payment intents can be rejected before execution

`OMN` has no real monetary value in this implementation.

## Agent Tasks

Agent tasks are supervised runs over the existing mandate and policy model.

Rules:

- a task requires an agent profile
- a task requires a valid mandate
- policy `deny` blocks execution
- policy `needs_review` or `requires_approval = true` requires approval before execution
- task execution creates agent run logs
- sensitive work can remain queued for human review

## Policy Precedence

Persistent rules are evaluated with conservative precedence:

- matching `deny` wins
- otherwise matching `needs_review` wins
- otherwise matching `allow` wins
- otherwise the runtime falls back to contextual policy defaults

Policy decisions are stored separately from rules so audits can preserve what the system decided at a point in time.

## Reputation

Reputation is derived state, not user input.

The first scoring model considers:

- signed active PACTs
- executed payments
- proofs
- revocations
- adverse audit decisions

Reputation recomputation writes score and event records. Future scoring models can change the factors while preserving the event history.

## Search And Stream

Global search returns typed results across identities, PACTs, domains, payments, and agents.

`GET /v1/ops/stream` exposes a Server-Sent Events compatible runtime snapshot for dashboard and operator surfaces. The current stream is snapshot-oriented; future releases can keep the connection open for continuous event delivery.

## World Runtime

OMNIA v0.8 adds a simulation and command layer above the sovereign runtime.

New runtime objects:

- `world_scenarios`: multi-domain scenario graphs owned by an OMNIA identity
- `scenario_runs`: deterministic sandbox simulation results
- `runtime_commands`: structured operator commands transformed into protocol objects
- `agent_crews`: supervised teams of mandated agents
- `agent_crew_members`: agent and mandate bindings inside a crew
- `crew_runs`: policy-gated executions of a crew objective
- `civilization_signals`: operational signals emitted by scenarios and runtime activity

## Scenario Rules

A `WorldScenario` contains:

- actor
- domain
- title and summary
- scenario nodes
- scenario edges
- payload
- status

Running a scenario produces:

- `impact_score`
- `risk_level`
- `recommended_actions`
- generated objects such as PACT, workflow, risk assessment, signal, and command log

High-impact scenario runs start as `needs_review`. They do not imply real-world execution.

## Runtime Command Rules

A runtime command contains:

- actor
- domain
- intent
- target
- command text
- payload

The runtime converts the command into a signed PACT, a workflow, risk assessment, audit event, event log entry, and timeline item. Commands are sandbox orchestration requests; they do not perform real payments, real medical processing, or blockchain actions.

## Agent Crew Rules

An agent crew requires:

- a human or organization actor
- one or more members
- each member bound to an `AgentProfile`
- each member bound to a valid `Mandate`

Crew runs evaluate policy before execution. If policy returns `deny`, the run is recorded as denied. If policy returns `needs_review`, the run is recorded without automatic execution.

## Unified Timeline

`GET /v1/runtime/timeline` returns runtime items sorted by creation time. It is the operator-readable history of OMNIA and includes:

- protocol events
- world scenarios
- scenario runs
- runtime commands
- agent crews
- crew runs
- civilization signals

The timeline is intentionally read-only. It projects state from source tables instead of becoming a second source of truth.
