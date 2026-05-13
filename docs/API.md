# PACTARA API Reference v1

This document provides a comprehensive list of all available API endpoints for the PACTARA Protocol.

---

## 🏥 System Health
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Basic API health check. |
| `GET` | `/ready` | Comprehensive readiness check (DB, services). |

## 🆔 Identity Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/identities` | Create a new PACTARA identity. |
| `GET` | `/v1/identities/:id` | Retrieve identity details. |
| `GET` | `/v1/identities/:id/did` | Retrieve the W3C DID Document for an identity. |

## 📜 PACT Operations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/pacts` | Create a draft PACT. |
| `GET` | `/v1/pacts/:id` | Retrieve PACT details. |
| `GET` | `/v1/pacts/:id/bundle` | Export a portable PACT Bundle. |
| `GET` | `/v1/pacts/:id/timeline` | Retrieve the chronological event log for a PACT. |
| `POST` | `/v1/pacts/:id/sign` | Sign a PACT (Developer Sandbox). |
| `POST` | `/v1/pacts/:id/verify` | Verify PACT integrity, authenticity, and status. |
| `POST` | `/v1/pacts/:id/revoke` | Revoke an active PACT. |
| `POST` | `/v1/bundles/verify` | Offline verification of an external PACT Bundle. |

## 🛡️ Trust & Authority
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/proofs` | Register a verifiable proof/claim. |
| `GET` | `/v1/proofs` | List registered proofs. |
| `POST` | `/v1/genomes` | Register a new Genome Of Things. |
| `GET` | `/v1/genomes` | List registered genomes. |
| `POST` | `/v1/mandates` | Create an agent mandate. |
| `GET` | `/v1/mandates` | List mandates. |
| `POST` | `/v1/mandates/:id/check` | Check agent authority against a mandate. |
| `GET` | `/v1/network/status` | Protocol-level network statistics. |
| `GET` | `/v1/graph/trust` | Export the global Trust Graph. |

## 🌍 Civilization Domains
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/domains` | List available civilization domains. |
| `GET` | `/v1/domains/:id/actions` | List action templates for a domain. |
| `POST` | `/v1/domains/:id/actions` | Execute a domain action. |

## 🔐 Security & Auth
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/auth/challenges` | Generate a security challenge. |
| `POST` | `/v1/auth/passkeys/register/start` | Start Passkey registration. |
| `POST` | `/v1/auth/passkeys/register/finish` | Finalize Passkey registration. |
| `POST` | `/v1/auth/passkeys/login/start` | Start Passkey login. |
| `POST` | `/v1/auth/passkeys/login/finish` | Finalize Passkey login. |
| `POST` | `/v1/auth/signed-requests/verify` | Verify a cryptographically signed request. |
| `GET` | `/v1/auth/credentials` | List identity credentials. |
| `DELETE` | `/v1/auth/credentials/:id` | Revoke a credential. |
| `POST` | `/v1/auth/sessions/dev` | Create a developer sandbox session. |

## 💰 Ledger & Payments
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/ledger/assets` | List available sandbox assets. |
| `POST` | `/v1/ledger/accounts` | Create a ledger account. |
| `GET` | `/v1/ledger/accounts` | List accounts. |
| `GET` | `/v1/ledger/accounts/:id/statement` | Retrieve account statement (credits/debits). |
| `POST` | `/v1/ledger/transfers` | Execute a double-entry transfer. |
| `POST` | `/v1/ledger/holds` | Place funds in escrow (hold). |
| `POST` | `/v1/ledger/holds/:id/release` | Release a ledger hold. |
| `GET` | `/v1/payments/intents` | List payment intents. |
| `POST` | `/v1/payments/intents` | Create a payment intent. |
| `POST` | `/v1/payments/:id/execute` | Finalize payment execution. |
| `POST` | `/v1/payments/:id/reject` | Reject a payment intent. |
| `POST` | `/v1/token/issue` | Issue sandbox PACT tokens. |

## 🤖 Agents & Policy
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/v1/agents` | Register an agent profile. |
| `GET` | `/v1/agents` | List agents. |
| `POST` | `/v1/agents/:id/runs` | Execute an agent run. |
| `GET` | `/v1/agent-tasks` | List supervised agent tasks. |
| `POST` | `/v1/agent-tasks` | Queue a new agent task. |
| `POST` | `/v1/agent-tasks/:id/approve` | Human-in-the-loop approval for a task. |
| `POST` | `/v1/agent-tasks/:id/run` | Execute an approved task. |
| `GET` | `/v1/policies/rules` | List active policy rules. |
| `POST` | `/v1/policies/rules` | Create a new policy rule. |
| `POST` | `/v1/policies/evaluate` | Evaluate policy for an action. |

## 🔄 Workflows & Reputation
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/workflows` | List active workflows. |
| `POST` | `/v1/workflows` | Initiate a guided domain workflow. |
| `GET` | `/v1/workflows/templates` | List available workflow templates. |
| `GET` | `/v1/workflows/:id` | Retrieve workflow details and steps. |
| `POST` | `/v1/workflows/:id/advance` | Advance workflow to the next step. |
| `POST` | `/v1/workflows/:id/review` | Record a human review for a workflow. |
| `GET` | `/v1/reputation/:identity` | Retrieve identity reputation score. |
| `POST` | `/v1/reputation/recompute` | Manually trigger reputation recomputation. |

## 🛠 Operational Overview
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/search` | Global search across protocol objects. |
| `GET` | `/v1/ops/overview` | Real-time mission control summary. |
| `GET` | `/v1/ops/stream` | Server-Sent Events (SSE) runtime snapshot. |
| `GET` | `/v1/ops/domain-actions` | List recent domain actions. |
| `GET` | `/v1/ops/agent-runs` | List recent agent runs. |
| `GET` | `/v1/audit/events` | List high-level audit events. |
| `GET` | `/v1/events` | List granular protocol events. |

## 🌌 World Runtime
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/v1/world/scenarios` | List world simulation scenarios. |
| `POST` | `/v1/world/scenarios` | Create a new world scenario. |
| `GET` | `/v1/world/scenarios/:id` | Retrieve scenario details. |
| `POST` | `/v1/world/scenarios/:id/run` | Execute a scenario simulation. |
| `GET` | `/v1/runtime/commands` | List runtime commands. |
| `POST` | `/v1/runtime/commands` | Execute a natural runtime command. |
| `GET` | `/v1/runtime/timeline` | Unified chronological runtime history. |
| `GET` | `/v1/agent-crews` | List collaborative agent crews. |
| `POST` | `/v1/agent-crews` | Create an agent crew. |
| `POST` | `/v1/agent-crews/:id/run` | Execute a crew objective. |
