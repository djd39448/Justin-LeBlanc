# Demo Handoff

- Status date: 2026-09-21
- Delivery code baseline verified by final checks: `8b8a4c954cde7a8d8f61cff1fd7a852ab0676f4c`
- Billing/document correction commit: `8e1ce48`
- Public API smoke evidence commit: `6331d2b`

## What is running

- The Cloudflare Pages website at `https://justinleblancmusic.50by50.dev` returned HTTP 200 on the exact hostname. The verified deployment ID is `ae47bbfd`.
- Public pages return `noindex, nofollow, noarchive`, frame denial, and a `frame-ancestors 'none'` CSP. The admin page also returns `Cache-Control: no-store`.
- The API is healthy on `127.0.0.1:4318`. Its checked capability result was `chat: true`, with booking, voice, and billing false under the current gates.
- The isolated Cloudflare tunnel `jlm-demo-api` (`e692323b-f1d0-494b-8529-113bd188104b`) routes `jlm-demo-api.50by50.dev` to loopback port 4318. Its protected token stays outside Git, and the running tunnel task reported four QUIC connections.
- Public API and exact website-proxy health returned HTTP 200 with the same KB identity. Synthetic public inquiry intake/resume and two grounded chat turns passed; unauthenticated admin returned HTTP 401 and no Calendar, email, or voice business write occurred.
- `jlm-demo-api` and `jlm-demo-worker` are installed and running as InteractiveOnly Windows tasks. `jlm-demo-tunnel` is also running.
- The final `stop-services.ps1 -Restart` check returned both owned tasks to `Running` and local health to HTTP 200 with the same knowledge-base identity and capability gates.
- The SQLite-backed demo has canonical booking and billing state, durable outbox processing, document generation, operator actions, backups, exports, and restore checking.
- One real, clearly labeled synthetic email diagnostic passed SMTP submission, To plus BCC delivery handling, deterministic Message-ID Sent-copy reconciliation, and a bounded IMAP scan.
- A seeded backup was copied to a new restore directory, opened read-only, and passed SQLite `PRAGMA integrity_check` with its seeded records readable.
- The backup command writes each SQLite snapshot and document copy into a distinct timestamped `snapshot-*` directory, preventing files from separate runs from being merged.
- An unauthenticated local admin request returned HTTP 401. A seeded authenticated event-brief PDF preview returned HTTP 200, 66,125 bytes, `application/pdf`, and `Cache-Control: no-store`.

Private configuration and operational data remain outside the repository. No credentials, recipient addresses, OAuth artifacts, private documents, database backups, or provider tokens belong in Git.

## What is not live

| Area               | Current limit                                                                                                         | Required next action                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Calendar    | Grant identity and both limited scopes passed; calendar create returns HTTP 403 `SERVICE_DISABLED`                    | Owner enables the Calendar API/accepts its terms, then operator runs provision-only recovery and verifies calendar/invitations                  |
| Invoice acceptance | Only the synthetic provider diagnostic is complete                                                                    | Run one end-to-end synthetic show through morning authorization, authenticated reply, immutable invoice, SMTP delivery, and Sent reconciliation |
| Retell             | An isolated agent and LLM exist, but no managed number was purchased; the number API returned HTTP 403 `No valid KYC` | Owner completes Retell KYC, then provisions an isolated demo number and completes inbound-call acceptance                                       |
| Unattended uptime  | S4U startup task registration returned `AccessDenied`                                                                 | Approve and install a supported startup service/task mode; until then a user must remain signed in                                              |

Public inquiry and chat paths now reach the backend through the isolated tunnel. Scheduling, voice, billing, and provider-backed operator outcomes remain gated. Do not present the demo as continuously available because the API and worker still depend on InteractiveOnly tasks.

## Implemented boundaries

- Booking, money, authentication, recipient gates, state transitions, and idempotency are deterministic.
- The calendar adapter uses a dedicated calendar and private metadata. It does not modify existing TrustCore calendars.
- Billing uses yesterday's Houston-local performance end date, a seven-day catch-up window, durable processed events, and version-bound performer approval.
- Initial unanswered checks queue one reminder after 24 hours from definitive original delivery, then enter review after 72 hours. Queued and confirmed-send timestamps stay distinct. Unanswered amendment approvals remain visible for operator review outside this initial-check reminder policy.
- Invoice snapshots are immutable and receive sequence numbers from stored state. Customer billing data comes from the canonical customer and agreed quote.
- Email effects have deterministic IDs and Message-IDs. SMTP interruption becomes uncertain; recovery reconciles the Sent mailbox and never blindly resends.
- Replies require an authenticated, aligned origin plus a known `In-Reply-To` and nonce. Subjects do not authorize billing. Sent echoes, automatic replies, and bounce-like messages are ignored.
- The IMAP worker persists UIDVALIDITY and the UID cursor, scans bounded batches under a lock, and advances only after processing.
- The final SMTP boundary enforces the exact demo allowlist and sends the client message with the required BCC. Internal event briefs remain operator-only.
- Generated briefs and invoices share typed HTML, plain-text, and PDF templates. The document is prepared before its mail effect is enqueued.

## Operational entry points

Use an environment file outside the repository:

```powershell
$configPath = 'C:\path\outside-repo\runtime.env'
node "--env-file=$configPath" --import tsx scripts/cli.ts --json health
```

The worker and API can be run directly with the same protected file or controlled through the `jlm-demo-api` and `jlm-demo-worker` scheduled tasks. Full commands, action schemas, backup handling, and uncertainty recovery are in [RUNBOOK.md](RUNBOOK.md).

Do not put the admin token in a URL. Operator actions should be stored briefly in a private JSON file, passed to `scripts/cli.ts`, and removed after use. Use record revisions and request keys from current state.

## Evidence and acceptance state

Repository evidence includes the sanitized email provider diagnostic, [hosting verification](evidence/hosting-verification.json), [public API smoke](evidence/public-api-smoke.json), [Google setup status](evidence/google-setup-status.json), and [document visual QA](evidence/documents/README.md). These artifacts intentionally omit addresses, credentials, message bodies with private data, and provider secrets.

The sanitized Retell provisioning evidence records the isolated agent, LLM, knowledge-base version, and reconciliation result. It records no phone number because none was purchased. Owner KYC and a managed number remain prerequisites for live voice acceptance.

The following statements are supported now:

- local API health: verified;
- exact-host website HTTP 200: verified;
- noindex, frame denial, CSP, and admin no-store headers: verified;
- public and website-proxy API health HTTP 200 with the expected KB identity: verified;
- public synthetic inquiry intake/resume and two grounded chat turns: verified with no provider business writes;
- unauthorized admin HTTP 401 and authenticated seeded brief PDF HTTP 200: verified;
- InteractiveOnly API and worker tasks running: verified;
- SMTP and IMAP provider access with deterministic Sent reconciliation: verified by a synthetic diagnostic;
- seeded backup restore integrity: verified.
- synthetic one-page brief, one-page invoice, and two-page long-edge invoice visual layout: verified.

The final `npm run verify` completed at 12:37:27 UTC: ESLint passed, TypeScript passed, 69 tests across 15 files passed, and Astro checked 18 files with zero diagnostics and built 9 pages.

The following statements must remain pending:

- live Google Calendar read/write acceptance;
- reply-driven invoice approval and delivery;
- Retell managed-number call handling;
- unattended recovery after Windows sign-out or reboot.

## Next controlled session

1. The owner enables the Google Calendar API in the Alex project and accepts any required terms. Do not repeat OAuth; run `scripts/google-authorize.ts --env <protected-env> --provision-only` and inspect the private provisioning manifest.
2. Verify the dedicated calendar and run the isolated synthetic booking/calendar flow.
3. Run the pending invoice acceptance exactly once. Reconcile any uncertain SMTP result by deterministic Message-ID; do not resend it blindly.
4. The owner completes Retell KYC. Provision and test an isolated Retell number only after that prerequisite and explicit resource approval.
5. Replace InteractiveOnly API and worker tasks with an approved unattended startup method, then test reboot and sign-out recovery.
6. Record final test totals and the integration commit in this handoff without copying private configuration.

The shared account usage snapshot supplied during final review was 17% used, leaving the required reserve intact.

Cloudflare, Google, Retell, Windows privilege, DNS, and credential changes remain user-controlled. The current repository work does not authorize changes to existing TrustCore resources.
