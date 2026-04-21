# 10. Security and Compliance

## 10.1 Security Objectives

- strong authentication
- least privilege
- secure node enrollment
- auditable admin and access actions
- minimal secret sprawl
- safe remote operations
- disciplined data retention
- governed extensibility
- crypto-agility and Post-Quantum Cryptography (PQC) readiness

## 10.2 Identity and Access

- MFA for admin accounts is mandatory
- privileged flows should support phishing-resistant methods and passkey-ready WebAuthn design
- RBAC for operator roles
- scoped API tokens
- session revocation
- device-aware login history
- optional SSO and SAML for enterprise
- SCIM traceability for user and group lifecycle changes

## 10.3 Policy and Approval Security

- elevated actions can require dual approval
- JIT access grants must be time-bound and auditable
- approval rules are policy data, not UI-only checks
- deny and allow decisions should record reason codes and policy versions
- simulation should be available before high-risk rollout or policy changes

## 10.4 Node Trust Model

- bootstrap tokens are short TTL and one-time use
- mTLS between agent and control plane
- certificate rotation
- signed config bundles
- command receipts authenticated and correlated
- explicit node revocation workflow
- runtime adapter compatibility verified before apply

## 10.5 Extension and Connector Security

- every extension has a manifest, owner, and trust class
- extensions receive least-privilege secrets and scopes
- no extension can bypass tenant scoping, audit logging, or approval enforcement
- outbound calls from connectors should be isolated and observable
- connector health and recent failures should be visible to operators
- extension enable and disable events are audited
- wasm plugin signing and integrity verification are mandatory in production

## 10.6 Data Protection

At rest:

- Postgres encryption via managed service or disk encryption
- object storage encryption
- secrets in KMS or Vault
- cryptographic agility to support future PQC algorithms

In transit:

- TLS everywhere, with PQC-hybrid evaluation on the roadmap where ecosystem support is production-ready
- HSTS on web
- mTLS for agent channels

## 10.7 Remote Management Guardrails

- allowlisted commands only
- no arbitrary shell in default production posture
- dual approval for break-glass actions
- session recording or transcript logging if shell is ever enabled
- file collection only from approved paths
- capability-aware command routing to avoid unsupported operations

## 10.8 Audit Model

Audit every:

- login and logout
- MFA or passkey changes
- tenant status changes
- subscription changes
- bootstrap token creation
- node lifecycle action
- command execution request
- rollout publish and rollback
- impersonation session
- access approval decision
- connector configuration change
- SCIM sync or sync failure

Audit entry fields:

- actor ID
- actor type
- target type
- target ID
- action
- diff summary
- source IP
- user agent
- correlation ID
- capability source
- timestamp

## 10.9 Abuse and Risk Controls

Because this platform manages remote access infrastructure, include:

- signup risk screening
- admin anomaly detection
- billing fraud checks
- traffic spike alerts
- account suspension workflow
- abuse complaint intake and evidence bundle export

## 10.10 Compliance Considerations

Depending on market:

- privacy notice
- DPA
- log retention policy
- lawful disclosure process
- invoice and tax compliance
- role separation for support versus ops
- periodic access review
- exportable evidence for SCIM, approvals, and access decisions
- transparency for automated remediation and access-denial decisions in applicable regulatory markets

## 10.11 Secure SDLC

- SAST
- dependency scanning
- secret scanning
- signed releases
- SBOM generation
- image scanning
- quarterly threat model review
- security review for new capability families and extension manifests

## 10.12 Autonomous Remediation Guardrails

Automated recovery must obey stricter controls than ordinary health automation.

Required guardrails:

- bounded action allowlist
- no arbitrary shell
- cooldowns and retry budgets
- approval gates for destructive or high-risk actions
- mandatory audit trail for every automated step
- tenant-safe failure isolation
- emergency global disable switch

High-risk actions that should default to approval or explicit enablement:

- node replacement
- certificate authority rotation
- persistent quarantine
- destructive data cleanup

## 10.13 WASM and eBPF Controls

For advanced runtime extensibility:

- signed artifacts only
- runtime sandboxing and resource quotas
- capability-scoped permissions
- controlled rollout with canary and rollback
- immediate disable path for compromised plugins or probes

## 10.14 Automated Decision Governance

Where heuristic or classifier-assisted detection is enabled:

- keep deterministic policy as final enforcement authority
- persist detector version, confidence, and decision context
- monitor detector quality and false-positive rates
- provide operator override and tenant-safe fallback behavior
