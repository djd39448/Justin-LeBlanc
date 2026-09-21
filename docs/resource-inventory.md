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
| Latest checked deployment | `ae47bbfd`, `https://ae47bbfd.50by50-justinleblancmusic.pages.dev`                         | Website proxy health now returns HTTP 200 through the isolated tunnel      |
| New Cloudflare tunnel     | `jlm-demo-api`, `e692323b-f1d0-494b-8529-113bd188104b`                                     | `jlm-demo-api.50by50.dev` → `http://127.0.0.1:4318`; four QUIC connections |
| New Retell agent          | `agent_ee62bd9b73af71d0b42a877f00`                                                         | Separate agent; no number attached                                         |
| New Retell LLM            | `llm_8b63e841b1bbf015da8acca1ccfe`                                                         | `gpt-4.1-mini`, standard voice `retell-Alejandro`                          |
| Shared KB                 | `2026-09-21.1`, SHA-256 `d050467fbc915673bcd95ae9cea1cd26ee49a9c6fe0c37da0d247663a2d9b0d8` | Local chat and provisioned voice configuration agree                       |
| Local API                 | `127.0.0.1:4318`, task `jlm-demo-api`                                                      | InteractiveOnly; local and public health checked                           |
| Tunnel task               | task `jlm-demo-tunnel`, protected token in `<private-root>/tunnel-token.txt`               | Running; token never stored in Git or command arguments                    |
| Local worker              | task `jlm-demo-worker`                                                                     | InteractiveOnly; user must remain signed in                                |
| Persistent database       | `<private-root>/data/jlm-demo.sqlite`                                                      | SQLite WAL; one synthetic rehearsal show, zero invoices                    |
| Private storage           | `<private-root>/documents`, `/backups`, `/logs`                                            | Outside Git, restricted host ACLs                                          |

On this host, `<private-root>` is `C:/Users/trustcore-rdp/.config/jlm-demo` and the configuration is `runtime.env` there. Do not print or commit populated files. Private resource manifests are `retell-provision.json` and `retell-number.json`; read them before retrying provisioning.

## Pending resources and precise dependencies

- **Calendar:** refresh-grant identity matches the configured account and both limited scopes passed. Calendar creation returned definitive HTTP 403 `SERVICE_DISABLED`; only owner API enablement/terms remain before `--provision-only` recovery creates/verifies `jlm-demo-performances`. The private manifest is `<private-root>/google-calendar-provisioning.json`. Booking writes remain disabled until live acceptance.
- **Retell number:** no purchase succeeded. The single number-create request returned `403 No valid KYC`. The owner must complete verification in the existing Retell account. The authorized number is one new US managed number named `jlm-demo-private-bookings`; recorded price is $2/month plus usage. It has no default call agent; the signed pre-connect gate admits only the configured demo caller to the configured new number. Check current provider price before executing a later purchase. Never change the existing number, global webhook, or Telnyx configuration.
- **Unattended startup:** S4U task registration returned `AccessDenied`. The installed InteractiveOnly tasks survive this coding session but require the user to remain signed in. An elevated supported startup method and reboot test remain necessary for unattended availability.

```powershell
$privateRoot = 'C:/Users/trustcore-rdp/.config/jlm-demo'
$configPath = Join-Path $privateRoot 'runtime.env'

# After owner API enablement/terms, resume deterministic provisioning without repeating OAuth.
node --import tsx scripts/google-authorize.ts --env $configPath --provision-only

# Reconcile existing agent configuration; exact-name matching prevents duplicate creation.
node --import tsx scripts/retell-provision.ts --help
# After owner KYC, reconcile before the authorized single-number purchase.
node --import tsx scripts/retell-number.ts --env $configPath `
  --manifest (Join-Path $privateRoot 'retell-number.json')
node --import tsx scripts/retell-number.ts --env $configPath `
  --manifest (Join-Path $privateRoot 'retell-number.json') --execute
```

An uncertain purchase is not retryable automatically. The number script refuses a prior un-reconciled `purchase_started` manifest. `provider_rejected` permits a later attempt after the provider prerequisite is resolved.

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

Current switches: `AI_ENABLED=true`; `BOOKING_WRITES_ENABLED=false`, `MORNING_SCAN_ENABLED=false`, `INVOICE_SEND_ENABLED=false`, `VOICE_ENABLED=false`. Limits are 100 chat requests/day, 10 admitted voice calls/day, two concurrent voice calls and five minutes per call. Voice association requires a verified signed call. The final SMTP adapter checks every To/Cc/Bcc recipient. Do not enable workflow gates until the corresponding provider and exact allowlists are verified. Restart the owned services after changing configuration.

The official downloaded `cloudflared.exe` is private, version 2026.9.1. Its SHA-256 matched the release digest: `2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712`. The `jlm-demo-tunnel` task is running with the protected token file and reported four QUIC connections.

## Isolated rollback, export, and transfer

Disable affected feature switches, then use `scripts/stop-services.ps1 -ConfigPath <private-config>` to stop only the demo's tasks and owned child processes. Preserve uncertain effects and mailbox cursors. The [runbook](RUNBOOK.md) has exact backup/export/reconciliation commands. Schema initialization is in [migration notes](../db/migrations/README.md).

For a website rollback, choose a previously verified deployment **inside `50by50-justinleblancmusic`** in the Cloudflare deployment UI, or rebuild that Git revision in an isolated checkout and use the same project-specific command. Never reset the live database merely to match an older frontend. Removal, when requested, must use the exact new IDs above; preserve root/MX DNS, existing projects, numbers, and agents. Do not delete resources as part of routine resume work.

For client transfer, export private records/documents through the CLI, take a consistent backup, create separate client-owned provider resources and credentials, replace every demo identity/allowlist, and rerun full acceptance before switching traffic. Synthetic demo invoices are not client accounting records. The checked-in repository contains no actual private export.

Evidence: [resource isolation](evidence/resource-isolation.json), [hosting](evidence/hosting-verification.json), [public API smoke](evidence/public-api-smoke.json), [Google setup status](evidence/google-setup-status.json), [operations/restore](evidence/operations-verification.json), [number blocker](evidence/retell-number-blocker.json).
