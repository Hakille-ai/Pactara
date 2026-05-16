# PACTARA Protocol

[![Stability: Experimental](https://img.shields.io/badge/stability-experimental-orange.svg)](https://github.com/pactara/pactara)
[![License: Apache--2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)

**PACTARA** is a universal action protocol designed for the next generation of digital interaction. It provides a unified framework for **Identity, Intent, Consent, Proof, Value, and Execution** in a single, verifiable, and sovereign system.

---

## 🌐 Vision

In an increasingly connected and automated world, the ability to verify actions—whether performed by humans, AI agents, or machines—is critical. PACTARA connects actions with the same seamlessness that the internet connects information. It is designed to scale from personal interactions to civilization-grade infrastructure, enabling trust to move across boundaries without centralized intermediaries.

## 🧱 Core Primitives

The atomic unit of the protocol is the **PACT**: a portable, signed, verifiable, and revocable record of action. Every PACT encapsulates:

*   **Identity**: Who is involved? (Ed25519-backed, DID-compatible)
*   **Intent**: What is the purpose of the action?
*   **Consent**: Is the action authorized and revocable?
*   **Proof**: What evidence supports the action?
*   **Value**: What assets or rights are being transferred?
*   **Execution**: How is the action realized in the system?

## 🚀 Protocol Roadmap

PACTARA is built in evolutionary layers, moving from a foundational API to a world-scale intelligence runtime.

### Foundation & Portability (v0.1 – v0.4)
*   **Verifiable Actions**: Core Rust API with Ed25519 signatures and BLAKE3 hashing.
*   **Trust Graph**: Mapping relationships between identities, PACTs, and proofs.
*   **Sovereign Identity**: Decentralized Identifiers (DID) and portable verification bundles.
*   **Edge Verification**: Offline verification via the `pactara-verifier` crate.

### Operating & Civilization Layer (v0.5 – v0.7)
*   **Domain OS**: Specialized modules for Economy, Health, Governance, and more.
*   **Sovereign Auth**: Passkey-style credentials and signed request validation.
*   **Sandbox Ledger**: Double-entry accounting for internal value flow and escrow.
*   **Policy Engine**: Conservative, precedence-based rule evaluation for automated decisions.
*   **Reputation System**: Derived trust scores based on protocol history and audit posture.

### World Intelligence Runtime (v0.8+)
*   **World Scenarios**: Modeling and simulating cross-domain shocks and responses.
*   **Agent Crews**: Collaborative teams of mandated AI agents operating under policy.
*   **Unified Timeline**: A chronological operational history of the entire world runtime.
*   **Natural Command**: Transforming natural language intent into structured, signed protocol objects.

---

## 📖 Documentation

*   **[Protocol Specification](docs/protocol-spec/README.md)**: Deep dive into PACT structures and verification rules.
*   **[Whitepaper](docs/whitepaper/README.md)**: Visionary thesis and strategic roadmap of the protocol.
*   **[API Reference](docs/API.md)**: Comprehensive endpoint documentation for developers.
*   **[Architecture Guide](docs/ARCHITECTURE.md)**: Monorepo layout, runtime flow, source of truth, and security model.
*   **[Development Guide](docs/DEVELOPMENT.md)**: Local setup, environment variables, commands, and verification checks.
*   **[Contributing Guide](CONTRIBUTING.md)**: Guidelines for contributing to the PACTARA ecosystem.

---

## 🛠 Architecture

PACTARA is implemented as a high-performance Rust monorepo, optimized for safety, concurrency, and verifiability.

*   **Backend**: Axum-based API, SQLx for PostgreSQL, and specialized crates for crypto, ledger, and agent logic.
*   **Frontend**: A modern Next.js dashboard for real-time mission control and protocol inspection.
*   **Security**: Client-side Ed25519 signatures, BLAKE3 hashes, canonical JSON payloads, strict CORS, and production flags that keep private keys out of the API.
*   **Deployment**: Fully containerized environment via Docker Compose.

---

## 🚦 Quick Start

### Prerequisites
*   [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)
*   (Optional) [Rust 1.88+](https://www.rust-lang.org/)

### Setup Environment
```bash
cp .env.example .env
docker compose up --build
```

### Access Services
*   **Mission Control Dashboard**: `http://localhost:3001`
*   **Protocol API**: `http://localhost:8080`
*   **Health Check**: `curl http://localhost:8080/health`

The public web entry now focuses on the production MVP flow: create an identity with a browser-generated public key, create a PACT, sign it locally, verify it, export a bundle/QR, and revoke it. Advanced experimental modules remain available from Labs.

### Development
To run the full test suite locally:
```bash
cargo test --workspace
```

---

## ⚖️ Security Note
Current developer builds support server-side custody for demonstration purposes. Production implementations should migrate private keys to client-side hardware or threshold-managed environments.

## 📄 License
This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---
© 2024 PACTARA Protocol. Building the verifiable substrate for a sovereign future.
