# 12. Observability and SRE

## 12.1 Signals

- metrics
- logs
- traces
- events

## 12.2 Metrics

### Control plane
- request rate
- latency p50/p95/p99
- error rate
- queue depth
- job latency
- DB pool saturation
- cache hit ratio
- outbox lag

### Fleet
- node online percentage
- heartbeat freshness
- config apply success
- upgrade success
- command execution latency
- regional traffic
- active sessions
- saturation indicators

## 12.3 Logs

Structured JSON logs only:
- request logs
- auth events
- command logs
- rollout logs
- agent lifecycle logs

Redaction rules:
- no raw secrets
- no full tokens
- no sensitive billing payload bodies beyond required fields

## 12.4 Tracing

Trace:
- login flow
- tenant creation
- bootstrap token issuance
- node enrollment
- config compile and rollout
- command dispatch
- billing webhook processing

Use OpenTelemetry everywhere.

## 12.5 Dashboards

Required dashboards:
- API health
- DB health
- queue / broker health
- node health by region
- rollout success/failure
- tenant usage and quota pressure
- billing event processing
- incident board

## 12.6 Alerting

Examples:
- API p95 latency breach
- error rate spike
- worker backlog too high
- heartbeat freshness below threshold
- node offline above regional threshold
- rollout failure ratio above threshold
- cert expiry under N days
- billing webhook failures sustained

## 12.7 SLOs

### Control plane
- availability 99.9%
- p95 API latency under target

### Fleet visibility
- 99.5% node heartbeat freshness

### Rollout engine
- 99% rollout task completion success for stable operations

## 12.8 Capacity Planning

Track:
- tenants
- active users
- active devices
- nodes
- sessions
- heartbeats per minute
- telemetry batch size
- artifact storage growth

Use these for quarterly scaling reviews.

## 12.9 Health Scoring and Remediation Metrics

Track:

- node health score distribution
- remediation attempts by failure class
- remediation success rate
- mean time to autonomous recovery
- quarantine rate
- false-positive remediation rate
- repeat-failure rate after remediation
- manual override rate

## 12.10 Self-Healing SLOs

Examples:

- at least 80% of eligible runtime failures recover through bounded automation within 5 minutes
- less than 5% of automated remediations escalate due to policy or tool failure
- less than 1% of automated remediations cause customer-visible regression
