# Project engineering addendum

Read `CODING_STANDARDS.md`, a TrustCore-Engine snapshot retrieved 2026-09-21. Its Claude co-author
example is illustrative; use truthful authorship. Dave explicitly authorized normal commits/pushes.

Strict TypeScript, typed public interfaces, schemas, pure domain logic, injected provider adapters.
Module headers state purpose, dependencies, consumers and why. Public functions document inputs,
outputs and errors. No swallowed exceptions, mystery fallbacks, dead code or undocumented TODOs.
Errors explain what/where/remedy without personal payloads. CLI JSON stdout, operational logs stderr.

Pin dependencies/lockfile and document runtime. Reuse reviewed patterns with provenance, not the
entire TrustCore engine. No client deliverable may depend on private absolute paths.
Assign exclusive worker file ownership; integrate through reviewed shared contracts.

Before code commits: formatter/linter, typecheck and affected tests. Milestones add relevant
build/integration/E2E checks. Docs-only commits: whitespace, internal links and secret checks.
Do not rerun passed suites without cause. Stage explicit paths; verify remote SHA/private visibility.
Never force-push or commit secrets, real customer exports, invoices, recordings or transcripts.

Expose operator CLI commands with --help, --json, auth, explicit target IDs and dry-run where useful:
doctor, kb validate/build, inquiry inspect, show confirm/cancel/reschedule, quote amend, morning
check, reply reconcile, invoice preview/reconcile, demo seed/reset, backup/export, deploy status
and rollback. Reset only synthetic demo IDs and preserve audit history.
