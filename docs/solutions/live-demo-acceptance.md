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

The published agent and LLM reached version 2 without changing their protected identities. Two
real calls connected successfully: v1 lasted 59,473 ms and cost 11.86 cents; v2 lasted 18,473 ms
and cost 5.177 cents. V2 correctly answered that consultations use Houston Central Time /
`America/Chicago`. Neither call invoked a tool. Requiring `search_knowledge` in the prompt was
insufficient because the full KB is embedded in model context, so the model can answer directly.
No additional call is requested, and voice-side tools remain unverified.

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
