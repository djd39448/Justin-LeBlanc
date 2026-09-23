# Demo Operations Runbook

Last runtime verification: 2026-09-22 at approximately 21:26 UTC. Public-form release and live
smoke: 2026-09-23.
This runbook covers the isolated Justin LeBlanc demo. It does not authorize production traffic, new
provider resources, or customer communication.

## Current service state

| Component       | State                                                                                              | Operator note                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Website         | Two-step inquiry-only planner live at `https://justinleblancmusic.50by50.dev`; exact-host HTTP 200 | Production deployment `73a78aec`; deployment `a3152e61` is the immediate rollback target                         |
| API             | Local, public tunnel, and website-proxy health returned HTTP 200                                   | Booking, chat, voice, and billing capabilities remain true; health exposes no voice-agent number                 |
| Worker          | Running as the S4U/Limited boot task `jlm-demo-worker`                                             | Startup logs show successful reconciliation, morning, IMAP, and billing-followup jobs                            |
| API task        | Running as the S4U/Limited boot task `jlm-demo-api`                                                | Local, direct-tunnel, and website-proxy health passed after the upgrade                                          |
| Tunnel task     | `jlm-demo-tunnel` running with four QUIC connections                                               | Protected token file is outside Git; route is `jlm-demo-api.50by50.dev` to `127.0.0.1:4318`                      |
| Windows startup | All three tasks running S4U/Limited with exact `MSFT_TaskBootTrigger` triggers                     | Registration and task execution passed; actual sign-out/reboot recovery remains untested                         |
| Email           | Automatic morning invoice path implemented and CI-verified; fresh live delivery pending            | Old-policy $700 invoice reached client/operator but does not prove the current path                              |
| Google Calendar | Dedicated calendar created; live booking lifecycle passed                                          | Consultation/hold, invitations, brief, confirmation, reschedule, and cancellation completed with no open effects |
| Public Shows    | Calendar disabled; exact fixed 503 returned through local, tunnel, and website paths               | Static frontend shows one verified public date; dedicated Calendar setup is deferred to the next QA pass         |
| Retell          | **(832) 501-3799** plus published version-4 agent/LLM                                              | KB `.4` read-back verified; same protected identities, six custom tools plus native `end_call`                   |
| Backup          | Seeded backup restored into a new directory and passed SQLite integrity checking                   | This proves the checked backup was readable and internally consistent; retain the source backup privately        |

Public inquiry, chat, scheduling, voice admission, and billing reach enabled backend gates. At the
latest verification, local, direct-tunnel, and website-proxy health returned HTTP 200 with
`ok: true`, KB `2026-09-21.4`, and all four capabilities enabled. The response omitted the
voice-agent phone field. The public frontend independently displays Justin's human business number,
**(832) 303-9116**. All three `/api/public-events` paths returned HTTP 503 with the fixed sanitized body
and approved no-store/retry headers. Actual recovery after sign-out or reboot remains untested.

## Public-form release boundary — inquiry-only frontend live, Calendar disabled

Verified implementation commit `c6abf12015bcb6ef179985a08919cd3319026915` is on both
`origin/main` and `origin/codex/justin-round-two`. It implements the approved
[public-form specification](PUBLIC_FORM_SIMPLIFICATION_SPEC.md) plus the non-conflicting round-two
requirements. It
removes public AI/chat/voice UI, package pricing, and the dormant voice-agent number while
preserving the running assistant services, and it publishes the human business number
**(832) 303-9116**. Do not disable, reprovision, or alter Retell/OpenAI, their KB/tools, provider
identities, manifests, or backend gates as part of this release.

The same round adds a separate read-only public-events path. It requires exact private
`PUBLIC_EVENTS_CALENDAR_ID`, `PUBLIC_EVENTS_TIMEZONE`, `PUBLIC_EVENTS_ID_SECRET`, and
`PUBLIC_EVENTS_ENABLED` configuration and must never point at `SHOW_CALENDAR_ID`, free/busy,
primary, family, or discovered Calendars. The code and privacy tests pass, and the reader is live
with `PUBLIC_EVENTS_ENABLED=false`. The Calendar embedded on Justin's existing public events page
was inspected and disqualified because it mixes private-event records and street-level locations.
A separate Public Shows Calendar/configuration is not yet available. Provider failure must fail
closed; never work around it by exposing an unfiltered Calendar.

The API/additive inquiry contract and Pages safety bridge remain deployed. Production Pages
deployment `73a78aec-f10a-4b95-b494-fd191ecccbd6` serves the inquiry-only frontend;
deployment `a3152e61-ed47-41a7-9595-ebd42e694245` is the immediate rollback target. Where I'm
Playing renders one manually curated public date—**Solo Sunday with Justin LeBlanc**, Sep 27, 2026,
5:00–8:00 PM Central, at The Blue Lion Brunchery & Pub in The Woodlands, TX—from a public Woodlands
Online source. The listing omits the street address, is filtered at build time, expires in the
browser after its end, and makes no Calendar request. Keep the Calendar reader disabled until the
next QA pass. A frontend rollback retains the additive schema and never resets SQLite.

This was a static Pages release. It did not require a runtime service restart or a Windows-checkout
sync; do not record either action unless separately performed and verified.

Live read-only smoke must verify the canonical page, `/plan-your-event/`, deployment URL, and
`/api/health` return 200; `/api/admin/state` returns 401; `/admin` returns 200 with no-store/noindex;
and `/api/public-events` retains its exact safe 503. The planner must have two steps, the exact
retained Step 2 labels including **Sound / equipment needs**, no retired or public scheduling
controls, no horizontal overflow, no console warning/error, and no `/api/time`, `/api/availability`,
`/api/bookings`, or scheduling marker in the deployed planner bundle. A read-only smoke does not
submit a live inquiry.

Before any deployment, stop if the runtime checkout is dirty, the expected feature tip differs, an
outbox/provider effect is unresolved, or another operator is changing the same checkout. Record the
current runtime commit, sanitized configuration manifest, service states, and current Pages
deployment privately:

```powershell
$configPath = 'C:\Users\trustcore-rdp\.config\jlm-demo\runtime.env'
$privateRoot = 'C:\Users\trustcore-rdp\.config\jlm-demo'

git fetch origin
git status --short
git rev-parse HEAD
git rev-parse origin/codex/justin-round-two
npx --yes wrangler@4.90.0 pages deployment list `
  --project-name 50by50-justinleblancmusic
node "--env-file=$configPath" --import tsx scripts/cli.ts --json health
node "--env-file=$configPath" --import tsx scripts/cli.ts --json backup `
  --directory (Join-Path $privateRoot 'backups')
```

The remote release SHA must contain verified implementation commit
`c6abf12015bcb6ef179985a08919cd3319026915` and match the final SHA supplied in the current handoff.
Capture the actual prior runtime commit and Pages deployment in the private change record; do not
substitute a remembered value. Set only
`PUBLIC_EVENTS_ENABLED=false` in the protected runtime configuration for the first restart. Leave
the Calendar ID and ID secret absent until the owner/access gate is satisfied; never print the
configuration file.

Install and verify the exact branch, then restart only the owned Justin services:

```powershell
$localBranch = git branch --list 'codex/justin-round-two'
if ($localBranch) {
  git switch codex/justin-round-two
} else {
  git switch --track origin/codex/justin-round-two
}
git pull --ff-only origin codex/justin-round-two
npm ci
npm run verify
pwsh -File scripts/stop-services.ps1 -ConfigPath $configPath -Restart
```

Recheck local, direct-tunnel, and exact-site health. With the reader disabled, all three
`/api/public-events` routes must return HTTP 503, `Cache-Control: no-store`, `Retry-After: 300`, and
exactly `{"error":"public_events_unavailable","message":"Current dates are temporarily unavailable."}`.
Existing booking, chat, voice, and billing capability states must remain unchanged. A 200 response,
provider diagnostics, or unfiltered fallback is a stop condition.

Only after the owner confirms the exact public-performance-only Calendar and existing read access,
configure its private ID, `America/Chicago`, and a backed-up random ID secret of at least 32 bytes.
Enable the reader, restart only the API as the existing helper requires, warm it once, and inspect
only the sanitized response. Every in-horizon venue/city display must be owner-reviewed; any street
address, residence, or ambiguous/private location blocks the entry. Verify fresh, stale, empty, and
fixed 503 behavior while the static fallback remains live.

When and only when the enabled endpoint passes, rebuild and deploy the frontend so the Calendar
feed can replace the static fallback:

```powershell
npm run build
$env:CLOUDFLARE_ACCOUNT_ID = 'b393d8ff72d57912119b872640d3511f'
npx --yes wrangler@4.90.0 pages deploy apps/web/dist `
  --project-name 50by50-justinleblancmusic --branch main --commit-dirty=true
```

For a schedule incident, set only `PUBLIC_EVENTS_ENABLED=false` and restart the owned API; do not
delete or rewrite Calendar data. For a frontend incident, restore the captured prior deployment in
the `50by50-justinleblancmusic` project. For a runtime regression, return the checkout to the exact
captured prior commit, run `npm ci`, and restart the owned services. In every rollback retain the
additive `text`/`budgetCents` schema, preserve SQLite, and reconcile uncertain effects before any
retry.

Dave completed the Administrator restart for KB `2026-09-21.4`. At about 17:45 UTC, local, direct-tunnel, and website-proxy health all returned HTTP 200 with hash `63f6cc2c6ac6d9066a490513f50e9c3f48de9c4d6acbc2f17cde92e4880b9c96`, all capabilities enabled and the Houston number; all three tasks were Running/S4U. Retell v4 publishes the same KB and native `end_call`, which remains untested by phone.

The first runtime `morning:auto-invoice:v2` catch-up completed seven durable dates from 2026-09-14 through 2026-09-20 at 17:44:28.820 UTC with zero eligible shows. At 17:45:39.067 UTC, state remained three shows, one sent historical invoice, 20 accepted effects and no unresolved/new effects. A fresh eligible Calendar-to-inbox walkthrough remains pending.

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

The dormant backend Houston voice-agent number **(832) 501-3799** and the same protected agent/LLM identities are provider-reconciled at version 4. The published voice release uses KB `2026-09-21.4`, hash `63f6cc2c6ac6d9066a490513f50e9c3f48de9c4d6acbc2f17cde92e4880b9c96`, six unchanged custom tools, and native `end_call`. The number is not rendered on the public website or returned by public health; the caller allowlist stays outside Git. The separate visible human business number is **(832) 303-9116**.

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

Supported operator actions include customer update, consultation completion, quote approval, show confirmation, cancellation or rescheduling, hold expiration, morning invoicing, outbox dispatch and reconciliation, invoice preparation, and synthetic demo seeding. Reply polling and billing follow-ups remain legacy-only actions for old-policy records. Use revisions and deterministic request keys from the current canonical records; never guess them.

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

With `force: false`, completed local dates are skipped without another Calendar read. Use `force: true` only from authenticated operator controls when a late-synced or newly seeded show must be found: it rescans all seven candidate dates, including dates already marked complete. Unique show/invoice constraints, daily run keys and deterministic outbox IDs must prevent a forced replay from creating or sending a duplicate invoice.

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

## Legacy reply polling safety

The reply poll and `billing-followups` action are retained only as manual tools to reconcile records created under the earlier reply-gated policy; the worker no longer schedules billing follow-ups. New confirmed performances do not create Did-you-play messages, unanswered reminders or reply-gated invoices. The admin labels these controls as legacy. Do not use a legacy reply to issue a second invoice for a show already handled by current morning invoicing.

Reply polling requires the email gate and a configured IMAP account. It snapshots the mailbox-open `UIDNEXT` high-water mark, then uses a bounded server-side IMAP `SEARCH` over later UIDs for the app's `In-Reply-To` Message-ID domain before fetching message bodies. Matching UIDs are processed in ascending bounded pages; arrivals above the opening high-water mark wait for the next poll. When a page has more matches, the cursor advances only to the last processed UID. When no matching messages remain, it advances to the stable high-water mark without downloading unrelated mailbox bodies. It retains the worker lock and UIDVALIDITY checks and ignores sent echoes, automatic responses, and bounce-like traffic.

A billing reply is accepted only when the message passes origin and authentication checks and binds to a known outbound request through `In-Reply-To` plus the expected nonce. The subject alone never authorizes a state change. Run a manual poll with:

```json
{
  "action": "replies-poll"
}
```

If UIDVALIDITY changes or a cursor looks inconsistent, stop the worker, preserve the database and sanitized logs, and investigate before advancing or resetting mailbox state. Do not widen the scan or replay messages by editing the cursor directly.

## Historical old-policy invoice acceptance

The isolated synthetic acceptance completed the earlier reply-gated provider path. A correlated authenticated `YES` created one immutable $700 demo invoice, dispatched it once, and reconciled the deterministic Message-ID against Sent. The exact client Inbox contained one matching message and Dave's Inbox contained the BCC copy. This remains useful delivery/idempotency evidence, but it does not prove the current Calendar-driven automatic invoice workflow.

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

`scripts/smoke-booking-billing.ts` now exercises the current morning-to-invoice path without a performer-reply stage. Every state-changing `--apply` stage requires `--worker-paused` after the owned worker and child process are stopped, including stages that do not directly execute providers, because the live worker could dispatch newly queued effects. Provider stages also require `--execute-providers`. The completed `rehearsal-v1` manifest remains read-only old-policy evidence and must never be reused to send its effect again. Current-policy acceptance belongs in [calendar invoice workflow evidence](evidence/calendar-invoice-workflow.json).

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

Every live booking stage requires `--apply --execute-providers --worker-paused` and `BOOKING_WRITES_ENABLED=true`. Both runners validate private recipient roles, reject unrelated pending/uncertain work, and preserve accepted effects on replay. Reconcile an uncertain send; do not replace a manifest, seed key or database to bypass a blocked stage. The completed booking and old-policy billing manifests are historical evidence; the fresh current-policy billing walkthrough remains pending.
