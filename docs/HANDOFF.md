# Demo handoff

## Round-three status — live

The current round-three implementation is live from main/runtime SHA
`5674a2fe63a384ff833db956d18a0db81d43f669`, with Pages deployment
`47db4b6d-660c-4ced-97c1-e87e390db778`. The two-step inquiry-only planner, protected
notification/follow-up support, safe receipt, and canonical smoke are verified. SMTP/provider
acceptance is recorded, not inbox receipt. Justin's mailbox and ChatGPT task remain pending
account-side authorization and observed testing.
The account-side Gmail task instructions are in
[CHATGPT_INQUIRY_NOTIFICATION_SETUP.md](CHATGPT_INQUIRY_NOTIFICATION_SETUP.md).
Runtime rollback is `8f765d8aa92e10df4baf6c6ce13f6acbfff2e2a1`; immediate frontend rollback is
`73a78aec-f10a-4b95-b494-fd191ecccbd6`.

## Historical round-two public-form status

Status date: 2026-09-23. The isolated baseline was deployed with real provider evidence for its web,
chat, private Calendar, email, and voice transport paths. The two-step, inquiry-only public planner
was released from commit `c6abf12015bcb6ef179985a08919cd3319026915`, on both `origin/main` and
`origin/codex/justin-round-two`. The delivered reply-driven $700 invoice was historical old-policy
evidence only.

### Round-two public-form simplification

Production deployment `73a78aec-f10a-4b95-b494-fd191ecccbd6` served the two-step planner;
`a3152e61-ed47-41a7-9595-ebd42e694245` was its immediate rollback target. Step 2 uses
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
`a3152e61-ed47-41a7-9595-ebd42e694245` was retained as the immediate frontend rollback target for
that historical release and is now only an older fallback. No
Calendar/event, OAuth, Retell, mail, billing, or DNS resource was changed.

## Running system

- The exact public hostname serves deployment `47db4b6d-660c-4ced-97c1-e87e390db778` and returns HTTP 200. Deployment `73a78aec-f10a-4b95-b494-fd191ecccbd6` is the immediate rollback point.
- The local API, worker, and isolated tunnel are Running/S4U. Booking, chat, voice, billing, and inquiry-notification capabilities are enabled.
- The runtime checkout is clean at `5674a2fe63a384ff833db956d18a0db81d43f669`. Local, direct-tunnel, and exact-site health returned HTTP 200 with KB `2026-09-21.4`, all five capabilities enabled, and no public voice-agent phone field. After the one authorized synthetic inquiry, the outbox had 21 accepted effects, zero unresolved effects, and zero leases.
- Local, direct-tunnel and exact-site `/api/public-events` return HTTP 503, `Cache-Control: no-store`, `Retry-After: 300`, and exactly `{"error":"public_events_unavailable","message":"Current dates are temporarily unavailable."}`.
- A fresh pre-release backup and non-destructive restore check passed SQLite integrity checking. The API, worker, and tunnel tasks are running S4U/Limited with exactly one boot trigger each; actual reboot/sign-out recovery remains untested.
- Local, direct-tunnel, and website-proxy health all returned HTTP 200 with KB `2026-09-21.4`, hash `63f6cc2c6ac6d9066a490513f50e9c3f48de9c4d6acbc2f17cde92e4880b9c96`, and all five capabilities enabled.
- The same protected voice agent and LLM identities are published and read-back verified at v4 with that KB, six unchanged custom tools, and native `end_call`.
- The first `morning:auto-invoice:v2` catch-up completed all seven dates from 2026-09-14 through 2026-09-20 at 17:44:28.820 UTC with zero eligible shows and no new effects; the existing sent invoice was preserved.
- The human business number shown publicly is **(832) 303-9116**. The dormant backend voice-agent number remains **(832) 501-3799** and is absent from the public website.
- [Main CI run 36083745550](https://github.com/djd39448/Justin-LeBlanc/actions/runs/36083745550) passed for `5674a2fe63a384ff833db956d18a0db81d43f669` after [feature CI run 36083511550](https://github.com/djd39448/Justin-LeBlanc/actions/runs/36083511550) passed.
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
| Public Shows runtime             | Round-three runtime is live while the separate public-events reader remains disabled-first; health, fixed 503, service state, outbox, backup, and rollback gates passed.                       | Keep the additive API schema and `PUBLIC_EVENTS_ENABLED=false` until the dedicated public source is approved.                                     |
| Public Shows Calendar            | No separate owner-confirmed public-only Calendar/access proof exists. The frontend uses one manually curated public listing and does not request Calendar data.                                | Configure and review a dedicated calendar and controlled venue/city entries during the next QA pass.                                              |
| Public frontend                  | Production deployment `47db4b6d` serves the two-step inquiry-only planner; canonical and plan route HTTP 200 plus admin no-store/noindex passed.                                               | Keep deployment `73a78aec` as the immediate rollback target; replace the temporary listing only after the dedicated feed passes QA.               |

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
