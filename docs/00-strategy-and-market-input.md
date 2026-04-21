# 00. Strategy and Market Input

## 0.1 Purpose

This document refreshes the original spec using current market signals, recurring user pain points, and near-term product trends observed through 2025 and early 2026.

It does not change the product into a different category. It sharpens the scope:

- from "VPN-like control plane" to "composable secure edge access platform"
- from feature accumulation to productized control loops
- from fixed built-in integrations to pluggable capability packs

## 0.2 What the Market Is Signaling

Recent secure access and Zero Trust data suggests the category is being reshaped by five forces:

1. Performance and user experience are now board-level problems, not just IT annoyances.
2. Identity-first and context-aware access are growing, but most teams are still mid-migration.
3. Teams want fewer consoles but more flexibility, which means composability instead of hard-coded sprawl.
4. Auditability, SCIM traceability, and approval workflows are now table stakes.
5. Passwordless and phishing-resistant authentication is becoming a default expectation for privileged flows.

## 0.3 External Data Points

### Remote access pain remains severe

The 2025 Tailscale State of Zero Trust survey reports:

- 90% of organizations have one or more issues with their current VPN or access setup
- top limitations include security risk (40%), latency/speed issues (35%), high ops overhead (34%), integration challenges (28%), and inability to scale (25%)
- 84% report increased throughput needs over the prior 1-2 years
- 37% hear daily or weekly user complaints about remote access and security friction

Implication:
- performance, operability, and supportability must be first-class product goals

### Fragmentation is high, but consolidation alone is not enough

The same 2025 survey reports:

- 92% of companies use more than one tool to manage network security
- 48% are actively trying to consolidate tools
- 29% cite integrating new tools with existing systems as a top team challenge
- 24% cite lack of automation as a major challenge
- 68% still rely on manual processes for network access management

Implication:
- the product should centralize control and audit, while keeping integrations modular and replaceable

### Identity-based access is growing, but still incomplete

The 2025 Tailscale survey also shows:

- only 29% use identity-based access as their primary model
- 37% report temporary or time-limited access/JIT access patterns
- 37% report fully automated identity-based access
- 24% report device posture management adoption

Implication:
- our vNext spec should treat identity, posture, and JIT approvals as core capabilities, not enterprise add-ons

### The category is moving toward richer audit and integration surfaces

Examples from vendor docs and changelogs:

- Cloudflare added SCIM provisioning logs with filterable audit detail on April 9, 2025
- Cloudflare added user-risk-score-driven access policy controls in March 2026
- Cloudflare added deny-by-default protection for unmanaged hostnames in January 2026
- Cloudflare added bulk policy testing in April 2025
- Tailscale exposed OpenAPI-based API docs, webhook management, log streaming, audit-log endpoints, and device-posture endpoints in mid-2024, and continued expanding posture and JIT flows through 2026
- Tailscale continues to push controlled auto-update behavior and stable-channel hygiene for managed devices
- Twingate supports audit export and sync to AWS S3 in JSON format
- Twingate documents connector health checks plus automatic load balancing and failover for redundant connectors
- Teleport documents dual-approval and least-privilege JIT access requests as standard governance patterns
- Teleport documents automatic review rules and access monitoring actions based on policy conditions

Implication:
- the product needs simulation, export, webhook, and connector surfaces as part of the platform core

### Phishing-resistant authentication is moving from "nice to have" to baseline

FIDO Alliance's 2025 enterprise passkey report and current CISA guidance both reinforce the same direction:

- enterprises are prioritizing passkey rollout for users with access to sensitive applications and data
- phishing-resistant MFA should be required for privileged and administrative access wherever feasible

Implication:
- passkeys and phishing-resistant admin authentication should be in the baseline security architecture

## 0.4 User Pain Points We Should Design Around

### Platform owner

- too many tools and weak revenue-to-cost visibility
- difficulty packaging different customer tiers without hard forks
- fear of coupling the business to one identity provider, billing provider, or infrastructure vendor

### Operations and NOC

- slow rollout visibility
- poor blast-radius control for remote actions
- inconsistent node metadata and region labeling
- fragmented logs and weak diffing for config changes

### Support

- cannot answer "why is access denied?" quickly
- cannot see identity, posture, quota, and node-assignment context in one place
- cannot safely grant temporary access with expiry and approvals

### Tenant admin

- onboarding/offboarding users across IdP, groups, device policies, and profiles is too manual
- audit evidence for SCIM changes, access approvals, and policy changes is weak
- current products are either too security-heavy or too ops-heavy

### Security and compliance

- admin MFA is inconsistent across tools
- third-party connectors are opaque and hard to govern
- posture, session, and approval evidence is hard to export

### Infrastructure engineer

- runtime variation across node types becomes operational debt
- provider-specific install logic leaks everywhere
- agents cannot clearly advertise which capabilities they support
- on-call teams need bounded auto-remediation instead of manual restart loops
- failover and replacement flows are often tribal knowledge instead of encoded policy

## 0.5 Design Implications for HugeEdge

The refreshed spec should treat the following as non-negotiable:

1. A stable core with replaceable integrations.
2. A capability registry that makes features discoverable and governable.
3. Policy-as-data with simulation before rollout.
4. Identity and posture as inputs into every access decision.
5. Time-bound approvals and auditable exceptions for elevated actions.
6. Export-first architecture for logs, audit, usage, and operational evidence.
7. A node and runtime model that supports multiple access engines through adapters.
8. Self-healing should be policy-driven, observable, and easy to disable.

## 0.6 Updated Product Positioning

Describe HugeEdge as:

- a composable secure edge access platform
- a multi-tenant control plane for identity-aware access, node orchestration, and policy distribution
- a platform that unifies fleet, policy, usage, and audit while letting operators plug in identity, billing, posture, and infrastructure providers

Do not describe it as:

- a generic consumer VPN product
- a stealth or evasion system
- a monolithic all-in-one replacement for every SSE/SASE domain on day one

## 0.7 Strategic Product Bets

### Bet 1: Composable control plane beats hard-coded feature breadth

We should optimize for:

- provider adapters
- policy packs
- event sinks
- UI extensions
- runtime adapters

instead of shipping every variant as core code.

### Bet 2: "Why did this decision happen?" is a product surface

Every deny, escalation, rollout, and quota event should be explainable with:

- identity inputs
- posture inputs
- policy version
- approving actor
- node/runtime target

### Bet 3: The node agent is a host, not just a daemon

The agent should expose capability negotiation and runtime adapters so the platform can support multiple access runtimes, telemetry probes, and lifecycle actions without rewriting the control plane.

### Bet 4: Governance features should land earlier

SCIM traceability, passkeys, JIT access, simulation, and audit export should move earlier in the roadmap than they appear in the original spec.

### Bet 5: Reliability automation must be bounded, not magical

Real operators want auto-restart, failover, quarantine, and replace-node workflows, but only with:

- explicit health signals
- remediation policies
- cooldowns and retry budgets
- human-visible reason codes
- approval requirements for risky actions

## 0.8 Non-Goals for This Refresh

This document refresh still does not propose:

- bypass or anti-detection functionality
- implementation plans or sprint-level tasks
- commitment to a specific third-party policy engine or marketplace model

## 0.9 Sources

- [Tailscale - State of Zero Trust 2025](https://tailscale.com/resources/report/zero-trust-report-2025)
- [Tailscale Docs - Device posture management](https://tailscale.com/docs/features/device-posture)
- [Tailscale Docs - Device posture for JIT access](https://tailscale.com/kb/1383/device-posture-for-jit)
- [Tailscale Changelog - OpenAPI, webhooks, logging, posture endpoints](https://tailscale.com/changelog)
- [Cloudflare Changelog - SCIM provisioning logs, April 9 2025](https://developers.cloudflare.com/changelog/post/2025-04-09-scim-provisioning-logs/)
- [Cloudflare Access Changelog - policy testing and current access features](https://developers.cloudflare.com/changelog/product/access/)
- [Cloudflare One Docs - SCIM provisioning logs](https://developers.cloudflare.com/cloudflare-one/insights/logs/scim-logs/)
- [Twingate Docs - Audit logs export](https://www.twingate.com/docs/audit-logs)
- [Teleport Docs - Just-in-Time Access Requests](https://goteleport.com/docs/identity-governance/access-requests/)
- [FIDO Alliance - The State of Passkey Deployment in the Enterprise, 2025](https://fidoalliance.org/wp-content/uploads/2025/02/The-State-of-Passkey-Deployment-in-the-Enterprise-in-the-US-and-UK-FIDO-Alliance.pdf)
- [CISA - More than a Password / MFA guidance](https://www.cisa.gov/mfa)
