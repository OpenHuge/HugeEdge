# 06. Frontend Panel

## 6.1 Frontend Goals

- extremely fast operator workflows
- dense but readable data surfaces
- safe bulk actions
- live fleet and capability visibility
- explainable decisions and diffs
- strong typed integration with the backend
- extension-friendly shell without UI sprawl

## 6.2 Stack

- TanStack Start
- React
- Mantine
- TanStack Router
- TanStack Query
- Zod for forms and validation
- ECharts or Recharts for charts
- Mantine plus TanStack Table for tabular views
- optional command palette

## 6.3 App Areas

### Public

- landing and docs
- login
- password reset
- invite accept
- status page

### Tenant self-service

- dashboard
- subscription
- usage
- users and devices
- profiles
- approvals
- invoices
- diagnostics export

### Operator admin

- global dashboard
- tenants
- plans
- regions and providers
- nodes and runtimes
- rollouts
- incidents
- audit logs
- integrations
- policy packs
- system settings

## 6.4 Route Structure

```text
/
  /login
  /app
    /dashboard
    /usage
    /profiles
    /devices
    /approvals
    /billing
    /settings
  /admin
    /overview
    /tenants
    /plans
    /fleet
      /nodes
      /regions
      /providers
      /runtimes
    /policies
      /packs
      /simulations
      /rollouts
    /integrations
      /identity
      /billing
      /posture
      /exports
      /notifications
    /ops
      /incidents
      /commands
      /audit
    /system
```

## 6.5 UX Principles

- table-first admin UX
- filters persist in the URL
- bulk actions always preview scope and blast radius
- destructive actions require typed confirmation
- live updates without page refresh
- "why is this denied or disabled?" must be visible
- every major entity page has timeline and related objects
- extensions inherit shell navigation and permissions rather than inventing their own

## 6.6 Key Screens

### Global overview

Cards:

- active tenants
- active nodes
- unhealthy nodes
- rollout failures
- high-risk access events
- traffic today and by billing period
- connector health summary

Charts:

- traffic by region
- node health trend
- denied access reasons
- subscription churn
- incident volume

### Fleet and nodes

Columns:

- name
- provider
- region
- status
- runtime adapter
- runtime version
- agent version
- config version
- uptime
- active sessions
- today traffic
- latency
- health score
- capability tags

Actions:

- inspect
- cordon
- drain
- maintenance
- restart
- upgrade
- collect diagnostics
- view remediation history

### Policy simulation

Must show:

- selected subject and target
- identity inputs
- posture inputs
- policy pack and version
- matched rules
- allow or deny
- explanation and next-step hint

### Integration detail

Must show:

- connector manifest
- health
- tenant scope
- required secrets
- last sync
- recent errors
- audit trail

### Remediation center

Must show:

- unhealthy nodes by failure class
- active remediation attempts
- cooldown and retry budget state
- auto-remediation success rate
- quarantined nodes
- replacement candidates

## 6.7 Design System Guidance

Use Mantine with:

- custom theme tokens
- compact density mode for operator surfaces
- accessible color contrast
- consistent empty, loading, and error states
- data badges for capability and health states

Shared components:

- `EntityHeader`
- `StatusBadge`
- `MetricCard`
- `DataTable`
- `DiffViewer`
- `Timeline`
- `DecisionTracePanel`
- `CapabilityPill`
- `ConfirmActionModal`
- `CommandProgressDrawer`

## 6.8 Frontend Extensibility Model

UI extensions should contribute metadata, not patch the app shell directly.

Allowed extension contributions:

- navigation items under approved route groups
- entity tabs
- action panels
- detail widgets
- settings forms driven by config schema

Each UI extension must declare:

- capability family
- required permissions
- route ownership
- supported entity types
- config schema reference

## 6.9 State Management

- server state in TanStack Query
- route loaders for SSR hydration
- client state only for ephemeral preferences
- optimistic updates only for low-risk actions
- websocket or SSE updates invalidate precise query keys

## 6.10 Frontend Performance

- SSR for first paint
- route-level code splitting
- virtualization for large tables
- skeleton loading over spinners
- aggressive caching of list views
- avoid over-fetching detail payloads
- defer extension bundles until the capability is enabled

## 6.11 Authorization in UI

- derive permissions from backend capability maps
- hide unavailable actions
- never rely on UI gating alone
- show impersonation or support banners clearly
- surface approval requirements before an action is submitted

## 6.12 Internationalization

Prefer English-first admin UI for v1.
Structure for i18n from day one:

- message catalogs
- locale-aware number and date formatting
- RTL not required in v1

## 6.13 Advanced Operations UX

The advanced operations surfaces should include:

- node health score timeline
- remediation ladder replay
- policy simulation for remediation rules
- "why was this node quarantined?" explanation
- side-by-side last-known-good versus failed config diff
- action gating for auto-remediation overrides
