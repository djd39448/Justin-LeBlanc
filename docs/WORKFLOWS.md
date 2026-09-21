# Booking and invoicing workflows

## Shared rules

One inquiry ID across form/chat/voice; customer ID across multiple shows. Every mutation records
actor, timestamp, source channel, prior/new state, request ID, and policy/version. Server enforces
transitions. External effects use a transactional outbox and provider IDs. Retries reconcile
uncertain outcomes before sending again; never promise universal exactly-once delivery.

All customer-facing consultation and event inputs and displays use Central Time
(`America/Chicago`), including daylight-saving transitions. Store UTC instants plus the IANA
timezone and original local input. Calendar event IDs are not customer IDs. Never treat subject
text as authorization or calendar creation time as performance time.

## Inquiry -> consultation -> hold -> booking

1. Answer sourced FAQs; create/update inquiry after consent and validate email/phone/timezone.
2. Produce provisional estimate if enough information, otherwise qualify for custom quote.
3. Offer actual free consultation slots through the verified TrustCore scheduling adapter.
4. Before committing, recheck consultation and performance conflicts with buffers. Lock the
   requested performer/time interval transactionally to prevent simultaneous double holds.
5. After visitor reviews both dates and tentative status, persist the booking intent and enqueue
   consultation + performance hold. Two calendar records with different roles and shared booking ID.
6. Invite client and Dave to consultation and tentative performance hold (unless Dave is already
   organizer). Never duplicate Dave as attendee. Use supported provider invitation behavior.
   Keep financial/internal notes out of attendee-visible descriptions. Calendar status is not the
   business status: use explicit title `[DEMO][TENTATIVE]` and private metadata.
7. Send client confirmation explaining consultation, non-guaranteed hold, expiry and next steps.
   Send Dave the full private one-page event brief. Do not attach it to the client invitation.
8. If one external write fails, record partial state, retry that effect only, and show accurate
   status. Cancel/compensate orphaned temporary entries if reservation cannot complete.
9. After consultation, authenticated operator sets agreed quote and confirms the performance.
   Update the existing hold to `[DEMO][CONFIRMED]`, preserving event ID and sending update notice.
   Only actual availability and required fields permit confirmation; no automatic approval by AI.
10. Expired holds release reservations and cancel/update only their own calendar records.
    Rescheduling checks new interval first; cancellation updates event and booking, sends notices,
    and blocks automatic invoice generation. Avoid repeated notification loops.

States: inquiry `new -> qualified -> consultation_scheduled -> consultation_completed`;
show `tentative -> confirmed -> awaiting_performance_reply -> performed|not_performed|needs_review`.
Side exits: tentative -> expired/cancelled; confirmed -> cancelled. Consultation and show states
are separate so a missed/rescheduled consultation does not incorrectly mark a show played.

## Morning scan

Run a deterministic scheduled job at **08:00 America/Chicago**, not a model-based scheduler.
For UTC-only cron, use an hourly trigger with local-time/date gate and one run key per local day;
test DST. On startup/catch-up reconcile up to 7 unprocessed days, bounded and deduplicated.

Read configured performer calendar(s), resolving recurring instances and events crossing midnight.
Select confirmed Justin demo shows whose **end** fell on the prior local date. A 1am finish is
included on the morning after that finish date. Also reconcile overdue unprocessed eligible shows.
Ignore consultations, tentative/cancelled/all-day/unrelated records and already invoiced shows.
An untagged calendar show is never auto-billed; queue an operator mapping task if explicitly imported.

Each eligible show must carry private app metadata: tenant ID, show ID, customer ID, quote version,
currency and agreed total in minor units. Retrieve latest event revision and customer record.
Calendar and DB price/version mismatch -> review, never silent overwrite. At confirmation the
approved quote is written to DB and calendar; that snapshot drives post-show billing.

Send one email thread per show to the authorized performer/operator (Dave for demo). Subject:
`[Justin Demo][SHOW-ID] Did you play <event> on <date>?` Include venue/time, customer, agreed line
items and total. Ask: **Did you perform? Reply YES (no changes), NO (not performed), or YES with
itemized changes.** One show per thread makes a simple yes/no unambiguous.

## Reply ingestion and approval

SMTP sends mail but cannot receive replies. Reuse the verified Gmail IMAP connection pattern in a
separate worker, or Gmail API OAuth when appropriate. Preferred minimal demo: bounded deterministic
polling of relevant threads every 2 minutes, cursor + message-ID dedupe. Production push can use Gmail watch/Pub/Sub
with renewal and history recovery. Never replace an existing mailbox watch without checking its
consumer; polling avoids a collision. See `docs/INTEGRATIONS.md` for source references.

Accept only inbound messages from configured operator identity, correlated to the original
provider thread and In-Reply-To/token, validated with available trusted authentication metadata.
A forged From header or a subject match is insufficient. Ignore sent echoes, BCC copies, bounces,
auto-replies, quoted original text and signatures. A security-sensitive uncertain reply requires
authenticated operator review; never let model content grant authority.

| Reply | Deterministic outcome |
|---|---|
| YES / played, no changes | Snapshot validated billing details + agreed quote, issue invoice |
| NO / did not play | Mark not_performed, no invoice; optional cancellation-charge review only |
| YES plus clear changes | Extract candidate amendment, validate, send revised total for explicit approval |
| NO changes (without clear played answer) | Ask whether performed; no invoice yet |
| Ambiguous, multiple shows, conflicting totals | needs_review; concise clarification, no invoice |
| No reply | Stay pending, remind once after 24h, operator queue after 72h |
| Missing customer billing data/price | Request missing info; no issued invoice |
| Duplicate/late reply after issue | Acknowledge state if needed; never issue a duplicate |

For changes, optional economical model extracts typed candidates; deterministic rules validate
money and quantities. Performer sees revised lines/total and replies APPROVE to that version.
Approval token/version invalidates on further edits. Unknown intent cannot pass based on a model
confidence score. Confirmed amendments update the audited show/quote and calendar metadata.

## Invoice generation and delivery

Generate sequential unique number (`JLM-DEMO-2026-0001`), issue/due dates, seller identity,
customer billing identity/email/address/PO when required, event/date/location, itemized services,
quantity/rate, agreed extras/discounts, subtotal, tax policy, deposits already paid and balance due.
Validate integer cents, nonnegative payable amount and customer/address requirements. A missing
seller legal address remains a marked demo fixture; do not publish Justin's home address by default.

Invoice states: draft -> awaiting_change_approval (optional) -> approved -> issuing -> sent;
failures -> delivery_pending/needs_review. After issue, snapshot is immutable. Corrections create
an auditable revision/void-and-replacement, never silently edit an emailed document. No payment
collection or automatic paid status in this demo; paid is authenticated operator-entered evidence.

Render HTML email and PDF from one validated invoice model. Deliver **To billing contact, BCC
performer** (Dave's configured address in demo; Justin after migration), correct Reply-To, attachment
and accessible plaintext alternative. No public PDF URL; store privately with expiring access.

Unique constraints on tenant/show/invoice kind and processed reply IDs prevent duplicate invoice
creation. Outbox tracks provider message IDs. If send times out after possible acceptance, query
sent records/correlating Message-ID before retry; if still uncertain stop in delivery_pending.
Do not claim delivered solely from API accepted; demo evidence includes inbox receipt/attachment.

## Demo controls

All effects have DEMO_MODE and recipient allowlist checks at the last external boundary, including
calendar attendees, email To/CC/BCC and outbound test call destinations. Real customer addresses
cannot escape via copied data. Use synthetic customers and nominated test inboxes.
Admin-only `run-morning-check --as-of` demonstrates the job instantly with a tagged synthetic past
show. It must run the same logic as the scheduled job. Global clock override forbidden in live mode.
Separate kill switches for AI, voice callbacks, booking writes, morning scan and invoice sending.
