# Isolated resource inventory and resume commands

Recorded 2026-09-21; round-two source status updated 2026-09-22. This inventory contains identifiers
and variable names, never credentials. Existing resources are read-only references. Calendar-driven
invoicing is implemented, CI-verified and loaded in the running services; fresh eligible delivery,
full voice booking, and recovery after an actual reboot/sign-out remain unverified. Round-two source
is pushed on `codex/justin-round-two` but no runtime or Pages deployment is claimed.

## Created and running

| Resource                  | Identifier / location                                                                      | Verified state                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Private GitHub repository | `djd39448/Justin-LeBlanc`, branch `main`                                                   | Published main SHA and GitHub Actions result are supplied in session delivery     |
| Cloudflare account        | `b393d8ff72d57912119b872640d3511f`                                                         | Existing authorized account                                                       |
| Existing DNS zone         | `50by50.dev`, `2ad6b3d042155b73baca25bea5b3be2d`                                           | Two Justin-only CNAMEs added; existing records unchanged                          |
| New Pages project         | `50by50-justinleblancmusic`, ID `7c9bb5e4-3b90-4d1f-954e-43d87400ea30`                     | Separate project, static site and API proxy                                       |
| Custom hostname           | `justinleblancmusic.50by50.dev`, binding `bd4ec301-091e-4bee-a4cd-bf0030e56e7a`            | HTTPS 200, noindex/security headers                                               |
| Latest checked deployment | `840a4ccf`, `https://840a4ccf.50by50-justinleblancmusic.pages.dev`                         | `/admin` HTTP 200; new label/legacy controls, no-store and noindex verified       |
| New Cloudflare tunnel     | `jlm-demo-api`, `e692323b-f1d0-494b-8529-113bd188104b`                                     | `jlm-demo-api.50by50.dev` → `http://127.0.0.1:4318`; four QUIC connections        |
| New Retell agent          | `agent_ee62bd9b73af71d0b42a877f00`, version 4                                              | Same protected identity; six custom tools plus native `end_call`                  |
| New Retell LLM            | `llm_8b63e841b1bbf015da8acca1ccfe`, version 4                                              | Published `gpt-4.1-mini` configuration with KB `2026-09-21.4`                     |
| Dedicated Calendar        | Private configured Calendar ID; omitted from Git                                           | Created and verified through live consultation/show lifecycle                     |
| Houston demo number       | **(832) 501-3799**                                                                         | Fourth call proved repaired inquiry, availability, follow-up, and lifecycle tools |
| Shared KB                 | `2026-09-21.4`, SHA-256 `63f6cc2c6ac6d9066a490513f50e9c3f48de9c4d6acbc2f17cde92e4880b9c96` | Retell/API/chat parity verified after restart                                     |
| Local API                 | `127.0.0.1:4318`, task `jlm-demo-api`                                                      | Running S4U/Limited boot task; all three health paths passed post-upgrade         |
| Tunnel task               | task `jlm-demo-tunnel`, protected token in `<private-root>/tunnel-token.txt`               | Running; token never stored in Git or command arguments                           |
| Local worker              | task `jlm-demo-worker`                                                                     | Running S4U/Limited boot task; startup jobs completed successfully                |
| Persistent database       | `<private-root>/data/jlm-demo.sqlite`                                                      | SQLite WAL; synthetic booking and historical old-policy invoice retained          |
| Private storage           | `<private-root>/documents`, `/backups`, `/logs`                                            | Outside Git, restricted host ACLs                                                 |

On this host, `<private-root>` is `C:/Users/trustcore-rdp/.config/jlm-demo` and the configuration is `runtime.env` there. Do not print or commit populated files. Private resource manifests are `retell-provision.json` and `retell-number.json`; read them before retrying provisioning.

## Round-two Public Shows resource — adapter complete, live source unconfirmed

Round two now has a tested isolated reader and `/api/public-events` route in commit
`ffb2fa00ed1465dbbbbc6ef737033f01751a157c` on `codex/justin-round-two`. It still requires one
exact live Public Shows Calendar for website listings. Determine whether the Calendar used by
Justin's existing events page is public-performance-only, owner-confirmed, and accessible by exact
ID. Otherwise, keep the integration disabled and obtain explicit owner approval before
creating/selecting a dedicated secondary Calendar or populating any event.

- Private variable names: `PUBLIC_EVENTS_ENABLED` (default `false`) and
  `PUBLIC_EVENTS_CALENDAR_ID`, plus `PUBLIC_EVENTS_TIMEZONE` and a backed-up random
  `PUBLIC_EVENTS_ID_SECRET` (never committed or returned to the browser).
- The public-events reader must never use `SHOW_CALENDAR_ID`, free/busy Calendars, `primary`, family
  Calendars, or discovery fallback.
- Public-site voice removal does not delete or change the Retell resources above. The number remains
  in private operational inventory while disappearing from rendered public web output and public
  phone-bearing payloads.

No owner-confirmed Public Shows Calendar ID, OAuth change, live cache, runtime install, or Pages
round-two deployment is recorded. The endpoint exists in source only. Windows coordination failed
before preflight because the Codex runner could not find its CLI path and the Claude runner had no
credit; this made no provider or runtime change. Record the exact resource and sanitized evidence
here only after provider verification. See
[round-two local evidence](evidence/round-two-2026-09-22.md).

## Verified resources and remaining limitations

- **Calendar:** the dedicated calendar exists and live acceptance passed consultation and tentative hold creation, attendee invitations, operator brief delivery, confirmation, non-overlapping reschedule, and cancellation with no unresolved effects. Tentative holds are transparent so attendee copies do not collide with the same canonical hold; confirmed shows become opaque. A reschedule that overlaps the confirmed attendee copy can still fail closed because Google free/busy does not expose enough event identity to subtract that interval safely.
- **Retell number:** the isolated Houston number **(832) 501-3799** and the same protected agent/LLM identities are provider-reconciled at version 4 with KB `2026-09-21.4`, six unchanged custom tools, and native `end_call`. The first three calls remain historical, including the third call's HTTP 413 failures. The fourth v2 call proved repaired inquiry, availability, follow-up and lifecycle handling; booking and native hangup remain untested. Never change the existing unrelated number, global webhook, or Telnyx configuration.
- **Invoice delivery:** an authenticated `YES` produced one immutable $700 demo invoice under the superseded reply-gated policy. Sent-copy reconciliation, exactly one client receipt, and Dave's BCC receipt passed. This is historical delivery/idempotency evidence, not proof of the current Calendar-driven automatic flow. New workflow evidence belongs in [calendar invoice workflow evidence](evidence/calendar-invoice-workflow.json).
- **Automatic morning scan:** the first runtime `morning:auto-invoice:v2` catch-up completed seven dates from 2026-09-14 through 2026-09-20 at 17:44:28.820 UTC with zero eligible shows. At 17:45:39.067 UTC the database still held three shows, one sent historical invoice, 20 accepted effects and no unresolved/new effects.
- **Unattended startup:** the corrected apply created its backup at 15:38:36 UTC and restarted the tasks at 15:38:40 UTC. At 15:39:09 UTC all three owned tasks were running S4U/Limited with exactly one `MSFT_TaskBootTrigger` each. At 15:39:43 UTC all three health paths passed, worker startup jobs succeeded, and the tunnel had four connections. A private manifest and three valid XML backups preserve the former interactive configuration. Actual reboot/sign-out recovery remains untested.

```powershell
# Verified read-only startup-upgrade plan, retained as operator history.
& 'C:/Users/trustcore-rdp/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File 'C:/Users/trustcore-rdp/Desktop/Justin Leblanc/scripts/upgrade-services.ps1' -ConfigPath 'C:/Users/trustcore-rdp/.config/jlm-demo/runtime.env'

# Verified apply command, already applied around 15:38 UTC; do not rerun routinely.
& 'C:/Users/trustcore-rdp/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File 'C:/Users/trustcore-rdp/Desktop/Justin Leblanc/scripts/upgrade-services.ps1' -ConfigPath 'C:/Users/trustcore-rdp/.config/jlm-demo/runtime.env' -Apply
```

The upgrade script changes only existing owned demo tasks, stores private XML backups, verifies S4U startup, and rolls back on failure. It cannot elevate itself or guarantee that Windows task policy and batch-logon rights will permit registration.

## Deployment and configuration

Node 24.14.0/npm 11.9.0 were used. Dependencies are pinned by `package-lock.json`. The round-two
branch passed 137 tests in 23 files, 21 clean Astro files, nine pages, 30 Playwright passes, the
public-output audit, and the secret scan. Follow the disabled-first sequence in the
[runbook](RUNBOOK.md), and build/deploy only this Pages project after the enabled endpoint gate:

```powershell
npm ci
npm run verify
$env:CLOUDFLARE_ACCOUNT_ID = 'b393d8ff72d57912119b872640d3511f'
npx --yes wrangler@4.90.0 pages deploy apps/web/dist `
  --project-name 50by50-justinleblancmusic --branch main --commit-dirty=true
```

`wrangler.jsonc` sets only this project and its `API_ORIGIN`. Runtime variable names are documented in `.env.example`. Secrets include `ADMIN_TOKEN`, `JOB_AUTH_SECRET`, SMTP password, Google client secret/refresh token, `OPENAI_API_KEY`, and `RETELL_API_KEY`. Identity allowlists and actual recipient addresses also stay private. Public UI never embeds them.

Current checked public capabilities are booking, chat, voice, and billing on. Limits are 100 chat requests/day, 10 admitted voice calls/day, two concurrent voice calls and five minutes per call. Voice association requires a verified signed call. The final SMTP adapter checks every To/Cc/Bcc recipient. Restart the owned services after changing configuration and verify all three health paths before reporting a gate state.

The official downloaded `cloudflared.exe` is private, version 2026.9.1. Its SHA-256 matched the release digest: `2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712`. The `jlm-demo-tunnel` task is running with the protected token file and reported four QUIC connections. Resource isolation at 17:44:13 UTC confirmed all baseline provider resources unchanged.

## Isolated rollback, export, and transfer

Disable affected feature switches, then use `scripts/stop-services.ps1 -ConfigPath <private-config>` to stop only the demo's tasks and owned child processes. Preserve uncertain effects and mailbox cursors. The [runbook](RUNBOOK.md) has exact backup/export/reconciliation commands. Schema initialization is in [migration notes](../db/migrations/README.md).

For a website rollback, choose a previously verified deployment **inside `50by50-justinleblancmusic`** in the Cloudflare deployment UI, or rebuild that Git revision in an isolated checkout and use the same project-specific command. Never reset the live database merely to match an older frontend. Removal, when requested, must use the exact new IDs above; preserve root/MX DNS, existing projects, numbers, and agents. Do not delete resources as part of routine resume work.

For client transfer, export private records/documents through the CLI, take a consistent backup, create separate client-owned provider resources and credentials, replace every demo identity/allowlist, and rerun full acceptance before switching traffic. Synthetic demo invoices are not client accounting records. The checked-in repository contains no actual private export.

Evidence: [round-two local implementation](evidence/round-two-2026-09-22.md), [resource isolation](evidence/resource-isolation.json), [hosting](evidence/hosting-verification.json), [public API smoke](evidence/public-api-smoke.json), [live booking](evidence/live-booking-acceptance.json), [historical old-policy invoice](evidence/live-invoice-acceptance.json), [calendar invoice workflow](evidence/calendar-invoice-workflow.json), [operator receipts](evidence/operator-mail-receipts.json), [live voice](evidence/live-voice-acceptance.json), [call completion and v3 release](evidence/consultation-call-completion.json), [voice tool repair](evidence/voice-tool-repair.json), [Central voice release](evidence/retell-central-release.json), [Houston number](evidence/retell-number-provisioned.json), [startup reconciliation](evidence/startup-reconciliation.json), [resume ledger](evidence/resume-ledger-reconciliation.json), and [operations/restore](evidence/operations-verification.json).
