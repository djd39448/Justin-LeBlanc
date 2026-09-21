# Execution plan — 2026-09-21

Status: documented, not implemented. Canonical scope: docs/BUILD_SPEC.md.

## 0. Preflight and research

Read instructions/spec, usage and resource readiness; reconcile Git state. Inspect authorized
deployment/account configuration read-only. Browse comparison sites and Justin assets, record
source manifest. Select Node host/SQL store in an ADR before implementing provider adapters.
No changes to existing TrustCore resources. Qualify available models and budget before dispatch.

## 1. Contracts and foundation

Scaffold web/API/domain/contracts, lint/tests/build/CI, migrations, auth, demo gates, outbox,
config, synthetic fixtures and CLI. Commit/push coherent verified units. Define shared contracts
before parallel workers edit consuming modules.

## 2. Parallel work with explicit ownership

- Design/web: apps/web and design research, mobile/accessibility/metadata.
- Booking/AI: booking adapters/channel tools; coordinator owns shared contracts.
- Billing/documents: morning/reply/invoice modules and typed templates.
- Research/KB can overlap preflight. Never assign two writers the same files.

Each brief names inputs, acceptance IDs, ownership, output limits and constraints. Use only
available qualified workers; no filler work. Commit/push integrated passing units continuously.

## 3. Integration and full demonstration

Provision isolated services; deploy API/web, new Retell number/agent and shared KB. Configure
actual email/calendar and persistent scheduler. Test offline then live with allowlisted recipients.
Verify two invitations, brief, manual confirmation, actual reply, invoice To/BCC. Prove existing
resources unchanged. Supply demo seed and reconciliation commands.

## 4. Review and compound

Review design/accessibility, TypeScript simplicity, security, state/idempotency and operations.
Fix material findings, retest affected areas, visually inspect PDFs/mobile. Record evidence,
usage, commit/URLs, docs/solutions learnings and updated runbook/handoff/resource inventory.

## Checkpoints

C1 docs/research/preflight/ADR; C2 form -> real booking -> brief; C3 shared-KB chat/voice;
C4 confirmed show -> morning check -> actual reply -> invoice; C5 polish/review/hosting/handoff.
Do not declare completion before C5. Report exact unavailable dependency and restartable command,
finish independent work and distinguish offline from live proof. Never fabricate successful tests.
