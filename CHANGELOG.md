# Changelog

## 2026-09-24 — Round-three inquiry implementation

- Implemented the exact two-step inquiry-only planner, optional strict phone validation, composite
  event-date input, safe receipt route, and browser idempotency handling.
- Added legacy replacement preservation, Justin-only deterministic inquiry notifications through
  the durable outbox, 20-hour/24-hour follow-up lifecycle, and authenticated CLI/admin completion.
- Added the release specification, local verification evidence, and account-side ChatGPT/Gmail
  setup.
- Local gates pass; deployment, provider delivery, and ChatGPT activation remain pending until
  observed and recorded.

## 2026-09-22 — Round-two specification revision

- Made the homepage conversion-first: the planner begins in the opening experience rather than at
  the bottom of the page or behind a CTA.
- Added persistent top navigation with anchor/focus-offset and responsive acceptance requirements.
- Replaced the external schedule-link plan with a sanitized read-only feed from an exact dedicated
  live Public Shows Google Calendar; private booking Calendars remain forbidden inputs.
- Replaced budget ranges with optional visitor-entered numeric USD stored as non-authoritative
  planning context.
- Removed all chatbot/voice presentation and phone references from the planned public website while
  explicitly retaining the underlying Retell/OpenAI resources, KB/tools, routes, configuration, and
  backend tests.
- Rewrote `KICKOFF.md` for a clean round-two implementation session and added
  `docs/ROUND_TWO_BUILD_SPEC.md` plus linked decision, architecture, workflow, integration,
  acceptance, progress, runbook, inventory, and handoff updates.
- Documentation only: no application code, deployment, Calendar, OAuth, Retell, email, database, or
  other provider state changed.

## 2026-09-21 — Planning pack

- Detailed theme-preserving private-event redesign and design-research requirements.
- Shared voice/chat knowledge and tools, calendar hold/consultation/confirmation flow.
- Morning performance confirmation, reply ingestion and invoice workflow.
- Data/contracts, demo defaults, attractive document designs, integration isolation and migration.
- Coding standards, staged build plan, acceptance matrix, runbook and Astra Ultra kickoff prompt.
- No application implementation or external resource changes in this documentation batch.
