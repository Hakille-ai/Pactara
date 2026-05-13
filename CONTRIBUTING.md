# Contributing to PACTARA

Thank you for your interest in contributing to the PACTARA Protocol. We are building the verifiable substrate for a sovereign future, and we welcome your help.

---

## 🏗 Development Principles

*   **Verifiability First**: Every action must be provable and signed.
*   **Safety Over Speed**: We prioritize cryptographic correctness and memory safety (Rust).
*   **Portability**: Design components to work offline and outside the central API.
*   **Sovereignty**: Respect the autonomy of identities and domains.

## 🚀 Getting Started

1.  **Fork the repository** and clone it locally.
2.  **Set up the environment**:
    ```bash
    cp .env.example .env
    docker compose up --build
    ```
3.  **Run tests**:
    ```bash
    cargo test --workspace
    ```

## 🛠 Contribution Workflow

### 1. Issue Selection
Before starting work, please comment on an existing issue or create a new one to discuss your proposed changes.

### 2. Branching
Create a feature branch using a descriptive name:
```bash
git checkout -b feat/your-feature-name
# OR
git checkout -b fix/issue-description
```

### 3. Code Standards
*   **Rust**: Follow `clippy` and `rustfmt`.
*   **Frontend**: Follow the existing Next.js and Tailwind CSS patterns.
*   **Documentation**: Ensure all new features are reflected in `docs/protocol-spec`.

### 4. Testing
We maintain high test coverage. Ensure that your changes include:
*   Unit tests for logic.
*   Integration tests for API endpoints.
*   Verification of the dashboard if UI changes are made.

### 5. Pull Request Process
*   Provide a clear description of the changes and the problem they solve.
*   Include screenshots or videos for frontend modifications.
*   Ensure the CI/CD pipeline passes.

## 💬 Communication
For major architectural changes, please reach out via our community channels or initiate a GitHub Discussion.

---

## ⚖️ License
By contributing to PACTARA, you agree that your contributions will be licensed under the project's **Apache License 2.0**.
