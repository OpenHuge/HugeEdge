# 08. API Specification

## 8.1 API Sets

- Public and tenant API
- Admin API
- Agent API
- Extensibility API
- Webhook and export API

Version all external APIs under `/v1`.

## 8.2 Authentication

### Browser

- session cookie or short-lived access token
- CSRF protection for cookie-authenticated flows

### API clients

- bearer API token
- scoped access by tenant, capability family, and action

### Privileged admin

- MFA mandatory
- design for phishing-resistant methods and passkey-ready WebAuthn flows

### Agents

- bootstrap token for first registration
- mTLS plus signed agent token thereafter

## 8.3 Capability Discovery

The platform should expose discovery endpoints so clients do not hard-code feature assumptions.

- `GET /v1/admin/capabilities`
- `GET /v1/admin/capabilities/{capabilityId}`
- `GET /v1/admin/extensions`
- `GET /v1/admin/extensions/{extensionId}`

Responses should include:

- type
- name
- version
- health
- scope
- compatibility
- config schema reference
- tenant availability

## 8.4 Admin API Endpoints

### Tenants

- `GET /v1/admin/tenants`
- `POST /v1/admin/tenants`
- `GET /v1/admin/tenants/{tenantId}`
- `PATCH /v1/admin/tenants/{tenantId}`
- `POST /v1/admin/tenants/{tenantId}/suspend`
- `POST /v1/admin/tenants/{tenantId}/resume`

### Plans and billing

- `GET /v1/admin/plans`
- `POST /v1/admin/plans`
- `PATCH /v1/admin/plans/{planId}`
- `POST /v1/admin/subscriptions/{subscriptionId}/adjust`
- `POST /v1/admin/coupons`

### Fleet

- `GET /v1/admin/nodes`
- `POST /v1/admin/nodes/bootstrap-tokens`
- `GET /v1/admin/nodes/{nodeId}`
- `GET /v1/admin/nodes/{nodeId}/capabilities`
- `POST /v1/admin/nodes/{nodeId}/cordon`
- `POST /v1/admin/nodes/{nodeId}/uncordon`
- `POST /v1/admin/nodes/{nodeId}/drain`
- `POST /v1/admin/nodes/{nodeId}/maintenance/start`
- `POST /v1/admin/nodes/{nodeId}/maintenance/finish`
- `POST /v1/admin/nodes/{nodeId}/commands`
- `GET /v1/admin/nodes/{nodeId}/commands`
- `GET /v1/admin/nodes/{nodeId}/wasm-plugins`
- `POST /v1/admin/nodes/{nodeId}/wasm-plugins`
- `POST /v1/admin/nodes/{nodeId}/wasm-plugins/{pluginId}/disable`
- `GET /v1/admin/regions`
- `POST /v1/admin/regions`
- `GET /v1/admin/providers`

### Policies and simulation

- `GET /v1/admin/policy-packs`
- `POST /v1/admin/policy-packs`
- `PATCH /v1/admin/policy-packs/{packId}`
- `POST /v1/admin/policy-simulations`
- `GET /v1/admin/policy-simulations/{simulationId}`
- `GET /v1/admin/risk-policies`
- `POST /v1/admin/risk-policies`
- `PATCH /v1/admin/risk-policies/{policyId}`
- `GET /v1/admin/remediation-policies`
- `POST /v1/admin/remediation-policies`
- `PATCH /v1/admin/remediation-policies/{policyId}`
- `POST /v1/admin/rollouts`
- `GET /v1/admin/rollouts`
- `GET /v1/admin/rollouts/{rolloutId}`
- `POST /v1/admin/rollouts/{rolloutId}/pause`
- `POST /v1/admin/rollouts/{rolloutId}/resume`
- `POST /v1/admin/rollouts/{rolloutId}/rollback`

### Integrations and extensions

- `GET /v1/admin/extensions`
- `POST /v1/admin/extensions`
- `GET /v1/admin/extensions/{extensionId}`
- `PATCH /v1/admin/extensions/{extensionId}`
- `POST /v1/admin/extensions/{extensionId}/enable`
- `POST /v1/admin/extensions/{extensionId}/disable`
- `POST /v1/admin/extensions/{extensionId}/rotate-secret`
- `POST /v1/admin/extensions/{extensionId}/test`

### Access approvals and audit

- `GET /v1/admin/access-requests`
- `POST /v1/admin/access-requests/{requestId}/approve`
- `POST /v1/admin/access-requests/{requestId}/deny`
- `GET /v1/admin/remediations`
- `GET /v1/admin/remediations/{remediationId}`
- `POST /v1/admin/remediations/{remediationId}/cancel`
- `GET /v1/admin/audit-logs`
- `GET /v1/admin/incidents`
- `POST /v1/admin/incidents`
- `POST /v1/admin/incidents/{incidentId}/events`

## 8.5 Tenant API Endpoints

### Account

- `GET /v1/app/me`
- `PATCH /v1/app/me`
- `POST /v1/app/mfa/setup`
- `POST /v1/app/mfa/verify`
- `POST /v1/app/passkeys/register`

### Subscription and usage

- `GET /v1/app/subscription`
- `GET /v1/app/usage`
- `GET /v1/app/invoices`

### Users and devices

- `GET /v1/app/users`
- `POST /v1/app/users`
- `GET /v1/app/devices`
- `POST /v1/app/devices/{deviceId}/revoke`

### Profiles and approvals

- `GET /v1/app/profiles`
- `POST /v1/app/profiles`
- `GET /v1/app/profiles/{profileId}`
- `POST /v1/app/profiles/{profileId}/rotate`
- `POST /v1/app/profiles/{profileId}/download-token`
- `GET /v1/app/access-requests`
- `POST /v1/app/access-requests`
- `POST /v1/app/sessions/{sessionId}/step-up`

## 8.6 Agent API Endpoints

### Enrollment

- `POST /v1/agent/register`
- `POST /v1/agent/renew`

### Telemetry

- `POST /v1/agent/heartbeat`
- `POST /v1/agent/telemetry/batch`

### Capabilities

- `POST /v1/agent/capabilities`
- `GET /v1/agent/runtime/desired`
- `GET /v1/agent/remediation-policy`
- `GET /v1/agent/wasm-plugins/desired`

### Commands

- `GET /v1/agent/commands`
- `POST /v1/agent/commands/{commandId}/result`

### Config

- `GET /v1/agent/config/current`
- `POST /v1/agent/config/applied`

## 8.7 Example Admin Node Detail Response

```json
{
  "id": "node_01HV...",
  "name": "sg-vultr-01",
  "provider": { "id": "prov_vultr", "name": "Vultr" },
  "region": { "id": "reg_sg", "name": "Singapore" },
  "status": "online",
  "channel": "stable",
  "agentVersion": "1.4.2",
  "runtimeAdapter": "xray-adapter",
  "runtimeVersion": "2.1.0",
  "configVersion": "cfg_2026_04_21_01",
  "cordoned": false,
  "draining": false,
  "maintenanceMode": false,
  "capabilities": [
    "runtime_adapter:xray",
    "telemetry_probe:netflow",
    "command_family:diagnostics"
  ],
  "lastSeenAt": "2026-04-21T06:15:00Z"
}
```

## 8.8 Example Policy Simulation Request

```json
{
  "subject": {
    "type": "user",
    "id": "usr_123"
  },
  "device": {
    "id": "dev_456",
    "posture": {
      "osVersion": "14.4.1",
      "managed": true,
      "edrHealthy": true
    }
  },
  "target": {
    "type": "profile",
    "id": "prof_prod"
  },
  "context": {
    "tenantId": "ten_123",
    "requestTime": "2026-04-21T08:00:00Z"
  }
}
```

## 8.9 Example Error Model

```json
{
  "error": {
    "code": "approval_required",
    "message": "This action requires a second approver",
    "details": {
      "policyPackId": "pack_break_glass",
      "requiredApprovals": 2
    }
  }
}
```

Rules:

- stable machine-readable `code`
- human-readable `message`
- optional `details`
- include trace ID in headers

## 8.10 Pagination

Cursor format:

- opaque cursor string
- `limit` default 20, max 200
- explicit sort order

## 8.11 Webhooks and Exports

Events:

- `subscription.created`
- `subscription.updated`
- `invoice.paid`
- `tenant.suspended`
- `node.online`
- `node.offline`
- `rollout.failed`
- `quota.threshold_reached`
- `extension.health_changed`
- `access_request.approved`
- `access_request.denied`
- `session.risk_elevated`
- `session.step_up_required`
- `remediation.heuristic_signal_triggered`

Delivery rules:

- sign payload with HMAC
- retries with backoff
- idempotent event IDs
- destination-specific dead-letter visibility

## 8.12 API Design Constraints

- external APIs must remain capability-discoverable
- no client should assume an extension exists unless discovery says so
- long-running operations return task IDs
- simulation and explanation endpoints are part of the API contract, not debug-only features

## 8.13 Remediation and Self-Healing APIs

Required response fields for remediation resources:

- remediation ID
- node ID
- failure class
- health score at detection
- triggered policy
- attempted actions
- cooldown state
- retry budget remaining
- escalation outcome
- correlated incident or audit references

Event types should include:

- `remediation.detected`
- `remediation.action_started`
- `remediation.action_succeeded`
- `remediation.action_failed`
- `remediation.quarantined`
- `remediation.escalated`

## 8.14 CARTA and Session Control Contracts

CARTA-related responses should include:

- risk score
- risk level
- policy reference
- evaluation timestamp
- required session action (`allow`, `step_up`, `restrict`, `terminate`)
- reason codes
