## 2024-05-24 - Authentication Bypass via Spoofed Headers
**Vulnerability:** The `ensure_auth` function in the API crate trusted `x-pactara-authenticated` and `x-pactara-signed-request` headers without any cryptographic verification, allowing anyone to bypass authentication by simply adding these headers to their request.
**Learning:** This pattern was likely introduced as a shortcut for development or internal services, but it creates a massive security hole if the API is exposed even slightly or if an attacker can control headers (e.g., via a proxy).
**Prevention:** Never trust client-provided headers for security decisions unless they contain a verifiable proof (like a JWT or a signed request) that is actually checked against a known secret or public key.
