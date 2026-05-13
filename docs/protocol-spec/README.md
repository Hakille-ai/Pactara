# PACTARA Protocol Specification v0.8

This document defines the formal structures and operational rules of the PACTARA Protocol, a universal action layer designed for verifiable digital interaction.

---

## 1. The PACT (Protocol Action)

The **PACT** is the fundamental unit of the protocol—a secure, portable, and verifiable envelope for any digital action.

### 1.1 Structure
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique immutable identifier. |
| `actor` | String | The PACTARA Identity ID performing the action. |
| `intent` | String | A dot-notated action type (e.g., `trade.sell`). |
| `object` | JSON | The primary subject of the action. |
| `target` | String | The PACTARA Identity ID receiving the action. |
| `terms` | JSON | The conditions and parameters of the action. |
| `consent` | JSON | Explicit consent and revocation parameters. |
| `proof` | JSON | Attached evidence or claims. |
| `created_at` | DateTime | Protocol-level timestamp of creation. |
| `expires_at` | DateTime | Point in time when the PACT becomes invalid. |
| `signature` | String | Ed25519 signature of the actor over the canonical payload. |
| `hash` | String | BLAKE3 hash of the canonical payload. |

### 1.2 Canonical Signing Payload
To ensure deterministic verification, the signature is computed over a canonical JSON representation of all fields **except** `signature`, `hash`, and `status`.

---

## 2. Protocol State Machine

### 2.1 PACT Status Lifecycle
*   **Draft**: Initial state. Created but lacks a valid signature.
*   **Active**: Signed, verified, not expired, and not revoked.
*   **Expired**: Current system time > `expires_at`.
*   **Revoked**: Explicitly terminated by a signed revocation event.
*   **Invalid**: Failed cryptographic verification (hash or signature mismatch).

### 2.2 Verification Rules
A verifier (local or offline) must evaluate a PACT based on:
1.  **Integrity**: Does the BLAKE3 hash match the payload?
2.  **Authenticity**: Does the Ed25519 signature verify against the actor's public key?
3.  **Validity**: Is the current time within the `[created_at, expires_at]` window?
4.  **Revocation**: Is there a registered revocation event for this PACT ID?

---

## 3. Civilizational Primitives

### 3.1 Genome
A **Genome** provides a portable, immutable memory for any digital or physical object, tracking its origin, history, and rights.

### 3.2 Mandate
A **Mandate** is a formal delegation of authority from a **Principal** to an **Agent**.
*   **Scope Control**: Defines `can` and `cannot` permissions.
*   **Authority Check**: Deny-by-default logic applies to all agent actions.

### 3.3 Proof Registry
A **Proof** is a verifiable claim (e.g., identity attestation, origin certificate) that can be anchored to a PACT or a Genome.

---

## 4. Trust Architecture

### 4.1 Decentralized Identifiers (DID)
Every PACTARA Identity corresponds to a W3C-compliant DID Document, exposing public keys and service endpoints without compromising private keys.

### 4.2 Portable Bundles
A **PACT Bundle** is a self-contained package allowing third-party verification without direct access to the PACTARA database. It includes the PACT, actor identity, proofs, and a chronological timeline of events.

### 4.3 The Trust Graph
The protocol projects all interactions into a directed graph:
*   **Nodes**: Identities, PACTs, Proofs, Genomes.
*   **Edges**: `acts`, `targets`, `proves`, `delegates`, `authorizes`, `describes`.

---

## 5. Domain Operating System

PACTARA seeds eight critical civilization domains:
*   **Economy**: Trade, value transfer, and settlement.
*   **Knowledge**: Information provenance and rights.
*   **Health**: Consent-driven medical and biological data.
*   **Governance**: Collective decision-making and policy.
*   **Energy**: Resource allocation and grid coordination.
*   **Link**: Infrastructure and communication.
*   **Space**: Multi-dimensional and physical coordination.
*   **Transport**: Mobility and logistics.

---

## 6. Security & Sovereignty

### 6.1 Authentication
The protocol implements sovereign authentication using Passkeys (WebAuthn), signed request validation, and cryptographic challenge-response cycles.

### 6.2 Policy Studio
A persistent, precedence-based policy engine governs all high-sensitivity actions.
*   **Rule Ordering**: `Deny` > `Needs Review` > `Allow`.

### 6.3 Sandbox Ledger
A double-entry accounting system for managing internal protocol value (`PACT` units) and escrow holds, ensuring verifiable value flow before external settlement.
