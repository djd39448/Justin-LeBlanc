# Demo Operations Runbook

Last verified: 2026-09-21 at 15:39:43 UTC. This runbook covers the isolated Justin LeBlanc demo. It does not authorize production traffic, new provider resources, or customer communication.

## Current service state

| Component       | State                                                                               | Operator note                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Website         | Live at `https://justinleblancmusic.50by50.dev`; exact-host check returned HTTP 200 | Deployment `75996868`; supplied-photo desktop/mobile QA passed; earlier Central-time and voice-CTA checks retained                                  |
| API             | Local, public tunnel, and website-proxy health returned HTTP 200                    | Booking, chat, voice, and billing capabilities all returned true                                                  |
| Worker          | Running as the S4U/Limited boot task `jlm-demo-worker`                              | Startup logs show successful reconciliation, morning, IMAP, and billing-followup jobs                             |
| API task        | Running as the S4U/Limited boot task `jlm-demo-api`                                 | Local, direct-tunnel, and website-proxy health passed after the upgrade                                            |
| Tunnel task     | `jlm-demo-tunnel` running with four QUIC connections                                | Protected token file is outside Git; route is `jlm-demo-api.50by50.dev` to `127.0.0.1:4318`                       |
| Windows startup | All three tasks running S4U/Limited with exact `MSFT_TaskBootTrigger` triggers      | Registration and task execution passed; actual sign-out/reboot recovery remains untested                           |
| Email           | Reply-driven invoice delivery verified                                               | Authenticated `YES`, immutable invoice, Sent copy, exact client Inbox receipt, and Dave BCC receipt passed         |
| Google Calendar | Dedicated calendar created; live booking lifecycle passed                            | Consultation/hold, invitations, brief, confirmation, reschedule, and cancellation completed with no open effects  |
| Retell          | **(832) 501-3799** plus published version-3 agent/LLM                                | Fourth call proved repaired inquiry, availability, follow-up, and lifecycle tool handling                         |
| Backup          | Seeded backup restored into a new directory and passed SQLite integrity checking    | This proves the checked backup was readable and internally consistent; retain the source backup privately         |

Public inquiry, chat, scheduling, voice admission, and billing reach enabled backend gates. At 15:39:43 UTC local, direct-tunnel, and website-proxy health returned HTTP 200 with `ok: true`, the expected KB identity, and all four capabilities enabled. Actual recovery after sign-out or reboot remains untested.

The 16:01 UTC Administrator restart loaded the body/time repair. A fourth actual call then proved inquiry, availability, follow-up, and lifecycle handling through the repaired signed boundary. Retell v3 now publishes KB `2026-09-21.3` and native `end_call`; the API/chat process still reports `2026-09-21.2`, so Dave must complete another Administrator restart before testing the no-notice policy or native hangup. See [call-completion evidence](evidence/consultation-call-completion.json).

## Protected configuration

Keep the runtime environment file, SQLite database, generated documents, OAuth material, tunnel token, logs, backups, exports, and operator action files outside the repository. This document uses placeholders deliberately.

```powershell
$configPath = 'C:\path\outside-repo\runtime.env'
$privateRoot = 'C:\path\outside-repo\jlm-demo'
```

Do not print the environment file, pass secrets in URLs, paste tokens into JSON action files, or commit provider responses that contain addresses or identifiers.

Install the pinned dependencies and run the repository checks from the repository root:

```powershell
npm ci
npm run verify
```

## Start and inspect the local services

For an attended development session:

```powershell
node "--env-file=$configPath" --import tsx apps/api/server.ts
node "--env-file=$configPath" --import tsx scripts/worker.ts
```

For the installed S4U boot tasks:

```powershell
Get-ScheduledTask -TaskName 'jlm-demo-api','jlm-demo-worker','jlm-demo-tunnel' |
  Select-Object TaskName, State

Start-ScheduledTask -TaskName 'jlm-demo-api'
Start-ScheduledTask -TaskName 'jlm-demo-worker'
Start-ScheduledTask -TaskName 'jlm-demo-tunnel'
```

The task installer is intended for a clean or deliberately repaired host and refuses to overwrite tasks it does not own:

```powershell
pwsh -File scripts/install-services.ps1 -ConfigPath $configPath -InteractiveOnly
```

The named tunnel has been installed from the protected token file. Do not recreate it, move its token to a command line, or change any unrelated tunnel or DNS record. A previous direct S4U registration attempt returned `AccessDenied`; the corrected upgrade path passed ownership checks and was applied around 15:38 UTC.

`scripts/upgrade-services.ps1` is the reversible path used to convert the existing owned tasks to S4U startup. The apply created a private manifest and three valid XML backups preserving the former interactive-logon tasks, then verified the new principals/triggers and restarted the previously running tasks. The commands below are retained as operator history; do not rerun them routinely. The script does not invoke UAC and rolls back on failure:

```powershell
& 'C:/Users/trustcore-rdp/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File 'C:/Users/trustcore-rdp/Desktop/Justin Leblanc/scripts/upgrade-services.ps1' -ConfigPath 'C:/Users/trustcore-rdp/.config/jlm-demo/runtime.env'
# Verified apply command, already completed from an elevated session:
& 'C:/Users/trustcore-rdp/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File 'C:/Users/trustcore-rdp/Desktop/Justin Leblanc/scripts/upgrade-services.ps1' -ConfigPath 'C:/Users/trustcore-rdp/.config/jlm-demo/runtime.env' -Apply
```

Check API health and recent private logs without exposing configuration:

```powershell
Invoke-RestMethod 'http://127.0.0.1:4318/api/health'
Invoke-RestMethod 'https://justinleblancmusic.50by50.dev/api/health'
Get-Content (Join-Path $privateRoot 'logs\api.log') -Tail 100
Get-Content (Join-Path $privateRoot 'logs\worker.log') -Tail 100
```

The API binds to loopback. Check both URLs: local health alone does not prove the public tunnel, and public health does not prove Google, Retell, or invoice workflows.

Local, direct-tunnel, and exact website-proxy health returned HTTP 200 with demo mode enabled, KB `2026-09-21.2` / `d6dd327317ecf32b537cbc74df5ea7957e79429442383014d4ef40986d9b0ad6`, and capabilities `chat: true`, `booking: true`, `voice: true`, and `billing: true`. A real Central-time chat answer correctly identified `America/Chicago`, daylight-saving behavior, and the 10:00–16:00 consultation window. Public smoke also proved HTTP 401 for unauthenticated admin and synthetic inquiry intake/resume. A seeded authenticated event-brief PDF preview returned HTTP 200, `application/pdf`, `Cache-Control: no-store`, and 66,125 bytes.

## Stop or restart installed services

Use the repository helper with the exact protected environment path:

```powershell
pwsh -File scripts/stop-services.ps1 -ConfigPath $configPath
pwsh -File scripts/stop-services.ps1 -ConfigPath $configPath -Restart
```

The helper stops only `jlm-demo-api`, `jlm-demo-worker`, and `jlm-demo-tunnel` tasks that exist, then finds and stops child Node or cloudflared processes tied to the exact resolved config path. `-Restart` starts the tasks that existed when the command began. Use this helper instead of `Stop-ScheduledTask` alone: an observed Windows task stop left its child Node process alive until explicit reconciliation.

The final operational check ran the helper with `-Restart`, confirmed both owned API and worker tasks returned to `Running`, and confirmed local health HTTP 200 with the same knowledge-base identity and capability gates.

## Dedicated Google Calendar behavior

The isolated refresh-grant identity, both limited scopes, and the dedicated calendar are verified. Live acceptance created a consultation plus tentative performance hold, delivered attendee invitations and the operator PDF brief, confirmed the same provider event against an agreed quote, rescheduled it without changing provider identity, and cancelled it. No outbox effect remained unresolved.

Tentative performance holds are deliberately `transparent`: the canonical booking transaction blocks conflicts, while the attendee's copy does not make the same hold collide with itself through free/busy. Operator confirmation updates the same provider event to `confirmed` and `opaque`. A later reschedule that overlaps the confirmed attendee copy can still reject safely because Google free/busy does not expose enough event identity to subtract that interval without risking removal of an unrelated conflict. Treat that rejection as fail-closed; choose a non-overlapping time or investigate the exact provider event as an authenticated operator. Never substitute existing TrustCore calendars or weaken the conflict check.

## Voice demo acceptance state

The isolated Houston number **(832) 501-3799** and the same protected agent/LLM identities are provider-reconciled at version 3. The published voice release uses Central Time KB `2026-09-21.3`, hash `2e53a286acbc5d1793d01a9c25c9429d033e0521cd8f9279fe3d63c5c675eb1e`, six unchanged backend tools, and native `end_call`. The public website reads the number from gated same-origin health; the caller allowlist stays outside Git.

The first two calls remain historical no-tool evidence. The v1 call lasted 59,473 ms and cost 11.86 cents; the first v2 call lasted 18,473 ms, cost 5.177 cents, and correctly answered Houston Central Time / `America/Chicago`. The third v2 call lasted 196,946 ms and cost 34.191 cents; inquiry creation passed, while its availability/follow-up attempts and terminal webhooks exposed the former HTTP 413 boundary.

The fourth v2 call (`ee1ddd70e7624259`) lasted 210,264 ms, cost 36.473 cents, and ended by `user_hangup`. Read-only backend-ledger inspection verified `upsert_inquiry`, four `get_availability` results, persisted `request_human_followup`, and started/ended/analyzed events. Each availability result returned `performanceAvailable=true` with the then-active 24-hour consultation rule as its sole reason. This proves the repaired phone tool path for inquiry, availability, follow-up, and lifecycle events. Booking did not complete. Native `end_call` was added in v3 after this call and remains untested.

Use `scripts/retell-refresh.ts` for prompt, KB, and tool-definition releases on the same protected Retell agent and LLM identities. Its default mode is a provider-read-only plan; `--execute` creates and publishes the next version only after exact identity and plan-fingerprint checks pass. Keep using the same release manifest if the outcome is uncertain so the script can reconcile the staged release. Do not use `scripts/retell-provision.ts` to create a replacement identity for a routine release; that command is for initial provisioning and reconciliation of the protected identity.

```powershell
$retellProvisionManifest = Join-Path $privateRoot 'retell-provision.json'
$retellReleaseManifest = Join-Path $privateRoot 'retell-release-<kb-version>.json'

# Read-only plan and identity check.
node --import tsx scripts/retell-refresh.ts `
  --env $configPath `
  --provision-manifest $retellProvisionManifest `
  --release-manifest $retellReleaseManifest

# Run only after reviewing the dry-run plan.
node --import tsx scripts/retell-refresh.ts `
  --env $configPath `
  --provision-manifest $retellProvisionManifest `
  --release-manifest $retellReleaseManifest `
  --execute
```

## Operator CLI

All commands support JSON output. Run them from the repository root:

```powershell
node "--env-file=$configPath" --import tsx scripts/cli.ts --json health
```

State-changing actions are read from a private JSON file so tokens and business data do not enter shell history or the repository:

```powershell
$actionFile = Join-Path $privateRoot 'operator-action.json'
node "--env-file=$configPath" --import tsx scripts/cli.ts --json action --file $actionFile
Remove-Item -LiteralPath $actionFile
```

Supported operator actions include customer update, consultation completion, quote approval, show confirmation, cancellation or rescheduling, hold expiration, morning billing scan, reply polling, outbox dispatch and reconciliation, invoice preparation, and synthetic demo seeding. Use revisions and deterministic request keys from the current canonical records; never guess them.

A synthetic seed action is safe only in the isolated demo database:

```json
{
  "action": "demo-seed",
  "key": "operator-chosen-demo-key"
}
```

The morning scan can be evaluated for an explicit Houston-local date when the gate is enabled:

```json
{
  "action": "morning",
  "asOfLocalDate": "2026-09-21",
  "force": false
}
```

With `force: false`, completed local dates are skipped without another Calendar read. Use `force: true` only from authenticated operator controls when a late-synced or newly seeded show must be found: it rescans all seven candidate dates, including dates already marked complete. Unique performance checks and deterministic outbox IDs prevent a forced replay from queuing the same request twice.

## Outbox recovery and uncertain email

Email delivery is deliberately fail-closed. A process interruption after SMTP acceptance can leave an effect uncertain. Do not reset it to pending and do not send a replacement message by hand.

1. Preserve the database and the exact outbox effect ID.
2. Run startup recovery. It changes interrupted `sending` work to a state that requires reconciliation; it does not blindly resend.

   ```powershell
   node "--env-file=$configPath" --import tsx scripts/cli.ts --json recover
   ```

3. Create a private operator action containing the exact effect ID:

   ```json
   {
     "action": "outbox-reconcile",
     "id": "exact-effect-id-from-private-state"
   }
   ```

4. Run the action through the CLI. The adapter searches the authenticated Sent mailbox for the deterministic Message-ID. A confirmed sent copy marks the existing effect sent. An absence or indeterminate provider result remains uncertain and requires investigation; it does not make the message retryable.
5. Dispatch other pending work only after reconciliation. The uncertain effect remains excluded:

   ```json
   {
     "action": "outbox-dispatch"
   }
   ```

Never infer delivery from a timeout, SMTP connection close, subject line, inbox appearance, or a provider UI preview. Never assign a new Message-ID to retry an uncertain logical message.

A separate manual retry is allowed only for an effect already classified `failed`, which represents a definitive pre-provider failure. The retry path rechecks the active kill switch and parses the stored payload before returning that same effect to pending, and writes an audit event. It rejects `uncertain`, `sending`, `accepted`, and already-pending effects. Use this private action with the exact effect ID; never change the outbox row directly:

```json
{
  "action": "outbox-retry-failed",
  "id": "exact-failed-effect-id-from-private-state"
}
```

The final dispatcher enforces `INVOICE_SEND_ENABLED` and the exact demo recipient allowlist. Turning a switch on is not permission to add recipients.

## Reply polling safety

The worker also invokes the authenticated `billing-followups` action every two minutes after its reply poll. Operators can use **Review unanswered checks** or a private action file containing `{"action":"billing-followups"}`. It requires `INVOICE_SEND_ENABLED`. Initial unanswered performance checks receive one queued reminder after 24 hours from definitive original SMTP acceptance or Sent reconciliation, then enter the operator review queue after 72 hours without a reply. Pending or uncertain original sends do not start the clock. Amendment approval threads remain visible for operator review and do not use this initial-check reminder policy.

Reply polling requires the email gate and a configured IMAP account. It snapshots the mailbox-open `UIDNEXT` high-water mark, then uses a bounded server-side IMAP `SEARCH` over later UIDs for the app's `In-Reply-To` Message-ID domain before fetching message bodies. Matching UIDs are processed in ascending bounded pages; arrivals above the opening high-water mark wait for the next poll. When a page has more matches, the cursor advances only to the last processed UID. When no matching messages remain, it advances to the stable high-water mark without downloading unrelated mailbox bodies. It retains the worker lock and UIDVALIDITY checks and ignores sent echoes, automatic responses, and bounce-like traffic.

A billing reply is accepted only when the message passes origin and authentication checks and binds to a known outbound request through `In-Reply-To` plus the expected nonce. The subject alone never authorizes a state change. Run a manual poll with:

```json
{
  "action": "replies-poll"
}
```

If UIDVALIDITY changes or a cursor looks inconsistent, stop the worker, preserve the database and sanitized logs, and investigate before advancing or resetting mailbox state. Do not widen the scan or replay messages by editing the cursor directly.

## Live invoice acceptance

The isolated synthetic acceptance completed the real provider path. A correlated authenticated `YES` reply advanced the approved rehearsal show, created one immutable $700 demo invoice, dispatched it once, and reconciled the deterministic Message-ID against Sent. The exact client Inbox contained one matching message and Dave's Inbox contained the BCC copy; the PDF attachment was present in both checked delivery evidence. The invoice remained clearly labeled as a demo and not a payment request.

This proves the bounded synthetic workflow, not real customer billing or payment collection. Keep addresses, tokens, message bodies, private document contents, and provider IDs out of Git. For another authorized acceptance, use a new approved synthetic show and reconcile existing effects before dispatch; do not replay this invoice or replace its Message-ID.

## Back up, restore-check, and export

Create backup and export directories outside the repository. Each backup invocation creates a new timestamped `snapshot-*` directory containing `jlm-demo.sqlite` and a copied `documents` directory, so files from separate backups cannot be merged:

```powershell
$backupDir = Join-Path $privateRoot 'backups'
$exportDir = Join-Path $privateRoot 'exports'

node "--env-file=$configPath" --import tsx scripts/cli.ts --json backup --directory $backupDir
node "--env-file=$configPath" --import tsx scripts/cli.ts --json export --directory $exportDir
```

Restore checking is intentionally non-destructive. Give it a new empty directory; it copies the selected backup, opens the copy read-only, runs `PRAGMA integrity_check`, and reports table counts.

```powershell
$snapshotDir = Join-Path $backupDir '<snapshot-directory>'
$restoreDir = Join-Path $privateRoot 'restore-check-2026-09-21'
node "--env-file=$configPath" --import tsx scripts/cli.ts --json restore-check `
  --file (Join-Path $snapshotDir 'jlm-demo.sqlite') `
  --directory $restoreDir
```

An actual seeded backup passed this procedure on 2026-09-21 with SQLite integrity `ok` and readable seeded records. This check did not replace or mutate the active database.

## Kill switches and incident containment

The protected runtime configuration contains independent gates for booking writes, invoice email, the morning scan, AI, and voice. For an incident:

1. Disable the affected gate in the protected environment file.
2. Stop and restart the relevant scheduled task so the process reloads configuration.
3. Preserve the SQLite database, private logs, generated document snapshot, Message-ID, outbox effect ID, and mailbox cursor state.
4. Use the recovery and reconciliation flow above. Do not delete ledger rows or manually rewrite an uncertain effect.
5. Re-enable a gate only after the canonical state and provider evidence agree.

Provider credentials, Google consent, the tunnel token, DNS, Retell provisioning, and startup-task permissions remain user-controlled actions.

## Restartable live acceptance runners

These runners completed the checked synthetic Calendar and billing acceptance. Keep their manifests beside the protected environment file. Stop the owned worker and its child process before any new live stage; `--worker-paused` is an operator assertion, not a process-control command. Keep the API and tunnel running. Resume the worker after reconciling the run.

```powershell
# Briefly stop only demo services, including their owned child processes.
pwsh -File scripts/stop-services.ps1 -ConfigPath $configPath
Start-ScheduledTask -TaskName 'jlm-demo-api'
Start-ScheduledTask -TaskName 'jlm-demo-tunnel'
# After the live run is reconciled:
# Start-ScheduledTask -TaskName 'jlm-demo-worker'
```

`scripts/smoke-booking-billing.ts` completed the `rehearsal-v1` path through the actual owner reply and invoice reconciliation. Its stages remain available for read-only inspection and a separately authorized future synthetic record. Live stages require `--apply --execute-providers`, the corresponding private feature gates, and working providers. Never reuse the completed manifest to send the same effect again.

```powershell
$billingManifest = Join-Path $privateRoot 'booking-billing-smoke.json'
node --no-warnings --import tsx scripts/smoke-booking-billing.ts `
  --env $configPath --manifest $billingManifest --stage inspect
```

`scripts/smoke-live-booking.ts` completed the future consultation/hold lifecycle: transparent tentative hold, both invitations, client notice, operator PDF brief, agreed-quote confirmation, non-overlapping reschedule, and cancellation. The stage inputs remain ISO instants with `--timezone America/Chicago`; any future authorized run must use a real available future consultation within the 10:00–16:00 Central Time weekday window. See `--help` for date options and keep the confirmed-overlap limitation above in mind.

```powershell
$bookingManifest = Join-Path $privateRoot 'live-booking-smoke.json'
node --no-warnings --import tsx scripts/smoke-live-booking.ts `
  --env $configPath --manifest $bookingManifest --stage inspect
```

Every live booking stage requires `--apply --execute-providers --worker-paused` and `BOOKING_WRITES_ENABLED=true`. Both runners validate private recipient roles, reject unrelated pending/uncertain work, and preserve accepted effects on replay. Reconcile an uncertain send; do not replace the manifest, seed key, or database to bypass a blocked stage. The current acceptance manifests are completed evidence, not permission to rerun provider writes.
