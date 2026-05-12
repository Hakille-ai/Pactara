# PACTARA Protocol

PACTARA is a universal action protocol: identity, intent, consent, proof, value, and execution in one verifiable system.

This repository is an independent monorepo for the first full foundation of PACTARA:

- Rust + Axum API
- PostgreSQL + SQLx
- Ed25519 signatures
- BLAKE3 hashes
- canonical JSON signing payloads
- Next.js dashboard
- Docker Compose local stack

## Quick Start

```powershell
cd "C:\Users\Stagiaire\Documents\Amadou PGC\Prs\Pactara"
copy .env.example .env
docker compose up --build
```

Services:

- API: http://localhost:8080
- Web: http://localhost:3001
- PostgreSQL: localhost:5432

## Backend Verification

Use Docker when Rust is not installed locally:

```powershell
docker compose up --build
```

Then verify the API is reachable:

```powershell
Invoke-RestMethod http://localhost:8080/health
Invoke-RestMethod http://localhost:8080/ready
```

With Rust 1.88+ available locally, run the workspace tests directly:

```powershell
cargo test --workspace
```

The web dashboard can be checked independently:

```powershell
cd apps/web
npm run build
```

## Core Flow

1. Create an PACTARA identity.
2. Create a draft PACT.
3. Sign the PACT.
4. Verify status, hash, signature, expiry, and revocation.
5. Generate a QR payload for portable verification.
6. Revoke the PACT when consent or validity ends.

## API v1

- `GET /health`
- `GET /ready`
- `POST /v1/identities`
- `GET /v1/identities/:id`
- `GET /v1/identities/:id/did`
- `POST /v1/pacts`
- `GET /v1/pacts/:id`
- `GET /v1/pacts/:id/bundle`
- `GET /v1/pacts/:id/timeline`
- `POST /v1/pacts/:id/sign`
- `POST /v1/pacts/:id/verify`
- `POST /v1/pacts/:id/revoke`
- `POST /v1/bundles/verify`
- `POST /v1/proofs`
- `GET /v1/proofs`
- `POST /v1/genomes`
- `GET /v1/genomes`
- `POST /v1/mandates`
- `GET /v1/mandates`
- `POST /v1/mandates/:id/check`
- `GET /v1/network/status`
- `GET /v1/graph/trust`
- `GET /v1/domains`
- `GET /v1/domains/:id/actions`
- `POST /v1/domains/:id/actions`
- `POST /v1/auth/challenges`
- `POST /v1/auth/passkeys/register/start`
- `POST /v1/auth/passkeys/register/finish`
- `POST /v1/auth/passkeys/login/start`
- `POST /v1/auth/passkeys/login/finish`
- `POST /v1/auth/signed-requests/verify`
- `GET /v1/auth/credentials`
- `DELETE /v1/auth/credentials/:id`
- `POST /v1/auth/sessions/dev`
- `GET /v1/ledger/assets`
- `POST /v1/ledger/accounts`
- `GET /v1/ledger/accounts`
- `GET /v1/ledger/accounts/:id/statement`
- `POST /v1/ledger/transfers`
- `POST /v1/ledger/holds`
- `POST /v1/ledger/holds/:id/release`
- `GET /v1/payments/intents`
- `POST /v1/payments/intents`
- `POST /v1/payments/:id/execute`
- `POST /v1/payments/:id/reject`
- `POST /v1/token/issue`
- `POST /v1/agents`
- `GET /v1/agents`
- `POST /v1/agents/:id/runs`
- `GET /v1/agent-tasks`
- `POST /v1/agent-tasks`
- `POST /v1/agent-tasks/:id/approve`
- `POST /v1/agent-tasks/:id/run`
- `GET /v1/policies/rules`
- `POST /v1/policies/rules`
- `POST /v1/policies/evaluate`
- `GET /v1/workflows`
- `POST /v1/workflows`
- `GET /v1/workflows/templates`
- `GET /v1/workflows/:id`
- `POST /v1/workflows/:id/advance`
- `POST /v1/workflows/:id/review`
- `GET /v1/workflows/:id/timeline`
- `GET /v1/reputation/:identity`
- `POST /v1/reputation/recompute`
- `GET /v1/search`
- `GET /v1/world/scenarios`
- `POST /v1/world/scenarios`
- `GET /v1/world/scenarios/:id`
- `POST /v1/world/scenarios/:id/run`
- `GET /v1/runtime/commands`
- `POST /v1/runtime/commands`
- `GET /v1/runtime/timeline`
- `GET /v1/agent-crews`
- `POST /v1/agent-crews`
- `POST /v1/agent-crews/:id/run`
- `GET /v1/ops/overview`
- `GET /v1/ops/stream`
- `GET /v1/ops/domain-actions`
- `GET /v1/ops/agent-runs`
- `GET /v1/audit/events`
- `GET /v1/events`

## Security Note

The first implementation supports developer custody of private keys so the API can demonstrate signing end to end. Production PACTARA identity custody should move private keys client-side, hardware-backed, or threshold-managed.

## v0.2 Protocol Layers

- **Proof Registry**: attach verifiable claims to PACTs or standalone protocol objects.
- **Genome Of Things**: describe the origin, history, and rights of products, data, places, or knowledge.
- **Agent Mandates**: let an identity delegate bounded authority to an agent or AI.
- **Network Status**: expose protocol counters so the system can be observed as infrastructure.

## v0.3 Portable Trust Layer

- **DID Document**: each PACTARA identity can expose a public decentralized identity document without leaking private keys.
- **PACT Bundle**: a signed action can be exported with actor public key, proofs, revocation state, verification result, and timeline.
- **PACT Timeline**: every relevant event around a PACT can be read as a chronological audit trail.
- **Mandate Check**: an AI or agent action can be checked against explicit `can` and `cannot` scope before execution.

## v0.4 Offline Verification And Trust Graph

- **Portable Verifier Crate**: `pactara-verifier` can validate a PACT Bundle without PostgreSQL or the API state.
- **Offline Bundle Verification API**: `POST /v1/bundles/verify` accepts an exported bundle and recomputes hash, signature, expiry, and revocation state from bundle contents.
- **Trust Graph**: `GET /v1/graph/trust` projects identities, PACTs, proofs, mandates, and genomes into a protocol graph.
- **Dashboard Expansion**: the web console now has Offline and Graph surfaces so PACTARA can be inspected as portable trust infrastructure, not only as CRUD records.

## v0.5 Civilization Operating Layer

- **Domain OS**: economy, knowledge, health, governance, energy, link, space, and transport are seeded as first-class protocol modules.
- **Sovereign Auth Prep**: passkey-style credentials, challenges, nonces, and signed request verification are now modeled.
- **Sandbox Ledger**: PACTARA ships a double-entry internal ledger with sandbox `PACT` units and payment intents.
- **Mandated Agents**: agents can run only through a mandate and policy decision.
- **Security Audit**: critical v0.5 actions write audit events alongside protocol events.

## v0.6 Mission Control Layer

- **Runtime Readiness**: `GET /ready` checks database availability and returns structured runtime health.
- **Operational Overview**: `GET /v1/ops/overview` summarizes network counts, payment status, recent events, audit events, domain actions, and agent runs.
- **Ledger Statements**: each account exposes credits, debits, net balance, and recent debit/credit entries.
- **Payment History**: payment intents can be listed and inspected from API and dashboard.
- **Ops Dashboard**: the web console now has a Mission Control surface for operating PACTARA as infrastructure, not only testing flows.

## v0.7 Sovereign Runtime And Civilization Apps

- **Sovereign Auth Runtime**: dev sessions, listable credentials, credential revocation, nonce replay protection, and signed request verification are exposed as first-class APIs.
- **Guided Domain Workflows**: every seeded civilization domain can launch a workflow that creates PACTs, proofs, risk assessments, reviews, and audit trail.
- **Advanced Sandbox Ledger**: assets, direct transfers, escrow holds, hold release, payment rejection, and sandbox `PACT` issuance are available without real money or blockchain dependency.
- **Supervised Agents**: agent tasks are queued, policy-gated, optionally human-approved, executed under mandate, and logged.
- **Policy Studio**: persistent rules drive `allow`, `deny`, and `needs_review` decisions with precedence.
- **Reputation Engine**: scores can be recomputed from signed PACTs, executed payments, revocations, proofs, and audit posture.
- **Runtime Ops**: SSE snapshots, global search, workflow queue counts, held funds, pending agent tasks, and risk counters make PACTARA feel like an operating system, not just an API.
- **Dashboard Expansion**: new Runtime, Workflows, Policy, Reputation, Search, and Stream tabs sit alongside ledger, agents, security, domains, and PACT verification.

## v0.8 World Runtime And Intelligence Layer

- **World Scenarios**: operators can model multi-domain shocks as nodes and edges, then run deterministic sandbox simulations that produce impact, risk, recommendations, and generated protocol objects.
- **Runtime Commands**: natural structured commands become signed PACTs, guided workflows, risk assessments, audit events, and timeline entries.
- **Agent Crews**: supervised teams of mandated agents can be created and run through policy gating; sensitive work stops at `needs_review`.
- **Civilization Signals**: scenario runs emit typed signals so risks become visible operational objects.
- **Unified Timeline**: identities, events, PACTs, workflows, commands, scenarios, crews, runs, and signals can be read as one runtime history.
- **Dashboard Expansion**: new World, Command, Crews, and Timeline tabs turn PACTARA into a visible command console for the eight civilization domains.
