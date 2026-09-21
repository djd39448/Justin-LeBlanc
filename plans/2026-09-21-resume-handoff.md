# Resume handoff — 2026-09-21, approximately 15:20 UTC

Dave requested a new session because the current session was getting bloated and expensive.
Implementation is stopped intentionally. Continue existing work; do not rebuild or reprovision.

## Objective and authority

Complete the Justin LeBlanc isolated private-event website, booking, shared voice/chat,
Calendar and actual reply-driven invoice demo. Original kickoff:
`C:/Users/trustcore-rdp/.codex/attachments/5f467332-0cad-4cc3-936a-b9be139afb62/Pasted text.txt`.
Read this handoff first, then relevant approved repository docs and AGENTS.md as needed.
Existing authorization covers private-repo commits/pushes, isolated resources, existing key reuse,
and synthetic/allowlisted integration tests. No real-client charges, campaigns, invoices, or
changes to existing TrustCore/Telnyx resources. No reset credits. No new permission needed for
already-authorized routine work. Do not repeat Google OAuth, KYC, or tunnel approval.

Latest business correction: Justin is in Houston. Use a Houston phone number and Central Time
(`America/Chicago`, DST-aware) for all default booking, consultation and event displays.
The live Houston number is stored in protected runtime configuration and returned by public
`/api/health`; the old Philadelphia number was released. Do not call or re-create the old number.

## Budget and execution

Last shared account usage: 32% of the weekly window, account route
`7ca36496-04e7-4da6-b175-76e61d3bc6d9`. Windows and Mac share this allowance. Reserve 25%.
Use deterministic tools; avoid repeated full reviews or passed checks. Previous bounded workers
were Sol/high; conductor Astra/Ultra. All workers have finished or stopped; no work is running.
If Switchboard is used/available, read its configured playbook before coordination.

## Checkout and current verification

- Workspace: `C:/Users/trustcore-rdp/Desktop/Justin Leblanc`
- Private repo: `https://github.com/djd39448/Justin-LeBlanc`, branch `main`.
- Local HEAD: `18570d36c495953a331cbf38ca8f9ab8f5abb4f7`.
- Last known pushed `origin/main`: `6361e382daced43c1dfb820cc988be0d4f833e1b`.
- Many verified commits remain local. Do not reset or discard them.
- Full `npm run verify` passed at 15:13:37 UTC against application code `8a280a0`:
  **87 tests / 17 files**, ESLint, TypeScript, Astro 19 files with zero diagnostics, 9 pages.
- Subsequent changes were docs and startup PowerShell. Startup script parser/static checks,
  PSScriptAnalyzer and actual non-Apply dry run passed separately.
- Last pushed CI passed: `https://github.com/djd39448/Justin-LeBlanc/actions/runs/35612538350`.
  Final integration push and CI remain outstanding.

Unstaged drafts are intentional: `HANDOFF.md`, `PROGRESS.md`, `docs/ACCEPTANCE.md`,
`docs/HANDOFF.md`, `docs/evidence/acceptance-results.md`, plus updated evidence and new
evidence/solution files. These drafts need final reconciliation, not replacement from old status.
Use `git status` to inventory. Avoid shared-index races; use commits scoped to owned paths.

## Running deployment

- Website: `https://justinleblancmusic.50by50.dev`
- API: `https://jlm-demo-api.50by50.dev`, loopback port 4318; website proxies `/api/*`.
- Cloudflare Pages project: `50by50-justinleblancmusic`; latest deployment **e63652d3**.
- Tunnel: `jlm-demo-api`, ID `e692323b-f1d0-494b-8529-113bd188104b`.
- API, worker and tunnel scheduled tasks were all **Running** at handoff.
- All capability gates are now true: booking, chat, voice, morning scan and invoice sending.
  Exact demo recipient and caller allowlists remain enforced. Persistent SQLite and documents
  live outside Git. No unresolved outbox effects; only two synthetic shows and one invoice.
- Tasks are still **InteractiveOnly**. Startup upgrade has not successfully been applied.
- Desktop/mobile live QA passed, including no overflow, Houston phone CTA and Central/DST
  booking displays. Demo remains noindex; admin remains no-store/authenticated.

Protected runtime directory: `C:/Users/trustcore-rdp/.config/jlm-demo`.
Never print or commit env values, recipient addresses, tokens, transcripts or recordings.
`runtime.env` is authoritative. `acceptance.env` is a private manual-test clone with the same
DB and enabled booking/billing gates; it has stale voice-number values and must NOT configure
Retell or running services. All live effects in this session used approved demo recipients.

## Verified live booking and invoice results

Google Calendar API/terms and Retell KYC were completed by Dave. The dedicated calendar
`jlm-demo-performances` now exists with `America/Chicago`; its ID is private. OAuth remains
limited to `calendar.app.created` and `calendar.freebusy`. Do not broaden scope or remove
configured primary free/busy protections.

Future-show acceptance used private `live-booking-smoke.json` and show
`0ff01042-c7fe-4805-bd01-35132bc6d43c`:

- Consultation and tentative performance invitations reached client and Dave; private brief
  PDF receipt was verified in Dave's inbox.
- A tentative attendee mirror initially self-conflicted because Google defaults to opaque.
  Fixed by transparent tentative performances, with local transactional holds still reserving
  availability. Confirmed performances and consultations remain opaque.
- Existing event `a46bc1345ca108fe87b7689c8a9cfd10` was repaired in place, confirmed for
  USD 700.00, moved to Sept 26 18:00–20:00 Central, then cancelled. Same event ID throughout.
- All calendar/mail effects accepted on attempt one; no unresolved effects.
- Remaining honest limitation: a confirmed event moved to an overlapping interval can fail
  closed because primary free/busy cannot distinguish its attendee mirror from another event.
  Never subtract matching busy intervals or drop the protected calendar to work around this.

Past rehearsal `jlm-demo-rehearsal-v1`, manifest `booking-billing-smoke.json`:

- Real Calendar scan of yesterday's ended show sent actual performer authorization email.
- Dave's authenticated/correlated YES was ingested by real IMAP.
- One immutable USD 700.00 labeled demo invoice was sent with PDF to the test inbox and BCC Dave.
- Exact Message-ID found once in client INBOX; Dave's BCC receipt separately verified in browser.
- Morning/reply/send replay queued zero additional mail; one invoice and one send attempt remain.
- IMAP now searches app-correlated In-Reply-To values up to a captured UID high-water mark;
  authentication, nonce and sender alignment still authorize the reply, not the search or subject.

Important late security fixes are committed and running:

- `3d45f83`: every Google attendee checked against demo allowlist before OAuth/provider upsert.
- `f22e52b`: all scheduling channels enforce enabled gate, inquiry token and recipients before
  availability or hold creation; token checks also apply to idempotent replay.
- Real public negative test created one synthetic blocked-recipient inquiry; booking returned
  400, invalid token returned 400, no show or effects created. Do not mistake that inquiry for a show.

Evidence: `live-booking-acceptance.json`, `live-invoice-acceptance.json`,
`operator-mail-receipts.json`, `live-booking-boundary.json`, `central-live-check.json`,
`live-backup-restore.json` under `docs/evidence`. Restored fresh copy had integrity_check=ok,
two shows and one invoice; live DB was never overwritten.

## Retell current state and remaining verification gap

- Protected agent: `agent_ee62bd9b73af71d0b42a877f00`
- Protected LLM: `llm_8b63e841b1bbf015da8acca1ccfe`
- Standard voice: `retell-Alejandro`
- Published agent/LLM version: **2 / 2**.
- KB version: **2026-09-21.2**; hash:
  `d6dd327317ecf32b537cbc74df5ea7957e79429442383014d4ef40986d9b0ad6`.
- Houston 832 number is the only current Justin line. 713/281 were definitively unavailable;
  old 267 was validated and released. Existing TrustCore number and all baseline agents unchanged.
- No default inbound/outbound binding; signed number webhook admits only approved caller,
  then overrides the agent. Daily limit 10; max call five minutes. No calls should be initiated
  to unrelated people.

Two actual Dave calls completed:

1. Agent v1: 59,473ms, 11.86 cents, user hangup. Asked about outdoor three-hour quinceanera
   and song requests. AI identity disclosed, event/contact details requested, unknown song policy
   acknowledged without guarantee or claiming saved follow-up. No intake completed. Provider
   success=false reflects incomplete intake, not connection failure.
2. Agent v2: 18,473ms, 5.177 cents, success=true. Dave asked the consultation time zone and
   heard Houston Central Time / America/Chicago. No booking was requested.

Both calls produced signed started/ended/analyzed webhooks and the correct KB ledger identity.
**Neither invoked an assistant tool.** Do not claim a live voice-tool or voice-intake pass.
The v2 prompt explicitly requires search_knowledge before business facts, and a read-only audit
confirmed exact published v2 LLM/prompt/all six tool bindings. Full KB is embedded, so the model
still answered directly. Strict tool schema mode does not force tool selection. Do not repeatedly
ask Dave the same FAQ call or rebuild the agent speculatively.

Private files for read-only reconciliation:
`last-call-private.json`, `last-call-v2-private.json`, `retell-call-evidence.json`,
`retell-call-v2-evidence.json`, `retell-v2-audit.json`, `retell-provision.json`,
`retell-prompt-update-v2.json`. The latter is verified published; no retry/publish needed.

`scripts/retell-refresh.ts` is the tested in-place release command. It reconciles a durable
per-release manifest, preserves agent/LLM identity, and validates prompt/tool read-back.
Retell omits four known JSON Schema bounds/null-enum details; only those read-back projections
are normalized, with runtime validation unchanged. Initial provisioning now refuses KB-drift
creation of duplicate agent identities.

Retell Playground supports stateless text testing, optionally mocked tools, billed per message;
simulation persists test resources and is billed. No playground/simulation call was executed.
Official reference: https://docs.retellai.com/api-references/agent-playground-completion .
It cannot be counted as a real phone tool pass merely from a mock. Research already established
that a stale version/binding is NOT the cause. Do not redo that investigation.

Some Git evidence is stale: `retell-central-release.json` still describes v1, and
`live-voice-acceptance.json` currently records only the first call. Update from the private
verified files without including transcript/PII. Docs drafts still mark the v2 tool test pending;
replace that with the actual second-call result and remaining tool gap.

## Startup upgrade: latest exact blocker

Dave ran the manual elevated command twice after an initial copy/paste path error. The previous
script refused ownership, so no task upgrade occurred. `18570d3` fixes the latest check:
actual executing PowerShell host rather than PATH lookup, SID identity comparison, exact owned
direct host or exact system conhost --headless wrapper. It reports mismatched field names.
Actual dry run passed all three Running tasks; current agent shell is not elevated.

The latest script has NOT yet been run by Dave. Do all independent reconciliation first, then
give the exact corrected command only if needed. Use forward slashes: the earlier UI swallowed
backslashes before `.cache` and `.config`. Command for Dave's Administrator PowerShell:

```powershell
& 'C:/Users/trustcore-rdp/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File 'C:/Users/trustcore-rdp/Desktop/Justin Leblanc/scripts/upgrade-services.ps1' -ConfigPath 'C:/Users/trustcore-rdp/.config/jlm-demo/runtime.env' -Apply
```

It backs up task XML, upgrades only three owned tasks to S4U/AtStartup, restarts only previously
running tasks and rolls back on failure. No reboot. Verify actual task principals/triggers and
service health after Apply. Do not claim reboot/sign-out recovery without that actual test;
do not initiate disruptive reboot/sign-out without Dave's explicit instruction.

## Finish without repeating work

1. Read git status and current private manifests; preserve all local work.
2. Update the stale voice/release and final operations evidence from verified state. Keep the
   voice-tool limitation honest. Reconcile startup if Dave completes it.
3. Finalize existing docs drafts and `docs/solutions/live-demo-acceptance.md`; include final
   totals, deployment, remaining overlap-reschedule and uptime/tool limitations.
4. Last isolation audit at 15:16:13 UTC: baseline 22 Retell versions unchanged, now 25 total
   (three versions of one Justin agent); baseline original number unchanged, now two total;
   baseline nine Pages projects unchanged, now ten; exactly two Justin DNS additions, no changes.
   Do not rerun without a new provider mutation.
5. Review only remaining diffs, run checks justified by new changes, commit sanitized evidence
   and docs, push main, verify remote SHA and CI. No further code changes require repeating the
   already-passed full suite unless new concerns arise.
6. Give Dave the live URL, Houston number, short walkthrough, commit, evidence and actual limits.
   Do not present pending voice-intake/tool or unattended recovery as completed.
