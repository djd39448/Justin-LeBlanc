# Integration inventory and isolation plan

Current implementation status and exact resource IDs are maintained in [resource-inventory.md](resource-inventory.md) and [acceptance results](evidence/acceptance-results.md). The source observations below are the original planning baseline, not the final live-readiness result.

Inspected local source on 2026-09-21. This proves code exists, not deployed/account readiness.
Do not use old README statements as live status. No secrets were read in the docs session.

## TrustCore references (read only)

Root: `C:/Users/trustcore-rdp/inbound-voice-agent/`
- `src/webhooks/book-meeting.ts`: Cal.com API v2 booking and alternative slots; Eastern-time fix.
- `RUNBOOK.md`: calendar linkage, lead watcher, separate inbound/outbound agents and operations.
- `src/webhooks/take-message.ts`: Nodemailer Gmail SMTP sender.
- `scripts/watch-leads.ts`: ImapFlow Gmail TLS reader using existing SMTP account credentials;
  currently filters TrustCore website leads and triggers calling. **Do not modify or reuse its
  trigger scope** for invoices. Adapt the connection/deduplication patterns into a separate worker.
- `src/google/calendar.ts`, `src/google/auth.ts`: family-only calendar insertion reference;
  not appropriate public-booking authorization. Do not repurpose or weaken family gates.
- `scripts/place-call.ts`: existing Telnyx-specific dialing, unsuitable to copy unchanged for a
  Retell-managed demo number.

Root: `C:/Users/trustcore-rdp/Birthday-Challenge/`
- `playbooks/sop-new-site.md`: Pages project, verification, custom domain, launch-log conventions.
- `.github/workflows/deploy-trustcore-systems.yml`: deployment reference; contains shared DNS/mail
  provisioning concerns. Extract only needed Justin deployment steps, don't copy wholesale.
- `sites/trustcore-systems/functions/api/lead.js`: consulting lead delivery reference; schema differs.
- `sites/trustcore-systems/wrangler.toml`: existing site name/build layout reference only.

## Preflight inventory to complete in build

Record actual account/host/project IDs and credential variable NAMES in a private local manifest.
Commit only non-sensitive resource IDs where appropriate. Never print secret values or copy env
files into the repo. Status per integration: located / authorized / configured / smoke-tested.

1. GitHub repo remains private; fresh clean branch/worktree; inspect existing changes first.
2. Cloudflare zone for 50by50.dev and Pages access; confirm target subdomain unused. Add only exact
   new hostname binding/DNS; no wildcard, MX, SPF, DKIM, root or TrustCore record changes.
3. Existing Node deployment capacity and durable database/private document storage. Record selected
   runtime capabilities (SMTP/IMAP sockets, PDF rendering, scheduler); deploy isolated services.
4. Cal.com credentials/event type and its connected calendars. Create a separate Justin consultation
   type if authorized/capable, otherwise use a dedicated direct Calendar adapter preserving the same
   user flow. Avoid double invitations when Cal.com already creates the consultation event.
5. Dedicated tagged demo performance calendar under Dave's account plus selected actual free/busy
   calendars. Invites must reach Dave and test client. Invitation-capable identity required; existing
   family service-account config may not support attendee invites. Never claim it does without test.
6. Gmail account: SMTP sender and existing IMAP permissions may already suffice. Preferred reuse is
   separate ImapFlow worker with durable UIDVALIDITY/UID + Message-ID/thread ledger. Verify socket
   support on actual host. If using OAuth Gmail API instead, verify read/send scopes and refresh;
   do not silently broaden access. Avoid changing any existing Gmail watch or watcher task.
7. Retell credential, managed number availability and separate agent ID. Do not edit existing agent,
   phone bindings, workspace defaults or global webhook. Use dedicated agent webhook/tools.
8. OpenAI key reuse (already selected by user): discover via existing secure config and validate
   server-only access; qualify a low-cost model. No plaintext in chat, commits, artifacts or browser.
9. Test recipients/phone and operator identity explicitly configured from verified Dave-owned info.
   No guess at which email is his TrustCore account. No unsolicited real-client demo messages.

## Provider behavior to verify against current docs

- Retell managed numbers: https://docs.retellai.com/deploy/purchase-number
- Retell number bindings: https://docs.retellai.com/api-references/create-phone-number
- Retell agent-level webhook overrides account webhook:
  https://docs.retellai.com/features/webhook-overview
- OpenAI schema-defined extraction/tools:
  https://developers.openai.com/api/docs/guides/structured-outputs
- Calendar attendees/invitations and permissions:
  https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Gmail API push alternative (watch renewal, history cursor, missed-event recovery):
  https://developers.google.com/workspace/gmail/api/guides/push

## Resource names and configuration contract

Prefix new resources `jlm-demo-` except Pages project `50by50-justinleblancmusic`.
Document `PUBLIC_SITE_URL`, `DEMO_MODE`, `DEMO_RECIPIENT_ALLOWLIST`, `OPERATOR_EMAIL`,
`PERFORMER_EMAIL`, `CLIENT_TEST_EMAIL`, `DATABASE_URL`, `PRIVATE_STORAGE_*`, `RETELL_API_KEY`,
`RETELL_JLM_AGENT_ID`, `RETELL_JLM_PHONE_NUMBER`, `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`,
`CAL_API_KEY`, `CAL_JLM_EVENT_TYPE`, `GOOGLE_*` credential references, `SHOW_CALENDAR_ID`,
`FREE_BUSY_CALENDAR_IDS`, `SMTP_USER`, `SMTP_PASS`, `IMAP_*`, `JOB_AUTH_SECRET`, `ADMIN_*`,
`BOOKING_WRITES_ENABLED`, `INVOICE_SEND_ENABLED`, `MORNING_SCAN_ENABLED` in `.env.example`.
Use placeholders and comments, never populated credentials. Avoid requiring unused alternatives.

## Migration to Justin

Code and business rules portable; integrations selected through configuration. Export customers,
bookings, quotes and invoices with stable IDs and secure transfer. Reconnect Justin-owned email,
calendar, provider keys and hosting; test on fixtures, then cut over with cursors/idempotency intact.
Verify number ownership/transfer options with Retell before promising retention. Change BCC and
performer identity, sender authentication, timezones and approved policies; remove demo labels only
after review. Revoke Dave's credentials in the client deployment, rotate test secrets and document
ownership. Never include actual credentials in the handoff repository.
