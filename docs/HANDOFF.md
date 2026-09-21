# Demo handoff

Status date: 2026-09-21. The isolated demo is deployed and its web, chat, Calendar, email, and voice transport paths have real provider evidence. Calendar-driven automatic invoicing is implemented, CI-verified and loaded in the running services; a fresh live Calendar-to-inbox walkthrough remains pending. The delivered reply-driven $700 invoice is historical old-policy evidence only. Full voice booking, native hangup, and recovery after an actual reboot/sign-out remain unverified.

## Running system

- The exact public hostname serves deployment `840a4ccf` and returns HTTP 200. `/admin` shows **Run morning invoicing** and legacy reply controls with no-store/noindex protections; photo deployment `75996868` remains historical visual evidence.
- The local API, worker, and isolated tunnel are Running/S4U. Booking, chat, voice, morning and invoice gates are enabled.
- The corrected startup upgrade created its backup at 15:38:36 UTC and restarted the tasks at 15:38:40 UTC. At 15:39:09 UTC the API, worker, and tunnel tasks were running as S4U/Limited with exactly one `MSFT_TaskBootTrigger` each. All three health paths passed at 15:39:43 UTC, worker startup jobs succeeded, and the tunnel restored four connections.
- At about 17:45 UTC, local, direct-tunnel, and website-proxy health all returned HTTP 200 with KB `2026-09-21.4`, hash `63f6cc2c6ac6d9066a490513f50e9c3f48de9c4d6acbc2f17cde92e4880b9c96`, all capabilities enabled and the Houston number.
- The same protected voice agent and LLM identities are published and read-back verified at v4 with that KB, six unchanged custom tools, and native `end_call`.
- The first `morning:auto-invoice:v2` catch-up completed all seven dates from 2026-09-14 through 2026-09-20 at 17:44:28.820 UTC with zero eligible shows and no new effects; the existing sent invoice was preserved.
- The public Houston demo number is **(832) 501-3799**.
- [CI run 35633834649](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35633834649) passed for `58d1c0ce5cd7fc8b675b0a89443bfa82bcfd9b10` at 17:44:56 UTC: **103 tests in 19 files**, lint, typecheck, 20 Astro files with zero errors/warnings, and nine built pages.
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

| Area                             | Current evidence                                                                                                                                                         | Required next action                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Voice workflow                   | The fourth call proved the repaired inquiry, availability, follow-up, and lifecycle paths. Booking did not complete; native `end_call` is published on v4 but has not been exercised by phone. | Phone-test a completed booking and native hangup on v4. See [call-completion evidence](evidence/consultation-call-completion.json). |
| Unattended recovery              | S4U/Limited registration, exact boot triggers, and post-apply task execution are verified. No actual reboot or sign-out was authorized or performed.                    | Separately authorize and verify recovery after a real reboot or sign-out before claiming that behavior.                                                |
| Overlapping confirmed reschedule | Google free/busy does not expose event identity for an attendee copy. A proposed buffered interval overlapping the current confirmed event may be rejected as busy.      | Keep the fail-closed behavior. Do not subtract intervals that might contain an unrelated conflict; use a non-overlapping move or operator review.      |

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
- [Operations runbook](RUNBOOK.md)

The live evidence is sanitized: it contains no phone number, email address, credential, access token, resume token, or private message body.

## Next controlled work

1. Complete a fresh live Calendar-to-inbox automatic invoice walkthrough; record it in [calendar invoice workflow evidence](evidence/calendar-invoice-workflow.json).
2. Separately authorize and verify recovery after an actual reboot or sign-out.
3. Preserve the zero-unresolved-effect state. Reconcile any uncertain provider outcome before retrying.
4. Keep inquiry, availability, and follow-up marked passed as tool operations. Keep booking and native hangup pending until v3 phone evidence exists.
