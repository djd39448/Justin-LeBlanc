# Demo handoff

Status date: 2026-09-23. The isolated baseline is deployed and its web, chat, private Calendar,
email, and voice transport paths have real provider evidence. The two-step, inquiry-only public
planner is live from commit `c6abf12015bcb6ef179985a08919cd3319026915`, on both `origin/main` and
`origin/codex/justin-round-two`. Calendar-driven automatic invoicing is
implemented, CI-verified and loaded in the running services; a fresh live Calendar-to-inbox
walkthrough remains pending. The delivered reply-driven $700 invoice is historical old-policy
evidence only. Full voice booking, native hangup, and recovery after an actual reboot/sign-out
remain unverified.

## Public-form simplification — live

Production deployment `73a78aec-f10a-4b95-b494-fd191ecccbd6` serves the two-step planner;
`a3152e61-ed47-41a7-9595-ebd42e694245` is the immediate rollback target. Step 2 uses
**Location of the event** and the exact retained planning labels, including
**Sound / equipment needs**. Retired step-three and all public consultation/scheduling controls are
absent. The deployed planner bundle contains no `/api/time`, `/api/availability`, `/api/bookings`,
or scheduling markers; protected backend workflows remain available outside the public browser.

The final gate passed 146 unit/integration tests in 24 files, lint/typecheck, 21 clean Astro files,
nine pages, 34 Playwright passes with 26 intentional skips across five viewports, a zero-finding
15-file public-output audit, and a clean secret scan. Feature CI
[35905466911](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905466911) and main CI
[35905771617](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905771617) passed. Live
read-only smoke passed without submitting an inquiry. See
[the dated public-form evidence](evidence/public-form-simplification-2026-09-23.md).

## Historical round-two implementation — superseded public form

Dave's 2026-09-22 direction and follow-up correction are implemented in verified frontend revision
`9ca79d9a5afeb38c8740f768b9bae73319f1756e`. The release:

- renders the planner in the opening homepage conversion experience with no preliminary CTA/reveal;
- keeps the primary navigation pinned throughout scrolling;
- temporarily renders one manually curated, publicly sourced performance date without making a
  Calendar request; the dedicated Public Shows Calendar is deferred to the next QA pass;
- accepts an optional visitor-entered numeric USD budget while preserving old inquiry records; and
- removes every chatbot/voice UI element, package price, dormant voice-agent number, and assistant
  reference from public output while leaving the Retell/OpenAI resources, KB/tools, routes,
  configuration, and backend tests intact; and
- publishes Justin's human business phone, **(832) 303-9116**, as the plain booking contact.

The temporary listing is **Solo Sunday with Justin LeBlanc**, Sep 27, 2026, 5:00–8:00 PM Central,
at The Blue Lion Brunchery & Pub in The Woodlands, TX. It links to the public Woodlands Online
source, omits the street address, is filtered at build time, and expires client-side after its end.
The exact-source adapter remains disabled, and the exact fixed `/api/public-events` 503 remains
live. Local verification passed 146 unit/integration tests in 24 files, lint/typecheck, 21 Astro files with zero
diagnostics, and nine pages. Playwright passed 32 cases with 23 intentional viewport skips across
five viewports; the public-output audit and secret scan found nothing. Responsive screenshots and
command-level evidence are in
[the dated round-two record](evidence/round-two-2026-09-22.md).

The existing Windows runtime remains on its previously verified backend release with
`PUBLIC_EVENTS_ENABLED=false`; this static Pages release did not require a runtime restart or a
Windows-checkout sync. All three health paths retain their prior passing evidence, and all three
public-events paths retain the exact fixed sanitized 503. Cloudflare Pages deployment
`a3152e61-ed47-41a7-9595-ebd42e694245` is retained as the immediate frontend rollback target. No
Calendar/event, OAuth, Retell, mail, billing, or DNS resource was changed.

## Running system

- The exact public hostname serves deployment `73a78aec-f10a-4b95-b494-fd191ecccbd6` and returns HTTP 200. Deployment `a3152e61-ed47-41a7-9595-ebd42e694245` is the immediate rollback point.
- The local API, worker, and isolated tunnel are Running/S4U. Booking, chat, voice, morning and invoice gates are enabled.
- The previously verified runtime checkout was clean at `e4e082e5d85d56f3301ce7652180b40c78f24956`. Local, direct-tunnel and exact-site health returned HTTP 200 with KB `2026-09-21.4`, all four capabilities enabled and no `demoVoicePhoneNumber`; the outbox had 20 accepted and zero unresolved effects. The static Pages correction did not restart or sync that runtime.
- Local, direct-tunnel and exact-site `/api/public-events` return HTTP 503, `Cache-Control: no-store`, `Retry-After: 300`, and exactly `{"error":"public_events_unavailable","message":"Current dates are temporarily unavailable."}`.
- The corrected startup upgrade created its backup at 15:38:36 UTC and restarted the tasks at 15:38:40 UTC. At 15:39:09 UTC the API, worker, and tunnel tasks were running as S4U/Limited with exactly one `MSFT_TaskBootTrigger` each. All three health paths passed at 15:39:43 UTC, worker startup jobs succeeded, and the tunnel restored four connections.
- At about 17:45 UTC, local, direct-tunnel, and website-proxy health all returned HTTP 200 with KB `2026-09-21.4`, hash `63f6cc2c6ac6d9066a490513f50e9c3f48de9c4d6acbc2f17cde92e4880b9c96`, all capabilities enabled and the Houston number.
- The same protected voice agent and LLM identities are published and read-back verified at v4 with that KB, six unchanged custom tools, and native `end_call`.
- The first `morning:auto-invoice:v2` catch-up completed all seven dates from 2026-09-14 through 2026-09-20 at 17:44:28.820 UTC with zero eligible shows and no new effects; the existing sent invoice was preserved.
- The human business number shown publicly is **(832) 303-9116**. The dormant backend voice-agent number remains **(832) 501-3799** and is absent from the public website.
- [Main CI run 35905771617](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905771617) passed for `c6abf12015bcb6ef179985a08919cd3319026915` after [feature CI run 35905466911](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905466911) passed.
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
| Round-two runtime                | The previously verified runtime remains disabled-first; health, fixed 503, service state, unresolved-effect, backup and rollback gates passed.                                                 | Keep the additive API schema and `PUBLIC_EVENTS_ENABLED=false` until the dedicated public source is approved.                                     |
| Public Shows Calendar            | No separate owner-confirmed public-only Calendar/access proof exists. The frontend uses one manually curated public listing and does not request Calendar data.                                | Configure and review a dedicated calendar and controlled venue/city entries during the next QA pass.                                              |
| Public frontend                  | Production deployment `73a78aec` serves the two-step inquiry-only planner; canonical and plan route HTTP 200 plus admin no-store/noindex passed.                                               | Keep deployment `a3152e61` as the immediate rollback target; replace the temporary listing only after the dedicated feed passes QA.               |

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
- [Public-form simplification release](evidence/public-form-simplification-2026-09-23.md)
- [Operations runbook](RUNBOOK.md)

The live evidence is sanitized: it contains no phone number, email address, credential, access token, resume token, or private message body.

## Next controlled work

1. During the next QA pass, configure and owner-review an exact public-performance-only Calendar,
   existing read access, and every controlled venue/city value. Do not broaden consent without
   separate authorization.
2. Replace the temporary manually curated listing only after the dedicated feed passes
   fresh/stale/empty/503 and privacy checks.
3. Complete a fresh live Calendar-to-inbox automatic invoice walkthrough; record it in
   [calendar invoice workflow evidence](evidence/calendar-invoice-workflow.json).
4. Separately authorize and verify recovery after an actual reboot or sign-out.
5. Preserve the zero-unresolved-effect state. Reconcile any uncertain provider outcome before retrying.
