# Specification and delivery

## From design to build contract

For a substantial build, translate the design into the outcome, users, scope, non-goals, behavior, inputs and outputs, validation, state changes, compatibility, edge cases, preservation rules, failure handling, external boundaries, security, tests, measurable acceptance, deployment order, and rollback. Use an acceptance matrix where it clarifies how each consequential requirement will be proven.

Create a dependency-aware plan with objectives, ownership, steps, shared contracts, checks, evidence, rollback, and completion conditions. Make parallel ownership disjoint; serialize dependencies. Identify the exact action authorized and the conditions that require renewed human input. Preserve any existing authorization rather than seeking it again.

## Documents with distinct jobs

Adapt to existing project conventions instead of creating every file by default:

- **Instructions / AGENTS:** scope, read order, authority, and working boundaries.
- **README:** front door and current state.
- **Decisions:** durable choices, rationale, status, and supersession.
- **Architecture / workflows:** responsibilities, boundaries, state, and behavior over time.
- **Build spec / acceptance:** explicit contract and proof criteria.
- **Plan / kickoff:** sequence, baseline, permissions, ownership, and execution instructions.
- **Progress / build log:** work completed, checks, blockers, and next action.
- **Changelog:** material changes over time.
- **Evidence:** dated, sanitized observations with commands and revision.
- **Runbook / handoff:** operation, recovery, current state, and restartable next steps.

## Build, prove, and continue

Implement a coherent slice, update relevant boundary tests, run appropriate checks, inspect the result, capture evidence, and update affected documents. Make small reversible commits when the project requires them. Run checks proportionate to the change; repeat after changes, failures, or new concerns.

Report evidence at the level actually observed: implemented in code, offline-tested, provider-accepted, or live-observed. A successful mock, accepted request, or confident narrative is not a stronger proof. Describe failures with what happened, where, and the next remedy, without exposing secrets.

For a handoff, identify revision and deployment, governing decisions, work completed, proof and unverified gaps, running state, pending or uncertain effects, blockers, rollback targets, evidence locations, and the next safe action. Capture reusable lessons only where they will help future work.
