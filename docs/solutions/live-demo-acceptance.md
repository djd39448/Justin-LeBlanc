# Live demo acceptance lessons — 2026-09-21

The live rehearsal exposed provider behavior that fixture tests alone did not cover.

## Calendar invitations and availability

A tentative Google event is opaque unless transparency is set explicitly. Its attendee copy
can therefore appear as busy on the configured primary calendar and block confirmation of
the same canonical hold. Tentative performances now use `transparent`; the local transactional
hold still reserves the interval. Confirmed performances and consultations remain `opaque`.
The existing event was repaired in place, then confirmed, rescheduled, and cancelled using
one provider ID. See [live booking evidence](../evidence/live-booking-acceptance.json).

Do not subtract matching free/busy intervals from a protected calendar: a matching interval
may contain an unrelated conflict. An overlapping move of a confirmed event can consequently
be rejected safely; the narrow free/busy scope cannot identify the mirrored event.

Google invitation delivery is a separate outbound boundary from SMTP. The Google upsert
adapter now checks every attendee against the demo recipient allowlist before OAuth or
provider requests. Scheduling also checks the gate, inquiry authorization, and recipients
before availability reads or canonical holds, for both web and assistant callers.

## Actual email replies and replay

Scanning a mailbox from its oldest UID delayed the actual performer reply behind unrelated
mail. The IMAP adapter now searches for app-correlated `In-Reply-To` values up to a captured
UID high-water mark, then fetches bounded results in order. Correlation only selects candidates;
sender authentication, alignment, thread identity, and nonce checks still authorize billing.
UIDVALIDITY changes remain explicit, and concurrent arrivals are deferred to the next scan.

The authenticated YES produced one immutable USD 700.00 demo invoice, delivered to the test
inbox and BCC operator with a PDF. Replaying the morning, reply, and delivery stages produced
no second invoice and left the send attempt count at one. See
[invoice evidence](../evidence/live-invoice-acceptance.json).

## Retell release identity

The protected agent and LLM identities must survive knowledge-base changes. Initial
provisioning now reconciles the protected manifest first and refuses to create replacement
identities for a changed release. `scripts/retell-refresh.ts` records one version attempt,
updates the corresponding LLM version, and reconciles publication before any further action.
Its fingerprint includes the prompt and complete tool plan, not only the knowledge hash.

Retell accepts some JSON Schema bounds but omits them on read-back, and removes a null enum
member while retaining the nullable type. Release verification normalizes only the observed
fields; server-side argument bounds are unchanged. A successful phone connection or provider
success flag is not evidence of a tool invocation: inspect both the actual call and the signed
backend tool ledger before claiming that result.

The published agent and LLM reached version 2 without changing their protected identities. The
first two calls remain historical no-tool evidence: v1 lasted 59,473 ms / 11.86 cents, and v2
lasted 18,473 ms / 5.177 cents and correctly answered Houston Central Time / `America/Chicago`.
Requiring `search_knowledge` in the prompt was insufficient because the full KB is embedded in
model context, so the model can answer directly.

A third v2 call lasted 196,946 ms and cost 34.191 cents. `upsert_inquiry` succeeded and persisted
the call/inquiry association. Two `get_availability` calls and one `request_human_followup` call
failed HTTP 413 because the signed growing call/transcript envelope exceeded the endpoint's 32 KiB
body limit. Terminal ended/analyzed events were absent; the same cap applies to their envelopes,
although provider delivery status was not captured. Availability tool
arguments also used naive local timestamps without an offset. The tested scoped repair
raises only signed tool/lifecycle endpoint limits and normalizes those local inputs with the existing
DST-aware Central-time converter; the public 32 KiB limit, signature checks, and tool argument
bounds remain unchanged.

A fourth actual v2 call (`ee1ddd70e7624259`) lasted 210,264 ms, cost 36.473 cents, and ended by
`user_hangup`. Read-only backend-ledger inspection verified `upsert_inquiry`, four
`get_availability` results, persisted `request_human_followup`, and started/ended/analyzed events.
Each availability result returned `performanceAvailable=true` and only the then-active 24-hour
consultation rule as a reason. This supplies actual phone evidence for the repaired inquiry,
availability, follow-up, and lifecycle paths; booking did not complete.

The same protected agent and LLM identities then reached version 3 with KB `2026-09-21.3`, hash
`2e53a286acbc5d1793d01a9c25c9429d033e0521cd8f9279fe3d63c5c675eb1e`, six unchanged backend
tools, and native `end_call`. After the Administrator restart, API/chat/Retell parity passed across
all health paths. A read-only website request then accepted a same-day consultation only 68 minutes
ahead with no reasons and no durable changes, proving the no-notice policy live. Completed voice
booking and native hangup remain untested by phone. See
[call-completion evidence](../evidence/consultation-call-completion.json).

## Windows task ownership

Windows may report an existing task principal as a short account name while the current
identity includes the machine prefix. Resolve both to security identifiers instead of
weakening ownership checks. An elevated shell can also have a different PATH, so task checks
must compare the actual executing PowerShell host. Keep ownership checks exact and report
the mismatched field before changing any task. A passing dry run does not prove startup or
reboot recovery; record each result separately.

At 15:22:32 UTC all three owned tasks were running with `LogonType=Interactive` and
`MSFT_TaskLogonTrigger`. The corrected S4U/AtStartup script had not been applied. This is a
working attended configuration, not evidence of recovery after sign-out or reboot.

The corrected apply created its backup at 15:38:36 UTC and restarted the tasks at 15:38:40 UTC.
It created a private manifest and three valid XML backups of the former interactive tasks. At
15:39:09 UTC all three tasks were running S4U/Limited with exactly one
`MSFT_TaskBootTrigger` each.
Post-upgrade local, tunnel, and website-proxy health passed at 15:39:43 UTC; worker startup jobs
also succeeded. This verifies registration and task execution, but not recovery after an actual
reboot or sign-out.
