# Demo handoff

Status date: 2026-09-22. The isolated baseline is deployed and its web, chat, private Calendar,
email, and voice transport paths have real provider evidence. Round-two code is merged to `main`;
its additive API and fail-closed Pages bridge are live, while the conversion frontend remains
gated on a dedicated public-only Calendar. Calendar-driven
automatic invoicing is implemented, CI-verified and loaded in the running services; a fresh live
Calendar-to-inbox walkthrough remains pending. The delivered reply-driven $700 invoice is
historical old-policy evidence only. Full voice booking, native hangup, and recovery after an actual
reboot/sign-out remain unverified.

## Round-two implementation — API deployed, frontend gated

Dave's 2026-09-22 direction is implemented in
`e4e082e5d85d56f3301ce7652180b40c78f24956` on `main`. The release:

- renders the planner in the opening homepage conversion experience with no preliminary CTA/reveal;
- keeps the primary navigation pinned throughout scrolling;
- reads actual public venue dates from an exact dedicated live Public Shows Calendar through a
  separate sanitized endpoint, never from the private booking/free-busy Calendars;
- accepts an optional visitor-entered numeric USD budget while preserving old inquiry records; and
- removes every chatbot/voice UI element, phone number, `tel:` link, and assistant reference from
  public output while leaving the Retell/OpenAI resources, KB/tools, routes, configuration, and
  backend tests intact.

The exact-source adapter, fixed 503, recurrence/filter/cache boundaries, multi-calendar privacy
fixture, and sanitized DTO all pass. `npm run verify` passed 141 tests in 24 files,
lint/typecheck, 21 Astro files with zero diagnostics, and nine pages. Playwright passed 30 cases with
15 intentional viewport skips; the 16-file public-output audit and secret scan found nothing.
Responsive screenshots and command-level evidence are in
[the dated round-two record](evidence/round-two-2026-09-22.md).

The Windows runtime now runs the same release commit with `PUBLIC_EVENTS_ENABLED=false` after a
private backup and rollback capture. All three health paths pass with unchanged capabilities, and
all three public-events paths return the exact fixed sanitized 503. Pages deployment `5213f7b6`
reused every static file and updated only the API safety bridge, so the public site still reflects
the prior design. The exact Calendar used by Justin's existing public events page was inspected and
rejected because it mixes private-event records and street-address locations. No Calendar/event,
OAuth, Retell, mail, billing, or DNS resource was changed.

## Running system

- The exact public hostname serves bridge-only deployment `5213f7b6-da9c-4985-819b-a05da8831db1` and returns HTTP 200. All 27 static files were reused, and a post-deploy comparison found zero mismatches across 26 served files after excluding Cloudflare's injected beacon. Deployment `840a4ccf-4784-4421-b85b-091f40f65cb4` is the captured frontend rollback point.
- The local API, worker, and isolated tunnel are Running/S4U. Booking, chat, voice, morning and invoice gates are enabled.
- The runtime checkout is clean at `e4e082e5d85d56f3301ce7652180b40c78f24956`. Local, direct-tunnel and exact-site health return HTTP 200 with KB `2026-09-21.4`, all four capabilities enabled and no `demoVoicePhoneNumber`; the outbox has 20 accepted and zero unresolved effects.
- Local, direct-tunnel and exact-site `/api/public-events` return HTTP 503, `Cache-Control: no-store`, `Retry-After: 300`, and exactly `{"error":"public_events_unavailable","message":"Current dates are temporarily unavailable."}`.
- The corrected startup upgrade created its backup at 15:38:36 UTC and restarted the tasks at 15:38:40 UTC. At 15:39:09 UTC the API, worker, and tunnel tasks were running as S4U/Limited with exactly one `MSFT_TaskBootTrigger` each. All three health paths passed at 15:39:43 UTC, worker startup jobs succeeded, and the tunnel restored four connections.
- At about 17:45 UTC, local, direct-tunnel, and website-proxy health all returned HTTP 200 with KB `2026-09-21.4`, hash `63f6cc2c6ac6d9066a490513f50e9c3f48de9c4d6acbc2f17cde92e4880b9c96`, all capabilities enabled and the Houston number.
- The same protected voice agent and LLM identities are published and read-back verified at v4 with that KB, six unchanged custom tools, and native `end_call`.
- The first `morning:auto-invoice:v2` catch-up completed all seven dates from 2026-09-14 through 2026-09-20 at 17:44:28.820 UTC with zero eligible shows and no new effects; the existing sent invoice was preserved.
- The public Houston demo number is **(832) 501-3799**.
- [Main CI run 35785830763](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35785830763) passed for `e4e082e5d85d56f3301ce7652180b40c78f24956`: **141 tests in 24 files**, lint, typecheck, public-output and secret audits, 21 Astro files with zero diagnostics, nine built pages, and the Playwright matrix.
- Private configuration, OAuth material, recipient data, provider credentials, SQLite state, generated customer documents, and backups remain outside the repository.

## Live acceptance completed

- A real consultation and tentative performance hold were created on the isolated Calendar with the expected Central times and two invited roles. The private one-page brief was delivered and reconciled.
- A durable one-time repair updated the existing tentative performance event to transparent without changing its provider identity. The approved USD 700.00 quote then confirmed that same event as opaque with matching quote metadata.
- The confirmed performance was moved to a non-overlapping next-day interval and cancelled. Confirmation, reschedule, and cancellation retained the same event identity; every associated effect was accepted on its first attempt.
- Historical old-policy acceptance: the Houston morning workflow sent one performer check, and an authenticated YES reply created one immutable USD 700.00 invoice and one delivery effect.
- That old-policy invoice reached the client and operator exactly once and reconciled against Sent. It does not prove the current Calendar-driven automatic invoice flow.
- The first two calls remain historical: the 59,473 ms v1 call cost 11.86 cents and the 18,473 ms v2 call cost 5.177 cents; neither invoked tools. The third v2 call ran from 15:44:53–15:48:10 UTC, lasted 196,946 ms, cost 34.191 cents, and successfully persisted a call-associated inquiry. Two `get_availability` calls and one `request_human_followup` call failed HTTP 413 `body_too_large`; terminal ended/analyzed webhooks were also absent at that boundary.
- The fourth v2 call (`ee1ddd70e7624259`) lasted 210,264 ms, cost 36.473 cents, and ended by `user_hangup`. Read-only ledger inspection verified `upsert_inquiry`, four `get_availability` results, persisted `request_human_followup`, and started/ended/analyzed events. Every availability result reported `performanceAvailable=true` and only the then-active 24-hour consultation rule as a reason. This is actual phone evidence for the repaired tool path; no booking completed.
- Provider isolation reconciliation at 17:44:13 UTC found all baseline Retell, DNS, Pages and other recorded resources unchanged.
- The current SQLite backup restored read-only with two shows and one old-policy invoice and passed integrity checking. The authenticated document preview, SMTP/IMAP diagnostic, public form/resume flow, grounded chat cases, and deployed accessibility/security checks remain valid.

## Remaining limits

| Area                             | Current evidence                                                                                                                                                                               | Required next action                                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Voice workflow                   | The fourth call proved the repaired inquiry, availability, follow-up, and lifecycle paths. Booking did not complete; native `end_call` is published on v4 but has not been exercised by phone. | Phone-test a completed booking and native hangup on v4. See [call-completion evidence](evidence/consultation-call-completion.json).               |
| Unattended recovery              | S4U/Limited registration, exact boot triggers, and post-apply task execution are verified. No actual reboot or sign-out was authorized or performed.                                           | Separately authorize and verify recovery after a real reboot or sign-out before claiming that behavior.                                           |
| Overlapping confirmed reschedule | Google free/busy does not expose event identity for an attendee copy. A proposed buffered interval overlapping the current confirmed event may be rejected as busy.                            | Keep the fail-closed behavior. Do not subtract intervals that might contain an unrelated conflict; use a non-overlapping move or operator review. |
| Round-two runtime                | Clean release commit is live disabled-first; health, fixed 503, service state, unresolved-effect, backup and rollback gates pass.                                                              | Keep the additive API schema and `PUBLIC_EVENTS_ENABLED=false` until the dedicated public source is approved.                                     |
| Public Shows Calendar            | The Calendar on the existing public events page mixes private events and street-address locations and is disqualified. No separate owner-confirmed public-only Calendar/access proof exists.   | Owner selects/confirms a dedicated calendar and controlled venue/city entries; separately authorize any required scope or credential.             |
| Round-two frontend               | Code is on `main`, but production intentionally reuses the prior visible frontend; only the Pages API bridge changed.                                                                          | Enable, warm and review the dedicated sanitized feed, then deploy and smoke-test the conversion frontend.                                         |

## Safety and recovery boundaries

- Calendar writes use deterministic identities and durable outbox effects. The accepted initial hold effect was never reset; its transparency correction used a new effect ID.
- Tentative performance invitations are transparent and become opaque on confirmation. The configured primary free/busy calendar remains queried, and unrelated conflicts still block confirmation.
- Public and assistant booking requests must pass the configured demo-recipient boundary before availability or hold creation, including idempotent replay. The Calendar adapter independently validates every final attendee before OAuth refresh or any provider request.
- A live negative boundary check rejected an unallowlisted public recipient and an invalid inquiry token with no holds or effects created.
- SMTP interruption becomes uncertain. Recovery reconciles the deterministic Message-ID against Sent and never blindly resends.
- Legacy reply records still require aligned authentication, a known thread and the per-check nonce. They do not gate or create current-policy invoices.
- Invoice snapshots are immutable, numbered from stored state, and derived only from the canonical customer and agreed quote.
- Current-policy morning invoicing requires a matching app-tagged confirmed Calendar performance, agreed quote and complete billing metadata. Tentative, cancelled, consultation, all-day, unrelated, untagged and already-invoiced records are skipped.
- Invoice delivery derives the billing-contact To and configured performer/operator BCC recipients from trusted records/config and enforces both against the final allowlist.
- The final provider boundary enforces the demo allowlist for Calendar attendees, email recipients, and calls.

## Operator entry points

Use the protected environment file outside the checkout. Do not place admin credentials in a URL.

```powershell
$configPath = 'C:\path\outside-repo\runtime.env'
node "--env-file=$configPath" --import tsx scripts/cli.ts --json health
pwsh -NoProfile -File scripts/stop-services.ps1 -ConfigPath $configPath -Restart
```

The following exact executable was used for the verified dry run:

```powershell
& 'C:/Users/trustcore-rdp/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File 'C:/Users/trustcore-rdp/Desktop/Justin Leblanc/scripts/upgrade-services.ps1' -ConfigPath 'C:/Users/trustcore-rdp/.config/jlm-demo/runtime.env'
```

The following exact command was applied successfully from a manually opened elevated PowerShell around 15:38 UTC. It is historical operator evidence, not a routine rerun step:

```powershell
& 'C:/Users/trustcore-rdp/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File 'C:/Users/trustcore-rdp/Desktop/Justin Leblanc/scripts/upgrade-services.ps1' -ConfigPath 'C:/Users/trustcore-rdp/.config/jlm-demo/runtime.env' -Apply
```

The upgrade script checks exact task ownership, backs up task XML and state privately, preserves prior running state, and rolls back a failed registration. It does not invoke UAC or reboot the host.

## Evidence

- [Live booking and Calendar](evidence/live-booking-acceptance.json)
- [Historical old-policy reply-driven invoice](evidence/live-invoice-acceptance.json)
- [Operator mail receipts](evidence/operator-mail-receipts.json)
- [Live voice call](evidence/live-voice-acceptance.json)
- [Published Central voice release](evidence/retell-central-release.json)
- [Voice tool repair](evidence/voice-tool-repair.json)
- [Startup reconciliation](evidence/startup-reconciliation.json)
- [Resume ledger reconciliation](evidence/resume-ledger-reconciliation.json)
- [Provider isolation](evidence/resource-isolation.json)
- [Central live health and chat](evidence/central-live-check.json)
- [Live booking recipient boundary](evidence/live-booking-boundary.json)
- [Live backup restore](evidence/live-backup-restore.json)
- [Acceptance matrix](evidence/acceptance-results.md)
- [Round-two implementation and browser evidence](evidence/round-two-2026-09-22.md)
- [Operations runbook](RUNBOOK.md)

The live evidence is sanitized: it contains no phone number, email address, credential, access token, resume token, or private message body.

## Next controlled work

1. Obtain owner confirmation of an exact public-performance-only Calendar, existing read access,
   and every controlled venue/city value. Do not create/share/edit a Calendar or broaden consent
   without separate authorization.
2. Enable and warm the exact feed privately; only after fresh/stale/empty/503 checks pass, deploy
   the frontend and perform the live privacy/accessibility route checks.
3. Complete a fresh live Calendar-to-inbox automatic invoice walkthrough; record it in
   [calendar invoice workflow evidence](evidence/calendar-invoice-workflow.json).
4. Separately authorize and verify recovery after an actual reboot or sign-out.
5. Preserve the zero-unresolved-effect state. Reconcile any uncertain provider outcome before retrying.
