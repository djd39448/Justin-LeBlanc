# Booking inquiry round-three evidence — 2026-09-24

This record covers the round-three public inquiry, Justin-only notification, and durable follow-up
release. It supplements rather than rewrites the dated round-two and provider evidence.

## Source and baseline

- Authoritative base: `origin/main` at `d69f12cdf87ebf52fb85ce1cfff3835b895008f1`.
- Feature branch: `codex/justin-inquiry-round-three`.
- Prior form implementation: `c6abf12015bcb6ef179985a08919cd3319026915`.
- Prior Pages deployment: `73a78aec-f10a-4b95-b494-fd191ecccbd6`.
- Immediate prior frontend rollback deployment: `a3152e61-ed47-41a7-9595-ebd42e694245`.
- The local `main` checkout was 14 commits behind before fetch; implementation began from the
  verified remote head, not stale local `main`.

Untouched baseline on 2026-09-24:

| Check               | Result                                                   |
| ------------------- | -------------------------------------------------------- |
| `npm ci`            | PASS — 564 packages installed; zero vulnerabilities      |
| `npm run verify`    | PASS — 146 tests in 24 files; lint/typecheck/build clean |
| Astro               | PASS — 21 files, zero diagnostics, nine pages built      |
| `npm run test:e2e`  | PASS — 34 cases, 26 intentional viewport skips           |
| Public-output audit | PASS — 15 built files scanned, zero findings             |
| Secret scan         | PASS — zero findings                                     |

The baseline Playwright run rewrote two historical screenshot files as a test side effect. They
were restored byte-for-byte from the clean base before implementation; no historical evidence was
carried into this release as a new artifact.

## Model routing and usage

- The active root task exposed `gpt-5.6-sol` with Ultra reasoning, not the requested GPT-6 Astra.
  The task cannot change its own root model mid-turn, so this record does not mislabel it.
- A GPT-6 Astra Ultra lead was assigned to architecture, security/idempotency review, and release
  judgment. Two bounded GPT-5.6 Luna Medium workers received exclusive frontend and backend file
  ownership for ordinary implementation.
- Shared Codex allowance was 63% after implementation and review. No reset credit was consumed.

## Local implementation verification

The deployed application snapshot passed on 2026-09-24:

| Check                         | Result                                                                |
| ----------------------------- | --------------------------------------------------------------------- |
| `npm run verify`              | PASS — lint, typecheck, 160 tests in 26 files, and production build   |
| Astro                         | PASS — 23 files, zero diagnostics, ten pages built                    |
| `npm run test:e2e`            | PASS — 46 cases, 54 intentional viewport-specific skips               |
| `npm run audit:public`        | PASS — 16 built files scanned, zero findings                          |
| `npm run scan:secrets --json` | PASS — zero findings                                                  |
| Release-file formatting       | PASS — Prettier and `git diff --check` clean for changed source files |

Post-release evidence hardening added a ninth round-three test using an injected clock and a
file-backed SQLite database. It closes and reopens the store at the 20-hour and 24-hour boundaries,
then replays each job to prove one due-soon effect, one overdue effect, and no duplicates. The
targeted suite passed 9/9, and final repository `npm run verify` passed lint, typecheck, 161 tests in
26 files, 23 clean Astro files, and 10 pages. No production source, wall clock, live state, or
reminder mail was involved.

Windows exact `npm ci` passed with 563 packages installed, 565 packages audited, and zero
vulnerabilities. Feature CI [36083511550](https://github.com/djd39448/Justin-LeBlanc/actions/runs/36083511550)
and main CI [36083745550](https://github.com/djd39448/Justin-LeBlanc/actions/runs/36083745550) passed
at `5674a2f`.

The GPT-6 Astra Ultra review found no remaining P1 or P2 blockers after checking retry/update
recovery, notification atomicity, recipient gates, legacy preservation, privacy, and follow-up
recovery. That review is code approval, not evidence of live email delivery.

## Responsive and accessibility evidence

Playwright created and the release lead visually inspected new full-page round-three captures at
360, 390, 768, 1280, and 1440 pixels. The planner remains readable and usable without horizontal
overflow, the two-column layout collapses cleanly on phones, and recap/consent/actions remain in
the intended order. The artifacts are in `docs/evidence/public-form-round-three/`. Historical
round-two screenshots are not evidence for this release.

## Runtime and production release — live

Windows preflight and release on 2026-09-25 established:

- the runtime checkout is clean at `5674a2fe63a384ff833db956d18a0db81d43f669`; the prior runtime
  revision is `8f765d8aa92e10df4baf6c6ce13f6acbfff2e2a1`;
- exact `npm ci` passed with 563 packages installed, 565 packages audited, and zero vulnerabilities;
- `npm run verify` passed with 160 tests in 26 files, 23 Astro files with zero diagnostics, and 10 pages;
- the fresh online backup `snapshot-2026-09-25T01-34-38-489Z` and non-destructive
  `restore-check-2026-09-25T01-34Z` passed SQLite integrity checking;
- the queue began with 20 accepted and zero unresolved effects, and after the synthetic inquiry had
  21 accepted, zero unresolved effects, and no leases;
- all three local/direct/site health paths returned HTTP 200 with five capabilities true; worker and
  owned tasks were healthy, and public-events returned the exact safe 503;
- protected inquiry keys were configured without recording the recipient value;
- Pages deployment `47db4b6d-660c-4ced-97c1-e87e390db778` was deployed from source
  `5674a2fe63a384ff833db956d18a0db81d43f669`; immediate frontend rollback is
  `73a78aec-f10a-4b95-b494-fd191ecccbd6`;
- the canonical form smoke passed, and the noindex receipt route contains no URL PII.

One synthetic inquiry (`cd378fdc-7332-4765-ade7-d681c63bf410`) was accepted as the ninth total
inquiry. Exactly one `email.inquiry_received` effect was accepted on its first SMTP attempt, to
the sole configured To recipient with no CC/BCC; no other business side effects occurred. SMTP /
provider acceptance is not observed inbox receipt. Justin mailbox receipt, event-trigger task
creation, and ChatGPT notification remain pending account-side authorization and observation.
