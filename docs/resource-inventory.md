# Isolated resource inventory and resume commands

Recorded 2026-09-21. This inventory contains identifiers and variable names, never credentials. Existing resources are read-only references. The implementation is partially live-verified; the complete requested demonstration remains pending.

## Created and running

| Resource                  | Identifier / location                                                                      | Verified state                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Private GitHub repository | `djd39448/Justin-LeBlanc`, branch `main`                                                   | Authorized verified milestone pushes; final SHA from `git rev-parse HEAD`  |
| Cloudflare account        | `b393d8ff72d57912119b872640d3511f`                                                         | Existing authorized account                                                |
| Existing DNS zone         | `50by50.dev`, `2ad6b3d042155b73baca25bea5b3be2d`                                           | Two Justin-only CNAMEs added; existing records unchanged                   |
| New Pages project         | `50by50-justinleblancmusic`, ID `7c9bb5e4-3b90-4d1f-954e-43d87400ea30`                     | Separate project, static site and API proxy                                |
| Custom hostname           | `justinleblancmusic.50by50.dev`, binding `bd4ec301-091e-4bee-a4cd-bf0030e56e7a`            | HTTPS 200, noindex/security headers                                        |
| Latest checked deployment | `e63652d3`, `https://e63652d3.50by50-justinleblancmusic.pages.dev`                         | Desktop/mobile Central-time and voice-CTA QA passed on the exact hostname  |
| New Cloudflare tunnel     | `jlm-demo-api`, `e692323b-f1d0-494b-8529-113bd188104b`                                     | `jlm-demo-api.50by50.dev` → `http://127.0.0.1:4318`; four QUIC connections |
| New Retell agent          | `agent_ee62bd9b73af71d0b42a877f00`, version 1                                              | Separate published agent; Central-time prompt matches the checked-in KB    |
| New Retell LLM            | `llm_8b63e841b1bbf015da8acca1ccfe`, version 1                                              | Published `gpt-4.1-mini` configuration with standard voice                 |
| Dedicated Calendar        | Private configured Calendar ID; omitted from Git                                           | Created and verified through live consultation/show lifecycle              |
| Houston demo number       | Retell-managed 832 number; full number omitted from Git                                     | One isolated number; signed webhook call reached no assistant tools        |
| Shared KB                 | `2026-09-21.2`, SHA-256 `d6dd327317ecf32b537cbc74df5ea7957e79429442383014d4ef40986d9b0ad6` | Checked-in chat and published voice configuration agree                    |
| Local API                 | `127.0.0.1:4318`, task `jlm-demo-api`                                                      | InteractiveOnly; local, public, and website-proxy health checked           |
| Tunnel task               | task `jlm-demo-tunnel`, protected token in `<private-root>/tunnel-token.txt`               | Running; token never stored in Git or command arguments                    |
| Local worker              | task `jlm-demo-worker`                                                                     | Running InteractiveOnly; user must remain signed in                        |
| Persistent database       | `<private-root>/data/jlm-demo.sqlite`                                                      | SQLite WAL; synthetic booking and sent-invoice acceptance state retained   |
| Private storage           | `<private-root>/documents`, `/backups`, `/logs`                                            | Outside Git, restricted host ACLs                                          |

On this host, `<private-root>` is `C:/Users/trustcore-rdp/.config/jlm-demo` and the configuration is `runtime.env` there. Do not print or commit populated files. Private resource manifests are `retell-provision.json` and `retell-number.json`; read them before retrying provisioning.

## Verified resources and remaining limitations

- **Calendar:** the dedicated calendar exists and live acceptance passed consultation and tentative hold creation, attendee invitations, operator brief delivery, confirmation, non-overlapping reschedule, and cancellation with no unresolved effects. Tentative holds are transparent so attendee copies do not collide with the same canonical hold; confirmed shows become opaque. A reschedule that overlaps the confirmed attendee copy can still fail closed because Google free/busy does not expose enough event identity to subtract that interval safely.
- **Retell number:** the isolated Houston 832 number and version-1 agent/LLM are provider-reconciled. The full number remains private in Git and is exposed to the approved public page only by gated health. One live call reached three verified signed webhooks but invoked no assistant tools. A version-2 search-first prompt and one short tool-bearing call remain before voice booking tools can be called live-tested. Never change the existing unrelated number, global webhook, or Telnyx configuration.
- **Invoice delivery:** an authenticated `YES` produced one immutable $700 demo invoice. Sent-copy reconciliation, exactly one matching client Inbox receipt, and Dave's BCC receipt passed. This remains synthetic acceptance, not a real payment request.
- **Unattended startup:** S4U task registration returned `AccessDenied`. The installed InteractiveOnly tasks require the user to remain signed in. The corrected startup-upgrade dry run validated all three owned running tasks and planned their S4U upgrade with `elevated: false`. An operator must review that plan, use an already elevated PowerShell session for `-Apply`, and test sign-out/reboot recovery.

```powershell
$privateRoot = 'C:/Users/trustcore-rdp/.config/jlm-demo'
$configPath = Join-Path $privateRoot 'runtime.env'

# Read-only startup-upgrade plan. Review the verified ownership and task list.
pwsh -File scripts/upgrade-services.ps1 -ConfigPath $configPath

# Manual elevated step only after the dry run is approved.
pwsh -File scripts/upgrade-services.ps1 -ConfigPath $configPath -Apply
```

The upgrade script changes only existing owned demo tasks, stores private XML backups, verifies S4U startup, and rolls back on failure. It cannot elevate itself or guarantee that Windows task policy and batch-logon rights will permit registration.

## Deployment and configuration

Node 24.14.0/npm 11.9.0 were used. Dependencies are pinned by `package-lock.json`. Build and deploy only this Pages project:

```powershell
npm ci
npm run verify
$env:CLOUDFLARE_ACCOUNT_ID = 'b393d8ff72d57912119b872640d3511f'
npx --yes wrangler@4.90.0 pages deploy apps/web/dist `
  --project-name 50by50-justinleblancmusic --branch main --commit-dirty=true
```

`wrangler.jsonc` sets only this project and its `API_ORIGIN`. Runtime variable names are documented in `.env.example`. Secrets include `ADMIN_TOKEN`, `JOB_AUTH_SECRET`, SMTP password, Google client secret/refresh token, `OPENAI_API_KEY`, and `RETELL_API_KEY`. Identity allowlists and actual recipient addresses also stay private. Public UI never embeds them.

Current checked public capabilities are booking, chat, voice, and billing on. Limits are 100 chat requests/day, 10 admitted voice calls/day, two concurrent voice calls and five minutes per call. Voice association requires a verified signed call. The final SMTP adapter checks every To/Cc/Bcc recipient. Restart the owned services after changing configuration and verify all three health paths before reporting a gate state.

The official downloaded `cloudflared.exe` is private, version 2026.9.1. Its SHA-256 matched the release digest: `2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712`. The `jlm-demo-tunnel` task is running with the protected token file and reported four QUIC connections.

## Isolated rollback, export, and transfer

Disable affected feature switches, then use `scripts/stop-services.ps1 -ConfigPath <private-config>` to stop only the demo's tasks and owned child processes. Preserve uncertain effects and mailbox cursors. The [runbook](RUNBOOK.md) has exact backup/export/reconciliation commands. Schema initialization is in [migration notes](../db/migrations/README.md).

For a website rollback, choose a previously verified deployment **inside `50by50-justinleblancmusic`** in the Cloudflare deployment UI, or rebuild that Git revision in an isolated checkout and use the same project-specific command. Never reset the live database merely to match an older frontend. Removal, when requested, must use the exact new IDs above; preserve root/MX DNS, existing projects, numbers, and agents. Do not delete resources as part of routine resume work.

For client transfer, export private records/documents through the CLI, take a consistent backup, create separate client-owned provider resources and credentials, replace every demo identity/allowlist, and rerun full acceptance before switching traffic. Synthetic demo invoices are not client accounting records. The checked-in repository contains no actual private export.

Evidence: [resource isolation](evidence/resource-isolation.json), [hosting](evidence/hosting-verification.json), [public API smoke](evidence/public-api-smoke.json), [live booking](evidence/live-booking-acceptance.json), [live invoice](evidence/live-invoice-acceptance.json), [operator receipts](evidence/operator-mail-receipts.json), [Central voice release](evidence/retell-central-release.json), [Houston number](evidence/retell-number-provisioned.json), and [operations/restore](evidence/operations-verification.json).
