# Demo Operations Runbook

Last verified: 2026-09-21 at 12:37:27 UTC. This runbook covers the isolated Justin LeBlanc demo. It does not authorize production traffic, new provider resources, or customer communication.

## Current service state

| Component       | State                                                                               | Operator note                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Website         | Live at `https://justinleblancmusic.50by50.dev`; exact-host check returned HTTP 200 | Cloudflare Pages deployment `ae47bbfd`; noindex and security headers verified                                     |
| API             | Healthy on `127.0.0.1:4318`; public proxy returns structured HTTP 503               | The named Cloudflare tunnel is awaiting user-action-time approval, so the proxy reports `api_unavailable`         |
| Worker          | Running as the InteractiveOnly scheduled task `jlm-demo-worker`                     | Runs only while the Windows user is signed in                                                                     |
| API task        | Running as the InteractiveOnly scheduled task `jlm-demo-api`                        | Runs only while the Windows user is signed in                                                                     |
| Windows startup | S4U startup task registration returned `AccessDenied`                               | InteractiveOnly tasks are the temporary operating mode; uptime does not survive sign-out as an unattended service |
| Email           | Real SMTP and IMAP diagnostic verified                                              | The diagnostic was synthetic and did not send an invoice or prove reply-driven billing acceptance                 |
| Google Calendar | Adapter implemented; live authorization pending                                     | Limited-use consent requires user-action-time approval                                                            |
| Retell          | Isolated agent and LLM created; no managed number provisioned                       | Number API returned HTTP 403 `No valid KYC`; the owner must complete Retell KYC before any number purchase        |
| Backup          | Seeded backup restored into a new directory and passed SQLite integrity checking    | This proves the checked backup was readable and internally consistent; retain the source backup privately         |

The website is available, but API-backed actions remain limited until the named tunnel is approved and running. The current API and worker uptime also depends on the Windows user remaining signed in.

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

For the installed InteractiveOnly tasks:

```powershell
Get-ScheduledTask -TaskName 'jlm-demo-api','jlm-demo-worker' |
  Select-Object TaskName, State

Start-ScheduledTask -TaskName 'jlm-demo-api'
Start-ScheduledTask -TaskName 'jlm-demo-worker'
```

The task installer is intended for a clean or deliberately repaired host and refuses to overwrite tasks it does not own:

```powershell
pwsh -File scripts/install-services.ps1 -ConfigPath $configPath -InteractiveOnly
```

Do not add `-IncludeTunnel` until the named Cloudflare tunnel and its protected token have been approved. S4U startup registration is not currently usable on this host because task registration returned `AccessDenied`.

When API/worker tasks already exist, use `-TunnelOnly -InteractiveOnly` after approval to install just the new tunnel task; `-IncludeTunnel` is for a fresh installation and refuses existing task names.

Check API health and recent private logs without exposing configuration:

```powershell
Invoke-RestMethod 'http://127.0.0.1:4318/api/health'
Get-Content (Join-Path $privateRoot 'logs\api.log') -Tail 100
Get-Content (Join-Path $privateRoot 'logs\worker.log') -Tail 100
```

The API binds to loopback. A local health result does not prove the public tunnel, Google, Retell, or invoice workflow is live.

The last local check returned HTTP 200 with demo mode enabled and capabilities `chat: true`, `booking: false`, `voice: false`, and `billing: false`. An unauthenticated admin request returned HTTP 401. A seeded authenticated event-brief PDF preview returned HTTP 200, `application/pdf`, `Cache-Control: no-store`, and 66,125 bytes. The public `/api/health` proxy returned HTTP 503 JSON with `api_unavailable`, which is the expected fail-closed response while the tunnel is absent.

## Stop or restart installed services

Use the repository helper with the exact protected environment path:

```powershell
pwsh -File scripts/stop-services.ps1 -ConfigPath $configPath
pwsh -File scripts/stop-services.ps1 -ConfigPath $configPath -Restart
```

The helper stops only `jlm-demo-api`, `jlm-demo-worker`, and `jlm-demo-tunnel` tasks that exist, then finds and stops child Node or cloudflared processes tied to the exact resolved config path. `-Restart` starts the tasks that existed when the command began. Use this helper instead of `Stop-ScheduledTask` alone: an observed Windows task stop left its child Node process alive until explicit reconciliation.

The final operational check ran the helper with `-Restart`, confirmed both owned API and worker tasks returned to `Running`, and confirmed local health HTTP 200 with the same knowledge-base identity and capability gates.

## Resume Google authorization

The last Google OAuth setup window expired without user approval and exited 1 with `Authorization window expired; restart setup`. Restart the flow while the user is present; do not treat the expired process as consent:

```powershell
$clientPath = 'C:\path\outside-repo\google-oauth-client.json'
npx tsx scripts/google-authorize.ts --client $clientPath --env $configPath
```

Complete only the isolated demo-account consent shown by the script, then verify the configured dedicated calendar. Never substitute credentials or calendars from existing TrustCore resources.

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

Reply polling requires the email gate and a configured IMAP account. It uses a durable mailbox UIDVALIDITY/UID cursor, a worker lock, bounded scans, and per-message processing before cursor advancement. It ignores sent echoes, automatic responses, and bounce-like traffic.

A billing reply is accepted only when the message passes origin and authentication checks and binds to a known outbound request through `In-Reply-To` plus the expected nonce. The subject alone never authorizes a state change. Run a manual poll with:

```json
{
  "action": "replies-poll"
}
```

If UIDVALIDITY changes or a cursor looks inconsistent, stop the worker, preserve the database and sanitized logs, and investigate before advancing or resetting mailbox state. Do not widen the scan or replay messages by editing the cursor directly.

## Pending live invoice acceptance

The completed provider diagnostic proved authenticated SMTP submission, To plus BCC envelope handling, deterministic Message-ID Sent-copy reconciliation, and a bounded IMAP scan. It did not create or send an invoice.

Live invoice acceptance remains pending and must use an approved demo show and the existing gates:

1. Complete Google consent and verify the dedicated calendar without modifying any existing TrustCore resource.
2. Confirm the synthetic show and agreed quote in canonical state.
3. Run the Houston morning job and dispatch the authorization request.
4. Receive an authenticated performer `YES`, `NO`, or valid change request replying to that exact message.
5. Poll replies and verify the stored state transition and immutable invoice snapshot.
6. Dispatch once, then reconcile its deterministic Message-ID against Sent.
7. Record sanitized evidence. Do not include addresses, tokens, message bodies with private data, or provider IDs.

Until these steps are complete, describe email as provider-diagnostic verified and invoice delivery as pending.

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
