# Demo handoff

Status date: 2026-09-21. The isolated demo is deployed and its web, chat, Calendar, email, billing, and voice transport paths have real provider evidence. Two acceptance gaps remain: neither of the two live voice calls invoked a backend assistant tool or created an inquiry, and unattended Windows startup has not been applied or reboot-tested. No additional voice call is requested.

## Running system

- The exact public hostname serves the latest site deployment and returns HTTP 200. Noindex, frame denial, CSP, and admin no-store protections remain enabled.
- The local API, worker, and isolated tunnel are running. Booking, chat, voice, morning-scan, and invoice gates are enabled.
- At 15:22:32 UTC the API, worker, and tunnel tasks were running with interactive logon and logon triggers. They require the Windows user to remain signed in; the corrected S4U/AtStartup upgrade has not been applied.
- The public website proxy and local API health checks use KB release `2026-09-21.2` with hash `d6dd327317ecf32b537cbc74df5ea7957e79429442383014d4ef40986d9b0ad6`.
- Published voice LLM release v2 uses that same KB and the existing isolated identity. Release verification normalizes only four known provider schema readback omissions; server-side schemas remain strict.
- The public Houston demo number is **(832) 501-3799**.
- Local verification at 15:13:37 UTC against `8a280a0` passed 87 tests in 17 files, lint, TypeScript, and the 19-file Astro check. After the separately authorized photo addition, [GitHub CI](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35619025879) passed for `c0aee21` at 15:28:40 UTC: 87 tests in 17 files, lint, TypeScript, 20 Astro files with zero diagnostics, and 9 pages. No local suite was repeated during this resume.
- Private configuration, OAuth material, recipient data, provider credentials, SQLite state, generated customer documents, and backups remain outside the repository.

## Live acceptance completed

- A real consultation and tentative performance hold were created on the isolated Calendar with the expected Central times and two invited roles. The private one-page brief was delivered and reconciled.
- A durable one-time repair updated the existing tentative performance event to transparent without changing its provider identity. The approved USD 700.00 quote then confirmed that same event as opaque with matching quote metadata.
- The confirmed performance was moved to a non-overlapping next-day interval and cancelled. Confirmation, reschedule, and cancellation retained the same event identity; every associated effect was accepted on its first attempt.
- The real Houston morning workflow sent one performer check. One authenticated, correlated YES reply created one immutable USD 700.00 invoice and one delivery effect.
- The client inbox contained exactly one matching invoice Message-ID. The operator BCC receipt and Sent copy were verified. Replaying the morning run, mailbox poll, reply handling, and sender produced no second invoice or send and left no queued work.
- Two real inbound voice calls passed caller admission and signed webhook verification. The 59,473 ms v1 call cost 11.86 cents and ended by user hangup after event questions, qualification prompts, and an honest unknown-song answer. The 18,473 ms v2 call cost 5.177 cents and correctly answered that consultations use Houston Central Time / `America/Chicago`.
- Provider isolation reconciliation found the previously existing Retell resources, DNS records, and Pages projects unchanged. Only the isolated demo resources were added.
- The current SQLite backup restored read-only with two shows and one invoice and passed integrity checking. The authenticated document preview, SMTP/IMAP diagnostic, public form/resume flow, grounded chat cases, and deployed accessibility/security checks remain valid.

## Remaining limits

| Area                             | Current evidence                                                                                                                                                         | Required next action                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Voice tool evidence              | Both calls connected successfully, and v2 answered the time-zone question correctly. Neither call invoked a tool or created an inquiry. The embedded KB can answer facts directly despite the required-search prompt. | Keep the limitation explicit. No additional call is requested; do not claim voice-side intake, availability, or booking tools are live-tested. |
| Unattended uptime                | At 15:22:32 UTC all three services were running with `LogonType=Interactive` and `MSFT_TaskLogonTrigger`.                                                               | From an already elevated shell, review and apply `scripts/upgrade-services.ps1`, then separately authorize and verify sign-out/reboot recovery.        |
| Overlapping confirmed reschedule | Google free/busy does not expose event identity for an attendee copy. A proposed buffered interval overlapping the current confirmed event may be rejected as busy.      | Keep the fail-closed behavior. Do not subtract intervals that might contain an unrelated conflict; use a non-overlapping move or operator review.      |

## Safety and recovery boundaries

- Calendar writes use deterministic identities and durable outbox effects. The accepted initial hold effect was never reset; its transparency correction used a new effect ID.
- Tentative performance invitations are transparent and become opaque on confirmation. The configured primary free/busy calendar remains queried, and unrelated conflicts still block confirmation.
- Public and assistant booking requests must pass the configured demo-recipient boundary before availability or hold creation, including idempotent replay. The Calendar adapter independently validates every final attendee before OAuth refresh or any provider request.
- A live negative boundary check rejected an unallowlisted public recipient and an invalid inquiry token with no holds or effects created.
- SMTP interruption becomes uncertain. Recovery reconciles the deterministic Message-ID against Sent and never blindly resends.
- Replies require aligned authentication, a known thread, and the per-check nonce. Subjects alone never authorize billing. Sent echoes, automatic replies, and bounce-like messages are ignored.
- Invoice snapshots are immutable, numbered from stored state, and derived only from the canonical customer and agreed quote.
- The final provider boundary enforces the demo allowlist for Calendar attendees, email recipients, and calls.

## Operator entry points

Use the protected environment file outside the checkout. Do not place admin credentials in a URL.

```powershell
$configPath = 'C:\path\outside-repo\runtime.env'
node "--env-file=$configPath" --import tsx scripts/cli.ts --json health
pwsh -NoProfile -File scripts/stop-services.ps1 -ConfigPath $configPath -Restart
```

Review the unattended upgrade without mutation:

```powershell
& 'C:/Users/trustcore-rdp/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File 'C:/Users/trustcore-rdp/Desktop/Justin Leblanc/scripts/upgrade-services.ps1' -ConfigPath 'C:/Users/trustcore-rdp/.config/jlm-demo/runtime.env'
```

Apply only from a manually opened elevated PowerShell after reviewing the preflight:

```powershell
& 'C:/Users/trustcore-rdp/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File 'C:/Users/trustcore-rdp/Desktop/Justin Leblanc/scripts/upgrade-services.ps1' -ConfigPath 'C:/Users/trustcore-rdp/.config/jlm-demo/runtime.env' -Apply
```

The upgrade script checks exact task ownership, backs up task XML and state privately, preserves prior running state, and rolls back a failed registration. It does not invoke UAC or reboot the host.

## Evidence

- [Live booking and Calendar](evidence/live-booking-acceptance.json)
- [Live reply-driven invoice](evidence/live-invoice-acceptance.json)
- [Operator mail receipts](evidence/operator-mail-receipts.json)
- [Live voice call](evidence/live-voice-acceptance.json)
- [Published Central voice release](evidence/retell-central-release.json)
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

1. Apply and validate unattended startup only through the elevated, reversible upgrade flow.
2. Preserve the zero-unresolved-effect state. Reconcile any uncertain provider outcome before retrying.
3. Keep the voice-tool limitation explicit unless a separately requested future call produces real tool and ledger evidence.
