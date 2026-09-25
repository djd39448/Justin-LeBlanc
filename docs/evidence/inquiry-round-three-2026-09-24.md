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
- Shared Codex allowance was 60% used before initial dispatch, 61% after the reconnaissance batch,
  and 62% after implementation and review. No reset credit was consumed.

## Local implementation verification

The final branch snapshot passed on 2026-09-24:

| Check                         | Result                                                                |
| ----------------------------- | --------------------------------------------------------------------- |
| `npm run verify`              | PASS — lint, typecheck, 160 tests in 26 files, and production build   |
| Astro                         | PASS — 23 files, zero diagnostics, ten pages built                    |
| `npm run test:e2e`            | PASS — 46 cases, 54 intentional viewport-specific skips               |
| `npm run audit:public`        | PASS — 16 built files scanned, zero findings                          |
| `npm run scan:secrets --json` | PASS — zero findings                                                  |
| Release-file formatting       | PASS — Prettier and `git diff --check` clean for changed source files |

The GPT-6 Astra Ultra review found no remaining P1 or P2 blockers after checking retry/update
recovery, notification atomicity, recipient gates, legacy preservation, privacy, and follow-up
recovery. That review is code approval, not evidence of live email delivery.

## Responsive and accessibility evidence

Playwright created and the release lead visually inspected new full-page round-three captures at
360, 390, 768, 1280, and 1440 pixels. The planner remains readable and usable without horizontal
overflow, the two-column layout collapses cleanly on phones, and recap/consent/actions remain in
the intended order. The artifacts are in `docs/evidence/public-form-round-three/`. Historical
round-two screenshots are not evidence for this release.

## Runtime and production release

Pending verified backend deployment, protected configuration, owned service restart, Pages
deployment, one synthetic inquiry, Justin-only delivery, and ChatGPT account-side result.
