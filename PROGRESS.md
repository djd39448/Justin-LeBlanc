# Progress

## Round-three inquiry release — live

Main/runtime SHA `5674a2fe63a384ff833db956d18a0db81d43f669` is live. Exact Windows `npm ci`,
verification, backup/restore, three-path health, worker/task, Pages, canonical form, and one
synthetic inquiry/outbox acceptance are recorded in the round-three evidence. The SMTP provider
accepted the one Justin-only effect; this does not prove inbox receipt. Justin's mailbox and
ChatGPT notification remain pending account-side authorization/observation. Pages deployment
`47db4b6d-660c-4ced-97c1-e87e390db778` is live; `73a78aec-f10a-4b95-b494-fd191ecccbd6` is the
immediate frontend rollback, and runtime rollback is
`8f765d8aa92e10df4baf6c6ce13f6acbfff2e2a1`.

## Historical round-two public-form release

Updated 2026-09-23. **The two-step, inquiry-only public planner was live at
`https://justinleblancmusic.50by50.dev/` from verified frontend revision
`c6abf12015bcb6ef179985a08919cd3319026915`, on both `origin/main` and
`origin/codex/justin-round-two`. Cloudflare Pages deployment
`73a78aec-f10a-4b95-b494-fd191ecccbd6` served the release; deployment
`a3152e61-ed47-41a7-9595-ebd42e694245` was the immediate rollback target. The dedicated Public Shows Calendar
remained disabled, so Where I'm Playing rendered one verified public date without requesting
Calendar data.**

### Round-two implementation record

The verified implementation commit is `c6abf12015bcb6ef179985a08919cd3319026915`, on `origin/main`
and the pushed feature branch. Release evidence is in
[the dated public-form record](docs/evidence/public-form-simplification-2026-09-23.md). The canonical
hostname, `/plan-your-event/`, deployment URL, and health return HTTP 200; `/admin` retains
no-store/noindex and unauthenticated `/api/admin/state` returns 401.

- [x] Reduce the public planner from three steps to two: Contact, then Event planning.
- [x] Keep the retained event fields, relabel Event city as **Location of the event**, and keep only
      **Performance time**, **Sound / equipment needs**, **Budget (optional)**, and
      **Special requests (optional)** as planning-detail controls before recap and consent.
- [x] Remove retired atmosphere/timing/additional-note controls plus every public consultation,
      availability, booking, reserve, next-step, and tentative-hold surface or endpoint path.
- [x] Preserve required legacy payload keys/data and every protected backend/private booking,
      Calendar, assistant, billing, auth, recipient, and idempotency capability.

- [x] Put the shared planner directly in the opening homepage conversion experience; no CTA, modal,
      or route change is required to begin.
- [x] Pin primary navigation to the viewport top with correct mobile, focus, and anchor-offset
      behavior.
- [x] Implement the brand/hero, category rail, Listen, Follow, FAQ, form-field, and public-copy
      changes in [the round-two specification](docs/ROUND_TWO_BUILD_SPEC.md).
- [x] Add `preferredReply: "text"` and optional integer `budgetCents` while preserving old records;
      replace budget ranges with visitor-entered numeric USD.
- [x] Add the isolated read-only sanitized `/api/public-events` projection and offline fixture proof
      that private/corporate/wedding/consultation/hold sources are never queried or published.
- [ ] During the next QA pass, owner-confirm the exact live public-performance-only Calendar and sufficient existing read
      access; the exact Calendar published by the existing events page was inspected and rejected
      because it contains private-event records and street-address locations. Keep
      `PUBLIC_EVENTS_ENABLED=false` until a safe dedicated source passes.
- [x] Remove chatbot/voice UI, the dormant voice-agent number, package pricing, and assistant
      references from the public website while preserving all underlying Retell/OpenAI resources,
      KB/tools, routes, config, and backend tests. Show the human business phone
      **(832) 303-9116** instead.
- [x] Add one temporary manually curated public listing for **Solo Sunday with Justin LeBlanc**,
      Sep 27, 2026, 5:00–8:00 PM Central, at The Blue Lion Brunchery & Pub in The Woodlands, TX.
      Link to the public Woodlands Online source, omit the street address, filter it at build time,
      expire it client-side after the event, and make no frontend Calendar request.
- [x] Add responsive browser evidence at all five required widths, the public-output audit, secret
      scan, and CI gates.
- [x] Capture private rollback state, deploy the compatible API disabled-first, and verify local,
      direct-tunnel, and exact-site health plus the fixed fail-closed 503. All four existing
      capability flags remain enabled and the outbox has no unresolved effects.
- [x] Deploy and smoke-test the corrected conversion frontend without enabling or querying the
      Public Shows Calendar. Do not mutate Retell for this release.
- [ ] Configure and review a dedicated Public Shows Calendar during the next QA pass; keep the
      exact safe `/api/public-events` 503 until then.

Final results: local verification passed 146 unit/integration tests in 24 files, lint/typecheck, 21
Astro files with zero diagnostics, and nine built pages. Playwright passed 34 tests with 26
intentional viewport-specific skips across five viewports. The public-output audit scanned 15 files
with zero findings, and the secret scan was clean. Feature CI run
[35905466911](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905466911) and main CI run
[35905771617](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905771617) passed.

- [x] Isolated repository, approved specification, provider isolation preflight, runtime architecture, durable SQLite state, backups, exports, and restore integrity.
- [x] Responsive public site, inquiry flow, operator workspace, readable reference content, structured metadata, and noindex controls. Round-two deployment `73a78aec` served the inquiry-only frontend, and `a3152e61` was its immediate rollback target at that time.
- [x] Billing-policy KB parity: Retell v4, API and chat use `2026-09-21.4` / `63f6cc2c6ac6d9066a490513f50e9c3f48de9c4d6acbc2f17cde92e4880b9c96`; all three health paths returned HTTP 200 with all capabilities enabled after restart.
- [x] Deterministic booking, money, state transitions, authentication, recipient gates, outbox leases, uncertainty reconciliation, and operator CLI.
- [x] Public/assistant booking authorization before availability or hold creation, including replay-token validation, plus an independent attendee allowlist at the final Calendar provider boundary.
- [x] Live negative recipient/token checks rejected unsafe booking requests without creating a hold or effect.
- [x] Live Calendar consultation and tentative hold with Central times, invited roles, private brief, same-ID confirmation, non-overlapping reschedule, and cancellation.
- [x] Historical old-policy acceptance: authenticated YES reply, one immutable USD 700.00 invoice, exact client Message-ID receipt, operator BCC receipt, Sent reconciliation, and zero-duplicate replay.
- [ ] Current automatic invoice policy is implemented, CI-verified and loaded in the running services. Fresh Calendar-to-inbox evidence remains pending; the attempted seed was blocked before mutation and made no new show, invoice or email.
- [x] Isolated Houston voice resource at **(832) 501-3799**, published agent/LLM v3 on the same protected identities, four admitted connections, correct versioned KB identity, and actual phone-tool evidence for inquiry creation, availability, and human follow-up.
- [x] Existing Retell, DNS, Pages, and other provider resources reconciled unchanged; only isolated demo resources were added.
- [x] Current backup restored read-only with two shows and one invoice and passed SQLite integrity checking.
- [x] Local API, worker, and tunnel are running with booking, chat, voice, morning, and invoice gates enabled.
- [ ] Full voice workflow: the first three calls remain historical evidence, including the third call's HTTP 413 failures. The 210,264 ms fourth v2 call (`ee1ddd70e7624259`, 36.473 cents, `user_hangup`) proved the repaired path: `upsert_inquiry`, four `get_availability` results, `request_human_followup`, and started/ended/analyzed events all persisted. Each availability result allowed the performance and was blocked only by the then-active 24-hour consultation rule. Booking did not complete, and v3 native `end_call` has not been phone-tested.
- [x] Startup registration and task execution: backup created at 15:38:36 UTC, tasks restarted at 15:38:40 UTC, and all three verified running S4U/Limited with exact boot triggers at 15:39:09 UTC. All three health paths and worker startup jobs passed afterward.
- [ ] Recovery after an actual reboot or sign-out has not been authorized or tested.

The provider queue was empty after the live booking cancellation and invoice replay. A confirmed event's attendee copy can still cause a safe false rejection when a requested reschedule overlaps the current interval; free/busy lacks event identity, so the adapter deliberately does not subtract that interval.

[Main CI run 35905771617](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905771617) passed for `c6abf12015bcb6ef179985a08919cd3319026915`, after feature CI run [35905466911](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905466911) also passed. Historical evidence is indexed in [acceptance results](docs/evidence/acceptance-results.md); current release evidence is in [the round-three record](docs/evidence/inquiry-round-three-2026-09-24.md).
